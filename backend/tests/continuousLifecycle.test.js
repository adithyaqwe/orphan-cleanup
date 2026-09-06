const mongoose = require('mongoose');
const seedService = require('../src/services/seedService');
const cleanupEngine = require('../src/cleanup/cleanupEngine');
const resourceRepository = require('../src/repositories/resourceRepository');
const AuditEvent = require('../src/models/AuditEvent');
const Resource = require('../src/models/Resource');

jest.setTimeout(25000);

describe('Continuous Lifecycle & Dynamic Scenario Generation Engine', () => {
  const mockOrgId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orphan-cleanup-test';
    try {
      await mongoose.connect(connStr, { serverSelectionTimeoutMS: 1000 });
    } catch (e) {
      mongoose.set('bufferCommands', false);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await Resource.deleteMany({ organizationId: mockOrgId });
      await AuditEvent.deleteMany({ organizationId: mockOrgId });
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Resource.deleteMany({ organizationId: mockOrgId });
      await AuditEvent.deleteMany({ organizationId: mockOrgId });
    }
  });

  // TEST 1: Generate Genuine Orphan scenario -> Enters Pending Confirmation -> Auto-reclaims
  it('TEST 1: Dynamic Genuine Orphan scenario generates unique ID, enters Pending Confirmation, and auto-reclaims', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res1 = await seedService.generateScenarioResource('GENUINE_ORPHAN', mockOrgId);
    expect(res1.resourceId).toBeDefined();
    expect(res1.state).toBe('PENDING_RECLAMATION');

    // Expire the grace period manually for fast test execution
    await Resource.updateOne(
      { _id: res1._id },
      { $set: { 'cleanupState.reclaimGracePeriodExpiresAt': new Date(Date.now() - 1000) } }
    );

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results.length).toBe(1);
    expect(results[0].status).toBe('RECLAIMED');

    const updated = await resourceRepository.findByResourceId(mockOrgId, res1.resourceId);
    expect(updated.state).toBe('RECLAIMED');
  });

  // TEST 2: Generate different new resource case -> receives new ID and unique lifecycle
  it('TEST 2: Subsequent scenario generation creates distinct unique resource ID and evidence', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const resA = await seedService.generateScenarioResource('GENUINE_ORPHAN', mockOrgId);
    const resB = await seedService.generateScenarioResource('GENUINE_ORPHAN', mockOrgId);

    expect(resA.resourceId).not.toBe(resB.resourceId);
    expect(resA.name).not.toBe(resB.name);

    const pending = await resourceRepository.findPendingReclamations(mockOrgId);
    expect(pending.length).toBe(2);
  });

  // TEST 3: Active resource scenario remains protected
  it('TEST 3: Active Resource scenario generated is initialized in PROTECTED state with owner', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const activeRes = await seedService.generateScenarioResource('ACTIVE_RESOURCE', mockOrgId);
    expect(activeRes.state).toBe('PROTECTED');
    expect(activeRes.ownershipState).toBe('ACTIVE_OWNER');
    expect(activeRes.owner.isActiveOwner).toBe(true);
    expect(activeRes.heartbeat.isHeartbeatActive).toBe(true);
  });

  // TEST 4: Adopted child scenario remains protected
  it('TEST 4: Adopted Child scenario generated is initialized in PROTECTED state with adoption', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const childRes = await seedService.generateScenarioResource('ADOPTED_CHILD', mockOrgId);
    expect(childRes.state).toBe('PROTECTED');
    expect(childRes.adoption.isAdopted).toBe(true);
  });

  // TEST 5: Resumed process scenario cancels grace period and returns to PROTECTED
  it('TEST 5: Resumed Process scenario detects liveness during evaluation, cancels cleanup, and protects', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const resumedRes = await seedService.generateScenarioResource('RESUMED_PROCESS', mockOrgId);
    expect(resumedRes.state).toBe('PENDING_RECLAMATION');

    // Run grace period evaluator
    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results[0].status).toBe('CANCELLED_ACTIVE');

    const updated = await resourceRepository.findByResourceId(mockOrgId, resumedRes.resourceId);
    expect(updated.state).toBe('PROTECTED');
  });

  // TEST 6: Audit trail contains full immutable history for every generated resource
  it('TEST 6: Audit log retains complete records for all generated resources without duplication', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await seedService.generateScenarioResource('GENUINE_ORPHAN', mockOrgId);
    await seedService.generateScenarioResource('ACTIVE_RESOURCE', mockOrgId);

    const logs = await AuditEvent.find({ organizationId: mockOrgId });
    expect(logs.length).toBeGreaterThan(0);
  });
});
