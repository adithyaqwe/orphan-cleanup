const resourceRepository = require('../repositories/resourceRepository');
const pipelineRepository = require('../repositories/pipelineRepository');
const aiService = require('../ai/aiService');

const analyzeResourceWithAI = async (req, res, next) => {
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

    const pipelineRun = resource.runId ? await pipelineRepository.findRunById(orgId, resource.runId) : null;

    const ageHours = (Date.now() - new Date(resource.creationTime).getTime()) / (1000 * 60 * 60);

    const evidencePayload = {
      name: resource.name,
      type: resource.type,
      ageHours: ageHours.toFixed(1),
      pipelineStatus: pipelineRun ? pipelineRun.status : 'UNKNOWN',
      owner: resource.owner,
      isHeartbeatActive: resource.heartbeat?.isHeartbeatActive || false,
      metricsCount: resource.activity?.metricsCount || 0,
      isAdopted: resource.adoption?.isAdopted || false,
      tags: resource.tags ? Object.fromEntries(resource.tags) : {},
    };

    const aiResult = await aiService.analyzeResource(evidencePayload);

    // Save AI analysis result to resource document
    await resourceRepository.updateState(orgId, resourceId, {
      'detectionState.aiRecommendation': aiResult.analysis,
    });

    res.status(200).json({
      success: true,
      data: aiResult,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyzeResourceWithAI };
