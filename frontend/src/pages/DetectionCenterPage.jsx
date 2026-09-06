import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import GoldenRuleBanner from '../components/GoldenRuleBanner';
import MagneticButton from '../components/MagneticButton';
import MagneticLink from '../components/MagneticLink';
import { Zap, ShieldCheck, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function DetectionCenterPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetectionScenario();
  }, []);

  const fetchDetectionScenario = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resources?limit=20');
      if (res.success) {
        setResources(res.data);
      }
    } catch (err) {
      console.error('Detection scenario fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resourceA = resources.find((r) => r.resourceId === 'res-orphan-server-a');
  const resourceB = resources.find((r) => r.resourceId === 'res-active-server-b');
  const resourceC = resources.find((r) => r.resourceId === 'res-adopted-child-c1');

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Zap size={28} style={{ color: '#ffffff' }} /> Resource Check
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.92rem', marginTop: '0.25rem' }}>
            Side-by-side verification: <strong style={{ color: '#ffffff' }}>OLD ≠ ORPHAN</strong> &bull; Check before cleaning
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <MagneticButton
            onClick={async () => {
              setLoading(true);
              try {
                const res = await api.post('/detection/sync-aws', { region: 'us-east-1' });
                if (res.success) {
                  fetchDetectionScenario();
                }
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }}
            className="btn-cyan-glow"
            strength={0.3}
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.88rem' }}
          >
            <Zap size={15} /> Check Cloud Resources
          </MagneticButton>
          <MagneticButton
            onClick={fetchDetectionScenario}
            className="btn-outline-cyan"
            strength={0.3}
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.88rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Scenario
          </MagneticButton>
        </div>
      </div>

      <GoldenRuleBanner />

      {loading ? (
        <div className="animated-card card-glass-cyan" style={{ padding: '4rem', textAlign: 'center', color: '#a1a1aa' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 1rem auto', color: '#ffffff' }} />
          <div>Evaluating resource activity and ownership...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
          {/* RESOURCE A: GENUINE ORPHAN */}
          <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #ffffff', animationDelay: '0.05s' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="pill-cyan-tag" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.4)' }}>
                  RESOURCE A — UNUSED
                </span>
                <StatusBadge status={resourceA?.state || 'VERIFIED_ORPHAN'} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                Temporary Server A
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                {resourceA?.resourceId || 'res-orphan-server-a'}
              </p>

              <div style={{ backgroundColor: 'rgba(18, 18, 18, 0.95)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '1.2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <div style={{ color: '#ffffff' }}>⏱️ <strong>AGE:</strong> 18 Hours (Old)</div>
                <div style={{ color: '#ffffff' }}>🤖 <strong>AUTOMATION:</strong> <span style={{ color: '#a1a1aa', fontWeight: '700' }}>Stopped (Crashed)</span></div>
                <div style={{ color: '#ffffff' }}>👤 <strong>OWNER:</strong> <span style={{ color: '#a1a1aa', fontWeight: '700' }}>None</span></div>
                <div style={{ color: '#ffffff' }}>📊 <strong>ACTIVITY:</strong> None (0 Metrics)</div>
                <div style={{ color: '#ffffff' }}>🔗 <strong>NOW USED BY:</strong> Nobody</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.35)', padding: '0.9rem 1rem', borderRadius: '16px', color: '#ffffff', fontSize: '0.88rem', fontWeight: '800' }}>
                <div style={{ color: '#ffffff', marginBottom: '0.2rem' }}>🔴 DECISION: Orphaned</div>
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: '500' }}>REASON: "No active process is using this resource."</div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <MagneticLink
                to={`/resources/${resourceA?.resourceId || 'res-orphan-server-a'}`}
                className="btn-cyan-glow"
                strength={0.3}
                style={{ display: 'flex', textAlign: 'center', padding: '0.75rem', fontSize: '0.9rem', width: '100%', backgroundColor: '#ffffff', color: '#000000' }}
              >
                Inspect Resource A &rarr;
              </MagneticLink>
            </div>
          </div>

          {/* RESOURCE B: LEGITIMATELY ACTIVE */}
          <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #a1a1aa', animationDelay: '0.1s' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="pill-cyan-tag" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#a1a1aa', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                  RESOURCE B — IN USE
                </span>
                <StatusBadge status={resourceB?.state || 'PROTECTED'} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                Temporary Server B
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                {resourceB?.resourceId || 'res-active-server-b'}
              </p>

              <div style={{ backgroundColor: 'rgba(18, 18, 18, 0.95)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '1.2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <div style={{ color: '#ffffff' }}>⏱️ <strong>AGE:</strong> 18 Hours (Equally Old!)</div>
                <div style={{ color: '#ffffff' }}>🤖 <strong>AUTOMATION:</strong> <span style={{ color: '#ffffff', fontWeight: '700' }}>Active</span></div>
                <div style={{ color: '#ffffff' }}>👤 <strong>OWNER:</strong> <span style={{ color: '#ffffff', fontWeight: '700' }}>Active Operator</span></div>
                <div style={{ color: '#ffffff' }}>📊 <strong>ACTIVITY:</strong> Recent (1,420 Metrics)</div>
                <div style={{ color: '#ffffff' }}>🔗 <strong>NOW USED BY:</strong> Active Work</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '0.9rem 1rem', borderRadius: '16px', color: '#ffffff', fontSize: '0.88rem', fontWeight: '800' }}>
                <div style={{ color: '#ffffff', marginBottom: '0.2rem' }}>🔵 DECISION: Protected</div>
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: '500' }}>REASON: "This resource is still being used."</div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <MagneticLink
                to={`/resources/${resourceB?.resourceId || 'res-active-server-b'}`}
                className="btn-outline-cyan"
                strength={0.3}
                style={{ display: 'flex', textAlign: 'center', padding: '0.75rem', fontSize: '0.9rem', width: '100%' }}
              >
                Inspect Resource B &rarr;
              </MagneticLink>
            </div>
          </div>

          {/* RESOURCE C: ADOPTED CHILD */}
          <div className="animated-card card-glass-cyan" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #a1a1aa', animationDelay: '0.15s' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span className="pill-cyan-tag" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#a1a1aa', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                  RESOURCE C — ADOPTED BY NEW WORK
                </span>
                <StatusBadge status={resourceC?.state || 'PROTECTED'} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                Temporary Resource C
              </h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                {resourceC?.resourceId || 'res-adopted-child-c1'}
              </p>

              <div style={{ backgroundColor: 'rgba(18, 18, 18, 0.95)', border: '1px solid rgba(255, 255, 255, 0.15)', padding: '1.2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                <div style={{ color: '#ffffff' }}>⏱️ <strong>AGE:</strong> 18 Hours</div>
                <div style={{ color: '#ffffff' }}>🤖 <strong>AUTOMATION:</strong> Stopped (Old Work Stopped)</div>
                <div style={{ color: '#ffffff' }}>👤 <strong>OWNER:</strong> Active Operator</div>
                <div style={{ color: '#ffffff' }}>📊 <strong>ACTIVITY:</strong> Recent (350 Metrics)</div>
                <div style={{ color: '#ffffff' }}>🔗 <strong>NOW USED BY:</strong> New Work</div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.25)', padding: '0.9rem 1rem', borderRadius: '16px', color: '#ffffff', fontSize: '0.88rem', fontWeight: '800' }}>
                <div style={{ color: '#ffffff', marginBottom: '0.2rem' }}>🔵 DECISION: Protected</div>
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: '500' }}>REASON: "Adopted by a new active work process."</div>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <MagneticLink
                to={`/resources/${resourceC?.resourceId || 'res-adopted-child-c1'}`}
                className="btn-outline-cyan"
                strength={0.3}
                style={{ display: 'flex', textAlign: 'center', padding: '0.75rem', fontSize: '0.9rem', width: '100%' }}
              >
                Inspect Adopted Dependency &rarr;
              </MagneticLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
