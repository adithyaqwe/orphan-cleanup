const request = require('supertest');
const app = require('../src/server');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Resource = require('../src/models/Resource');
const AuditEvent = require('../src/models/AuditEvent');
const detectionEngine = require('../src/detection/detectionEngine');
const safetyEngine = require('../src/security/safetyEngine');
const cleanupEngine = require('../src/cleanup/cleanupEngine');

jest.setTimeout(15000);

describe('Human-in-the-Loop Safety Fallback System', () => {
  let adminToken, operatorToken, viewerToken;
  let adminUser, operatorUser, viewerUser, org;

  beforeAll(async () => {
    mongoose.set('bufferCommands', false);
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orphan-cleanup-test';
    try {
      await mongoose.connect(connStr, { serverSelectionTimeoutMS: 2000 });
    } catch (e) {
      console.warn('MongoDB not reachable for test, running offline mode');
    }

    // Setup test organization & users
    org = await Organization.create({ name: 'Human Review Test Org', slug: `test-hr-${Date.now()}` });

    adminUser = await User.create({
      email: `admin-hr-${Date.now()}@test.internal`,
      password: 'Password123!',
      name: 'Admin HR',
      role: 'ADMIN',
      organizationId: org._id,
    });

    operatorUser = await User.create({
      email: `operator-hr-${Date.now()}@test.internal`,
      password: 'Password123!',
      name: 'Operator HR',
      role: 'OPERATOR',
      organizationId: org._id,
    });

    viewerUser = await User.create({
      email: `viewer-hr-${Date.now()}@test.internal`,
      password: 'Password123!',
      name: 'Viewer HR',
      role: 'VIEWER',
      organizationId: org._id,
    });

    // Obtain JWT tokens via login endpoint
    const adminRes = await request(app).post('/api/auth/login').send({ email: adminUser.email, password: 'Password123!' });
    adminToken = adminRes.headers['set-cookie'] || adminRes.body.data.token;

    const operatorRes = await request(app).post('/api/auth/login').send({ email: operatorUser.email, password: 'Password123!' });
    operatorToken = operatorRes.headers['set-cookie'] || operatorRes.body.data.token;

    const viewerRes = await request(app).post('/api/auth/login').send({ email: viewerUser.email, password: 'Password123!' });
    viewerToken = viewerRes.headers['set-cookie'] || viewerRes.body.data.token;
  });

  afterAll(async () => {
    if (org) {
      await Promise.all([
        User.deleteMany({ organizationId: org._id }),
        Resource.deleteMany({ organizationId: org._id }),
        Organization.deleteOne({ _id: org._id }),
        AuditEvent.deleteMany({ organizationId: org._id }),
      ]);
    }
  });

  // SCENARIO 1: Clearly active resource -> PROTECTED automatically
  test('Scenario 1: Clearly active resource evaluates to PROTECTED automatically', async () => {
    const activeRes = await Resource.create({
      resourceId: `res-active-${Date.now()}`,
      name: 'active-test-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 20 * 3600 * 1000),
      state: 'ACTIVE',
      owner: { email: 'dev@test.internal', name: 'Active Dev', isActiveOwner: true },
      ownershipState: 'ACTIVE_OWNER',
      activity: { lastActivityTime: new Date(), metricsCount: 1500 },
      heartbeat: { lastHeartbeatTime: new Date(), isHeartbeatActive: true },
      organizationId: org._id,
    });

    const evalResult = detectionEngine.evaluateResource(activeRes);
    expect(evalResult.decision).toBe('PROTECTED');
    expect(evalResult.confidence).toBeGreaterThanOrEqual(0.90);
  });

  // SCENARIO 2: Clearly orphaned resource -> normal grace period and safe cleanup
  test('Scenario 2: Clearly orphaned resource evaluates to VERIFIED_ORPHAN for normal grace period', async () => {
    const orphanRes = await Resource.create({
      resourceId: `res-orphan-${Date.now()}`,
      name: 'orphan-test-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 20 * 3600 * 1000),
      state: 'ORPHAN_CANDIDATE',
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: new Date(Date.now() - 20 * 3600 * 1000), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: new Date(Date.now() - 20 * 3600 * 1000), isHeartbeatActive: false },
      organizationId: org._id,
    });

    const evalResult = detectionEngine.evaluateResource(orphanRes);
    expect(evalResult.decision).toBe('VERIFIED_ORPHAN');
    expect(evalResult.confidence).toBeGreaterThanOrEqual(0.95);
  });

  // SCENARIO 3: Conflicting evidence -> HUMAN_REVIEW_REQUIRED
  test('Scenario 3: Conflicting evidence triggers HUMAN_REVIEW_REQUIRED', async () => {
    const conflictRes = await Resource.create({
      resourceId: `res-conflict-${Date.now()}`,
      name: 'conflicting-evidence-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'ORPHAN_CANDIDATE',
      owner: { email: 'unconfirmed@test.internal', name: 'Unconfirmed Dev', isActiveOwner: false },
      ownershipState: 'UNCONFIRMED_OWNER',
      activity: { lastActivityTime: new Date(), metricsCount: 15 }, // low non-zero workload activity
      heartbeat: { lastHeartbeatTime: new Date(Date.now() - 18 * 3600 * 1000), isHeartbeatActive: false },
      organizationId: org._id,
    });

    const evalResult = detectionEngine.evaluateResource(conflictRes);
    expect(evalResult.decision).toBe('HUMAN_REVIEW_REQUIRED');
    expect(evalResult.confidence).toBeLessThan(0.90);
  });

  // SCENARIO 4: AI says RECLAIM but safety engine detects active usage -> block cleanup
  test('Scenario 4: AI says RECLAIM but deterministic safety engine BLOCKS cleanup on active usage', async () => {
    const activeWithAiReclaim = await Resource.create({
      resourceId: `res-ai-reclaim-conflict-${Date.now()}`,
      name: 'active-ai-conflict-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'ACTIVE',
      owner: { email: 'lead@test.internal', name: 'Lead Developer', isActiveOwner: true },
      ownershipState: 'ACTIVE_OWNER',
      activity: { lastActivityTime: new Date(), metricsCount: 200 },
      heartbeat: { lastHeartbeatTime: new Date(), isHeartbeatActive: true },
      detectionState: {
        aiRecommendation: { decision: 'RECLAIM', recommendedAction: 'RECLAIM', reasoningSummary: 'Incorrect AI recommendation' },
      },
      organizationId: org._id,
    });

    const safetyResult = await safetyEngine.verifyReclaimSafety(org._id, activeWithAiReclaim.resourceId, activeWithAiReclaim.detectionState.aiRecommendation);
    expect(safetyResult.isSafe).toBe(false);
    expect(safetyResult.blockReason).toContain('active owner');
  });

  // SCENARIO 5: AI says PROTECT but deterministic evidence confirms orphan -> follow safety rules
  test('Scenario 5: AI says PROTECT but deterministic signals confirm orphan -> follow deterministic safety rules', async () => {
    const orphanWithAiProtect = await Resource.create({
      resourceId: `res-ai-protect-orphan-${Date.now()}`,
      name: 'orphan-ai-protect-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 24 * 3600 * 1000),
      state: 'VERIFIED_ORPHAN',
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: new Date(Date.now() - 24 * 3600 * 1000), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: new Date(Date.now() - 24 * 3600 * 1000), isHeartbeatActive: false },
      detectionState: {
        aiRecommendation: { decision: 'PROTECT', recommendedAction: 'PROTECT', reasoningSummary: 'AI caution' },
      },
      organizationId: org._id,
    });

    const safetyResult = await safetyEngine.verifyReclaimSafety(org._id, orphanWithAiProtect.resourceId, orphanWithAiProtect.detectionState.aiRecommendation);
    expect(safetyResult.isSafe).toBe(true);
  });

  // SCENARIO 6: Resource becomes active while awaiting human review -> cancel/block reclaim
  test('Scenario 6: Resource becomes active while awaiting human review -> automatically block/cancel reclaim', async () => {
    const hrRes = await Resource.create({
      resourceId: `res-hr-became-active-${Date.now()}`,
      name: 'human-review-becoming-active-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'HUMAN_REVIEW_REQUIRED',
      owner: { email: 'active-user@test.internal', name: 'Resumed User', isActiveOwner: true },
      ownershipState: 'ACTIVE_OWNER',
      activity: { lastActivityTime: new Date(), metricsCount: 120 },
      heartbeat: { lastHeartbeatTime: new Date(), isHeartbeatActive: true },
      organizationId: org._id,
    });

    const approveResult = await cleanupEngine.approveHumanReviewReclaim(operatorUser, hrRes.resourceId, 'Operator clicked approve');
    expect(approveResult.success).toBe(false);
    expect(approveResult.code).toBe('RECLAIM_BLOCKED_ACTIVE_SIGNAL');

    const updatedRes = await Resource.findOne({ resourceId: hrRes.resourceId });
    expect(updatedRes.state).toBe('PROTECTED');
  });

  // SCENARIO 7: Operator approves reclaim -> final safety check still runs
  test('Scenario 7: Operator approves reclaim -> schedule two-phase reclamation and run safety check', async () => {
    const hrOrphanRes = await Resource.create({
      resourceId: `res-hr-approve-reclaim-${Date.now()}`,
      name: 'human-review-approve-orphan-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'HUMAN_REVIEW_REQUIRED',
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: new Date(Date.now() - 18 * 3600 * 1000), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: new Date(Date.now() - 18 * 3600 * 1000), isHeartbeatActive: false },
      organizationId: org._id,
    });

    const approveResult = await cleanupEngine.approveHumanReviewReclaim(operatorUser, hrOrphanRes.resourceId, 'Operator authorized reclaim');
    expect(approveResult.success).toBe(true);
    expect(approveResult.gracePeriodSeconds).toBe(300);

    const updatedRes = await Resource.findOne({ resourceId: hrOrphanRes.resourceId });
    expect(updatedRes.state).toBe('PENDING_RECLAMATION');
  });

  // SCENARIO 8: Operator protects resource -> cleanup cancelled
  test('Scenario 8: Operator protects resource -> state changes to PROTECTED', async () => {
    const hrProtectRes = await Resource.create({
      resourceId: `res-hr-protect-choice-${Date.now()}`,
      name: 'human-review-protect-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'HUMAN_REVIEW_REQUIRED',
      owner: { email: 'qa@test.internal', name: 'QA Team', isActiveOwner: true },
      ownershipState: 'UNCONFIRMED_OWNER',
      activity: { lastActivityTime: new Date(), metricsCount: 10 },
      organizationId: org._id,
    });

    const protectResult = await cleanupEngine.protectHumanReviewResource(operatorUser, hrProtectRes.resourceId, 'Keep for QA testing');
    expect(protectResult.success).toBe(true);

    const updatedRes = await Resource.findOne({ resourceId: hrProtectRes.resourceId });
    expect(updatedRes.state).toBe('PROTECTED');
  });

  // SCENARIO 9: VIEWER attempts approval -> reject with authorization error (403)
  test('Scenario 9: VIEWER role attempt to approve human review -> returns 403 Forbidden', async () => {
    const hrResForViewer = await Resource.create({
      resourceId: `res-hr-viewer-test-${Date.now()}`,
      name: 'human-review-viewer-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'HUMAN_REVIEW_REQUIRED',
      organizationId: org._id,
    });

    const res = await request(app)
      .post(`/api/cleanup/human-review/${hrResForViewer.resourceId}/approve-reclaim`)
      .set('Cookie', viewerToken)
      .send({ reason: 'Viewer trying to approve' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // SCENARIO 10: Two operators attempt decisions simultaneously -> concurrency lock handles cleanly
  test('Scenario 10: Simultaneous operator decisions handled cleanly via concurrency lock / state check', async () => {
    const hrResForConcurrency = await Resource.create({
      resourceId: `res-hr-concurrency-${Date.now()}`,
      name: 'human-review-concurrency-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'HUMAN_REVIEW_REQUIRED',
      organizationId: org._id,
    });

    // First operator protects
    const firstRes = await cleanupEngine.protectHumanReviewResource(adminUser, hrResForConcurrency.resourceId, 'Operator 1 protected first');
    expect(firstRes.success).toBe(true);

    // Second operator attempts to approve reclaim on the already decided resource
    const secondRes = await cleanupEngine.approveHumanReviewReclaim(operatorUser, hrResForConcurrency.resourceId, 'Operator 2 attempting second');
    expect(secondRes.success).toBe(false);
    expect(secondRes.code).toBe('ALREADY_DECIDED');
  });

  // SCENARIO 11: Every human decision appears in the audit history
  test('Scenario 11: Human decisions recorded in immutable AuditEvent history', async () => {
    const hrAuditRes = await Resource.create({
      resourceId: `res-hr-audit-test-${Date.now()}`,
      name: 'human-review-audit-server',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      creationTime: new Date(Date.now() - 18 * 3600 * 1000),
      state: 'HUMAN_REVIEW_REQUIRED',
      organizationId: org._id,
    });

    await cleanupEngine.protectHumanReviewResource(adminUser, hrAuditRes.resourceId, 'Protected during audit verification test');

    const auditLogs = await AuditEvent.find({ resourceId: hrAuditRes.resourceId, organizationId: org._id });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toBe('HUMAN_REVIEW_PROTECTED');
    expect(auditLogs[0].actorEmail).toBe(adminUser.email);
    expect(auditLogs[0].actorRole).toBe('ADMIN');
  });
});
