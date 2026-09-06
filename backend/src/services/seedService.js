const Organization = require('../models/Organization');
const User = require('../models/User');
const Pipeline = require('../models/Pipeline');
const PipelineRun = require('../models/PipelineRun');
const Resource = require('../models/Resource');
const Policy = require('../models/Policy');
const AuditEvent = require('../models/AuditEvent');

class SeedService {
  async seedGoldenScenario() {
    // 1. Ensure Default Organization
    let org = await Organization.findOne({ slug: 'demo-corp' });
    if (!org) {
      org = await Organization.create({
        name: 'Demo Cloud Operations Corp',
        slug: 'demo-corp',
      });
    }

    // 2. Ensure Users (Admin, Operator, Viewer)
    let admin = await User.findOne({ email: 'admin@demo.internal' });
    if (!admin) {
      admin = await User.create({
        email: 'admin@demo.internal',
        password: 'Password123!',
        name: 'Alex Admin',
        role: 'ADMIN',
        organizationId: org._id,
      });
    }

    let operator = await User.findOne({ email: 'operator@demo.internal' });
    if (!operator) {
      operator = await User.create({
        email: 'operator@demo.internal',
        password: 'Password123!',
        name: 'Sam Operator',
        role: 'OPERATOR',
        organizationId: org._id,
      });
    }

    let viewer = await User.findOne({ email: 'viewer@demo.internal' });
    if (!viewer) {
      viewer = await User.create({
        email: 'viewer@demo.internal',
        password: 'Password123!',
        name: 'Valerie Viewer',
        role: 'VIEWER',
        organizationId: org._id,
      });
    }

    // 3. Reset existing resources, pipelines, and runs for clean demo seed
    await Promise.all([
      Resource.deleteMany({}),
      Pipeline.deleteMany({}),
      PipelineRun.deleteMany({}),
      AuditEvent.deleteMany({}),
    ]);

    // 4. Create Policy
    await Policy.findOneAndUpdate(
      { organizationId: org._id },
      {
        reviewThresholdHours: 12,
        heartbeatFreshnessMinutes: 15,
        autoReclaimEnabled: false,
        protectedEnvironments: ['production', 'staging'],
        protectedResourceTypes: ['RDS_DATABASE'],
      },
      { upsert: true }
    );

    // 5. Create Pipelines
    const pipelineCI = await Pipeline.create({
      pipelineId: 'pipe-ephemeral-builds',
      name: 'CI/CD Preview Builder Pipeline',
      repository: 'github.com/democorp/preview-builder',
      provider: 'AWS',
      organizationId: org._id,
    });

    const eighteenHoursAgo = new Date(Date.now() - 18 * 60 * 60 * 1000);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // 6. Create Pipeline Runs
    const runCrashed = await PipelineRun.create({
      runId: 'run-crashed-101',
      pipelineId: pipelineCI.pipelineId,
      status: 'CRASHED',
      startTime: eighteenHoursAgo,
      endTime: eighteenHoursAgo,
      owner: { email: null, name: null, isActiveOwner: false },
      lastHeartbeat: eighteenHoursAgo,
      lastActivity: eighteenHoursAgo,
      organizationId: org._id,
    });

    const runActive = await PipelineRun.create({
      runId: 'run-active-202',
      pipelineId: pipelineCI.pipelineId,
      status: 'ACTIVE',
      startTime: eighteenHoursAgo,
      owner: { email: 'devops@demo.internal', name: 'DevOps Lead', isActiveOwner: true },
      lastHeartbeat: twoMinutesAgo,
      lastActivity: twoMinutesAgo,
      organizationId: org._id,
    });

    const runParentCrashed = await PipelineRun.create({
      runId: 'run-crashed-parent-303',
      pipelineId: pipelineCI.pipelineId,
      status: 'CRASHED',
      startTime: eighteenHoursAgo,
      endTime: eighteenHoursAgo,
      owner: { email: null, name: null, isActiveOwner: false },
      lastHeartbeat: eighteenHoursAgo,
      lastActivity: eighteenHoursAgo,
      organizationId: org._id,
    });

    const runAdoptingActive = await PipelineRun.create({
      runId: 'run-adopting-active-404',
      pipelineId: pipelineCI.pipelineId,
      status: 'ACTIVE',
      startTime: twoMinutesAgo,
      owner: { email: 'operator@demo.internal', name: 'Sam Operator', isActiveOwner: true },
      lastHeartbeat: twoMinutesAgo,
      lastActivity: twoMinutesAgo,
      adoptedResourceIds: ['res-adopted-child-c1'],
      organizationId: org._id,
    });

    // 7. Seed Golden Scenario Resources

    // RESOURCE A: Genuine Orphan (18 hrs old, crashed pipeline, no owner, no heartbeat, no activity)
    const resourceA = await Resource.create({
      resourceId: 'res-orphan-server-a',
      name: 'preview-build-app-server-a',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'VERIFIED_ORPHAN',
      pipelineId: pipelineCI.pipelineId,
      runId: runCrashed.runId,
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: eighteenHoursAgo, metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: eighteenHoursAgo, isHeartbeatActive: false },
      parentResourceId: null,
      childResourceIds: [],
      dependencies: [],
      adoption: { isAdopted: false, adoptedByRunId: null, adoptedAt: null },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-crashed-101', details: 'Resource initialized by CI pipeline' },
        { event: 'PIPELINE_CRASHED', timestamp: eighteenHoursAgo, actor: 'SYSTEM', details: 'CI process terminated unexpectedly' },
        { event: 'DETECTION_EVALUATED', timestamp: twoMinutesAgo, actor: 'DETECTION_ENGINE', details: 'Verified orphan: Crashed pipeline, no active owner, stale heartbeat' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        evidence: [
          'Pipeline run-crashed-101 status is CRASHED',
          'No active owner assigned',
          'Last heartbeat was 18 hours ago (exceeds 15m threshold)',
          'Zero workload activity metrics recorded in past 12 hours',
          'No active dependencies or adoption records',
        ],
        confidence: 0.98,
        evaluatedAt: new Date(),
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
      organizationId: org._id,
      tags: new Map([['env', 'preview'], ['ephemeral', 'true']]),
    });

    // RESOURCE B: Legitemately Active (18 hrs old, active pipeline, active owner, active heartbeat)
    const resourceB = await Resource.create({
      resourceId: 'res-active-server-b',
      name: 'staging-api-server-b',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'PROTECTED',
      pipelineId: pipelineCI.pipelineId,
      runId: runActive.runId,
      owner: { email: 'devops@demo.internal', name: 'DevOps Lead', isActiveOwner: true },
      ownershipState: 'ACTIVE_OWNER',
      activity: { lastActivityTime: twoMinutesAgo, metricsCount: 1420 },
      heartbeat: { lastHeartbeatTime: twoMinutesAgo, isHeartbeatActive: true },
      parentResourceId: null,
      childResourceIds: [],
      dependencies: [],
      adoption: { isAdopted: false, adoptedByRunId: null, adoptedAt: null },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-active-202', details: 'Resource initialized for staging verification' },
        { event: 'HEARTBEAT_RECEIVED', timestamp: twoMinutesAgo, actor: 'AGENT', details: 'Active heartbeat signal verified' },
        { event: 'DETECTION_EVALUATED', timestamp: twoMinutesAgo, actor: 'DETECTION_ENGINE', details: 'Protected: Active pipeline run, verified owner, active heartbeat' },
      ],
      detectionState: {
        decision: 'PROTECTED',
        evidence: [
          'Associated pipeline run-active-202 is ACTIVE',
          'Verified active owner: devops@demo.internal',
          'Heartbeat active (received 2 minutes ago)',
          'High workload activity (1,420 metrics in past hour)',
        ],
        confidence: 0.99,
        evaluatedAt: new Date(),
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
      organizationId: org._id,
      tags: new Map([['env', 'staging'], ['protected', 'true']]),
    });

    // RESOURCE C: Adopted Child (Parent crashed, adopted by active run-404 => MUST BE PROTECTED)
    const resourceC = await Resource.create({
      resourceId: 'res-adopted-child-c1',
      name: 'shared-test-cache-c1',
      provider: 'AWS',
      type: 'K8S_POD',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'PROTECTED',
      pipelineId: pipelineCI.pipelineId,
      runId: runParentCrashed.runId,
      owner: { email: 'operator@demo.internal', name: 'Sam Operator', isActiveOwner: true },
      ownershipState: 'ACTIVE_OWNER',
      activity: { lastActivityTime: twoMinutesAgo, metricsCount: 350 },
      heartbeat: { lastHeartbeatTime: twoMinutesAgo, isHeartbeatActive: true },
      parentResourceId: resourceA.resourceId,
      childResourceIds: [],
      dependencies: [{ resourceId: resourceA.resourceId, relationship: 'CHILD_OF' }],
      adoption: {
        isAdopted: true,
        adoptedByRunId: runAdoptingActive.runId,
        adoptedAt: twoMinutesAgo,
      },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-crashed-parent-303', details: 'Resource created under parent run' },
        { event: 'PARENT_CRASHED', timestamp: eighteenHoursAgo, actor: 'SYSTEM', details: 'Original parent pipeline crashed' },
        { event: 'ADOPTED', timestamp: twoMinutesAgo, actor: 'run-adopting-active-404', details: 'Adopted by active pipeline run-adopting-active-404' },
        { event: 'DETECTION_EVALUATED', timestamp: twoMinutesAgo, actor: 'DETECTION_ENGINE', details: 'Protected: Active adoption by run-adopting-active-404' },
      ],
      detectionState: {
        decision: 'PROTECTED',
        evidence: [
          'Adopted by active pipeline run: run-adopting-active-404',
          'Parent pipeline crashed but active adoption protects resource',
          'Heartbeat active from adopting process',
        ],
        confidence: 0.97,
        evaluatedAt: new Date(),
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
      organizationId: org._id,
      tags: new Map([['adopted', 'true']]),
    });

    // RESOURCE D: Two-Phase Delete Demo (Pending Reclamation 1)
    const resourceD = await Resource.create({
      resourceId: 'res-pending-reclaim-d',
      name: 'demo-ec2-pending-d',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'PENDING_RECLAMATION',
      pipelineId: pipelineCI.pipelineId,
      runId: runCrashed.runId,
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: eighteenHoursAgo, metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: eighteenHoursAgo, isHeartbeatActive: false },
      parentResourceId: null,
      childResourceIds: [],
      dependencies: [],
      adoption: { isAdopted: false, adoptedByRunId: null, adoptedAt: null },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-crashed-101', details: 'Resource initialized by CI pipeline' },
        { event: 'RECLAIM_SCHEDULED', timestamp: twoMinutesAgo, actor: 'operator@demo.internal', details: 'Marked for Two-Phase reclamation. Grace period: 300s.' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        evidence: [
          'Two-Phase Delete Phase 1 initiated',
          'Grace period countdown active (5 minutes remaining)',
          'Liveness re-verification pending prior to final cloud deletion',
        ],
        confidence: 0.99,
        evaluatedAt: new Date(),
      },
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimScheduledAt: twoMinutesAgo,
        reclaimGracePeriodExpiresAt: new Date(Date.now() + 300 * 1000),
        gracePeriodSeconds: 300,
      },
      organizationId: org._id,
      tags: new Map([['twophase', 'true']]),
    });

    // RESOURCE E: Two-Phase Delete Demo (Pending Reclamation 2 - 4m remaining)
    const resourceE = await Resource.create({
      resourceId: 'res-pending-reclaim-e',
      name: 'preview-k8s-pod-e',
      provider: 'AWS',
      type: 'K8S_POD',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'PENDING_RECLAMATION',
      pipelineId: pipelineCI.pipelineId,
      runId: runCrashed.runId,
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: eighteenHoursAgo, metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: eighteenHoursAgo, isHeartbeatActive: false },
      parentResourceId: null,
      childResourceIds: [],
      dependencies: [],
      adoption: { isAdopted: false, adoptedByRunId: null, adoptedAt: null },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-crashed-101', details: 'Resource initialized by CI pipeline' },
        { event: 'RECLAIM_SCHEDULED', timestamp: twoMinutesAgo, actor: 'operator@demo.internal', details: 'Marked for Two-Phase reclamation. Grace period: 240s.' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        evidence: [
          'Two-Phase Delete Phase 1 initiated',
          'Grace period countdown active (4 minutes remaining)',
          'Liveness re-verification pending prior to final cloud deletion',
        ],
        confidence: 0.98,
        evaluatedAt: new Date(),
      },
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimScheduledAt: twoMinutesAgo,
        reclaimGracePeriodExpiresAt: new Date(Date.now() + 240 * 1000),
        gracePeriodSeconds: 240,
      },
      organizationId: org._id,
      tags: new Map([['twophase', 'true']]),
    });

    // RESOURCE F: Two-Phase Delete Demo (Pending Reclamation 3 - 2m remaining)
    const resourceF = await Resource.create({
      resourceId: 'res-pending-reclaim-f',
      name: 'build-cache-worker-f',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'PENDING_RECLAMATION',
      pipelineId: pipelineCI.pipelineId,
      runId: runCrashed.runId,
      owner: { email: null, name: null, isActiveOwner: false },
      ownershipState: 'NO_OWNER',
      activity: { lastActivityTime: eighteenHoursAgo, metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: eighteenHoursAgo, isHeartbeatActive: false },
      parentResourceId: null,
      childResourceIds: [],
      dependencies: [],
      adoption: { isAdopted: false, adoptedByRunId: null, adoptedAt: null },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-crashed-101', details: 'Resource initialized by CI pipeline' },
        { event: 'RECLAIM_SCHEDULED', timestamp: twoMinutesAgo, actor: 'operator@demo.internal', details: 'Marked for Two-Phase reclamation. Grace period: 120s.' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        evidence: [
          'Two-Phase Delete Phase 1 initiated',
          'Grace period countdown active (2 minutes remaining)',
          'Liveness re-verification pending prior to final cloud deletion',
        ],
        confidence: 0.97,
        evaluatedAt: new Date(),
      },
      cleanupState: {
        status: 'PENDING_RECLAMATION',
        reclaimScheduledAt: twoMinutesAgo,
        reclaimGracePeriodExpiresAt: new Date(Date.now() + 120 * 1000),
        gracePeriodSeconds: 120,
      },
      organizationId: org._id,
      tags: new Map([['twophase', 'true']]),
    });

    // RESOURCE G: Human Review Required (Conflicting evidence)
    const resourceG = await Resource.create({
      resourceId: 'res-human-review-g',
      name: 'legacy-analytics-worker-g',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      state: 'HUMAN_REVIEW_REQUIRED',
      pipelineId: pipelineCI.pipelineId,
      runId: runCrashed.runId,
      owner: { email: 'sarah.qa@democorp.com', name: 'Sarah QA Lead', isActiveOwner: false },
      ownershipState: 'UNCONFIRMED_OWNER',
      activity: { lastActivityTime: twoMinutesAgo, metricsCount: 18 },
      heartbeat: { lastHeartbeatTime: eighteenHoursAgo, isHeartbeatActive: false },
      parentResourceId: null,
      childResourceIds: [],
      dependencies: [],
      adoption: { isAdopted: false, adoptedByRunId: null, adoptedAt: null },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: eighteenHoursAgo, actor: 'run-crashed-101', details: 'Worker spawned for legacy analytics testing' },
        { event: 'HUMAN_REVIEW_ALERT_RAISED', timestamp: twoMinutesAgo, actor: 'DETECTION_ENGINE', details: 'Human Review Alert Raised: Conflicting evidence (18 ops recorded, unconfirmed owner)' },
      ],
      detectionState: {
        decision: 'HUMAN_REVIEW_REQUIRED',
        evidence: [
          'Heartbeat mechanism is present, but currently not responding (owning process unresponsive)',
          'Low non-zero workload activity recorded (18 metrics, below 50 active threshold)',
          'Unconfirmed owner assigned: sarah.qa@democorp.com',
          'Associated pipeline run status is CRASHED',
          'Advisory AI recommendation conflicts with deterministic rules',
          'Resource not adopted by any running process (Adopted: No)',
        ],
        confidence: 0.65,
        evaluatedAt: new Date(),
        aiRecommendation: { decision: 'RECLAIM', reasoningSummary: 'Crashed pipeline detected. AI suggests reclaim, but non-zero workload metrics create uncertainty.' },
      },
      humanReviewState: {
        reason: 'Conflicting evidence: heartbeat mechanism is present but not responding, while 18 non-zero workload metrics are still recorded. Pipeline is crashed and ownership is uncertain.',
        uncertaintyEvidence: [
          'Heartbeat mechanism is present, but currently not responding (owning process unresponsive)',
          '18 workload operations recorded in past hour (below active 50 threshold, but non-zero)',
          'Owner sarah.qa@democorp.com is unconfirmed active owner',
          'No active adoption by any other process (Adopted: No)',
          'AI recommends RECLAIM, but safety engine requires human decision due to conflicting workload & heartbeat signals',
        ],
        raisedAt: new Date(),
        decision: 'PENDING',
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
      organizationId: org._id,
      tags: new Map([['humanReview', 'true']]),
    });

    // Create Initial Audit Event
    await AuditEvent.create({
      actorId: admin._id.toString(),
      actorEmail: admin.email,
      actorRole: 'ADMIN',
      action: 'GOLDEN_SCENARIO_SEEDED',
      result: 'SUCCESS',
      reason: 'Seeded Golden Demo dataset with human review alert items.',
      evidence: ['res-orphan-server-a', 'res-active-server-b', 'res-adopted-child-c1', 'res-pending-reclaim-d', 'res-human-review-g'],
      organizationId: org._id,
    });

    return {
      organization: org,
      users: { admin, operator, viewer },
      resources: { resourceA, resourceB, resourceC, resourceD, resourceE, resourceF, resourceG },
    };
  }

  async generateScenarioResource(scenarioType, customOrgId = null) {
    let orgId = customOrgId;
    if (!orgId) {
      let org = await Organization.findOne({ slug: 'demo-corp' });
      if (!org) {
        org = await Organization.create({ name: 'Demo Cloud Operations Corp', slug: 'demo-corp' });
      }
      orgId = org._id;
    }

    const uniqueId = Math.random().toString(36).substring(2, 8);
    const now = new Date();
    const eighteenHoursAgo = new Date(now.getTime() - 18 * 60 * 60 * 1000);

    let doc = {
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: eighteenHoursAgo,
      pipelineId: 'pipe-ephemeral-builds',
      runId: `run-sim-${uniqueId}`,
      organizationId: orgId,
      cleanupState: { status: 'NOT_RECLAIMED' },
    };

    switch (scenarioType) {
      case 'GENUINE_ORPHAN':
        doc.resourceId = `res-orphan-${uniqueId}`;
        doc.name = `preview-app-server-${uniqueId}`;
        doc.state = 'PENDING_RECLAMATION';
        doc.owner = { email: 'alex.developer@democorp.com', name: 'Alex Developer (Build Lead)', isActiveOwner: false };
        doc.ownershipState = 'NO_OWNER';
        doc.activity = { lastActivityTime: eighteenHoursAgo, metricsCount: 0 };
        doc.heartbeat = { lastHeartbeatTime: eighteenHoursAgo, isHeartbeatActive: false };
        doc.adoption = { isAdopted: false, adoptedByRunId: null, adoptedAt: null };
        doc.lifecycleHistory = [
          { event: 'CREATED', timestamp: eighteenHoursAgo, actor: `run-sim-${uniqueId}`, details: 'Simulated preview worker initialized by Alex Developer' },
          { event: 'PIPELINE_CRASHED', timestamp: eighteenHoursAgo, actor: 'SYSTEM', details: 'CI process terminated unexpectedly' },
          { event: 'PENDING_CONFIRMATION', timestamp: now, actor: 'DETECTION_ENGINE', details: 'Verified orphan: Grace period timer started (300s)' }
        ];
        doc.detectionState = {
          decision: 'VERIFIED_ORPHAN',
          evidence: [
            `Simulated orphan scenario ${uniqueId}`,
            'Active owner assigned: alex.developer@democorp.com',
            'Associated pipeline run status is CRASHED',
            'Heartbeat stale (>15 minutes threshold exceeded)'
          ],
          confidence: 0.98,
          evaluatedAt: now
        };
        doc.cleanupState = {
          status: 'PENDING_RECLAMATION',
          reclaimScheduledAt: now,
          reclaimGracePeriodExpiresAt: new Date(now.getTime() + 300 * 1000),
          gracePeriodSeconds: 300,
        };
        break;

      case 'ACTIVE_RESOURCE':
        doc.resourceId = `res-active-${uniqueId}`;
        doc.name = `staging-api-${uniqueId}`;
        doc.state = 'PROTECTED';
        doc.owner = { email: 'engineer@demo.internal', name: 'Active Engineer', isActiveOwner: true };
        doc.ownershipState = 'ACTIVE_OWNER';
        doc.activity = { lastActivityTime: now, metricsCount: 2400 };
        doc.heartbeat = { lastHeartbeatTime: now, isHeartbeatActive: true };
        doc.adoption = { isAdopted: false, adoptedByRunId: null, adoptedAt: null };
        doc.lifecycleHistory = [
          { event: 'CREATED', timestamp: eighteenHoursAgo, actor: `run-sim-${uniqueId}`, details: 'Production worker instance initialized' },
          { event: 'HEARTBEAT_RECEIVED', timestamp: now, actor: 'AGENT', details: 'Active heartbeat pulse received' }
        ];
        doc.detectionState = {
          decision: 'PROTECTED',
          evidence: [
            `Active resource scenario ${uniqueId}`,
            'Verified active owner: engineer@demo.internal',
            'Heartbeat active',
            'High workload metrics (2,400 recorded)'
          ],
          confidence: 0.99,
          evaluatedAt: now
        };
        break;

      case 'ADOPTED_CHILD':
        doc.resourceId = `res-adopted-${uniqueId}`;
        doc.name = `shared-cache-${uniqueId}`;
        doc.type = 'K8S_POD';
        doc.state = 'PROTECTED';
        doc.owner = { email: 'operator@demo.internal', name: 'Sam Operator', isActiveOwner: true };
        doc.ownershipState = 'ACTIVE_OWNER';
        doc.activity = { lastActivityTime: now, metricsCount: 890 };
        doc.heartbeat = { lastHeartbeatTime: now, isHeartbeatActive: true };
        doc.adoption = { isAdopted: true, adoptedByRunId: 'run-active-adopter-99', adoptedAt: now };
        doc.lifecycleHistory = [
          { event: 'CREATED', timestamp: eighteenHoursAgo, actor: `run-sim-${uniqueId}`, details: 'Resource spawned' },
          { event: 'ADOPTED', timestamp: now, actor: 'run-active-adopter-99', details: 'Adopted by active runner' }
        ];
        doc.detectionState = {
          decision: 'PROTECTED',
          evidence: [
            `Adopted child scenario ${uniqueId}`,
            'Adopted by active pipeline run-active-adopter-99',
            'Protection rule applied'
          ],
          confidence: 0.97,
          evaluatedAt: now
        };
        break;

      case 'RESUMED_PROCESS':
        doc.resourceId = `res-resumed-${uniqueId}`;
        doc.name = `analytics-worker-${uniqueId}`;
        doc.state = 'PENDING_RECLAMATION';
        doc.owner = { email: 'sam.operator@demo.internal', name: 'Sam Operator (Infrastructure)', isActiveOwner: true };
        doc.ownershipState = 'ACTIVE_OWNER';
        doc.activity = { lastActivityTime: now, metricsCount: 150 };
        doc.heartbeat = { lastHeartbeatTime: now, isHeartbeatActive: true };
        doc.adoption = { isAdopted: false, adoptedByRunId: null, adoptedAt: null };
        doc.lifecycleHistory = [
          { event: 'CREATED', timestamp: eighteenHoursAgo, actor: `run-sim-${uniqueId}`, details: 'Worker spawned' },
          { event: 'PENDING_CONFIRMATION', timestamp: now, actor: 'DETECTION_ENGINE', details: 'Entered grace period' },
          { event: 'RESUMED_ACTIVITY', timestamp: now, actor: 'AGENT', details: 'Heartbeat signal resumed during grace period!' }
        ];
        doc.detectionState = {
          decision: 'VERIFIED_ORPHAN',
          evidence: [
            `Resumed scenario ${uniqueId}`,
            'Active owner: sam.operator@demo.internal',
            'Heartbeat resumed during grace period evaluation'
          ],
          confidence: 0.95,
          evaluatedAt: now
        };
        doc.cleanupState = {
          status: 'PENDING_RECLAMATION',
          reclaimScheduledAt: now,
          reclaimGracePeriodExpiresAt: new Date(now.getTime() + 300 * 1000),
          gracePeriodSeconds: 300,
        };
        break;

      case 'NEEDS_REVIEW':
      default:
        doc.resourceId = `res-review-${uniqueId}`;
        doc.name = `legacy-storage-${uniqueId}`;
        doc.state = 'NEEDS_REVIEW';
        doc.owner = { email: 'sarah.qa@democorp.com', name: 'Sarah QA Lead', isActiveOwner: true };
        doc.ownershipState = 'UNCONFIRMED_OWNER';
        doc.activity = { lastActivityTime: new Date(now.getTime() - 60 * 60 * 1000), metricsCount: 12 };
        doc.heartbeat = { lastHeartbeatTime: new Date(now.getTime() - 60 * 60 * 1000), isHeartbeatActive: false };
        doc.adoption = { isAdopted: false, adoptedByRunId: null, adoptedAt: null };
        doc.lifecycleHistory = [
          { event: 'CREATED', timestamp: eighteenHoursAgo, actor: `run-sim-${uniqueId}`, details: 'Legacy volume created by Sarah QA' },
          { event: 'NEEDS_REVIEW', timestamp: now, actor: 'DETECTION_ENGINE', details: 'Ambiguous metrics require manual review' }
        ];
        doc.detectionState = {
          decision: 'NEEDS_REVIEW',
          evidence: [
            `Review scenario ${uniqueId}`,
            'Active QA owner assigned: sarah.qa@democorp.com',
            'Low non-zero metric activity',
            'Requires operator manual confirmation'
          ],
          confidence: 0.60,
          evaluatedAt: now
        };
        break;
    }

    const createdResource = await Resource.create(doc);

    await AuditEvent.create({
      actorId: 'DEMO_GENERATOR',
      actorEmail: 'system@demo.internal',
      actorRole: 'SYSTEM',
      action: 'DEMO_SCENARIO_RESOURCE_GENERATED',
      result: 'SUCCESS',
      reason: `Generated simulated demo scenario: ${scenarioType} (Resource ID: ${createdResource.resourceId})`,
      evidence: [createdResource.resourceId, scenarioType],
      organizationId: orgId,
    });

    return createdResource;
  }
}

module.exports = new SeedService();
