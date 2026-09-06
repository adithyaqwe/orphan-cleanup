const resourceRepository = require('../repositories/resourceRepository');

class ResourceService {
  async getResources(organizationId, query = {}) {
    const filters = {};

    if (query.state) filters.state = query.state;
    if (query.provider) filters.provider = query.provider;
    if (query.environment) filters.environment = query.environment;
    if (query.type) filters.type = query.type;
    if (query.search && typeof query.search === 'string') {
      const sanitizedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filters.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { resourceId: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    return resourceRepository.findAll(organizationId, filters, {
      page: query.page,
      limit: query.limit,
    });
  }

  async getResourceById(organizationId, resourceId) {
    const resource = await resourceRepository.findByResourceId(organizationId, resourceId);
    if (!resource) {
      throw { status: 404, code: 'RESOURCE_NOT_FOUND', message: `Resource '${resourceId}' was not found.` };
    }
    return resource;
  }

  async getResourceLifecycle(organizationId, resourceId) {
    const resource = await this.getResourceById(organizationId, resourceId);
    return {
      resourceId: resource.resourceId,
      name: resource.name,
      state: resource.state,
      creationTime: resource.creationTime,
      lifecycleHistory: resource.lifecycleHistory,
      heartbeat: resource.heartbeat,
      activity: resource.activity,
      adoption: resource.adoption,
      detectionState: resource.detectionState,
    };
  }
}

module.exports = new ResourceService();
