const resourceRepository = require('../repositories/resourceRepository');
const pipelineRepository = require('../repositories/pipelineRepository');
const policyRepository = require('../repositories/policyRepository');
const dependencyEngine = require('../dependencies/dependencyEngine');

class SafetyEngine {
  constructor() {
    // Atomic in-memory lock set for concurrent reclaim operations
    this.activeReclaimLocks = new Set();
  }

  acquireLock(resourceId) {
    if (this.activeReclaimLocks.has(resourceId)) {
      return false;
    }
    this.activeReclaimLocks.add(resourceId);
    return true;
  }

  releaseLock(resourceId) {
    this.activeReclaimLocks.delete(resourceId);
  }

  async reverifyLiveness(organizationId, resourceId) {
    const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
    if (!resource) return { isLive: false, reason: 'Resource not found' };

    // 1. Adoption re-check
    const adoptionSafety = await dependencyEngine.evaluateAdoptionSafety(organizationId, resourceId);
    if (adoptionSafety.isProtected) {
      return { isLive: true, reason: adoptionSafety.reason };
    }

    // 2. Active owner re-check
    if (resource.ownershipState === 'ACTIVE_OWNER' && resource.owner?.isActiveOwner && resource.owner?.email) {
      return { isLive: true, reason: `Active owner assigned (${resource.owner.email})` };
    }

    // 3. Heartbeat re-check
    if (resource.heartbeat?.isHeartbeatActive) {
      return { isLive: true, reason: 'Active heartbeat signal detected' };
    }

    // 4. Workload activity re-check
    if (resource.activity?.metricsCount > 50) {
      return { isLive: true, reason: `Workload metrics active (${resource.activity.metricsCount} operations)` };
    }

    // 5. Active pipeline run re-check
    if (resource.runId) {
      const run = await pipelineRepository.findRunById(organizationId, resource.runId);
      if (run && (run.status === 'ACTIVE' || run.status === 'RUNNING')) {
        return { isLive: true, reason: `Associated pipeline run '${resource.runId}' is active (${run.status})` };
      }
    }

    // 6. Environment & Resource Type Policy protection re-check
    const policy = await policyRepository.getPolicy(organizationId);
    if (policy.protectedEnvironments?.includes(resource.environment)) {
      return { isLive: true, reason: `Environment '${resource.environment}' is protected by policy` };
    }
    if (policy.protectedResourceTypes?.includes(resource.type)) {
      return { isLive: true, reason: `Resource type '${resource.type}' is protected by policy` };
    }

    return { isLive: false, reason: null };
  }

  async verifyReclaimSafety(organizationId, resourceId, aiRecommendation = null) {
    const checks = [];
    let isSafe = true;
    let blockReason = null;

    // 1. Concurrency Check
    if (!this.acquireLock(resourceId)) {
      return {
        isSafe: false,
        code: 'CONCURRENCY_LOCK_ACTIVE',
        blockReason: `Concurrent reclaim lock active for resource '${resourceId}'`,
        checks: ['Concurrent lock active'],
      };
    }

    try {
      // 2. Fetch Latest Real-Time Resource State
      const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
      if (!resource) {
        isSafe = false;
        blockReason = `Resource '${resourceId}' not found`;
        return { isSafe, blockReason, checks };
      }
      checks.push(`Latest resource state loaded (${resource.state})`);

      // 3. Already Reclaimed or Pending Human Review Check
      if (resource.state === 'RECLAIMED') {
        isSafe = false;
        blockReason = `Resource '${resourceId}' is already reclaimed`;
        return { isSafe, blockReason, checks };
      }

      if (resource.state === 'HUMAN_REVIEW_REQUIRED' || resource.state === 'NEEDS_REVIEW') {
        isSafe = false;
        blockReason = `Resource '${resourceId}' requires Human Review due to evidence uncertainty. Automated cleanup is blocked until an authorized operator reviews and decides.`;
        checks.push(`BLOCK: Human Review Required (${resource.humanReviewState?.reason || 'Uncertain evidence'})`);
        return { isSafe, blockReason, checks };
      }

      // 4. Adoption Safety Check
      const adoptionSafety = await dependencyEngine.evaluateAdoptionSafety(organizationId, resourceId);
      if (adoptionSafety.isProtected) {
        isSafe = false;
        blockReason = adoptionSafety.reason;
        checks.push(`BLOCK: Adoption safety active (${blockReason})`);
        return { isSafe, blockReason, checks };
      }
      checks.push('Adoption safety check passed (No active adoption)');

      // 5. Active Pipeline Run Check
      if (resource.runId) {
        const run = await pipelineRepository.findRunById(organizationId, resource.runId);
        if (run && (run.status === 'ACTIVE' || run.status === 'RUNNING')) {
          isSafe = false;
          blockReason = `Associated pipeline run '${resource.runId}' is active (${run.status})`;
          checks.push(`BLOCK: Active pipeline run`);
          return { isSafe, blockReason, checks };
        }
      }
      checks.push('Pipeline run check passed (Not active)');

      // 6. Active Owner Check
      if (resource.ownershipState === 'ACTIVE_OWNER' && resource.owner?.isActiveOwner && resource.owner?.email) {
        isSafe = false;
        blockReason = `Resource has an active owner (${resource.owner.email})`;
        checks.push('BLOCK: Active owner exists');
        return { isSafe, blockReason, checks };
      }
      checks.push('Owner check passed (No active owner)');

      // 7. Heartbeat Check
      if (resource.heartbeat?.isHeartbeatActive) {
        isSafe = false;
        blockReason = 'Resource heartbeat is currently active';
        checks.push('BLOCK: Active heartbeat signal');
        return { isSafe, blockReason, checks };
      }
      checks.push('Heartbeat check passed (No active heartbeat)');

      // 8. Workload Activity Check
      if (resource.activity?.metricsCount > 50) {
        isSafe = false;
        blockReason = `Resource recorded active workload metrics (${resource.activity.metricsCount})`;
        checks.push('BLOCK: Workload metrics active');
        return { isSafe, blockReason, checks };
      }
      checks.push('Workload metrics check passed');

      // 9. Policy Protection Check
      const policy = await policyRepository.getPolicy(organizationId);
      if (policy.protectedEnvironments?.includes(resource.environment)) {
        isSafe = false;
        blockReason = `Environment '${resource.environment}' is protected by policy`;
        checks.push('BLOCK: Environment protected by policy');
        return { isSafe, blockReason, checks };
      }
      if (policy.protectedResourceTypes?.includes(resource.type)) {
        isSafe = false;
        blockReason = `Resource type '${resource.type}' is protected by policy`;
        checks.push('BLOCK: Resource type protected by policy');
        return { isSafe, blockReason, checks };
      }
      checks.push('Organizational policy check passed');

      // 10. AI Override Check (Deterministic Safety Overrides AI)
      if (aiRecommendation && aiRecommendation.recommendedAction === 'RECLAIM' && !isSafe) {
        checks.push('DETERMINISTIC_OVERRIDE: AI recommended RECLAIM, but Deterministic Safety Engine BLOCKED destructive action');
      }

      return {
        isSafe: true,
        blockReason: null,
        checks,
        resource,
      };
    } finally {
      this.releaseLock(resourceId);
    }
  }
}

module.exports = new SafetyEngine();
