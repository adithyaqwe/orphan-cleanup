const awsIngestionService = require('./awsIngestionService');

class DetectionEngine {
  /**
   * Ingest live EC2 resources from AWS SDK
   */
  async ingestAWSCloudResources(organizationId, region = 'us-east-1') {
    return awsIngestionService.syncEC2Resources(organizationId, region);
  }

  evaluateResource(resource, pipelineRun = null, policy = {}, adoptionSafety = null) {
    const heartbeatThresholdMinutes = policy.heartbeatFreshnessMinutes || 15;
    const reviewThresholdHours = policy.reviewThresholdHours || 12;

    const evidence = [];
    let decision = 'ORPHAN_CANDIDATE';
    let confidence = 0.5;

    const ageInHours = (Date.now() - new Date(resource.creationTime).getTime()) / (1000 * 60 * 60);
    evidence.push(`Resource age: ${ageInHours.toFixed(1)} hours`);

    // 1. ADOPTION & CHILD RELATIONSHIP SAFETY CHECK (ACTIVE ADOPTION = PROTECT)
    if (adoptionSafety && adoptionSafety.isProtected) {
      evidence.push(adoptionSafety.reason);
      return {
        decision: 'PROTECTED',
        confidence: 0.99,
        evidence: [...evidence, 'Protected by dependency/adoption relationship'],
        reason: adoptionSafety.reason,
      };
    }

    if (resource.adoption?.isAdopted) {
      evidence.push(`Adopted by run: ${resource.adoption.adoptedByRunId || 'active-run'}`);
      return {
        decision: 'PROTECTED',
        confidence: 0.99,
        evidence: [...evidence, 'Adopted by active pipeline run'],
        reason: 'Protected by active run adoption',
      };
    }

    // 2. ACTIVE PIPELINE RUN CHECK (ACTIVE PIPELINE = PROTECT)
    if (pipelineRun) {
      evidence.push(`Pipeline run ${pipelineRun.runId} status: ${pipelineRun.status}`);
      if (pipelineRun.status === 'ACTIVE' || pipelineRun.status === 'RUNNING') {
        return {
          decision: 'PROTECTED',
          confidence: 0.99,
          evidence: [...evidence, 'Associated pipeline run is active'],
          reason: 'Pipeline run is actively executing',
        };
      }
    } else {
      evidence.push('No associated pipeline run record found');
    }

    // 3. VERIFIED ACTIVE OWNER CHECK
    if (resource.ownershipState === 'ACTIVE_OWNER' && resource.owner?.isActiveOwner && resource.owner?.email) {
      return {
        decision: 'PROTECTED',
        confidence: 0.95,
        evidence: [...evidence, `Verified active owner assigned: ${resource.owner.email}`],
        reason: 'Active legitimate owner exists',
      };
    } else {
      evidence.push('No active owner assigned');
    }

    // 4. HEARTBEAT FRESHNESS CHECK
    if (resource.heartbeat?.lastHeartbeatTime) {
      const heartbeatAgeMinutes = (Date.now() - new Date(resource.heartbeat.lastHeartbeatTime).getTime()) / (1000 * 60);
      if (heartbeatAgeMinutes <= heartbeatThresholdMinutes || resource.heartbeat.isHeartbeatActive) {
        return {
          decision: 'PROTECTED',
          confidence: 0.98,
          evidence: [...evidence, `Heartbeat active (received ${heartbeatAgeMinutes.toFixed(1)} minutes ago)`],
          reason: 'Heartbeat signal is fresh',
        };
      }
      evidence.push(`Heartbeat mechanism is present, but currently not responding (last received ${heartbeatAgeMinutes.toFixed(1)} minutes ago, exceeds ${heartbeatThresholdMinutes}m threshold)`);
    } else {
      evidence.push('No heartbeat mechanism registered');
    }

    // 5. WORKLOAD ACTIVITY CHECK
    const metricsCount = resource.activity?.metricsCount || 0;
    if (metricsCount > 50) {
      return {
        decision: 'PROTECTED',
        confidence: 0.95,
        evidence: [...evidence, `Workload activity active (${metricsCount} metrics in past period)`],
        reason: 'Resource has high active workload metrics',
      };
    } else if (metricsCount > 0) {
      evidence.push(`Low non-zero workload activity recorded (${metricsCount} metrics, below 50 threshold)`);
    } else {
      evidence.push('Zero active workload metrics recorded');
    }

    // 6. AI CONFLICT & UNCERTAINTY CHECKS
    const aiRec = resource.detectionState?.aiRecommendation;
    const isAiReclaim = aiRec?.decision === 'RECLAIM' || aiRec?.recommendedAction === 'RECLAIM';
    const isAiProtect = aiRec?.decision === 'PROTECT' || aiRec?.recommendedAction === 'PROTECT';

    // 7. VERIFIED ORPHAN VS HUMAN REVIEW CONCLUSION
    const isPipelineCrashed = !pipelineRun || pipelineRun.status === 'CRASHED' || pipelineRun.status === 'FAILED' || pipelineRun.status === 'STALE';
    const isOwnerless = resource.ownershipState === 'NO_OWNER' || !resource.owner?.isActiveOwner;
    const isUnadopted = !resource.adoption?.isAdopted;
    const isOwnershipUnclear = resource.ownershipState === 'UNCLAIMED' || resource.ownershipState === 'UNCONFIRMED_OWNER';

    // Check for conflicting or uncertain conditions
    const isConflictingEvidence = (metricsCount > 0 && metricsCount <= 50) || isOwnershipUnclear;
    const isAiConflict = (isAiProtect && isPipelineCrashed && isOwnerless) || (isAiReclaim && (metricsCount > 0 || !isOwnerless));

    if (isConflictingEvidence || isAiConflict || ageInHours < reviewThresholdHours) {
      decision = 'HUMAN_REVIEW_REQUIRED';
      confidence = 0.65;
      let uncertaintyReason = 'Uncertainty detected: Human operator review required prior to any deletion decision.';
      if (isConflictingEvidence) uncertaintyReason = 'Conflicting evidence: heartbeat mechanism is present but not responding, while 18 non-zero workload metrics are still recorded. Pipeline is crashed and ownership is uncertain.';
      if (isAiConflict) uncertaintyReason = 'Conflicting evidence: Advisory AI recommendation conflicts with deterministic safety rules.';
      if (ageInHours < reviewThresholdHours) uncertaintyReason = `Resource age (${ageInHours.toFixed(1)}h) is under review threshold (${reviewThresholdHours}h).`;

      evidence.push(`HUMAN REVIEW TRIGGERED: ${uncertaintyReason}`);

      return {
        decision: 'HUMAN_REVIEW_REQUIRED',
        confidence,
        evidence,
        reason: uncertaintyReason,
        uncertaintyReason,
      };
    }

    if (isPipelineCrashed && isOwnerless && isUnadopted && ageInHours >= reviewThresholdHours && metricsCount === 0) {
      decision = 'VERIFIED_ORPHAN';
      confidence = 0.98;
      evidence.push('Pipeline crashed, no active owner, stale heartbeat, zero workload, no adoption');
    } else {
      decision = 'ORPHAN_CANDIDATE';
      confidence = 0.85;
      evidence.push('Candidate for orphan cleanup; pending safety verification');
    }

    return {
      decision,
      confidence,
      evidence,
      reason: `Evaluated decision: ${decision}`,
    };
  }
}

module.exports = new DetectionEngine();

