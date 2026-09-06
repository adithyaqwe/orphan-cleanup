const AuditEvent = require('../models/AuditEvent');

class AuditRepository {
  async log(eventData) {
    return AuditEvent.create(eventData);
  }

  async findAll(organizationId, filters = {}, options = {}) {
    const query = { organizationId, ...filters };
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      AuditEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditEvent.countDocuments(query),
    ]);

    return {
      events,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async deleteManyByOrg(organizationId) {
    return AuditEvent.deleteMany({ organizationId });
  }
}

module.exports = new AuditRepository();
