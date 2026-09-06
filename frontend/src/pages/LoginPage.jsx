import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import BubbleBackground from '../components/BubbleBackground';
import { Shield, Lock, Mail, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.error?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (presetEmail) => {
    setEmail(presetEmail);
    setPassword('Password123!');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', padding: '1.5rem', fontFamily: 'var(--font-main)', position: 'relative' }}>
      <BubbleBackground />
      <div className="card-easy-trip" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', zIndex: 1, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '9999px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 20px rgba(255, 255, 255, 0.2)' }}>
            <Shield size={28} color="#000000" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.03em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            OrphanCleanup Platform
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '0.88rem', fontWeight: '500' }}>
            Ephemeral Lifecycle Leak Detection &amp; Safe Reclamation
          </p>
        </div>

        {error && (
          <div style={{ background: '#18181b', border: '1px solid #ffffff', color: '#ffffff', padding: '0.75rem', borderRadius: '9999px', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center', fontWeight: '700' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OPERATIONS EMAIL
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@demo.internal"
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.8rem', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '9999px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', fontWeight: '500' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.8rem', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '9999px', color: '#ffffff', fontSize: '0.9rem', outline: 'none', fontWeight: '500' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-dark-pill"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Portal'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid #27272a', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#a1a1aa', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700' }}>
            <UserCheck size={14} /> Quick Demo Account Presets:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handlePreset('admin@demo.internal')}
              className="btn-outline-pill"
              style={{ padding: '0.5rem', fontSize: '0.78rem' }}
            >
              ADMIN
            </button>
            <button
              type="button"
              onClick={() => handlePreset('operator@demo.internal')}
              className="btn-outline-pill"
              style={{ padding: '0.5rem', fontSize: '0.78rem' }}
            >
              OPERATOR
            </button>
            <button
              type="button"
              onClick={() => handlePreset('viewer@demo.internal')}
              className="btn-outline-pill"
              style={{ padding: '0.5rem', fontSize: '0.78rem' }}
            >
              VIEWER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
