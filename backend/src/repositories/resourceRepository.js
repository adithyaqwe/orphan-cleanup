const Resource = require('../models/Resource');

class ResourceRepository {
  async findByResourceId(organizationId, resourceId) {
    return Resource.findOne({ organizationId, resourceId });
  }

  async findAll(organizationId, filters = {}, options = {}) {
    const query = { organizationId, ...filters };
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [resources, total] = await Promise.all([
      Resource.find(query).sort({ creationTime: -1 }).skip(skip).limit(limit),
      Resource.countDocuments(query),
    ]);

    return {
      resources,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(resourceData) {
    return Resource.create(resourceData);
  }

  async updateState(organizationId, resourceId, updates) {
    const hasOperator = updates && typeof updates === 'object' && Object.keys(updates).some(k => k.startsWith('$'));
    const updateDoc = hasOperator ? updates : { $set: updates };
    return Resource.findOneAndUpdate(
      { organizationId, resourceId },
      updateDoc,
      { new: true, runValidators: true }
    );
  }

  async findPendingReclamations(organizationId) {
    return Resource.find({
      organizationId,
      state: 'PENDING_RECLAMATION',
    });
  }

  async deleteManyByOrg(organizationId) {
    return Resource.deleteMany({ organizationId });
  }
}

module.exports = new ResourceRepository();
