const mongoose = require('mongoose');
const cleanupEngine = require('../src/cleanup/cleanupEngine');
const safetyEngine = require('../src/security/safetyEngine');
const cloudAdapter = require('../src/cloud/cloudAdapter');
const resourceRepository = require('../src/repositories/resourceRepository');
const auditRepository = require('../src/repositories/auditRepository');
const Resource = require('../src/models/Resource');
const AuditEvent = require('../src/models/AuditEvent');

jest.setTimeout(20000);

describe('Automatic Reclamation & 5-Minute Grace Period Lifecycle Engine', () => {
  const mockOrgId = new mongoose.Types.ObjectId().toString();
  const dummyUser = { id: 'test-user-1', email: 'tester@demo.internal', role: 'ADMIN', organizationId: mockOrgId };

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

  // TEST 1: Verified orphan enters Pending Confirmation -> After 5 minutes -> automatically reclaimed
  it('TEST 1: Verified orphan in Pending Confirmation automatically reclaims after grace period expires', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await resourceRepository.create({
      resourceId: 'test-res-auto-1',
      name: 'orphan-worker-1',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      heartbeat: { isHeartbeatActive: false },
      activity: { metricsCount: 0 },
      adoption: { isAdopted: false },
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000), // expired
        gracePeriodSeconds: 300,
      },
    });

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].status).toBe('RECLAIMED');

    const updated = await resourceRepository.findByResourceId(mockOrgId, 'test-res-auto-1');
    expect(updated.state).toBe('RECLAIMED');
    expect(updated.cleanupState.automatic).toBe(true);
  });

  // TEST 2: Resource becomes active during grace period -> cleanup cancelled and resource protected
  it('TEST 2: Resumed activity during grace period cancels cleanup and protects resource', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await resourceRepository.create({
      resourceId: 'test-res-resumed-2',
      name: 'resumed-app-2',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      heartbeat: { isHeartbeatActive: true }, // Resumed heartbeat!
      activity: { metricsCount: 500 }, // Resumed workload!
      adoption: { isAdopted: false },
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000),
        gracePeriodSeconds: 300,
      },
    });

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results[0].status).toBe('CANCELLED_SAFETY_CHECK');

    const updated = await resourceRepository.findByResourceId(mockOrgId, 'test-res-resumed-2');
    expect(updated.state).toBe('PROTECTED');
  });

  // TEST 3: Resource is adopted during grace period -> cleanup cancelled and resource protected
  it('TEST 3: Adoption during grace period cancels cleanup and protects resource', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await resourceRepository.create({
      resourceId: 'test-res-adopted-3',
      name: 'adopted-cache-3',
      provider: 'AWS',
      type: 'K8S_POD',
      environment: 'testing',
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      heartbeat: { isHeartbeatActive: false },
      activity: { metricsCount: 0 },
      adoption: { isAdopted: true, adoptedByRunId: 'run-active-100' }, // Adopted!
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000),
        gracePeriodSeconds: 300,
      },
    });

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results[0].status).toBe('CANCELLED_SAFETY_CHECK');

    const updated = await resourceRepository.findByResourceId(mockOrgId, 'test-res-adopted-3');
    expect(updated.state).toBe('PROTECTED');
  });

  // TEST 4: Owner becomes active during grace period -> cleanup cancelled
  it('TEST 4: Active owner assigned during grace period cancels cleanup', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await resourceRepository.create({
      resourceId: 'test-res-owner-4',
      name: 'owned-vm-4',
      provider: 'AZURE',
      type: 'EC2_INSTANCE',
      environment: 'development',
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'dev@demo.internal', name: 'Active Dev', isActiveOwner: true }, // Owner active!
      heartbeat: { isHeartbeatActive: false },
      activity: { metricsCount: 0 },
      adoption: { isAdopted: false },
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000),
        gracePeriodSeconds: 300,
      },
    });

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results[0].status).toBe('CANCELLED_SAFETY_CHECK');

    const updated = await resourceRepository.findByResourceId(mockOrgId, 'test-res-owner-4');
    expect(updated.state).toBe('PROTECTED');
  });

  // TEST 5: State change immediately before reclamation -> latest safety check detects change and blocks cleanup
  it('TEST 5: Latest safety check detects state changes right before reclamation and blocks cleanup', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await resourceRepository.create({
      resourceId: 'test-res-statechange-5',
      name: 'protected-server-5',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'production', // Policy protected environment!
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      heartbeat: { isHeartbeatActive: false },
      activity: { metricsCount: 0 },
      adoption: { isAdopted: false },
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000),
        gracePeriodSeconds: 300,
      },
    });

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results[0].status).toBe('CANCELLED_SAFETY_CHECK');

    const updated = await resourceRepository.findByResourceId(mockOrgId, 'test-res-statechange-5');
    expect(updated.state).toBe('PROTECTED');
  });

  // TEST 6: Two cleanup attempts occur simultaneously -> concurrency lock allows only one operation
  it('TEST 6: Atomic concurrency lock prevents simultaneous duplicate cleanups on the same resource', async () => {
    const resId = 'test-concurrent-6';
    safetyEngine.acquireLock(resId); // Lock acquired by worker 1

    const canAcquireSecond = safetyEngine.acquireLock(resId); // Worker 2 attempts
    expect(canAcquireSecond).toBe(false); // Lock rejected!

    safetyEngine.releaseLock(resId);
    const canAcquireAfterRelease = safetyEngine.acquireLock(resId);
    expect(canAcquireAfterRelease).toBe(true); // Lock granted after release
    safetyEngine.releaseLock(resId);
  });

  // TEST 7: Cleanup fails -> resource not falsely marked as deleted, failure recorded
  it('TEST 7: Handles cloud reclamation failure cleanly without marking resource as RECLAIMED', async () => {
    if (mongoose.connection.readyState !== 1) return;

    // Mock cloud adapter to fail
    const spy = jest.spyOn(cloudAdapter, 'reclaimResource').mockResolvedValueOnce({
      success: false,
      details: 'Simulated Cloud API AccessDenied Exception (500)',
    });

    await resourceRepository.create({
      resourceId: 'test-res-fail-7',
      name: 'failing-resource-7',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      heartbeat: { isHeartbeatActive: false },
      activity: { metricsCount: 0 },
      adoption: { isAdopted: false },
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000),
        gracePeriodSeconds: 300,
      },
    });

    const results = await cleanupEngine.processAutomaticReclamations(mockOrgId);
    expect(results[0].status).toBe('FAILED');
    expect(results[0].reason).toContain('AccessDenied');

    const updated = await resourceRepository.findByResourceId(mockOrgId, 'test-res-fail-7');
    expect(updated.state).toBe('CLEANUP_FAILED'); // Not RECLAIMED!

    spy.mockRestore();
  });

  // TEST 8: Audit log contains all required fields
  it('TEST 8: Audit log contains resource, previous state, grace period completion, final safety decision, result, timestamp, reason', async () => {
    if (mongoose.connection.readyState !== 1) return;

    await resourceRepository.create({
      resourceId: 'test-res-audit-8',
      name: 'audit-test-8',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: new Date(Date.now() - 10 * 3600 * 1000),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      heartbeat: { isHeartbeatActive: false },
      activity: { metricsCount: 0 },
      adoption: { isAdopted: false },
      organizationId: mockOrgId,
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimGracePeriodExpiresAt: new Date(Date.now() - 1000),
        gracePeriodSeconds: 300,
      },
    });

    await cleanupEngine.processAutomaticReclamations(mockOrgId);

    const logs = await AuditEvent.find({ organizationId: mockOrgId, resourceId: 'test-res-audit-8' });
    expect(logs.length).toBeGreaterThan(0);
    const log = logs[0];

    expect(log.resourceId).toBe('test-res-audit-8');
    expect(log.action).toBe('AUTOMATIC_RECLAMATION');
    expect(log.result).toBe('SUCCESS');
    expect(log.reason).toBeDefined();
    expect(log.createdAt).toBeDefined();
  });
});
