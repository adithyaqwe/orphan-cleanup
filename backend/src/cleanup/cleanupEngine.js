const safetyEngine = require('../security/safetyEngine');
const cloudAdapter = require('../cloud/cloudAdapter');
const resourceRepository = require('../repositories/resourceRepository');
const auditRepository = require('../repositories/auditRepository');

class CleanupEngine {
  /**
   * Phase 1: Schedule Two-Phase Reclamation with Grace Period (Mark & Wait)
   */
  async scheduleTwoPhaseDelete(user, resourceId, gracePeriodSeconds = 300) {
    const organizationId = user.organizationId;
    const actorId = user._id ? user._id.toString() : (user.id || 'system-actor');

    // 1. Verify Initial Safety Engine Criteria
    const safetyResult = await safetyEngine.verifyReclaimSafety(organizationId, resourceId);

    if (!safetyResult.isSafe) {
      await auditRepository.log({
        actorId,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'RECLAIM_BLOCKED',
        resourceId,
        result: 'BLOCKED',
        reason: safetyResult.blockReason,
        evidence: safetyResult.checks,
        organizationId,
      });

      return {
        success: false,
        code: safetyResult.code || 'RECLAIM_BLOCKED',
        message: `Schedule reclamation blocked: ${safetyResult.blockReason}`,
        checks: safetyResult.checks,
      };
    }

    const resource = safetyResult.resource;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + gracePeriodSeconds * 1000);

    const updatedHistory = [
      ...(resource.lifecycleHistory || []),
      {
        event: 'RECLAIM_SCHEDULED',
        timestamp: now,
        actor: user.email,
        details: `Resource marked for reclamation. Grace period: ${gracePeriodSeconds}s.`,
      },
    ];

    // Update resource state to PENDING_RECLAMATION
    const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
      state: 'PENDING_RECLAMATION',
      lifecycleHistory: updatedHistory,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimScheduledAt: now,
        reclaimGracePeriodExpiresAt: expiresAt,
        gracePeriodSeconds,
      },
    });

    // Log Immutable Audit Event
    await auditRepository.log({
      actorId,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'RECLAIM_SCHEDULED',
      resourceId,
      result: 'SUCCESS',
      reason: `Resource marked for Two-Phase reclamation. Grace period expires at ${expiresAt.toISOString()}.`,
      evidence: safetyResult.checks,
      organizationId,
    });

    return {
      success: true,
      data: updatedResource,
      gracePeriodSeconds,
      expiresAt,
      checks: safetyResult.checks,
    };
  }

  /**
   * Phase 2: Finalize Two-Phase Reclamation (Re-verify Liveness & Delete or Reverse)
   */
  async finalizeTwoPhaseDelete(user, resourceId) {
    const organizationId = user.organizationId;
    const actorId = user._id ? user._id.toString() : (user.id || 'system-actor');

    const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
    if (!resource) {
      return { success: false, code: 'NOT_FOUND', message: `Resource '${resourceId}' not found.` };
    }

    if (resource.state === 'RECLAIMED') {
      return { success: false, code: 'ALREADY_RECLAIMED', message: `Resource '${resourceId}' is already reclaimed.` };
    }

    // 1. Re-verify Liveness Signals (Detect if process resumed during grace period)
    const livenessCheck = await safetyEngine.reverifyLiveness(organizationId, resourceId);

    if (livenessCheck.isLive) {
      // CAUGHT AND REVERSED! Process resumed during grace period.
      const reversed = await this.reverseReclamation(user, resourceId, livenessCheck.reason);
      return {
        success: false,
        code: 'RECLAIM_REVERSED_LIVENESS_DETECTED',
        message: `🔒 CAUGHT AND REVERSED! Liveness signal detected right before deletion (${livenessCheck.reason}). Resource protected.`,
        data: reversed.data,
        reason: livenessCheck.reason,
      };
    }

    // 2. No Liveness Detected: Execute Final Cloud Reclamation
    const cloudResult = await cloudAdapter.reclaimResource(resource);

    if (!cloudResult || !cloudResult.success) {
      await auditRepository.log({
        actorId,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'RECLAIM_FAILED',
        resourceId,
        result: 'FAILURE',
        reason: cloudResult?.details || 'Cloud provider mutation failed.',
        organizationId,
      });

      return {
        success: false,
        code: 'CLOUD_MUTATION_FAILED',
        message: `Cloud provider mutation failed: ${cloudResult?.details || 'Unknown error'}`,
      };
    }

    // 3. Database State Update to RECLAIMED
    const now = new Date();
    const updatedHistory = [
      ...(resource.lifecycleHistory || []),
      {
        event: 'RECLAIMED',
        timestamp: now,
        actor: user.email,
        details: `Two-Phase final reclamation completed cleanly via ${cloudResult.mode}.`,
      },
    ];

    const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
      state: 'RECLAIMED',
      lifecycleHistory: updatedHistory,
      cleanupState: {
        reclaimedAt: now,
        reclaimedBy: user.email,
        status: 'RECLAIMED',
      },
    });

    // 4. Immutable Audit Event
    await auditRepository.log({
      actorId,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'RECLAIM_EXECUTED',
      resourceId,
      result: 'SUCCESS',
      reason: 'Two-Phase final reclamation executed following liveness re-verification.',
      details: cloudResult,
      organizationId,
    });

    return {
      success: true,
      data: updatedResource,
      cloudResult,
    };
  }

  /**
   * Demo / Action: Reverse Pending Reclamation (Simulate Process Resumption)
   */
  async reverseReclamation(user, resourceId, reason = 'Process resumed right before deletion / Manual reversal trigger') {
    const organizationId = user.organizationId;
    const actorId = user._id ? user._id.toString() : (user.id || 'system-actor');

    const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
    if (!resource) {
      return { success: false, code: 'NOT_FOUND', message: `Resource '${resourceId}' not found.` };
    }

    const now = new Date();
    const updatedHistory = [
      ...(resource.lifecycleHistory || []),
      {
        event: 'RECLAIM_REVERSED',
        timestamp: now,
        actor: user.email,
        details: `Reclamation reversed to PROTECTED state: ${reason}`,
      },
    ];

    const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      'owner.isActiveOwner': true,
      'heartbeat.isHeartbeatActive': true,
      'heartbeat.lastHeartbeatTime': now,
      lifecycleHistory: updatedHistory,
      cleanupState: {
        status: 'NOT_RECLAIMED',
        reversalReason: reason,
      },
    });

    await auditRepository.log({
      actorId,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'RECLAIM_REVERSED',
      resourceId,
      result: 'REVERSED',
      reason: `Reclamation caught and reversed: ${reason}`,
      organizationId,
    });

    return {
      success: true,
      message: `Reclamation for '${resourceId}' was successfully reversed to PROTECTED.`,
      data: updatedResource,
    };
  }

  /**
   * Human-in-the-Loop Decision 1: Protect Resource (Operator Keep Choice)
   */
  async protectHumanReviewResource(user, resourceId, reason = 'Operator reviewed evidence and chose to keep/protect resource.') {
    const organizationId = user.organizationId;
    const actorId = user._id ? user._id.toString() : (user.id || 'system-actor');

    if (!safetyEngine.acquireLock(resourceId)) {
      return { success: false, code: 'CONCURRENCY_LOCK_ACTIVE', message: `Another operator action is currently in progress for resource '${resourceId}'.` };
    }

    try {
      const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
      if (!resource) {
        return { success: false, code: 'NOT_FOUND', message: `Resource '${resourceId}' not found.` };
      }

      if (resource.state !== 'HUMAN_REVIEW_REQUIRED' && resource.state !== 'NEEDS_REVIEW') {
        return {
          success: false,
          code: 'ALREADY_DECIDED',
          message: `Resource '${resourceId}' is in state '${resource.state}' and does not require human review or has already been decided by another operator.`,
        };
      }

      const now = new Date();
      const updatedHistory = [
        ...(resource.lifecycleHistory || []),
        {
          event: 'HUMAN_REVIEW_DECISION',
          timestamp: now,
          actor: user.email,
          details: `Human operator (${user.role}) protected resource: ${reason}`,
        },
      ];

      const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
        state: 'PROTECTED',
        ownershipState: 'ACTIVE_OWNER',
        'owner.isActiveOwner': true,
        lifecycleHistory: updatedHistory,
        humanReviewState: {
          reason: resource.humanReviewState?.reason || 'Human Review Alert Raised',
          uncertaintyEvidence: resource.humanReviewState?.uncertaintyEvidence || resource.detectionState?.evidence || [],
          raisedAt: resource.humanReviewState?.raisedAt || resource.detectionState?.evaluatedAt || now,
          decision: 'PROTECTED',
          decidedBy: user.email,
          decidedAt: now,
          decisionReason: reason,
        },
      });

      await auditRepository.log({
        actorId,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'HUMAN_REVIEW_PROTECTED',
        resourceId,
        result: 'SUCCESS',
        reason: `Human operator decision: PROTECT resource. Reason: ${reason}`,
        organizationId,
      });

      return {
        success: true,
        message: `Human Review Alert resolved: Resource '${resourceId}' set to PROTECTED.`,
        data: updatedResource,
      };
    } finally {
      safetyEngine.releaseLock(resourceId);
    }
  }

  /**
   * Human-in-the-Loop Decision 2: Approve Reclaim (Operator Reclaim Choice)
   * CRITICAL SAFETY RULE: Does NOT bypass final safety engine verification.
   */
  async approveHumanReviewReclaim(user, resourceId, reason = 'Operator reviewed evidence and authorized reclamation.') {
    const organizationId = user.organizationId;
    const actorId = user._id ? user._id.toString() : (user.id || 'system-actor');

    if (!safetyEngine.acquireLock(resourceId)) {
      return { success: false, code: 'CONCURRENCY_LOCK_ACTIVE', message: `Another operator action is currently in progress for resource '${resourceId}'.` };
    }

    try {
      const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
      if (!resource) {
        return { success: false, code: 'NOT_FOUND', message: `Resource '${resourceId}' not found.` };
      }

      if (resource.state !== 'HUMAN_REVIEW_REQUIRED' && resource.state !== 'NEEDS_REVIEW') {
        return {
          success: false,
          code: 'ALREADY_DECIDED',
          message: `Resource '${resourceId}' is in state '${resource.state}' and does not require human review or has already been decided by another operator.`,
        };
      }

      // Re-verify Liveness to ensure resource didn't become active while awaiting human review
      const livenessCheck = await safetyEngine.reverifyLiveness(organizationId, resourceId);
      if (livenessCheck.isLive) {
        const now = new Date();
        const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
          state: 'PROTECTED',
          'owner.isActiveOwner': true,
          'heartbeat.isHeartbeatActive': true,
          lifecycleHistory: [
            ...(resource.lifecycleHistory || []),
            {
              event: 'HUMAN_REVIEW_BLOCKED_ACTIVE',
              timestamp: now,
              actor: 'SAFETY_ENGINE',
              details: `Operator approved reclamation, but safety engine BLOCKED deletion because resource became active: ${livenessCheck.reason}`,
            },
          ],
          humanReviewState: {
            decision: 'PROTECTED',
            decidedBy: 'SAFETY_ENGINE_OVERRIDE',
            decidedAt: now,
            decisionReason: `Reclamation blocked because resource is live: ${livenessCheck.reason}`,
          },
        });

        await auditRepository.log({
          actorId,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'HUMAN_REVIEW_RECLAIM_BLOCKED_ACTIVE',
          resourceId,
          result: 'BLOCKED',
          reason: `Operator approved reclaim, but safety engine blocked deletion because resource is live: ${livenessCheck.reason}`,
          organizationId,
        });

        return {
          success: false,
          code: 'RECLAIM_BLOCKED_ACTIVE_SIGNAL',
          message: `🔒 SAFETY OVERRIDE: Operator approved reclamation, but safety engine BLOCKED deletion because resource is active (${livenessCheck.reason}). Resource returned to PROTECTED.`,
          data: updatedResource,
        };
      }

      const now = new Date();
      await auditRepository.log({
        actorId,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'HUMAN_REVIEW_RECLAIM_APPROVED',
        resourceId,
        result: 'SUCCESS',
        reason: `Human operator decision: APPROVE RECLAIM. Reason: ${reason}`,
        organizationId,
      });

      await resourceRepository.updateState(organizationId, resourceId, {
        state: 'VERIFIED_ORPHAN',
        humanReviewState: {
          decision: 'RECLAIM_APPROVED',
          decidedBy: user.email,
          decidedAt: now,
          decisionReason: reason,
        },
      });
    } finally {
      safetyEngine.releaseLock(resourceId);
    }

    return this.scheduleTwoPhaseDelete(user, resourceId, 300);
  }

  /**
   * Manual Cancellation of Grace Period
   */
  async cancelGracePeriod(user, resourceId) {
    const organizationId = user.organizationId;
    const actorId = user._id ? user._id.toString() : (user.id || 'system-actor');

    const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
    if (!resource) {
      return { success: false, code: 'NOT_FOUND', message: `Resource '${resourceId}' not found.` };
    }

    const now = new Date();
    const updatedHistory = [
      ...(resource.lifecycleHistory || []),
      {
        event: 'RECLAIM_CANCELLED',
        timestamp: now,
        actor: user.email,
        details: `User manually cancelled 5-minute grace period. Returned resource to VERIFIED_ORPHAN.`,
      },
    ];

    const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
      state: 'VERIFIED_ORPHAN',
      lifecycleHistory: updatedHistory,
      cleanupState: {
        status: 'NOT_RECLAIMED',
      },
    });

    await auditRepository.log({
      actorId,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'RECLAIM_CANCELLED',
      resourceId,
      result: 'CANCELLED',
      reason: 'Grace period cancelled by user request.',
      organizationId,
    });

    return {
      success: true,
      message: `Grace period cancelled for resource '${resourceId}'.`,
      data: updatedResource,
    };
  }

  /**
   * Automated Grace Period Evaluator & Final Reclamation Worker
   */
  async processAutomaticReclamations(organizationId) {
    const pendingResources = await resourceRepository.findPendingReclamations(organizationId);
    const results = [];

    for (const resItem of pendingResources) {
      const resourceId = resItem.resourceId;
      const now = new Date();
      const expiresAt = resItem.cleanupState?.reclaimGracePeriodExpiresAt
        ? new Date(resItem.cleanupState.reclaimGracePeriodExpiresAt)
        : null;

      // 1. Check if grace period is still active -> run liveness check to catch resumed activity early
      if (expiresAt && now < expiresAt) {
        const livenessCheck = await safetyEngine.reverifyLiveness(organizationId, resourceId);
        if (livenessCheck.isLive) {
          const reversed = await this.reverseReclamation(
            { id: 'SYSTEM_AUTO_RECLAIM', email: 'SYSTEM_AUTO_RECLAIM', role: 'SYSTEM', organizationId },
            resourceId,
            `Cleanup cancelled because resource became active during grace period: ${livenessCheck.reason}`
          );
          results.push({ resourceId, status: 'CANCELLED_ACTIVE', reason: livenessCheck.reason });
        }
        continue;
      }

      // 2. Grace Period Expired: Acquire Concurrency Lock
      if (!safetyEngine.acquireLock(resourceId)) {
        results.push({ resourceId, status: 'BLOCKED_CONCURRENCY', reason: 'Concurrent lock active' });
        continue;
      }

      try {
        // 3. Re-fetch LATEST resource state right before destructive action
        const latestResource = await resourceRepository.findByResourceId(organizationId, resourceId);
        if (!latestResource || latestResource.state === 'RECLAIMED') {
          results.push({ resourceId, status: 'SKIPPED', reason: 'Resource state changed or already reclaimed' });
          continue;
        }

        // 4. Perform Final Safety Check on Latest State
        const livenessCheck = await safetyEngine.reverifyLiveness(organizationId, resourceId);
        if (livenessCheck.isLive) {
          await this.reverseReclamation(
            { id: 'SYSTEM_AUTO_RECLAIM', email: 'SYSTEM_AUTO_RECLAIM', role: 'SYSTEM', organizationId },
            resourceId,
            `Final safety check failed: Resource is active (${livenessCheck.reason})`
          );
          results.push({ resourceId, status: 'CANCELLED_SAFETY_CHECK', reason: livenessCheck.reason });
          continue;
        }

        // 5. Execute Cloud Reclamation via Cloud Adapter (DEMO / SIMULATED INFRASTRUCTURE)
        const cloudResult = await cloudAdapter.reclaimResource(latestResource);

        if (!cloudResult || !cloudResult.success) {
          // Cloud Mutation Failed: Mark CLEANUP_FAILED
          const updatedHistory = [
            ...(latestResource.lifecycleHistory || []),
            {
              event: 'RECLAIM_FAILED',
              timestamp: now,
              actor: 'SYSTEM_AUTO_RECLAIM',
              details: `Cloud reclamation failed: ${cloudResult?.details || 'Cloud API Error'}`,
            },
          ];

          await resourceRepository.updateState(organizationId, resourceId, {
            state: 'CLEANUP_FAILED',
            lifecycleHistory: updatedHistory,
            cleanupState: {
              status: 'CLEANUP_FAILED',
              failedAt: now,
              failureReason: cloudResult?.details || 'Cloud API Error',
            },
          });

          await auditRepository.log({
            actorId: 'SYSTEM_AUTO_RECLAIM',
            actorEmail: 'SYSTEM_AUTO_RECLAIM',
            actorRole: 'SYSTEM',
            action: 'RECLAIM_FAILED',
            resourceId,
            result: 'FAILURE',
            reason: cloudResult?.details || 'Cloud provider mutation failed.',
            organizationId,
          });

          results.push({ resourceId, status: 'FAILED', reason: cloudResult?.details });
          continue;
        }

        // 6. Update Database State to RECLAIMED
        const updatedHistory = [
          ...(latestResource.lifecycleHistory || []),
          {
            event: 'AUTOMATIC_RECLAMATION',
            timestamp: now,
            actor: 'SYSTEM_AUTO_RECLAIM',
            details: `⚡ 5-minute grace period expired. Final safety check passed. Automatically reclaimed via ${cloudResult.mode}.`,
          },
        ];

        const updatedResource = await resourceRepository.updateState(organizationId, resourceId, {
          state: 'RECLAIMED',
          lifecycleHistory: updatedHistory,
          cleanupState: {
            status: 'RECLAIMED',
            reclaimedAt: now,
            reclaimedBy: 'SYSTEM_AUTO_RECLAIM',
            automatic: true,
            reason: 'Automatically Reclaimed via Grace Period Rule',
          },
        });

        // 7. Create Audit Log
        await auditRepository.log({
          actorId: 'SYSTEM_AUTO_RECLAIM',
          actorEmail: 'SYSTEM_AUTO_RECLAIM',
          actorRole: 'SYSTEM',
          action: 'AUTOMATIC_RECLAMATION',
          resourceId,
          result: 'SUCCESS',
          reason: '5-minute grace period expired. Latest safety check passed (0 CPU, 0 Network, 0 DB conns). Resource automatically reclaimed.',
          details: cloudResult,
          organizationId,
        });

        results.push({ resourceId, status: 'RECLAIMED', data: updatedResource });
      } finally {
        safetyEngine.releaseLock(resourceId);
      }
    }

    return results;
  }

  /**
   * Direct Safe Reclamation (Executes 2-Phase schedule + immediate finalization)
   */
  async executeSafeReclamation(user, resourceId) {
    const scheduleRes = await this.scheduleTwoPhaseDelete(user, resourceId, 0);
    if (!scheduleRes.success) return scheduleRes;
    return this.finalizeTwoPhaseDelete(user, resourceId);
  }
}

module.exports = new CleanupEngine();
