const mongoose = require('mongoose');

const lifecycleEventSchema = new mongoose.Schema({
  event: String,
  timestamp: { type: Date, default: Date.now },
  actor: String,
  details: mongoose.Schema.Types.Mixed,
}, { _id: false });

const resourceSchema = new mongoose.Schema({
  resourceId: {
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
  provider: {
    type: String,
    enum: ['AWS', 'AZURE', 'GCP', 'SIMULATED'],
    default: 'SIMULATED',
  },
  type: {
    type: String,
    enum: ['EC2_INSTANCE', 'RDS_DATABASE', 'S3_BUCKET', 'K8S_POD', 'PREVIEW_ENV', 'CONTAINER', 'SIMULATED_SERVER'],
    default: 'SIMULATED_SERVER',
  },
  environment: {
    type: String,
    default: 'testing',
  },
  creationTime: {
    type: Date,
    default: Date.now,
    index: true,
  },
  state: {
    type: String,
    enum: ['ACTIVE', 'PROTECTED', 'ORPHAN_CANDIDATE', 'VERIFIED_ORPHAN', 'PENDING_RECLAMATION', 'NEEDS_REVIEW', 'HUMAN_REVIEW_REQUIRED', 'RECLAIMED', 'CLEANUP_FAILED'],
    default: 'ACTIVE',
    index: true,
  },
  pipelineId: {
    type: String,
    index: true,
  },
  runId: {
    type: String,
    index: true,
  },
  owner: {
    email: String,
    name: String,
    isActiveOwner: { type: Boolean, default: true },
  },
  ownershipState: {
    type: String,
    enum: ['ACTIVE_OWNER', 'NO_OWNER', 'UNCLAIMED', 'UNCONFIRMED_OWNER'],
    default: 'ACTIVE_OWNER',
  },
  activity: {
    lastActivityTime: Date,
    metricsCount: { type: Number, default: 0 },
  },
  heartbeat: {
    lastHeartbeatTime: Date,
    isHeartbeatActive: { type: Boolean, default: false },
  },
  parentResourceId: {
    type: String,
    default: null,
  },
  childResourceIds: [{
    type: String,
  }],
  dependencies: [{
    resourceId: String,
    relationship: String,
  }],
  adoption: {
    isAdopted: { type: Boolean, default: false, index: true },
    adoptedByRunId: { type: String, default: null },
    adoptedAt: { type: Date, default: null },
  },
  lifecycleHistory: [lifecycleEventSchema],
  detectionState: {
    decision: String,
    evidence: [String],
    confidence: Number,
    evaluatedAt: Date,
    aiRecommendation: mongoose.Schema.Types.Mixed,
  },
  humanReviewState: {
    reason: String,
    uncertaintyEvidence: [String],
    raisedAt: Date,
    decision: { type: String, enum: ['PENDING', 'PROTECTED', 'RECLAIM_APPROVED'], default: 'PENDING' },
    decidedBy: String,
    decidedAt: Date,
    decisionReason: String,
  },
  cleanupState: {
    reclaimedAt: Date,
    reclaimedBy: String,
    reclaimScheduledAt: Date,
    reclaimGracePeriodExpiresAt: Date,
    gracePeriodSeconds: Number,
    reversalReason: String,
    automatic: { type: Boolean, default: false },
    failureReason: String,
    reason: String,
    status: { type: String, enum: ['NOT_RECLAIMED', 'PENDING_RECLAMATION', 'RECLAIMED', 'FAILED', 'CLEANUP_FAILED'], default: 'NOT_RECLAIMED' },
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  tags: {
    type: Map,
    of: String,
  },
}, { timestamps: true });

// Compound indexes for querying
resourceSchema.index({ organizationId: 1, state: 1 });
resourceSchema.index({ organizationId: 1, creationTime: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
