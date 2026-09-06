import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function GoldenRuleBanner({ compact = false }) {
  if (compact) {
    return (
      <div
        className="animated-card"
        style={{
          background: 'rgba(18, 18, 18, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <ShieldCheck size={20} style={{ color: '#ffffff' }} />
        <div style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: '700' }}>
          <strong>OLD ≠ ORPHAN</strong> — An old resource may still be in use. We check its activity and ownership before cleanup.
        </div>
      </div>
    );
  }

  return (
    <div
      className="animated-card card-glass-cyan"
      style={{
        padding: '1.25rem 1.75rem',
        borderRadius: '20px',
        marginBottom: '1.75rem',
        background: 'rgba(18, 18, 18, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '1.2rem',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
          }}
        >
          ≠
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>
              OLD ≠ ORPHAN
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              CORE RULE
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: '500', marginTop: '0.15rem' }}>
            An old resource may still be in use. We check its activity and ownership before cleanup.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', fontWeight: '800', color: '#a1a1aa' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff' }}>
          <ShieldCheck size={14} /> CHECK BEFORE CLEANING
        </span>
        &bull;
        <span style={{ color: '#ffffff' }}>PROTECT WHAT IS STILL IN USE</span>
        &bull;
        <span style={{ color: '#a1a1aa' }}>CLEAN ONLY WHAT IS TRULY ABANDONED</span>
      </div>
    </div>
  );
}
