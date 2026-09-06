const resourceRepository = require('../repositories/resourceRepository');
const pipelineRepository = require('../repositories/pipelineRepository');

const getDependencyGraph = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const [resourcesResult, pipelines, runsResult] = await Promise.all([
      resourceRepository.findAll(orgId, {}, { limit: 100 }),
      pipelineRepository.findAllPipelines(orgId),
      pipelineRepository.findAllRuns(orgId, {}, { limit: 100 }),
    ]);

    const resources = resourcesResult.resources;
    const runs = runsResult.runs || [];

    const nodes = [];
    const edges = [];

    // Pipeline Nodes
    pipelines.forEach((p, idx) => {
      nodes.push({
        id: `pipeline-${p.pipelineId}`,
        type: 'pipelineNode',
        data: { label: p.name, provider: p.provider, pipelineId: p.pipelineId },
        position: { x: 50, y: 100 + idx * 120 },
      });
    });

    // Pipeline Run Nodes
    runs.forEach((r, idx) => {
      nodes.push({
        id: `run-${r.runId}`,
        type: 'runNode',
        data: { label: `Run: ${r.runId}`, status: r.status, owner: r.owner?.name || 'No Owner' },
        position: { x: 300, y: 50 + idx * 100 },
      });

      if (r.pipelineId) {
        edges.push({
          id: `e-pipe-run-${r.runId}`,
          source: `pipeline-${r.pipelineId}`,
          target: `run-${r.runId}`,
          animated: r.status === 'ACTIVE',
        });
      }
    });

    // Resource Nodes
    resources.forEach((resItem, idx) => {
      nodes.push({
        id: `res-${resItem.resourceId}`,
        type: 'resourceNode',
        data: {
          label: resItem.name,
          resourceId: resItem.resourceId,
          type: resItem.type,
          state: resItem.state,
          isAdopted: resItem.adoption?.isAdopted,
        },
        position: { x: 600, y: 50 + idx * 110 },
      });

      // Pipeline Run -> Resource ownership edge
      if (resItem.runId) {
        edges.push({
          id: `e-run-res-${resItem.resourceId}`,
          source: `run-${resItem.runId}`,
          target: `res-${resItem.resourceId}`,
          label: 'owns',
        });
      }

      // Parent -> Child relationship edge
      if (resItem.parentResourceId) {
        edges.push({
          id: `e-parent-child-${resItem.resourceId}`,
          source: `res-${resItem.parentResourceId}`,
          target: `res-${resItem.resourceId}`,
          label: 'parent-of',
          style: { stroke: '#94a3b8' },
        });
      }

      // Adoption edge
      if (resItem.adoption?.isAdopted && resItem.adoption?.adoptedByRunId) {
        edges.push({
          id: `e-adoption-${resItem.resourceId}`,
          source: `run-${resItem.adoption.adoptedByRunId}`,
          target: `res-${resItem.resourceId}`,
          label: 'ADOPTED_BY',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 },
        });
      }
    });

    res.status(200).json({
      success: true,
      data: { nodes, edges },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDependencyGraph };
