const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  actorId: {
    type: String,
    required: true,
  },
  actorEmail: {
    type: String,
    required: true,
  },
  actorRole: {
    type: String,
    enum: ['ADMIN', 'OPERATOR', 'VIEWER', 'SYSTEM'],
    required: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
    index: true,
  },
  result: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'BLOCKED', 'OVERRIDDEN', 'REVERSED', 'CANCELLED'],
    required: true,
  },
  reason: {
    type: String,
  },
  evidence: [String],
  details: mongoose.Schema.Types.Mixed,
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
