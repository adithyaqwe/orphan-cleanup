const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
  },
  reviewThresholdHours: {
    type: Number,
    default: 12,
  },
  heartbeatFreshnessMinutes: {
    type: Number,
    default: 15,
  },
  autoReclaimEnabled: {
    type: Boolean,
    default: false,
  },
  protectedEnvironments: {
    type: [String],
    default: ['production'],
  },
  protectedResourceTypes: {
    type: [String],
    default: ['RDS_DATABASE'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Policy', policySchema);
