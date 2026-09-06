// ============================================================
// MOCK API — 100% Local, In-Memory API Engine (No Backend HTTP Calls)
// ============================================================
import { store, getResource, updateResource, evaluateGracePeriods, recalcAnalytics } from './mockData';

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function ok(data, extra = {}) {
  return Promise.resolve({ success: true, data, ...extra });
}

function fail(code, message) {
  return Promise.reject({ success: false, error: { code, message } });
}

// ─── HELPER PARSERS ─────────────────────────────────────────
function parsePath(url) {
  const clean = url.startsWith('/') ? url.slice(1) : url;
  const pathWithoutQuery = clean.includes('?') ? clean.slice(0, clean.indexOf('?')) : clean;
  return pathWithoutQuery.split('/').filter(Boolean);
}

function parseQS(url) {
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(qIdx + 1)).entries());
}

// ─── MOCK ROUTE HANDLERS ─────────────────────────────────────
async function handleGet(url, config = {}) {
  await delay(100);
  evaluateGracePeriods();
  const parts = parsePath(url);
  const [section, id, sub] = parts;
  const params = { ...parseQS(url), ...(config?.params || {}) };

  // AUTH
  if (section === 'auth' && id === 'me') {
    return ok({
      id: 'mock-admin-id',
      email: 'admin@demo.internal',
      name: 'Admin User',
      role: 'ADMIN',
      organizationId: 'mock-org-id',
    });
  }

  // ANALYTICS
  if (section === 'analytics' && id === 'summary') {
    recalcAnalytics();
    return ok({ ...store.analytics });
  }

  // AUDIT LOGS
  if (section === 'audit') {
    let list = [...store.auditEvents].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));
    if (params.result) list = list.filter((e) => e.result === params.result);
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const total = list.length;
    const paged = list.slice((page - 1) * limit, page * limit);
    return {
      success: true,
      data: paged,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  // RESOURCES LIST
  if (section === 'resources' && !id) {
    let list = store.resources.map((r) => ({ ...r }));
    if (params.state) list = list.filter((r) => r.state === params.state);
    if (params.provider) list = list.filter((r) => r.provider === params.provider);
    if (params.environment) list = list.filter((r) => r.environment === params.environment);
    if (params.type) list = list.filter((r) => r.type === params.type);
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter((r) => r.resourceId.toLowerCase().includes(s) || (r.name && r.name.toLowerCase().includes(s)));
    }

    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const total = list.length;
    list.sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime));
    const paged = list.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: paged,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  // RESOURCE DETAIL BY ID
  if (section === 'resources' && id && !sub) {
    const r = getResource(id);
    if (!r) return fail('RESOURCE_NOT_FOUND', `Resource '${id}' was not found.`);
    return ok({ ...r });
  }

  // SETTINGS / POLICY
  if (section === 'settings' && id === 'policy') {
    return ok({
      reviewThresholdHours: 12,
      heartbeatFreshnessMinutes: 15,
      autoReclaimEnabled: false,
      protectedEnvironments: ['production', 'staging'],
      protectedResourceTypes: ['RDS_DATABASE'],
    });
  }

  // DEPENDENCIES GRAPH
  if (section === 'dependencies') {
    return ok({ resourceId: id, dependencies: [], adoptedBy: null });
  }

  console.warn('[MockAPI GET] Unhandled route:', url);
  return ok([]);
}

async function handlePost(url, body = {}) {
  await delay(150);
  evaluateGracePeriods();
  const parts = parsePath(url);
  const [section, id, sub] = parts;

  // AUTH LOGIN
  if (section === 'auth' && id === 'login') {
    const email = body?.email || 'admin@demo.internal';
    const roles = {
      'admin@demo.internal': { role: 'ADMIN', name: 'Alex Admin' },
      'operator@demo.internal': { role: 'OPERATOR', name: 'Sam Operator' },
      'viewer@demo.internal': { role: 'VIEWER', name: 'Valerie Viewer' },
    };
    const userObj = roles[email] || { role: 'ADMIN', name: 'Admin User' };
    return ok({
      id: 'mock-user-id',
      email,
      name: userObj.name,
      role: userObj.role,
      organizationId: 'mock-org-id',
      token: 'mock-jwt-token',
    });
  }

  // AUTH LOGOUT
  if (section === 'auth' && id === 'logout') {
    return ok({ message: 'Logged out successfully.' });
  }

  // DETECTION EVALUATE
  if (section === 'detection' && id === 'evaluate' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const decision = r.state === 'VERIFIED_ORPHAN' ? 'VERIFIED_ORPHAN'
      : r.state === 'PROTECTED' ? 'PROTECTED'
        : r.state === 'ACTIVE' ? 'ACTIVE'
          : 'ORPHAN_CANDIDATE';

    const updated = updateResource(sub, {
      detectionState: {
        ...r.detectionState,
        decision,
        confidence: parseFloat((0.88 + Math.random() * 0.11).toFixed(2)),
        evaluatedAt: new Date().toISOString(),
      },
    });
    return ok({ evaluation: { decision, confidence: updated.detectionState.confidence }, resource: { ...updated } });
  }

  // DETECTION SYNC AWS
  if (section === 'detection' && id === 'sync-aws') {
    return ok({ message: 'AWS EC2 resources synchronized locally.' });
  }

  // AI ANALYZE
  if (section === 'ai' && id === 'analyze' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const isOrphan = ['VERIFIED_ORPHAN', 'ORPHAN_CANDIDATE', 'PENDING_RECLAMATION'].includes(r.state);
    const recommendation = isOrphan
      ? { decision: 'RECLAIM', reasoningSummary: 'Deterministic signals confirm orphan status: no heartbeat, no active owner, zero workload. Zero-false-positive safety checks pass. Safe to reclaim.' }
      : { decision: 'PROTECT', reasoningSummary: 'Active ownership, heartbeat, or workload signals present. Resource must remain protected. No reclamation recommended.' };

    const updated = updateResource(sub, {
      detectionState: { ...r.detectionState, aiRecommendation: recommendation },
    });
    return ok({ source: 'GEMINI_ADVISORY_AI', recommendation, resource: { ...updated } });
  }

  // HUMAN REVIEW ACTIONS
  if (section === 'cleanup' && id === 'human-review' && sub && parts[3]) {
    const resourceId = sub;
    const hrAction = parts[3];
    const r = getResource(resourceId);
    if (!r) return fail('NOT_FOUND', `Resource '${resourceId}' not found.`);

    if (r.humanReviewState?.decision && r.humanReviewState.decision !== 'PENDING') {
      return fail('ALREADY_DECIDED', 'Resource human review alert has already been decided.');
    }

    const nowIso = new Date().toISOString();

    if (hrAction === 'protect') {
      const updated = updateResource(resourceId, {
        state: 'PROTECTED',
        humanReviewState: {
          ...r.humanReviewState,
          decision: 'PROTECTED',
          decidedBy: 'operator@demo.internal',
          decidedAt: nowIso,
          decisionReason: body?.reason || 'Operator protected resource',
        },
        lifecycleHistory: [
          ...(r.lifecycleHistory || []),
          { event: 'HUMAN_REVIEW_PROTECTED', timestamp: nowIso, actor: 'operator@demo.internal', details: `Operator protected resource: ${body?.reason || 'No reason provided'}` },
        ],
      });
      recalcAnalytics();
      return ok({ ...updated }, { message: `Resource '${resourceId}' protected by operator.` });
    }

    if (hrAction === 'approve-reclaim') {
      // Re-verify liveness before scheduling
      if (r.heartbeat?.isHeartbeatActive || (r.activity?.metricsCount || 0) > 50 || r.owner?.isActiveOwner) {
        const protectedRes = updateResource(resourceId, {
          state: 'PROTECTED',
          humanReviewState: {
            ...r.humanReviewState,
            decision: 'PROTECTED',
            decidedBy: 'SYSTEM_SAFETY_LIVENESS',
            decidedAt: nowIso,
            decisionReason: 'Liveness signals detected during reclaim approval',
          },
          lifecycleHistory: [
            ...(r.lifecycleHistory || []),
            { event: 'HUMAN_REVIEW_RECLAIM_BLOCKED', timestamp: nowIso, actor: 'SAFETY_ENGINE', details: '🔒 Reclamation blocked: Resource resumed active signals during review.' },
          ],
        });
        recalcAnalytics();
        return fail('RECLAIM_BLOCKED_ACTIVE_SIGNAL', 'Resource exhibits active usage signals. Reclamation blocked and resource protected.');
      }

      const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();
      const updated = updateResource(resourceId, {
        state: 'PENDING_RECLAMATION',
        gracePeriodStartTime: nowIso,
        gracePeriodExpiresAt: expiresAt,
        humanReviewState: {
          ...r.humanReviewState,
          decision: 'RECLAIM_APPROVED',
          decidedBy: 'operator@demo.internal',
          decidedAt: nowIso,
          decisionReason: body?.reason || 'Operator authorized reclamation',
        },
        lifecycleHistory: [
          ...(r.lifecycleHistory || []),
          { event: 'HUMAN_REVIEW_RECLAIM_APPROVED', timestamp: nowIso, actor: 'operator@demo.internal', details: `Operator approved reclaim: ${body?.reason || 'Grace period started'}` },
        ],
        cleanupState: { status: 'PENDING_RECLAMATION', reclaimScheduledAt: nowIso, gracePeriodSeconds: 300, gracePeriodExpiresAt: expiresAt },
      });
      recalcAnalytics();
      return ok({ ...updated }, { gracePeriodSeconds: 300, expiresAt, message: `Reclamation approved. 5-minute grace period scheduled for '${resourceId}'.` });
    }
  }

  // CLEANUP SCHEDULE
  if (section === 'cleanup' && id === 'schedule' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + 300 * 1000).toISOString();

    const updated = updateResource(sub, {
      state: 'PENDING_RECLAMATION',
      gracePeriodStartTime: nowIso,
      gracePeriodExpiresAt: expiresAt,
      livenessStatus: 'MONITORING',
      lifecycleHistory: [
        ...(r.lifecycleHistory || []),
        { event: 'RECLAIM_SCHEDULED', timestamp: nowIso, actor: 'admin@demo.internal', details: 'Two-Phase 5-Minute Grace Period initiated. Liveness monitoring active.' },
      ],
      cleanupState: { status: 'PENDING_RECLAMATION', reclaimScheduledAt: nowIso, gracePeriodSeconds: 300, gracePeriodExpiresAt: expiresAt },
    });
    return ok({ ...updated }, { gracePeriodSeconds: 300, expiresAt });
  }

  // CLEANUP CANCEL
  if (section === 'cleanup' && id === 'cancel' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const nowIso = new Date().toISOString();
    const updated = updateResource(sub, {
      state: 'VERIFIED_ORPHAN',
      gracePeriodStartTime: null,
      gracePeriodExpiresAt: null,
      livenessStatus: 'CANCELLED',
      lifecycleHistory: [
        ...(r.lifecycleHistory || []),
        { event: 'RECLAIM_CANCELLED', timestamp: nowIso, actor: 'admin@demo.internal', details: 'User cancelled 5-minute grace period. Reset to VERIFIED_ORPHAN.' },
      ],
      cleanupState: { status: 'NOT_RECLAIMED' },
    });
    return ok({ ...updated }, { message: `Grace period cancelled for '${sub}'.` });
  }

  // CLEANUP FINALIZE
  if (section === 'cleanup' && id === 'finalize' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const nowIso = new Date().toISOString();
    const updated = updateResource(sub, {
      state: 'RECLAIMED',
      lifecycleHistory: [
        ...(r.lifecycleHistory || []),
        { event: 'RECLAIMED', timestamp: nowIso, actor: 'admin@demo.internal', details: 'Finalized reclamation cleanly.' },
      ],
      cleanupState: { status: 'RECLAIMED', reclaimedAt: nowIso, reclaimedBy: 'admin@demo.internal' },
    });
    return ok({ ...updated }, { cloudResult: { success: true } });
  }

  // CLEANUP DIRECT RECLAIM
  if (section === 'cleanup' && id === 'reclaim' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const nowIso = new Date().toISOString();
    const updated = updateResource(sub, {
      state: 'RECLAIMED',
      lifecycleHistory: [
        ...(r.lifecycleHistory || []),
        { event: 'RECLAIMED', timestamp: nowIso, actor: 'admin@demo.internal', details: 'Direct reclamation completed cleanly.' },
      ],
      cleanupState: { status: 'RECLAIMED', reclaimedAt: nowIso, reclaimedBy: 'admin@demo.internal' },
    });
    return ok({ ...updated }, { cloudResult: { success: true }, message: `Resource '${sub}' reclaimed.` });
  }

  // CLEANUP REVERSE
  if (section === 'cleanup' && id === 'reverse' && sub) {
    const r = getResource(sub);
    if (!r) return fail('NOT_FOUND', 'Resource not found');
    const nowIso = new Date().toISOString();
    const updated = updateResource(sub, {
      state: 'PROTECTED',
      ownershipState: 'ACTIVE_OWNER',
      heartbeat: { isHeartbeatActive: true, lastHeartbeatTime: nowIso },
      lifecycleHistory: [
        ...(r.lifecycleHistory || []),
        { event: 'RECLAIM_REVERSED', timestamp: nowIso, actor: 'admin@demo.internal', details: '🔒 CAUGHT & REVERSED: Resumed activity detected. Returned to PROTECTED.' },
      ],
      cleanupState: { status: 'NOT_RECLAIMED' },
    });
    return ok({ ...updated }, { message: `Reclamation reversed for '${sub}'.` });
  }

  // DEMO GENERATE / SEED
  if (section === 'demo' && (id === 'generate' || id === 'generate-scenario' || id === 'seed')) {
    const uniqueId = Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();
    const newRes = {
      resourceId: `res-pending-${uniqueId}`,
      name: `test-pending-item-${uniqueId}`,
      provider: 'AWS',
      type: 'EC2_INSTANCE',
      environment: 'testing',
      creationTime: nowIso,
      state: 'PENDING_RECLAMATION',
      ownershipState: 'NO_OWNER',
      owner: { email: 'alex.developer@democorp.com', name: 'Alex Developer', isActiveOwner: false },
      activity: { lastActivityTime: nowIso, metricsCount: 0 },
      heartbeat: { lastHeartbeatTime: nowIso, isHeartbeatActive: false },
      adoption: { isAdopted: false },
      gracePeriodStartTime: nowIso,
      gracePeriodExpiresAt: expiresAt,
      livenessStatus: 'MONITORING',
      lifecycleHistory: [
        { event: 'CREATED', timestamp: nowIso, actor: 'test-runner', details: 'Test pending resource created' },
        { event: 'RECLAIM_SCHEDULED', timestamp: nowIso, actor: 'admin@demo.internal', details: '5-Minute Grace Period active.' },
      ],
      detectionState: { decision: 'VERIFIED_ORPHAN', confidence: 0.98, evidence: ['Two-Phase Delete testing item'] },
      cleanupState: { status: 'PENDING_RECLAMATION', reclaimScheduledAt: nowIso, gracePeriodSeconds: 300, gracePeriodExpiresAt: expiresAt },
    };
    store.resources.unshift(newRes);
    recalcAnalytics();
    return ok({ ...newRes });
  }

  console.warn('[MockAPI POST] Unhandled route:', url);
  return ok({});
}

const mockApi = {
  get: handleGet,
  post: handlePost,
  put: async (url, body) => { await delay(100); return ok(body || {}); },
  patch: async (url, body) => { await delay(100); return ok(body || {}); },
};

export default mockApi;
