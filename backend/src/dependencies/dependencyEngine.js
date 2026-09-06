const resourceRepository = require('../repositories/resourceRepository');
const pipelineRepository = require('../repositories/pipelineRepository');

class DependencyEngine {
  async evaluateAdoptionSafety(organizationId, resourceId) {
    const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
    if (!resource) return { isAdopted: false, isProtected: false };

    if (resource.adoption?.isAdopted) {
      const adoptingRunId = resource.adoption.adoptedByRunId;
      if (adoptingRunId) {
        const run = await pipelineRepository.findRunById(organizationId, adoptingRunId);
        if (run && (run.status === 'ACTIVE' || run.status === 'RUNNING')) {
          return {
            isAdopted: true,
            adoptingRunId,
            isProtected: true,
            reason: `Resource adopted by active pipeline run '${adoptingRunId}'`,
          };
        }
      }
      return {
        isAdopted: true,
        adoptingRunId,
        isProtected: true,
        reason: 'Resource has active adoption status recorded',
      };
    }

    // Check if any child resource is active or adopted
    if (resource.childResourceIds && resource.childResourceIds.length > 0) {
      for (const childId of resource.childResourceIds) {
        const child = await resourceRepository.findByResourceId(organizationId, childId);
        if (child && (child.state === 'ACTIVE' || child.state === 'PROTECTED' || child.adoption?.isAdopted)) {
          return {
            isAdopted: false,
            hasActiveChild: true,
            activeChildId: childId,
            isProtected: true,
            reason: `Parent resource has active/adopted child resource '${childId}'`,
          };
        }
      }
    }

    return { isAdopted: false, isProtected: false };
  }
}

module.exports = new DependencyEngine();
