const resourceRepository = require('../repositories/resourceRepository');
const pipelineRepository = require('../repositories/pipelineRepository');
const policyRepository = require('../repositories/policyRepository');
const dependencyEngine = require('../dependencies/dependencyEngine');
const detectionEngine = require('../detection/detectionEngine');

const evaluateResourceDetection = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const orgId = req.user.organizationId;

    const resource = await resourceRepository.findByResourceId(orgId, resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: `Resource '${resourceId}' not found.` },
      });
    }

    const [pipelineRun, policy, adoptionSafety] = await Promise.all([
      resource.runId ? pipelineRepository.findRunById(orgId, resource.runId) : null,
      policyRepository.getPolicy(orgId),
      dependencyEngine.evaluateAdoptionSafety(orgId, resourceId),
    ]);

    const evaluation = detectionEngine.evaluateResource(resource, pipelineRun, policy, adoptionSafety);

    // Update resource detection state in database
    await resourceRepository.updateState(orgId, resourceId, {
      state: evaluation.decision,
      detectionState: {
        decision: evaluation.decision,
        evidence: evaluation.evidence,
        confidence: evaluation.confidence,
        evaluatedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        resourceId,
        evaluation,
      },
    });
  } catch (error) {
    next(error);
  }
};

const syncAWSCloud = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const region = req.body.region || process.env.AWS_REGION || 'us-east-1';

    const syncResult = await detectionEngine.ingestAWSCloudResources(orgId, region);

    res.status(200).json({
      success: true,
      message: `AWS EC2 Cloud SDK Ingestion completed via ${syncResult.source}.`,
      data: syncResult,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { evaluateResourceDetection, syncAWSCloud };

