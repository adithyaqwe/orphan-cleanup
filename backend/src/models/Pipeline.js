const mongoose = require('mongoose');

const pipelineSchema = new mongoose.Schema({
  pipelineId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  repository: {
    type: String,
    trim: true,
  },
  provider: {
    type: String,
    enum: ['AWS', 'AZURE', 'GCP', 'GITHUB_ACTIONS', 'GITLAB_CI', 'SIMULATED'],
    default: 'SIMULATED',
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Pipeline', pipelineSchema);
