import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import StatusBadge from '../components/StatusBadge';
import GoldenRuleBanner from '../components/GoldenRuleBanner';
import ConfirmationModal from '../components/ConfirmationModal';
import EmptyState from '../components/EmptyState';
import Tooltip from '../components/Tooltip';
import MagneticButton from '../components/MagneticButton';
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Clock,
  RotateCcw,
  CheckCircle2,
  Zap,
  Inbox,
  Check,
  ShieldCheck,
  FileText,
  Filter,
  XCircle,
  CheckCircle,
  AlertOctagon,
} from 'lucide-react';

export default function CleanupCenterPage() {
  const { hasRole } = useAuth();
  const [orphans, setOrphans] = useState([]);
  const [pending, setPending] = useState([]);
  const [reclaimed, setReclaimed] = useState([]);
  const [humanReviewList, setHumanReviewList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Audit Log State
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResultFilter, setAuditResultFilter] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  useEffect(() => {
    fetchAuditEvents();
  }, [auditResultFilter, auditPage]);

  const fetchAuditEvents = async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (auditResultFilter) params.append('result', auditResultFilter);
      params.append('page', auditPage);
      params.append('limit', 10);

      const res = await api.get(`/audit?${params.toString()}`);
      if (res.success) {
        setAuditEvents(res.data);
        if (res.pagination) setAuditPagination(res.pagination);
      }
    } catch (err) {
      console.error('Audit log fetch error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const renderResultBadge = (result) => {
    switch (result) {
      case 'SUCCESS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: '800', fontSize: '0.78rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
            <CheckCircle size={12} /> Successfully Executed
          </span>
        );
      case 'BLOCKED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: '800', fontSize: '0.78rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <Shield size={12} /> Safely Blocked
          </span>
        );
      case 'FAILURE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: '800', fontSize: '0.78rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
            <AlertOctagon size={12} /> Operation Failed
          </span>
        );
      case 'OVERRIDDEN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: '800', fontSize: '0.78rem', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
            <AlertTriangle size={12} /> Admin Overridden
          </span>
        );
      default:
        return (
          <span style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', fontWeight: '800', fontSize: '0.78rem', backgroundColor: '#18181b', color: '#ffffff', border: '1px solid #3f3f46' }}>
            {result}
          </span>
        );
    }
  };

  // State for Confirmation Modal
  const [modalState, setModalState] = useState({
    isOpen: false,
    resourceId: null,
    resourceName: null,
    title: '',
    description: '',
    confirmText: '',
    actionType: '',
  });

  useEffect(() => {
    fetchCleanupData(true);
    const interval = setInterval(() => {
      fetchCleanupData(false);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchCleanupData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [orphanRes, pendingRes, reclaimedRes, hrRequiredRes, hrNeedsRes] = await Promise.all([
        api.get('/resources?state=VERIFIED_ORPHAN'),
        api.get('/resources?state=PENDING_RECLAMATION'),
        api.get('/resources?state=RECLAIMED'),
        api.get('/resources?state=HUMAN_REVIEW_REQUIRED'),
        api.get('/resources?state=NEEDS_REVIEW'),
      ]);
      if (orphanRes.success) setOrphans(orphanRes.data);
      if (pendingRes.success) setPending(pendingRes.data);
      if (reclaimedRes.success) setReclaimed(reclaimedRes.data);
      
      const combinedHR = [];
      if (hrRequiredRes.success) combinedHR.push(...hrRequiredRes.data);
      if (hrNeedsRes.success) combinedHR.push(...hrNeedsRes.data.filter(r => !combinedHR.some(c => c.resourceId === r.resourceId)));
      setHumanReviewList(combinedHR);
    } catch (err) {
      console.error('Cleanup center fetch error:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleProtectHumanReview = async (resourceId) => {
    setProcessingId(resourceId);
    setFeedback(null);
    try {
      const res = await api.post(`/cleanup/human-review/${resourceId}/protect`, { reason: 'Operator verified resource is required for operations' });
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `🛡️ Human Review Decision Saved: Resource '${resourceId}' marked as PROTECTED. Reclamation blocked.`,
        });
        fetchCleanupData(false);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Protect action failed: ${err.error?.message || err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveHumanReviewReclaim = async (resourceId) => {
    setProcessingId(resourceId);
    setFeedback(null);
    try {
      const res = await api.post(`/cleanup/human-review/${resourceId}/approve-reclaim`, { reason: 'Operator confirmed resource is an unneeded orphan' });
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `⚡ Human Review Approved: Resource '${resourceId}' moved to 5-minute grace period with final liveness monitoring.`,
        });
        fetchCleanupData(false);
      }
    } catch (err) {
      if (err.error?.code === 'RECLAIM_BLOCKED_ACTIVE_SIGNAL') {
        setFeedback({
          type: 'warning',
          text: err.error?.message || '🔒 Reclamation blocked due to active workload signals detected during final safety check.',
        });
        fetchCleanupData(false);
      } else {
        setFeedback({ type: 'error', text: `Reclaim approval failed: ${err.error?.message || err.message}` });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirmModal = (resource, actionType) => {
    if (actionType === 'direct') {
      setModalState({
        isOpen: true,
        resourceId: resource.resourceId,
        resourceName: resource.name,
        title: 'Confirm Immediate Reclamation',
        description: `Are you sure you want to permanently reclaim resource '${resource.resourceId}'? All 15 safety gatekeeper checks have passed cleanly.`,
        confirmText: 'Reclaim Resource Now',
        actionType: 'direct',
      });
    } else if (actionType === 'finalize') {
      setModalState({
        isOpen: true,
        resourceId: resource.resourceId,
        resourceName: resource.name,
        title: 'Finalize Two-Phase Cleanup',
        description: `This will re-verify active liveness signals. If the process remains dead, '${resource.resourceId}' will be permanently deleted.`,
        confirmText: 'Re-verify & Clean Up',
        actionType: 'finalize',
      });
    }
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleExecuteModalAction = async () => {
    const { resourceId, actionType } = modalState;
    if (!resourceId) return;

    if (actionType === 'direct') {
      await handleDirectReclaim(resourceId);
    } else if (actionType === 'finalize') {
      await handleFinalize(resourceId);
    }
    closeModal();
  };

  const handleSchedule2Phase = async (resourceId) => {
    setProcessingId(resourceId);
    setFeedback(null);
    try {
      const res = await api.post(`/cleanup/schedule/${resourceId}`, { gracePeriodSeconds: 300 });
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Phase 1 Initiated: Resource '${resourceId}' marked Pending Confirmation with a 5-minute grace period.`,
        });
        fetchCleanupData();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Schedule failed: ${err.error?.message || err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFinalize = async (resourceId) => {
    setProcessingId(resourceId);
    setFeedback(null);
    try {
      const res = await api.post(`/cleanup/finalize/${resourceId}`);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Phase 2 Completed: Resource '${resourceId}' passed liveness re-verification and was reclaimed cleanly.`,
        });
        fetchCleanupData();
      }
    } catch (err) {
      if (err.error?.code === 'RECLAIM_REVERSED_LIVENESS_DETECTED') {
        setFeedback({
          type: 'warning',
          text: err.error?.message || `🔒 CAUGHT AND REVERSED! Active liveness signal detected during Phase 2. Reclamation cancelled safely.`,
        });
        fetchCleanupData();
      } else {
        setFeedback({ type: 'error', text: `Finalization failed: ${err.error?.message || err.message}` });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReverse = async (resourceId) => {
    setProcessingId(resourceId);
    setFeedback(null);
    try {
      const res = await api.post(`/cleanup/reverse/${resourceId}`, {
        reason: 'Process resumed activity right before deletion (Demo Trigger)',
      });
      if (res.success) {
        setFeedback({
          type: 'warning',
          text: `↺ DEMO CAUGHT & REVERSED: Reclamation for '${resourceId}' cancelled! Resumed process detected; resource returned to Protected.`,
        });
        fetchCleanupData();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Reversal failed: ${err.error?.message || err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDirectReclaim = async (resourceId) => {
    setProcessingId(resourceId);
    setFeedback(null);
    try {
      const res = await api.post(`/cleanup/reclaim/${resourceId}`);
      if (res.success) {
        setFeedback({ type: 'success', text: `Resource '${resourceId}' reclaimed safely.` });
        fetchCleanupData();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Reclamation blocked: ${err.error?.message || err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResetDemo = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await api.post('/demo/seed');
      setFeedback({ type: 'success', text: '⚡ Demo dataset re-seeded successfully! Sample items populated.' });
      fetchCleanupData(false);
    } catch (err) {
      setFeedback({ type: 'error', text: `Seed failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSeedPendingItem = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      await api.post('/demo/generate', { scenarioType: 'GENUINE_ORPHAN' });
      setFeedback({ type: 'success', text: '⚡ Sample pending resource created for testing Two-Phase Delete.' });
      fetchCleanupData(false);
    } catch (err) {
      setFeedback({ type: 'error', text: `Generate failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', color: '#ffffff' }}>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={handleExecuteModalAction}
        title={modalState.title}
        description={modalState.description}
        resourceId={modalState.resourceId}
        resourceName={modalState.resourceName}
        confirmText={modalState.confirmText}
        loading={processingId === modalState.resourceId}
      />



      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            backgroundColor: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : feedback.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${feedback.type === 'error' ? '#ef4444' : feedback.type === 'warning' ? '#f59e0b' : '#22c55e'}`,
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: '800' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Operational Principle Banner */}
      <div
        style={{
          marginBottom: '2rem',
          padding: '1.25rem 1.75rem',
          borderRadius: '20px',
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
        }}
      >
        <AlertOctagon size={32} style={{ flexShrink: 0, color: '#fbbf24' }} />
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b' }}>
            OPERATIONAL SAFETY PRINCIPLE
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', marginTop: '0.15rem' }}>
            "WHEN THE SYSTEM IS UNCERTAIN, IT DOES NOT DELETE — IT ASKS A HUMAN."
          </div>
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
            Automatic cleanup is strictly blocked for resources with ambiguous metrics, conflicting evidence, or unconfirmed ownership until an authorized operator reviews the case.
          </div>
        </div>
      </div>

      {/* HUMAN REVIEW REQUIRED ALERT SECTION */}
      <div className="animated-card card-glass-amber" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem', border: '1.5px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={22} style={{ color: '#fbbf24' }} /> Human Review Alerts ({humanReviewList.length})
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Resources flagged for operator intervention due to detection uncertainty or conflicting signals
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '1.5rem 0' }}>Loading human review alerts...</p>
        ) : humanReviewList.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No Human Review Alerts Pending"
            description="All resources have clear automated decisions (Protected or Verified Orphan). System is operating with high confidence."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {humanReviewList.map((r) => (
              <div
                key={r.resourceId}
                style={{
                  padding: '1.5rem',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <Link to={`/resources/${r.resourceId}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '1.1rem', color: '#fbbf24', textDecoration: 'none' }}>
                        {r.resourceId}
                      </Link>
                      <StatusBadge status={r.state} />
                    </div>
                    <div style={{ color: '#ffffff', fontWeight: '700', fontSize: '0.95rem' }}>{r.name}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {hasRole('ADMIN', 'OPERATOR') ? (
                      <>
                        <MagneticButton
                          onClick={() => handleProtectHumanReview(r.resourceId)}
                          disabled={processingId === r.resourceId}
                          className="btn-outline-cyan"
                          strength={0.2}
                          style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)', gap: '0.4rem' }}
                        >
                          <Shield size={15} /> Protect Resource
                        </MagneticButton>

                        <MagneticButton
                          onClick={() => handleApproveHumanReviewReclaim(r.resourceId)}
                          disabled={processingId === r.resourceId}
                          className="btn-cyan-glow"
                          strength={0.2}
                          style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', backgroundColor: '#f59e0b', gap: '0.4rem' }}
                        >
                          <Zap size={15} /> Approve Reclaim
                        </MagneticButton>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>Operator role required to decide</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontSize: '0.83rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: '600' }}>REASON FOR HUMAN REVIEW</span>
                    <strong style={{ color: '#fbbf24' }}>
                      {r.humanReviewState?.reason || r.detectionState?.evidence?.[0] || 'Uncertain metrics / unconfirmed ownership state'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: '600' }}>OWNER & WORKLOAD STATUS</span>
                    <span style={{ color: '#ffffff' }}>
                      {r.owner?.name || r.owner?.email || 'Unconfirmed Owner'} ({r.activity?.metricsCount || 0} ops recorded)
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: '600' }}>AI RECOM. vs SAFETY ENGINE</span>
                    <span style={{ color: '#ffffff' }}>
                      AI: <strong style={{ color: '#c084fc' }}>{r.detectionState?.aiRecommendation?.decision || 'RECLAIM'}</strong> | Safety: <strong style={{ color: '#fbbf24' }}>{r.state}</strong>
                    </span>
                  </div>

                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '0.2rem', fontWeight: '600' }}>HEARTBEAT & ADOPTION</span>
                    <span style={{ color: '#ffffff' }}>
                      Heartbeat: {r.heartbeat?.isHeartbeatActive ? 'Active' : (r.heartbeat?.lastHeartbeatTime ? 'Present, but not responding' : 'Unresponsive')} | Adopted: {r.adoption?.isAdopted ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1: Two-Phase Delete Pending Grace Period List */}
      <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem', animationDelay: '0.05s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={22} style={{ color: '#c084fc' }} /> Step 1: Pending Confirmation (Grace Period) ({pending.length})
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Resources scheduled for cleanup undergoing 5-minute final liveness monitoring
            </p>
          </div>

        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '1.5rem 0' }}>Loading pending cleanup items...</p>
        ) : pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <EmptyState
              icon={Clock}
              title="No Items Pending Confirmation"
              description="There are currently no resources in the 5-minute grace period. Select a ready resource below or create a test pending item to evaluate."
            />
            <button
              onClick={handleSeedPendingItem}
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1.4rem',
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '9999px',
                fontWeight: '800',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(255, 255, 255, 0.25)',
              }}
            >
              ⚡ Create Test Pending Item
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(34, 211, 238, 0.2)', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 0.85rem' }}>RESOURCE ID</th>
                  <th style={{ padding: '1rem 0.85rem' }}>NAME</th>
                  <th style={{ padding: '1rem 0.85rem' }}>STATE</th>
                  <th style={{ padding: '1rem 0.85rem' }}>GRACE EXPIRES</th>
                  <th style={{ padding: '1rem 0.85rem' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.resourceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '1rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#c084fc' }}>
                      <Link to={`/resources/${r.resourceId}`} style={{ color: '#c084fc', textDecoration: 'none' }}>
                        {r.resourceId}
                      </Link>
                    </td>
                    <td style={{ padding: '1rem 0.85rem', color: '#ffffff', fontWeight: '700' }}>{r.name}</td>
                    <td style={{ padding: '1rem 0.85rem' }}>
                      <StatusBadge status={r.state} />
                    </td>
                    <td style={{ padding: '1rem 0.85rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      {r.cleanupState?.reclaimGracePeriodExpiresAt
                        ? new Date(r.cleanupState.reclaimGracePeriodExpiresAt).toLocaleTimeString()
                        : 'Active Countdown'}
                    </td>
                    <td style={{ padding: '1rem 0.85rem' }}>
                      {hasRole('ADMIN', 'OPERATOR') ? (
                        <div style={{ display: 'flex', gap: '0.65rem' }}>
                          <Tooltip content="Re-verify process activity and complete safe cleanup">
                            <MagneticButton
                              onClick={() => openConfirmModal(r, 'finalize')}
                              disabled={processingId === r.resourceId}
                              className="btn-cyan-glow"
                              strength={0.25}
                              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', gap: '0.4rem' }}
                            >
                              <Zap size={14} />
                              {processingId === r.resourceId ? 'Verifying...' : 'Finalize Cleanup'}
                            </MagneticButton>
                          </Tooltip>

                          <Tooltip content="Simulate process activity to trigger Caught & Reversed safety protection">
                            <MagneticButton
                              onClick={() => handleReverse(r.resourceId)}
                              disabled={processingId === r.resourceId}
                              className="btn-outline-cyan"
                              strength={0.25}
                              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', gap: '0.4rem', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
                            >
                              <RotateCcw size={14} />
                              Simulate Resumed Process
                            </MagneticButton>
                          </Tooltip>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Operator Role Required</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Verified Orphans List */}
      <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', marginBottom: '2rem', animationDelay: '0.1s' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AlertTriangle size={22} style={{ color: '#f43f5e' }} /> Resources Ready for Cleanup ({orphans.length})
        </h2>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '1.5rem 0' }}>Loading resources ready for cleanup...</p>
        ) : orphans.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="All Systems Clean"
            description="There are currently no verified orphan resources requiring cleanup."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(34, 211, 238, 0.2)', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 0.85rem' }}>RESOURCE ID</th>
                  <th style={{ padding: '1rem 0.85rem' }}>NAME</th>
                  <th style={{ padding: '1rem 0.85rem' }}>TYPE</th>
                  <th style={{ padding: '1rem 0.85rem' }}>EVIDENCE SUMMARY</th>
                  <th style={{ padding: '1rem 0.85rem' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {orphans.map((r) => (
                  <tr key={r.resourceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '1rem 0.85rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#f43f5e' }}>
                      <Link to={`/resources/${r.resourceId}`} style={{ color: '#f43f5e', textDecoration: 'none' }}>
                        {r.resourceId}
                      </Link>
                    </td>
                    <td style={{ padding: '1rem 0.85rem', color: '#ffffff', fontWeight: '700' }}>{r.name}</td>
                    <td style={{ padding: '1rem 0.85rem', color: '#94a3b8' }}>{r.type}</td>
                    <td style={{ padding: '1rem 0.85rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                      {r.owner?.name || r.owner?.email || 'Alex Developer'} &bull; Crashed pipeline &bull; Heartbeat unresponsive
                    </td>
                    <td style={{ padding: '1rem 0.85rem' }}>
                      {hasRole('ADMIN', 'OPERATOR') ? (
                        <div style={{ display: 'flex', gap: '0.65rem' }}>
                          <Tooltip content="Schedule two-phase cleanup with a 5-minute grace period">
                            <MagneticButton
                              onClick={() => handleSchedule2Phase(r.resourceId)}
                              disabled={processingId === r.resourceId}
                              className="btn-outline-cyan"
                              strength={0.25}
                              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', gap: '0.4rem' }}
                            >
                              <Clock size={14} /> Schedule 2-Phase Delete
                            </MagneticButton>
                          </Tooltip>

                          <Tooltip content="Instantly reclaim verified orphan with multi-gatekeeper verification">
                            <MagneticButton
                              onClick={() => openConfirmModal(r, 'direct')}
                              disabled={processingId === r.resourceId}
                              className="btn-cyan-glow"
                              strength={0.25}
                              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', gap: '0.4rem', backgroundColor: '#f43f5e' }}
                            >
                              <Shield size={14} /> Direct Reclaim
                            </MagneticButton>
                          </Tooltip>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Operator Role Required</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: Immutable Operations Audit Trail */}
      <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', animationDelay: '0.15s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={22} color="#ffffff" /> Immutable Operations Audit Trail
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Compliance history tracking all detection scans, safety gatekeeper checks, and reclamation events
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <select
              value={auditResultFilter}
              onChange={(e) => { setAuditResultFilter(e.target.value); setAuditPage(1); }}
              aria-label="Filter Audit Log Outcome"
              style={{ padding: '0.5rem 1rem', background: '#09090b', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '9999px', color: '#ffffff', fontSize: '0.82rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">Successfully Executed</option>
              <option value="BLOCKED">Safely Blocked</option>
              <option value="FAILURE">Operation Failed</option>
              <option value="OVERRIDDEN">Admin Overridden</option>
            </select>
            <button
              onClick={fetchAuditEvents}
              style={{ padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '9999px', color: '#ffffff', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} className={auditLoading ? 'spin' : ''} /> Refresh Trail
            </button>
          </div>
        </div>

        {auditLoading ? (
          <p style={{ color: '#94a3b8', padding: '1.5rem 0' }}>Loading audit history entries...</p>
        ) : auditEvents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No audit history recorded yet"
            description="System activity like candidate detection, safety gatekeeper checks, and reclamation actions will appear here automatically."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 0.85rem' }}>TIMESTAMP</th>
                  <th style={{ padding: '1rem 0.85rem' }}>USER / ROLE</th>
                  <th style={{ padding: '1rem 0.85rem' }}>ACTION</th>
                  <th style={{ padding: '1rem 0.85rem' }}>RESOURCE</th>
                  <th style={{ padding: '1rem 0.85rem' }}>OUTCOME</th>
                  <th style={{ padding: '1rem 0.85rem' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((evt) => (
                  <tr key={evt._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '0.9rem 0.85rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.9rem 0.85rem', color: '#ffffff', fontWeight: '600' }}>
                      {evt.actorEmail} <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700' }}>({evt.actorRole})</span>
                    </td>
                    <td style={{ padding: '0.9rem 0.85rem', fontWeight: '700', color: '#ffffff' }}>{evt.action}</td>
                    <td style={{ padding: '0.9rem 0.85rem', fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: '600' }}>
                      {evt.resourceId || 'N/A'}
                    </td>
                    <td style={{ padding: '0.9rem 0.85rem' }}>
                      {renderResultBadge(evt.result)}
                    </td>
                    <td style={{ padding: '0.9rem 0.85rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      {evt.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {auditPagination.pages > 1 && (
              <div style={{ padding: '1rem 0.85rem 0 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                <div>Page <strong style={{ color: '#ffffff' }}>{auditPagination.page}</strong> of <strong style={{ color: '#ffffff' }}>{auditPagination.pages}</strong> ({auditPagination.total} Events)</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', cursor: auditPage <= 1 ? 'not-allowed' : 'pointer', opacity: auditPage <= 1 ? 0.4 : 1, fontSize: '0.78rem' }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditPage >= auditPagination.pages}
                    onClick={() => setAuditPage((p) => Math.min(auditPagination.pages, p + 1))}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', cursor: auditPage >= auditPagination.pages ? 'not-allowed' : 'pointer', opacity: auditPage >= auditPagination.pages ? 0.4 : 1, fontSize: '0.78rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
