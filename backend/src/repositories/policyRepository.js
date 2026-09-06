const Policy = require('../models/Policy');

class PolicyRepository {
  async getPolicy(organizationId) {
    let policy = await Policy.findOne({ organizationId });
    if (!policy) {
      policy = await Policy.create({ organizationId });
    }
    return policy;
  }

  async updatePolicy(organizationId, updates) {
    return Policy.findOneAndUpdate(
      { organizationId },
      { $set: updates },
      { new: true, upsert: true }
    );
  }
}

module.exports = new PolicyRepository();
