const mongoose = require('mongoose');

const pipelineRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  pipelineId: {
    type: String,
    required: true,
    ref: 'Pipeline',
    index: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RUNNING', 'COMPLETED', 'FAILED', 'CRASHED', 'CANCELLED', 'STALE'],
    default: 'ACTIVE',
    required: true,
    index: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  owner: {
    email: String,
    userId: String,
    name: String,
    isActiveOwner: { type: Boolean, default: true },
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  adoptedResourceIds: [{
    type: String,
    trim: true,
  }],
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('PipelineRun', pipelineRunSchema);
