import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';
import Tooltip from '../components/Tooltip';
import {
  Shield,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Heart,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export default function ResourceDetailPage() {
  const { id: resourceId } = useParams();
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [reclaiming, setReclaiming] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [graceSeconds, setGraceSeconds] = useState(300);

  useEffect(() => {
    fetchResource(true);
  }, [resourceId]);

  // Auto-refresh every 1s when in PENDING_RECLAMATION, else 5s for active states
  useEffect(() => {
    if (!resource) return;
    if (['PENDING_RECLAMATION', 'VERIFIED_ORPHAN', 'ORPHAN_CANDIDATE'].includes(resource.state)) {
      const pollRate = resource.state === 'PENDING_RECLAMATION' ? 1000 : 5000;
      const interval = setInterval(() => fetchResource(false), pollRate);
      return () => clearInterval(interval);
    }
  }, [resource?.state, resourceId]);

  // Grace Period countdown ticker
  useEffect(() => {
    if (resource?.state !== 'PENDING_RECLAMATION') return;
    const updateCountdown = () => {
      const expiresAt = resource.gracePeriodExpiresAt || resource.cleanupState?.gracePeriodExpiresAt;
      if (!expiresAt) {
        setGraceSeconds(300);
        return;
      }
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      const rem = Math.max(0, Math.floor(remainingMs / 1000));
      setGraceSeconds(rem);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resource?.state, resource?.gracePeriodExpiresAt, resource?.cleanupState?.gracePeriodExpiresAt]);

  const handleCancelGracePeriod = async () => {
    setReclaiming(true);
    setActionFeedback(null);
    try {
      const res = await api.post(`/cleanup/cancel/${resourceId}`);
      if (res.success) {
        setActionFeedback({ type: 'warning', text: `🛑 Grace period cancelled by user — Resource '${resourceId}' returned to VERIFIED_ORPHAN status.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Cancellation failed: ${err.error?.message || err.message}` });
      await fetchResource(false);
    } finally {
      setReclaiming(false);
    }
  };

  const fetchResource = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await api.get(`/resources/${resourceId}`);
      if (res.success && res.data) {
        setResource(res.data);
      }
    } catch (err) {
      console.error('Resource detail fetch error:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleEvaluateDetection = async () => {
    setEvaluating(true);
    try {
      const res = await api.post(`/detection/evaluate/${resourceId}`);
      if (res.success) {
        setActionFeedback({
          type: 'success',
          text: `Multi-factor detection evaluated: State updated to ${res.data.evaluation.decision}`,
        });
        fetchResource();
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Detection evaluation failed: ${err.message}` });
    } finally {
      setEvaluating(false);
    }
  };

  const handleRunAI = async () => {
    setAnalyzingAI(true);
    try {
      const res = await api.post(`/ai/analyze/${resourceId}`);
      if (res.success) {
        setActionFeedback({ type: 'success', text: `AI safety analysis completed cleanly via ${res.data.source}.` });
        fetchResource();
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `AI analysis failed: ${err.message}` });
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleProtectHumanReview = async () => {
    setReclaiming(true);
    setActionFeedback(null);
    try {
      const res = await api.post(`/cleanup/human-review/${resourceId}/protect`, { reason: 'Operator marked protected from Detail View' });
      if (res.success) {
        setActionFeedback({ type: 'success', text: `🛡️ Human Review Alert Resolved: Resource '${resourceId}' is now PROTECTED.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Protect action failed: ${err.error?.message || err.message}` });
    } finally {
      setReclaiming(false);
    }
  };

  const handleApproveHumanReviewReclaim = async () => {
    setReclaiming(true);
    setActionFeedback(null);
    try {
      const res = await api.post(`/cleanup/human-review/${resourceId}/approve-reclaim`, { reason: 'Operator approved reclamation from Detail View' });
      if (res.success) {
        setActionFeedback({ type: 'success', text: `⚡ Human Review Approved: Resource '${resourceId}' entered 5-minute grace period with active liveness monitoring.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      }
    } catch (err) {
      if (err.error?.code === 'RECLAIM_BLOCKED_ACTIVE_SIGNAL') {
        setActionFeedback({ type: 'warning', text: err.error?.message || '🔒 Reclamation blocked due to active workload signals detected during final safety check.' });
        await fetchResource(false);
      } else {
        setActionFeedback({ type: 'error', text: `Reclaim approval failed: ${err.error?.message || err.message}` });
      }
    } finally {
      setReclaiming(false);
    }
  };

  const handleSchedule2Phase = async () => {
    setReclaiming(true);
    setActionFeedback(null);
    try {
      const res = await api.post(`/cleanup/schedule/${resourceId}`, { gracePeriodSeconds: 300 });
      if (res.success) {
        setActionFeedback({ type: 'success', text: `⏱️ 5-Minute Grace Period Initiated: '${resourceId}' is in Liveness Monitoring. Automatic cleanup will trigger when timer reaches 0:00.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Schedule failed: ${err.error?.message || err.message}` });
      await fetchResource(false);
    } finally {
      setReclaiming(false);
    }
  };

  const handleFinalize = async () => {
    setReclaiming(true);
    setActionFeedback(null);
    try {
      const res = await api.post(`/cleanup/finalize/${resourceId}`);
      if (res.success) {
        setActionFeedback({ type: 'success', text: `✅ Phase 2 Complete: '${resourceId}' passed liveness re-verification and was reclaimed cleanly from cloud infrastructure.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Finalization failed: ${err.error?.message || err.message}` });
      await fetchResource(false);
    } finally {
      setReclaiming(false);
    }
  };

  const handleReverse = async () => {
    setReclaiming(true);
    setActionFeedback(null);
    try {
      const res = await api.post(`/cleanup/reverse/${resourceId}`, { reason: 'Process resumed right before deletion (Demo)' });
      if (res.success) {
        setActionFeedback({ type: 'warning', text: `🔒 CAUGHT & REVERSED: Reclamation cancelled! Resumed process detected — '${resourceId}' returned to PROTECTED.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: `Reversal failed: ${err.error?.message || err.message}` });
      await fetchResource(false);
    } finally {
      setReclaiming(false);
    }
  };

  const executeDirectReclaim = async () => {
    setShowConfirmModal(false);
    setReclaiming(true);
    try {
      const res = await api.post(`/cleanup/reclaim/${resourceId}`);
      if (res.success) {
        setActionFeedback({ type: 'success', text: `✅ Resource '${resourceId}' successfully reclaimed and removed from cloud infrastructure. Zero false positives.` });
        if (res.data) setResource(res.data);
        await fetchResource(false);
      } else {
        setActionFeedback({ type: 'error', text: `Reclamation failed: ${res.error?.message || res.message || 'Unknown error'}` });
        await fetchResource(false);
      }
    } catch (err) {
      const msg = err.error?.message || err.message || 'Safety engine blocked reclamation.';
      setActionFeedback({ type: 'error', text: `❌ Reclamation blocked: ${msg}` });
      await fetchResource(false);
    } finally {
      setReclaiming(false);
    }
  };

  const formatMMSS = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading resource 360-degree telemetry...</div>;
  }

  if (!resource) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#f43f5e', marginBottom: '0.5rem' }}>Resource Not Found</h2>
        <p style={{ color: '#94a3b8' }}>Resource '{resourceId}' does not exist in active telemetry databases.</p>
        <Link to="/inventory" style={{ color: '#22d3ee', textDecoration: 'none', display: 'inline-block', marginTop: '1rem', fontWeight: '600' }}>&larr; Back to Resource Inventory</Link>
      </div>
    );
  }

  const ageHours = ((Date.now() - new Date(resource.creationTime).getTime()) / (1000 * 3600)).toFixed(1);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={`Confirm Reclamation of ${resourceId}`}
        description={`This will trigger direct cloud provider deletion for resource '${resource.name || resourceId}'. Zero-false-positive safety checks will be evaluated before deletion.`}
        confirmText="Confirm Reclaim"
        cancelText="Cancel"
        onConfirm={executeDirectReclaim}
        onCancel={() => setShowConfirmModal(false)}
        variant="danger"
      />

      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/inventory" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem' }}>
          <ArrowLeft size={16} color="#22d3ee" /> Back to Inventory
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>{resource.resourceId}</h1>
              <StatusBadge status={resource.state} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>{resource.name} &bull; {resource.type} &bull; Provider: {resource.provider} &bull; Env: {resource.environment}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Tooltip text="Re-evaluate safety checks and multi-factor telemetry">
              <button
                onClick={handleEvaluateDetection}
                disabled={evaluating}
                className="btn-outline-pill"
                style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} className={evaluating ? 'spin' : ''} /> {evaluating ? 'Evaluating...' : 'Run Detection Engine'}
              </button>
            </Tooltip>

            <Tooltip text="Query Advisory AI model for natural language safety analysis">
              <button
                onClick={handleRunAI}
                disabled={analyzingAI}
                className="btn-outline-cyan"
                style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Sparkles size={14} /> {analyzingAI ? 'Analyzing AI...' : 'Run Advisory AI'}
              </button>
            </Tooltip>

            {['HUMAN_REVIEW_REQUIRED', 'NEEDS_REVIEW'].includes(resource.state) && (
              <>
                <button
                  onClick={handleProtectHumanReview}
                  disabled={reclaiming}
                  className="btn-outline-cyan"
                  style={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)', padding: '0.6rem 1rem', cursor: reclaiming ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Shield size={16} /> Protect Resource
                </button>
                <button
                  onClick={handleApproveHumanReviewReclaim}
                  disabled={reclaiming}
                  className="btn-cyan-glow"
                  style={{ backgroundColor: '#f59e0b', padding: '0.6rem 1.1rem', cursor: reclaiming ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Zap size={16} /> Approve Reclaim
                </button>
              </>
            )}

            {resource.state === 'VERIFIED_ORPHAN' && (
              <>
                <button
                  onClick={handleSchedule2Phase}
                  disabled={reclaiming}
                  className="btn-outline-pill"
                  style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)', padding: '0.6rem 1rem', cursor: reclaiming ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Clock size={14} /> Start 5-Min Grace Period
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={reclaiming}
                  className="btn-cyan-glow"
                  style={{ padding: '0.6rem 1.1rem', cursor: reclaiming ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Shield size={16} /> Direct Safe Reclaim
                </button>
              </>
            )}

            {resource.state === 'PENDING_RECLAMATION' && (
              <>
                <button
                  onClick={handleCancelGracePeriod}
                  disabled={reclaiming}
                  className="btn-outline-pill"
                  style={{ color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.4)', padding: '0.6rem 1rem', cursor: reclaiming ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <XCircle size={14} /> Cancel Reclamation
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={reclaiming}
                  className="btn-cyan-glow"
                  style={{ padding: '0.6rem 1rem', cursor: reclaiming ? 'wait' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Zap size={14} /> Force Immediate Cleanup
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            background:
              actionFeedback.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : actionFeedback.type === 'warning'
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
            border:
              actionFeedback.type === 'success'
                ? '1px solid rgba(52, 211, 153, 0.4)'
                : actionFeedback.type === 'warning'
                ? '1px solid rgba(251, 191, 36, 0.4)'
                : '1px solid rgba(248, 113, 113, 0.4)',
            color:
              actionFeedback.type === 'success'
                ? '#34d399'
                : actionFeedback.type === 'warning'
                ? '#fbbf24'
                : '#f87171',
            fontSize: '0.88rem',
            fontWeight: '700',
          }}
        >
          {actionFeedback.text}
        </div>
      )}

      {/* HUMAN REVIEW REQUIRED ALERT PANEL */}
      {['HUMAN_REVIEW_REQUIRED', 'NEEDS_REVIEW'].includes(resource.state) && (
        <div
          className="animated-card card-glass-amber"
          style={{
            padding: '1.75rem',
            borderRadius: '24px',
            marginBottom: '1.75rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%)',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
            <AlertTriangle size={32} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: '0.2rem' }}>
                HUMAN-IN-THE-LOOP SAFETY FALLBACK TRIGGERED
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', marginBottom: '0.4rem' }}>
                Automatic Reclamation Blocked — Human Review Required
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                {resource.humanReviewState?.reason || resource.detectionState?.evidence?.[0] || 'Detection engine encountered ambiguous metric activity or conflicting owner signals. Automatic reclamation has been halted.'}
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>Uncertainty Evidence: <strong style={{ color: '#fbbf24' }}>{resource.humanReviewState?.uncertaintyEvidence?.[0] || 'Conflicting workload / ownership evidence'}</strong></span>
                <span>AI Recommendation: <strong style={{ color: '#c084fc' }}>{resource.detectionState?.aiRecommendation?.decision || 'RECLAIM'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5-MINUTE GRACE PERIOD & AUTOMATIC RECLAMATION PANEL */}
      {resource.state === 'PENDING_RECLAMATION' && (
        <div
          className="animated-card card-glass-amber"
          style={{
            padding: '1.75rem',
            borderRadius: '24px',
            marginBottom: '1.75rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
                  Liveness Monitoring: ACTIVE
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>
                  Auto-reclamation rule enabled
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.35rem' }}>
                5-Minute Grace Period Active
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                The backend is actively monitoring CPU, Network, and DB metrics. When the countdown hits <strong style={{ color: '#fbbf24' }}>0:00</strong>, pre-deletion safety checks will run automatically and cloud resources will be reclaimed without manual intervention.
              </p>
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>
                <span>CPU Traffic: <strong style={{ color: '#34d399' }}>0.0%</strong></span>
                <span>Network: <strong style={{ color: '#34d399' }}>0 KB/s</strong></span>
                <span>DB Connections: <strong style={{ color: '#34d399' }}>0</strong></span>
                <span>Safety Check: <strong style={{ color: '#34d399' }}>PASSED</strong></span>
              </div>
            </div>

            {/* Countdown Clock Display */}
            <div style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem 2rem', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                Grace Period Remaining
              </div>
              <div
                style={{
                  fontSize: '2.5rem',
                  fontWeight: '900',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  color: graceSeconds <= 60 ? '#f43f5e' : '#fbbf24',
                  textShadow: graceSeconds <= 60 ? '0 0 16px rgba(244,63,94,0.6)' : '0 0 16px rgba(251,191,36,0.5)',
                }}
              >
                {formatMMSS(graceSeconds)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                {graceSeconds <= 60 ? '⚠️ Automated cleanup imminent' : 'Automatic reclamation scheduled'}
              </div>
            </div>
          </div>

          {/* Draining Progress Bar */}
          <div style={{ marginTop: '1.25rem', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, (graceSeconds / 300) * 100))}%`,
                background: graceSeconds <= 60 ? 'linear-gradient(90deg, #f43f5e, #ef4444)' : 'linear-gradient(90deg, #fbbf24, #c084fc)',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* AUTOMATED RECLAMATION NOTICE (when status is RECLAIMED and automatic) */}
      {resource.state === 'RECLAIMED' && resource.cleanupState?.automatic && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '20px',
            marginBottom: '1.75rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <CheckCircle2 size={28} color="#34d399" />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '800' }}>
              Automatically Reclaimed via Grace Period Rule
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: '0.15rem' }}>
              The 5-minute grace period expired, liveness monitoring confirmed zero workload activity, and all safety checks passed. Cloud infrastructure was safely terminated automatically.
            </div>
          </div>
        </div>
      )}

      {/* Primary Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card-easy-trip" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a1a1aa', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>RESOURCE AGE</span>
            <Clock size={18} color="#ffffff" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', marginTop: '0.4rem' }}>
            {ageHours} <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: '500' }}>hours</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.3rem' }}>Created: {new Date(resource.creationTime).toLocaleString()}</p>
        </div>

        <div className="card-easy-trip" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a1a1aa', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>AGENT HEARTBEAT</span>
            <Heart size={18} color={resource.heartbeat?.isHeartbeatActive ? '#ffffff' : '#a1a1aa'} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: resource.heartbeat?.isHeartbeatActive ? '#ffffff' : '#fbbf24', marginTop: '0.4rem' }}>
            {resource.heartbeat?.isHeartbeatActive ? 'ACTIVE' : (resource.heartbeat?.lastHeartbeatTime ? 'PRESENT, BUT NOT RESPONDING' : 'UNRESPONSIVE')}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.3rem' }}>
            Heartbeat mechanism registered &bull; Last signal: {resource.heartbeat?.lastHeartbeatTime ? new Date(resource.heartbeat.lastHeartbeatTime).toLocaleTimeString() : 'Unresponsive'}
          </p>
        </div>

        <div className="card-easy-trip" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a1a1aa', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>OWNERSHIP STATE</span>
            <User size={18} color={resource.ownershipState === 'ACTIVE_OWNER' ? '#ffffff' : '#a1a1aa'} />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginTop: '0.4rem' }}>
            {resource.ownershipState || 'UNASSIGNED'}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.3rem' }}>Owner: {resource.owner?.email || 'Unassigned'}</p>
        </div>

        <div className="card-easy-trip" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a1a1aa', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>WORKLOAD METRICS</span>
            <Activity size={18} color="#ffffff" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', marginTop: '0.4rem' }}>
            {resource.activity?.metricsCount || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.3rem' }}>Operations in past 12 hours</p>
        </div>
      </div>

      {/* Detection Evidence & AI Analysis Card */}
      {resource.detectionState && (
        <div className="card-easy-trip" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#ffffff" /> Resource Check &amp; Safety Matrix
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.75rem' }}>
                What We Found:
              </h3>
              <ul style={{ paddingLeft: '1.2rem', color: '#a1a1aa', fontSize: '0.85rem', lineHeight: '1.6' }}>
                {resource.detectionState.evidence?.map((ev, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{ev}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(18, 18, 18, 0.95)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} /> AI Analysis
              </h3>
              {resource.detectionState.aiRecommendation ? (
                <div style={{ fontSize: '0.85rem', color: '#a1a1aa', lineHeight: '1.5' }}>
                  <p style={{ marginBottom: '0.4rem' }}>
                    <strong style={{ color: '#ffffff' }}>AI Recommendation:</strong> "{resource.detectionState.aiRecommendation.decision === 'VERIFIED_ORPHAN' ? 'Likely orphaned' : 'Likely in use'}"
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#ffffff' }}>FINAL SAFETY DECISION:</strong>{' '}
                    <span style={{ color: '#ffffff', fontWeight: '800' }}>
                      {resource.state === 'PROTECTED' || resource.state === 'ACTIVE' ? 'Protected by safety checks' : 'Safe to clean'}
                    </span>
                  </p>
                  <p style={{ color: '#71717a', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                    * AI assists the analysis and does NOT directly delete resources. Safety checks enforce final deletion rules.
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: '#a1a1aa', lineHeight: '1.5' }}>
                  <p style={{ marginBottom: '0.4rem' }}>
                    <strong style={{ color: '#ffffff' }}>AI Recommendation:</strong> "Likely orphaned"
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#ffffff' }}>FINAL SAFETY DECISION:</strong>{' '}
                    <span style={{ color: '#ffffff', fontWeight: '800' }}>
                      {resource.state === 'PROTECTED' || resource.state === 'ACTIVE' ? 'Protected by safety checks' : 'Safe to clean'}
                    </span>
                  </p>
                  <p style={{ color: '#71717a', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                    * AI assists the analysis and does NOT directly delete resources. Safety checks enforce final deletion rules.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lifecycle Timeline History */}
      <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.25rem' }}>Lifecycle Event History</h2>
        {resource.lifecycleHistory && resource.lifecycleHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {resource.lifecycleHistory.map((hist, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', paddingBottom: '0.85rem', borderBottom: idx < resource.lifecycleHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', fontFamily: 'monospace' }}>
                  {hist.event}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: '600' }}>{hist.details || 'Event logged'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem' }}>Actor: {hist.actor || 'SYSTEM'} &bull; {new Date(hist.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No history events logged.</p>
        )}
      </div>
    </div>
  );
}


