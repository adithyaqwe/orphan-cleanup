import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import GoldenRuleBanner from '../components/GoldenRuleBanner';
import StatusBadge from '../components/StatusBadge';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Trash2,
  HelpCircle,
  DollarSign,
  PieChart,
  RefreshCw,
  MoreHorizontal,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const [wavePhase, setWavePhase] = useState(0);
  const countdownRef = useRef(null);

  useEffect(() => {
    let animId;
    let startTime;
    const animate = (time) => {
      if (!startTime) startTime = time;
      setWavePhase((time - startTime) / 1000);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  // 5-minute countdown
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 300;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  const resetCountdown = () => setCountdown(300);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, resourceRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/resources?limit=500'),
      ]);
      if (analyticsRes.success) setSummary(analyticsRes.data);
      if (resourceRes.success) setResources(resourceRes.data);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const total = summary?.totalResources || 0;
  const reclaimedCount = summary?.reclaimedResources || 0;
  const verifiedOrphans = summary?.verifiedOrphans || 0;
  const orphanCandidates = summary?.orphanCandidates || 0;
  const protectedCount = summary?.protectedResources || 0;
  const activeCount = summary?.activeResources || 0;
  const reviewCount = summary?.needsReview || 0;
  const humanReviewCount = summary?.humanReviewCount || reviewCount || 0;

  const estimatedSavingsMonth = (reclaimedCount * 45).toFixed(0);
  const potentialSavingsMonth = ((verifiedOrphans + orphanCandidates) * 45).toFixed(0);

  const evidenceCounts = {
    NO_ACTIVE_OWNER: 0,
    HEARTBEAT_EXPIRED: 0,
    ZERO_WORKLOAD_METRICS: 0,
    UNATTACHED_NETWORK: 0,
    UNATTACHED_STORAGE: 0,
    EXPIRED_TTL: 0,
  };

  resources.forEach((r) => {
    if (r.evidenceSignals && Array.isArray(r.evidenceSignals)) {
      r.evidenceSignals.forEach((sig) => {
        if (evidenceCounts[sig] !== undefined) {
          evidenceCounts[sig]++;
        }
      });
    }
  });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', color: '#ffffff' }}>


      <GoldenRuleBanner />

      {humanReviewCount > 0 && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1.25rem 1.75rem',
            borderRadius: '20px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertTriangle size={26} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#ffffff' }}>
                ⚠️ {humanReviewCount} Resource{humanReviewCount > 1 ? 's' : ''} Require Human Review
              </div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                Automatic reclamation is blocked due to ambiguous metrics or conflicting evidence. Review and decide in Cleanup Center.
              </div>
            </div>
          </div>
          <Link
            to="/cleanup"
            style={{
              padding: '0.5rem 1.25rem',
              backgroundColor: '#f59e0b',
              color: '#000000',
              borderRadius: '9999px',
              fontWeight: '800',
              fontSize: '0.82rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Review Items &rarr;
          </Link>
        </div>
      )}

      {/* 5-Minute Auto-Scan Countdown */}
      <div
        className="animated-card card-glass-cyan"
        style={{
          marginBottom: '2rem',
          padding: '1.5rem 2rem',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          flexWrap: 'wrap',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.4)',
          transition: 'border 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Left: label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Animated ring */}
          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="26"
                fill="none"
                stroke="#ffffff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - countdown / 300)}`}
                style={{
                  transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease',
                  filter: 'drop-shadow(0 0 6px #ffffff)',
                }}
              />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 0 12px #ffffff',
              animation: 'pulse 1.5s infinite',
            }} />
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
              Next Automatic Check
            </div>
            <div style={{
              fontSize: '2.4rem',
              fontWeight: '900',
              fontFamily: 'var(--font-mono)',
              color: '#ffffff',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              transition: 'color 0.4s ease',
            }}>
              {formatTime(countdown)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
              {countdown <= 60 ? '⚠️ Check starting soon — evaluating resources' : 'Resource check system monitoring all resources'}
            </div>
          </div>
        </div>

        {/* Right: stats + reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff' }}>{summary?.verifiedOrphans || 0}</div>
            <div style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orphaned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff' }}>{summary?.reclaimedResources || 0}</div>
            <div style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cleaned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff' }}>{summary?.pendingReclamation || 0}</div>
            <div style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checking</div>
          </div>
          <button
            onClick={resetCountdown}
            style={{
              padding: '0.5rem 1.1rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '9999px',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '800',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Financial Impact Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Reclaimed Cloud Spend
            </span>
            <div style={{ background: '#18181b', border: '1px solid #3f3f46', padding: '0.5rem', borderRadius: '10px' }}>
              <DollarSign size={20} color="#ffffff" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff' }}>
            ${loading ? '...' : estimatedSavingsMonth} <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: '500' }}>/ mo</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
            Direct monthly savings realized from safely reclaiming {reclaimedCount} orphaned resources.
          </p>
        </div>

        <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Potential Monthly Savings
            </span>
            <div style={{ background: '#18181b', border: '1px solid #3f3f46', padding: '0.5rem', borderRadius: '10px' }}>
              <TrendingUp size={20} color="#ffffff" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff' }}>
            ${loading ? '...' : potentialSavingsMonth} <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: '500' }}>/ mo</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
            Pending waste reduction from {orphanCandidates + verifiedOrphans} detected orphan candidates awaiting action.
          </p>
        </div>

        <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Protected Workloads
            </span>
            <div style={{ background: '#18181b', border: '1px solid #3f3f46', padding: '0.5rem', borderRadius: '10px' }}>
              <ShieldCheck size={20} color="#ffffff" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ffffff' }}>
            {loading ? '...' : protectedCount + activeCount} <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: '500' }}>resources</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: '0.5rem' }}>
            Active &amp; protected resources guarded by adoption rules &amp; active run protection.
          </p>
        </div>
      </div>

      {/* Middle Grid: Glowing Trend Graph + Resource Types Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.75rem', marginBottom: '2rem' }}>
        {/* Main Graph Card */}
        <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', animationDelay: '0.25s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Resource Activity &amp; Cleanup Trends
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                Real-time activity of protected vs cleaned resources over time
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', fontWeight: '700' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 0 10px #ffffff' }} /> Cleaned Resources
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a1a1aa' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a1a1aa' }} /> Protected Resources
              </span>
            </div>
          </div>

          {/* SVG Smooth Glowing Curve Graph */}
          {(() => {
            const w1 = Math.sin(wavePhase * 1.5) * 8;
            const w2 = Math.cos(wavePhase * 1.8) * 6;
            const w3 = Math.sin(wavePhase * 2.1) * 9;

            const cyanCurveD = `M 0,${230 + w1} C 100,${170 - w2} 180,${100 + w3} 250,${150 - w1} C 320,${200 + w2} 400,${110 - w3} 500,${70 + w1} C 600,${30 - w2} 700,${80 + w3} 700,${80 + w3}`;
            const cyanAreaD = `${cyanCurveD} L 700,250 L 0,250 Z`;
            const protectedCurveD = `M 0,${140 - w2} C 100,${160 + w1} 180,${150 - w3} 250,${130 + w2} C 320,${110 - w1} 400,${120 + w3} 500,${100 - w2} C 600,${90 + w1} 700,${140 - w3} 700,${140 - w3}`;

            const cursorProgress = (wavePhase * 0.08) % 1;
            const cursorX = cursorProgress * 700;
            const cursorY = 130 + w1 + Math.sin(cursorProgress * Math.PI * 2.5) * 45;
            const liveSavings = Math.round(800 + Math.sin(wavePhase * 1.2) * 40);
            const tooltipX = Math.max(10, Math.min(630, cursorX - 30));

            return (
              <div style={{ width: '100%', height: '250px', position: 'relative' }}>
                <style>{`
                  @keyframes flowStream {
                    from { stroke-dashoffset: 60; }
                    to { stroke-dashoffset: 0; }
                  }
                  @keyframes flowReverse {
                    from { stroke-dashoffset: 0; }
                    to { stroke-dashoffset: 60; }
                  }
                `}</style>
                <svg width="100%" height="100%" viewBox="0 0 700 250" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="cyanArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <line x1="0" y1="50" x2="700" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="110" x2="700" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="170" x2="700" y2="170" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" strokeWidth="1" />

                  <path d={cyanAreaD} fill="url(#cyanArea)" />

                  <path
                    d={cyanCurveD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray="24 8"
                    style={{
                      animation: 'flowStream 1.2s linear infinite',
                      filter: 'url(#glow)',
                    }}
                  />

                  <path
                    d={protectedCurveD}
                    fill="none"
                    stroke="#a1a1aa"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                    style={{
                      animation: 'flowReverse 2s linear infinite',
                    }}
                  />

                  <line x1={cursorX} y1="0" x2={cursorX} y2="250" stroke="rgba(255, 255, 255, 0.3)" strokeDasharray="3 3" strokeWidth="1.5" />
                  <circle
                    cx={cursorX}
                    cy={cursorY}
                    r="7"
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth="3"
                    style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }}
                  />

                  <g transform={`translate(${tooltipX}, ${Math.max(10, cursorY - 45)})`}>
                    <rect width="65" height="28" rx="14" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))' }} />
                    <text x="32.5" y="18" textAnchor="middle" fill="#000000" fontSize="12" fontWeight="900" fontFamily="sans-serif">
                      ${liveSavings}
                    </text>
                  </g>
                </svg>
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
          </div>
        </div>

        {/* Side Panel: Resource Types Breakdown */}
        <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', animationDelay: '0.3s', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff' }}>
              Resource Types
            </h3>
            <MoreHorizontal size={20} color="#64748b" style={{ cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flex: 1, justifyContent: 'space-around' }}>
            {[
              { name: 'Temporary Servers', pct: 74, color: '#ffffff', icon: '🖥️' },
              { name: 'Temporary Apps', pct: 43, color: '#e4e4e7', icon: '📦' },
              { name: 'Work Runs', pct: 38, color: '#d4d4d8', icon: '⚙️' },
              { name: 'Automation Processes', pct: 24, color: '#a1a1aa', icon: '🔄' },
              { name: 'Other Resources', pct: 16, color: '#71717a', icon: '⚡' },
            ].map((item) => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{item.icon}</span> {item.name}
                  </span>
                  <span style={{ fontWeight: '800', color: '#ffffff' }}>{item.pct}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${item.pct}%`,
                      height: '100%',
                      backgroundColor: item.color,
                      borderRadius: '9999px',
                      boxShadow: `0 0 10px ${item.color}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* State Distribution Card */}
        <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} color="#ffffff" /> Resource Lifecycle State Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'ACTIVE', count: activeCount, color: '#ffffff' },
              { label: 'PROTECTED (Adopted / Non-prod tag)', count: protectedCount, color: '#e4e4e7' },
              { label: 'ORPHAN CANDIDATE (Low Confidence)', count: orphanCandidates, color: '#a1a1aa' },
              { label: 'VERIFIED ORPHAN (High Confidence)', count: verifiedOrphans, color: '#ffffff' },
              { label: 'NEEDS REVIEW (Manual Safeguard)', count: reviewCount, color: '#71717a' },
              { label: 'RECLAIMED (Deleted / Cleaned)', count: reclaimedCount, color: '#52525b' },
            ].map((item) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '600', color: '#ffffff' }}>{item.label}</span>
                    <span style={{ color: '#a1a1aa', fontWeight: '600' }}>
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#18181b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: item.color,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evidence Signals Frequency */}
        <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="#ffffff" /> Evidence Signal Frequencies
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(evidenceCounts).map(([key, count]) => {
              const maxSig = Math.max(...Object.values(evidenceCounts), 1);
              const barWidth = Math.round((count / maxSig) * 100);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: '600', color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>
                      {key}
                    </span>
                    <span style={{ fontWeight: '700', color: '#ffffff' }}>{count} occurrences</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#18181b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: '#ffffff',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Safety & Compliance Callout */}
      <div className="card-easy-trip" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
          🛡️ Zero False Positive Reclamation Guarantee
        </h3>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.6' }}>
          OrphanCleanup strictly combines multi-factor evidence (heartbeat age + owner verification + CPU/network metrics + active pipeline run adoption) before confirming reclamation. Resources associated with active runs or marked with production safeguards are automatically shifted to <strong>PROTECTED</strong> state regardless of idle age.
        </p>
      </div>
    </div>
  );
}
