// ============================================================
// MOCK DATA STORE — 100% Local, In-Memory Data Store
// ============================================================

const now = Date.now();
const ago = (h) => new Date(now - h * 3600 * 1000).toISOString();
const agoMin = (m) => new Date(now - m * 60 * 1000).toISOString();

export const store = {
  resources: [
    // ── VERIFIED ORPHANS (ready to reclaim) ──────────────────
    {
      resourceId: 'res-orphan-server-a',
      name: 'preview-build-app-server-a',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: ago(18),
      state: 'VERIFIED_ORPHAN',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'alex.developer@democorp.com', name: 'Alex Developer (Build Lead)', isActiveOwner: true },
      activity: { lastActivityTime: ago(18), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(18), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(18), actor: 'run-crashed-101', details: 'Resource initialized by Alex Developer for preview build' },
        { event: 'PIPELINE_CRASHED', timestamp: ago(17), actor: 'SYSTEM', details: 'CI process terminated unexpectedly — container OOM killed' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(5), actor: 'DETECTION_ENGINE', details: 'Verified orphan: Crashed pipeline, stale heartbeat' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.98,
        evidence: [
          'Pipeline run-crashed-101 is CRASHED',
          'Active owner assigned: alex.developer@democorp.com',
          'Last heartbeat 18h ago (threshold 15min)',
          'Zero workload metrics in 12h',
          'No adoption records',
        ],
        evaluatedAt: agoMin(5),
        aiRecommendation: { decision: 'RECLAIM', reasoningSummary: 'All signals confirm orphan. Safe to reclaim.' },
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-orphan-ec2-b2',
      name: 'ephemeral-ci-runner-b2',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'ci',
      creationTime: ago(24),
      state: 'VERIFIED_ORPHAN',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'sam.operator@demo.internal', name: 'Sam Operator (CI/CD Ops)', isActiveOwner: true },
      activity: { lastActivityTime: ago(24), metricsCount: 2 },
      heartbeat: { lastHeartbeatTime: ago(23), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(24), actor: 'ci-runner-pipeline', details: 'Ephemeral CI runner spun up by Sam Operator for build job #4892' },
        { event: 'BUILD_FAILED', timestamp: ago(23), actor: 'SYSTEM', details: 'Build job failed — runner abandoned' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(3), actor: 'DETECTION_ENGINE', details: 'Verified orphan: abandoned CI runner' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.96,
        evidence: ['Build pipeline abandoned', 'Active owner: sam.operator@demo.internal', 'Heartbeat stale for 23h', 'Only 2 metrics recorded total'],
        evaluatedAt: agoMin(3),
        aiRecommendation: null,
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-orphan-k8s-c3',
      name: 'test-pod-feature-branch-c3',
      provider: 'AWS',
      type: 'K8S_POD',
      environment: 'testing',
      creationTime: ago(36),
      state: 'VERIFIED_ORPHAN',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'sarah.qa@democorp.com', name: 'Sarah QA Lead', isActiveOwner: true },
      activity: { lastActivityTime: ago(36), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(36), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(36), actor: 'feature/auth-refactor', details: 'Pod created for feature branch testing by Sarah QA' },
        { event: 'BRANCH_DELETED', timestamp: ago(35), actor: 'GIT_WEBHOOK', details: 'Feature branch deleted — pod left orphaned' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(10), actor: 'DETECTION_ENGINE', details: 'Verified orphan: feature branch deleted 35h ago' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.99,
        evidence: ['Feature branch deleted 35h ago', 'Active owner: sarah.qa@democorp.com', 'Pod has zero active connections', 'No memory/CPU usage for 36h'],
        evaluatedAt: agoMin(10),
        aiRecommendation: { decision: 'RECLAIM', reasoningSummary: 'Feature branch is deleted. Pod is safe to terminate.' },
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-orphan-s3-d4',
      name: 'tmp-build-artifacts-d4',
      provider: 'AWS',
      type: 'S3_BUCKET',
      environment: 'ci',
      creationTime: ago(72),
      state: 'VERIFIED_ORPHAN',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'devops-team@democorp.com', name: 'DevOps Platform Team', isActiveOwner: true },
      activity: { lastActivityTime: ago(72), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(72), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(72), actor: 'ci-artifact-job', details: 'S3 bucket created for temporary build artifacts' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(8), actor: 'DETECTION_ENGINE', details: 'Stale artifact bucket — never cleaned up' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.97,
        evidence: ['S3 bucket has 0 access requests in 72h', 'Active team: devops-team@democorp.com', 'No linked pipeline runs found'],
        evaluatedAt: agoMin(8),
        aiRecommendation: null,
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-orphan-azure-e5',
      name: 'dev-vm-sprint-22-e5',
      provider: 'AZURE',
      type: 'EC2_INSTANCE',
      environment: 'development',
      creationTime: ago(96),
      state: 'VERIFIED_ORPHAN',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'john.doe@acme.com', name: 'John Doe (Senior Developer)', isActiveOwner: true },
      activity: { lastActivityTime: ago(72), metricsCount: 5 },
      heartbeat: { lastHeartbeatTime: ago(48), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(96), actor: 'john.doe@acme.com', details: 'Dev VM created for Sprint 22' },
        { event: 'OWNER_OFFBOARDED', timestamp: ago(72), actor: 'HR_SYSTEM', details: 'Owner john.doe@acme.com deprovisioned — VM left running' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(15), actor: 'DETECTION_ENGINE', details: 'Orphan: owner offboarded, no transfer' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.94,
        evidence: ['Owner john.doe@acme.com', 'Last SSH session 72h ago', 'Heartbeat stale 48h'],
        evaluatedAt: agoMin(15),
        aiRecommendation: { decision: 'RECLAIM', reasoningSummary: 'Owner is offboarded. VM has no active users. Reclaim safely.' },
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },

    // ── PENDING RECLAMATION ───────────────────────────────────
    {
      resourceId: 'res-pending-reclaim-d',
      name: 'demo-ec2-pending-d',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: ago(18),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'alex.developer@democorp.com', name: 'Alex Developer (Build Lead)', isActiveOwner: true },
      activity: { lastActivityTime: ago(18), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(18), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      gracePeriodStartTime: agoMin(1),
      gracePeriodExpiresAt: new Date(now + 240 * 1000).toISOString(),
      livenessStatus: 'MONITORING',
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(18), actor: 'run-crashed-101', details: 'Resource initialized by CI pipeline' },
        { event: 'RECLAIM_SCHEDULED', timestamp: agoMin(1), actor: 'operator@demo.internal', details: 'Two-Phase reclamation scheduled. 5-Minute Grace Period started. Liveness monitoring active.' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.99,
        evidence: ['Two-Phase Delete Phase 1 initiated', '5-Minute Liveness Monitoring active', 'Active owner: alex.developer@democorp.com'],
        evaluatedAt: agoMin(1),
        aiRecommendation: null,
      },
      cleanupState: { status: 'PENDING_RECLAMATION', reclaimScheduledAt: agoMin(1), gracePeriodSeconds: 300, gracePeriodExpiresAt: new Date(now + 240 * 1000).toISOString() },
    },
    {
      resourceId: 'res-pending-gcp-f6',
      name: 'compute-node-batch-f6',
      provider: 'GCP',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: ago(20),
      state: 'PENDING_RECLAMATION',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'batch-ops@democorp.com', name: 'Batch Engineering Ops', isActiveOwner: true },
      activity: { lastActivityTime: ago(20), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(20), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      gracePeriodStartTime: agoMin(2),
      gracePeriodExpiresAt: new Date(now + 180 * 1000).toISOString(),
      livenessStatus: 'MONITORING',
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(20), actor: 'batch-runner-gcp', details: 'GCP compute node for batch job' },
        { event: 'RECLAIM_SCHEDULED', timestamp: agoMin(2), actor: 'admin@demo.internal', details: '5-Minute Grace Period initiated after batch job abandoned. Liveness monitoring active.' },
      ],
      detectionState: {
        decision: 'VERIFIED_ORPHAN',
        confidence: 0.97,
        evidence: ['Batch job completed 20h ago', 'Active owner: batch-ops@democorp.com', 'Node not terminated by job runner', 'Zero CPU usage for 20h'],
        evaluatedAt: agoMin(2),
        aiRecommendation: null,
      },
      cleanupState: { status: 'PENDING_RECLAMATION', reclaimScheduledAt: agoMin(2), gracePeriodSeconds: 300, gracePeriodExpiresAt: new Date(now + 180 * 1000).toISOString() },
    },

    // ── PROTECTED (active, legitimate) ───────────────────────
    {
      resourceId: 'res-active-server-b',
      name: 'staging-api-server-b',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'staging',
      creationTime: ago(18),
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'devops@demo.internal', name: 'DevOps Lead', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(2), metricsCount: 1420 },
      heartbeat: { lastHeartbeatTime: agoMin(2), isHeartbeatActive: true },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(18), actor: 'run-active-202', details: 'Staging server initialized' },
        { event: 'HEARTBEAT_RECEIVED', timestamp: agoMin(2), actor: 'AGENT', details: 'Active heartbeat verified' },
      ],
      detectionState: {
        decision: 'PROTECTED',
        confidence: 0.99,
        evidence: ['Active owner devops@demo.internal', 'Heartbeat active 2min ago', 'Pipeline ACTIVE', '1420 ops/hr workload'],
        evaluatedAt: agoMin(2),
        aiRecommendation: { decision: 'PROTECT', reasoningSummary: 'Fully active resource. High workload, live owner.' },
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-adopted-child-c1',
      name: 'shared-test-cache-c1',
      provider: 'AWS',
      type: 'K8S_POD',
      environment: 'testing',
      creationTime: ago(18),
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'operator@demo.internal', name: 'Sam Operator', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(2), metricsCount: 350 },
      heartbeat: { lastHeartbeatTime: agoMin(2), isHeartbeatActive: true },
      adoption: { isAdopted: true, adoptedByRunId: 'run-adopting-active-404' },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(18), actor: 'run-crashed-parent-303', details: 'Created under parent run' },
        { event: 'ADOPTED', timestamp: agoMin(2), actor: 'run-adopting-active-404', details: 'Adopted by active pipeline run' },
      ],
      detectionState: {
        decision: 'PROTECTED',
        confidence: 0.97,
        evidence: ['Adopted by active run-adopting-active-404', 'Active heartbeat', '350 ops active'],
        evaluatedAt: agoMin(2),
        aiRecommendation: null,
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-prod-db-g7',
      name: 'production-rds-postgres-g7',
      provider: 'AWS',
      type: 'RDS_DATABASE',
      environment: 'production',
      creationTime: ago(720),
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'dba@demo.internal', name: 'Database Admin', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(1), metricsCount: 8900 },
      heartbeat: { lastHeartbeatTime: agoMin(1), isHeartbeatActive: true },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(720), actor: 'dba@demo.internal', details: 'Production RDS instance provisioned' },
        { event: 'HEARTBEAT_RECEIVED', timestamp: agoMin(1), actor: 'AGENT', details: 'Active connections confirmed' },
      ],
      detectionState: {
        decision: 'PROTECTED',
        confidence: 1.0,
        evidence: ['Production environment — policy protected', 'RDS type — policy protected', '8900 active DB connections/hr', 'DBA actively managing'],
        evaluatedAt: agoMin(1),
        aiRecommendation: { decision: 'PROTECT', reasoningSummary: 'Production database. Never reclaim without explicit migration plan.' },
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-prod-api-h8',
      name: 'prod-load-balancer-h8',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'production',
      creationTime: ago(2160),
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'sre@demo.internal', name: 'SRE Team', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(0.5), metricsCount: 45000 },
      heartbeat: { lastHeartbeatTime: agoMin(0.5), isHeartbeatActive: true },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(2160), actor: 'sre@demo.internal', details: 'Production load balancer deployed' },
      ],
      detectionState: { decision: 'PROTECTED', confidence: 1.0, evidence: ['Production LB — 45000 req/hr throughput', 'SRE ownership active', '99.99% uptime tracked'], evaluatedAt: agoMin(0.5), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-azure-ml-i9',
      name: 'ml-training-cluster-i9',
      provider: 'AZURE',
      type: 'EC2_INSTANCE',
      environment: 'staging',
      creationTime: ago(48),
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'mlops@demo.internal', name: 'ML Platform', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(3), metricsCount: 5200 },
      heartbeat: { lastHeartbeatTime: agoMin(3), isHeartbeatActive: true },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(48), actor: 'mlops@demo.internal', details: 'Azure ML training cluster provisioned for model v4.2' },
        { event: 'TRAINING_STARTED', timestamp: ago(2), actor: 'TRAINING_ORCHESTRATOR', details: 'Model training job running (72h estimated)' },
      ],
      detectionState: { decision: 'PROTECTED', confidence: 0.99, evidence: ['Active training job in progress', 'ML team ownership active', '5200 GPU-ops/min workload'], evaluatedAt: agoMin(3), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-gcp-k8s-j10',
      name: 'gke-payment-service-j10',
      provider: 'GCP',
      type: 'K8S_POD',
      environment: 'production',
      creationTime: ago(336),
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'payments-eng@demo.internal', name: 'Payments Team', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(0.1), metricsCount: 22000 },
      heartbeat: { lastHeartbeatTime: agoMin(0.1), isHeartbeatActive: true },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(336), actor: 'payments-eng@demo.internal', details: 'Payment service pod deployed' },
      ],
      detectionState: { decision: 'PROTECTED', confidence: 1.0, evidence: ['Payment service — 22000 tx/hr', 'Active ownership', 'Zero downtime required'], evaluatedAt: agoMin(0.1), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },

    // ── ORPHAN CANDIDATES (under review) ─────────────────────
    {
      resourceId: 'res-candidate-k11',
      name: 'qa-env-sprint-23-k11',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: ago(14),
      state: 'ORPHAN_CANDIDATE',
      ownershipState: 'UNCLAIMED',
      owner: { email: 'qa-lead@demo.internal', name: 'QA Lead', isActiveOwner: false },
      activity: { lastActivityTime: ago(10), metricsCount: 12 },
      heartbeat: { lastHeartbeatTime: ago(8), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(14), actor: 'qa-lead@demo.internal', details: 'QA environment for Sprint 23 testing' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(20), actor: 'DETECTION_ENGINE', details: 'Orphan candidate: low activity, stale heartbeat' },
      ],
      detectionState: { decision: 'ORPHAN_CANDIDATE', confidence: 0.72, evidence: ['Heartbeat stale for 8h', 'Only 12 ops in 14h (below threshold)', 'QA lead has not confirmed active use'], evaluatedAt: agoMin(20), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-candidate-l12',
      name: 'data-processing-job-l12',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'ci',
      creationTime: ago(10),
      state: 'ORPHAN_CANDIDATE',
      ownershipState: 'UNCLAIMED',
      owner: { email: null, name: null, isActiveOwner: false },
      activity: { lastActivityTime: ago(6), metricsCount: 45 },
      heartbeat: { lastHeartbeatTime: ago(4), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(10), actor: 'data-pipeline-runner', details: 'EC2 instance for data processing batch job' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(30), actor: 'DETECTION_ENGINE', details: 'Orphan candidate: unclear ownership' },
      ],
      detectionState: { decision: 'ORPHAN_CANDIDATE', confidence: 0.68, evidence: ['No owner assignment', 'Heartbeat stale 4h', 'Activity declining — 45 ops vs 800 expected'], evaluatedAt: agoMin(30), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
    {
      resourceId: 'res-candidate-m13',
      name: 'preview-env-pr-4821-m13',
      provider: 'AWS',
      type: 'PREVIEW_ENV',
      environment: 'testing',
      creationTime: ago(8),
      state: 'ORPHAN_CANDIDATE',
      ownershipState: 'UNCLAIMED',
      owner: { email: 'frontend-dev@demo.internal', name: 'Frontend Dev', isActiveOwner: false },
      activity: { lastActivityTime: ago(5), metricsCount: 8 },
      heartbeat: { lastHeartbeatTime: ago(5), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(8), actor: 'github-actions', details: 'Preview environment for PR #4821' },
        { event: 'PR_MERGED', timestamp: ago(6), actor: 'GIT_WEBHOOK', details: 'PR merged — preview env not cleaned up' },
        { event: 'DETECTION_EVALUATED', timestamp: agoMin(15), actor: 'DETECTION_ENGINE', details: 'Candidate: PR merged but env persists' },
      ],
      detectionState: { decision: 'ORPHAN_CANDIDATE', confidence: 0.81, evidence: ['PR #4821 merged 6h ago', 'Preview env should auto-terminate', 'No activity since PR merge'], evaluatedAt: agoMin(15), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },

    // ── RECLAIMED ─────────────────────────────────────────────
    {
      resourceId: 'res-reclaimed-o15',
      name: 'old-build-node-o15',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'ci',
      creationTime: ago(96),
      state: 'RECLAIMED',
      ownershipState: 'NO_OWNER',
      owner: { email: null, name: null, isActiveOwner: false },
      activity: { lastActivityTime: ago(96), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(96), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(96), actor: 'build-pipeline', details: 'Build node for v2.1 release' },
        { event: 'RECLAIM_SCHEDULED', timestamp: ago(2), actor: 'admin@demo.internal', details: 'Two-Phase reclamation scheduled' },
        { event: 'RECLAIMED', timestamp: ago(1), actor: 'admin@demo.internal', details: 'Reclaimed cleanly via SIMULATED_INFRASTRUCTURE' },
      ],
      detectionState: { decision: 'RECLAIMED', confidence: 0.99, evidence: ['Resource reclaimed successfully', 'Cloud provider confirmed termination'], evaluatedAt: ago(1), aiRecommendation: null },
      cleanupState: { status: 'RECLAIMED', reclaimedAt: ago(1), reclaimedBy: 'admin@demo.internal' },
    },
    {
      resourceId: 'res-reclaimed-p16',
      name: 'stale-preview-pr-3900-p16',
      provider: 'AWS',
      type: 'PREVIEW_ENV',
      environment: 'testing',
      creationTime: ago(120),
      state: 'RECLAIMED',
      ownershipState: 'NO_OWNER',
      owner: { email: null, name: null, isActiveOwner: false },
      activity: { lastActivityTime: ago(120), metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: ago(120), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(120), actor: 'github-actions', details: 'Preview env for PR #3900' },
        { event: 'RECLAIMED', timestamp: ago(3), actor: 'operator@demo.internal', details: 'Direct safe reclamation — PR closed' },
      ],
      detectionState: { decision: 'RECLAIMED', confidence: 0.98, evidence: ['PR #3900 closed 5 days ago', 'Reclaimed after review'], evaluatedAt: ago(3), aiRecommendation: null },
      cleanupState: { status: 'RECLAIMED', reclaimedAt: ago(3), reclaimedBy: 'operator@demo.internal' },
    },

    // ── ACTIVE ────────────────────────────────────────────────
    {
      resourceId: 'res-active-s19',
      name: 'prod-cache-redis-s19',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'production',
      creationTime: ago(504),
      state: 'ACTIVE',
      ownershipState: 'ACTIVE_OWNER',
      owner: { email: 'infra@demo.internal', name: 'Infra Team', isActiveOwner: true },
      activity: { lastActivityTime: agoMin(0.2), metricsCount: 95000 },
      heartbeat: { lastHeartbeatTime: agoMin(0.2), isHeartbeatActive: true },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(504), actor: 'infra@demo.internal', details: 'Redis cache cluster for product tier' },
      ],
      detectionState: { decision: 'ACTIVE', confidence: 1.0, evidence: ['95000 ops/min — extremely high activity', 'Infra team active ownership', '21-day uptime'], evaluatedAt: agoMin(0.2), aiRecommendation: null },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },

    // ── HUMAN REVIEW REQUIRED (Uncertainty Fallback) ─────────
    {
      resourceId: 'res-human-review-g',
      name: 'legacy-analytics-worker-g',
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: ago(18),
      state: 'HUMAN_REVIEW_REQUIRED',
      ownershipState: 'UNCONFIRMED_OWNER',
      owner: { email: 'sarah.qa@democorp.com', name: 'Sarah QA Lead', isActiveOwner: false },
      activity: { lastActivityTime: agoMin(2), metricsCount: 18 },
      heartbeat: { lastHeartbeatTime: ago(18), isHeartbeatActive: false },
      adoption: { isAdopted: false },
      lifecycleHistory: [
        { event: 'CREATED', timestamp: ago(18), actor: 'run-crashed-101', details: 'Worker spawned for legacy analytics testing' },
        { event: 'HUMAN_REVIEW_ALERT_RAISED', timestamp: agoMin(2), actor: 'DETECTION_ENGINE', details: 'Human Review Alert Raised: Conflicting evidence (18 ops recorded, unconfirmed owner)' },
      ],
      detectionState: {
        decision: 'HUMAN_REVIEW_REQUIRED',
        confidence: 0.65,
        evidence: [
          'Low non-zero workload activity recorded (18 metrics, below 50 active threshold)',
          'Unconfirmed owner assigned: sarah.qa@democorp.com',
          'Associated pipeline run status is CRASHED',
          'Heartbeat stale (>15 minutes threshold exceeded)',
          'Advisory AI recommendation conflicts with deterministic safety rules',
        ],
        evaluatedAt: agoMin(2),
        aiRecommendation: { decision: 'RECLAIM', reasoningSummary: 'Crashed pipeline detected. AI suggests reclaim, but low activity metrics create uncertainty.' },
      },
      humanReviewState: {
        reason: 'Conflicting evidence: 18 non-zero workload metrics recorded while pipeline is crashed and owner is unconfirmed.',
        uncertaintyEvidence: [
          '18 workload operations recorded in past hour (below active 50 threshold, but non-zero)',
          'Owner sarah.qa@democorp.com is unconfirmed active owner',
          'AI recommends RECLAIM, but safety engine requires human decision due to non-zero workload',
        ],
        raisedAt: agoMin(2),
        decision: 'PENDING',
      },
      cleanupState: { status: 'NOT_RECLAIMED' },
    },
  ],

  auditEvents: [
    { _id: 'ae1', actorEmail: 'admin@demo.internal', actorRole: 'ADMIN', action: 'RECLAIM_EXECUTED', resourceId: 'res-reclaimed-o15', result: 'SUCCESS', reason: 'Two-Phase reclamation completed cleanly', timestamp: ago(1) },
    { _id: 'ae2', actorEmail: 'operator@demo.internal', actorRole: 'OPERATOR', action: 'RECLAIM_EXECUTED', resourceId: 'res-reclaimed-p16', result: 'SUCCESS', reason: 'Direct safe reclamation', timestamp: ago(3) },
    { _id: 'ae3', actorEmail: 'admin@demo.internal', actorRole: 'ADMIN', action: 'RECLAIM_SCHEDULED', resourceId: 'res-pending-reclaim-d', result: 'SUCCESS', reason: 'Phase 1 initiated', timestamp: agoMin(12) },
    { _id: 'ae4', actorEmail: 'DETECTION_ENGINE', actorRole: 'SYSTEM', action: 'DETECTION_EVALUATED', resourceId: 'res-orphan-server-a', result: 'SUCCESS', reason: 'Verified orphan detected', timestamp: agoMin(5) },
    { _id: 'ae5', actorEmail: 'admin@demo.internal', actorRole: 'ADMIN', action: 'GOLDEN_SCENARIO_SEEDED', resourceId: 'N/A', result: 'SUCCESS', reason: 'Demo data initialized', timestamp: ago(19) },
  ],

  analytics: {},
};

export function getResource(resourceId) {
  return store.resources.find((r) => r.resourceId === resourceId) || null;
}

export function updateResource(resourceId, updates) {
  const idx = store.resources.findIndex((r) => r.resourceId === resourceId);
  if (idx === -1) return null;
  store.resources[idx] = JSON.parse(JSON.stringify({ ...store.resources[idx], ...updates }));
  recalcAnalytics();
  return store.resources[idx];
}

export function recalcAnalytics() {
  const r = store.resources;
  const reviewItems = r.filter((x) => x.state === 'NEEDS_REVIEW' || x.state === 'HUMAN_REVIEW_REQUIRED').length;
  store.analytics = {
    totalResources: r.length,
    activeResources: r.filter((x) => x.state === 'ACTIVE').length,
    orphanCandidates: r.filter((x) => x.state === 'ORPHAN_CANDIDATE').length,
    verifiedOrphans: r.filter((x) => x.state === 'VERIFIED_ORPHAN').length,
    pendingReclamation: r.filter((x) => x.state === 'PENDING_RECLAMATION').length,
    reclaimedResources: r.filter((x) => x.state === 'RECLAIMED').length,
    protectedResources: r.filter((x) => x.state === 'PROTECTED').length,
    needsReview: reviewItems,
    humanReviewCount: reviewItems,
    estimatedMonthlySavings: r.filter((x) => x.state === 'RECLAIMED').length * 45,
    principleMessage: 'WHEN THE SYSTEM IS UNCERTAIN, IT DOES NOT DELETE — IT ASKS A HUMAN.',
  };
}

export function evaluateGracePeriods() {
  const currentTime = Date.now();
  let changed = false;

  store.resources.forEach((r) => {
    if (r.state === 'PENDING_RECLAMATION') {
      const expiresAt = r.gracePeriodExpiresAt || r.cleanupState?.gracePeriodExpiresAt;
      if (expiresAt) {
        const remainingMs = new Date(expiresAt).getTime() - currentTime;
        if (remainingMs <= 0) {
          r.state = 'RECLAIMED';
          r.livenessStatus = 'EXPIRED_CLEANED';
          const isoNow = new Date().toISOString();
          r.cleanupState = {
            status: 'RECLAIMED',
            reclaimedAt: isoNow,
            reclaimedBy: 'SYSTEM_AUTO_GRACE_PERIOD',
            automatic: true,
            reason: 'Automatically Reclaimed via Grace Period Rule',
          };
          if (!r.lifecycleHistory) r.lifecycleHistory = [];
          r.lifecycleHistory.push({
            event: 'AUTOMATIC_RECLAMATION',
            timestamp: isoNow,
            actor: 'SYSTEM_AUTO_RECLAIM',
            details: '⚡ 5-minute grace period expired. Pre-deletion safety check passed. Automatically reclaimed.',
          });
          store.auditEvents.unshift({
            _id: 'ae_auto_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            actorEmail: 'SYSTEM_AUTO_RECLAIM',
            actorRole: 'SYSTEM',
            action: 'AUTOMATIC_RECLAMATION',
            resourceId: r.resourceId,
            result: 'SUCCESS',
            reason: 'Automatically Reclaimed via Grace Period Rule (5-min elapsed)',
            timestamp: isoNow,
          });
          changed = true;
        }
      }
    }
  });

  if (changed) {
    recalcAnalytics();
  }
}

// Initial calculation
recalcAnalytics();

// Auto-run grace period countdown checks
if (typeof window !== 'undefined') {
  setInterval(evaluateGracePeriods, 1000);
}
