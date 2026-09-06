import React from 'react';

const statusConfig = {
  ACTIVE: { bg: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: 'rgba(255, 255, 255, 0.35)', label: 'Active' },
  PROTECTED: { bg: 'rgba(161, 161, 170, 0.15)', color: '#a1a1aa', border: 'rgba(161, 161, 170, 0.35)', label: 'Protected' },
  ORPHAN_CANDIDATE: { bg: 'rgba(212, 212, 216, 0.15)', color: '#d4d4d8', border: 'rgba(212, 212, 216, 0.35)', label: 'Checking' },
  VERIFIED_ORPHAN: { bg: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', border: 'rgba(255, 255, 255, 0.5)', label: 'Orphaned' },
  PENDING_RECLAMATION: { bg: 'rgba(228, 228, 231, 0.18)', color: '#e4e4e7', border: 'rgba(228, 228, 231, 0.4)', label: 'Checking' },
  CLEANING: { bg: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', border: 'rgba(255, 255, 255, 0.3)', label: 'Cleaning' },
  NEEDS_REVIEW: { bg: 'rgba(113, 113, 122, 0.18)', color: '#a1a1aa', border: 'rgba(113, 113, 122, 0.4)', label: 'Needs Review' },
  RECLAIMED: { bg: 'rgba(161, 161, 170, 0.15)', color: '#a1a1aa', border: 'rgba(161, 161, 170, 0.35)', label: 'Cleaned' },
};

export default function StatusBadge({ status }) {
  const cfg = statusConfig[status] || {
    bg: 'rgba(148, 163, 184, 0.12)',
    color: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.3)',
    label: status || 'UNKNOWN',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.85rem',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: '800',
        letterSpacing: '0.03em',
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 10px ${cfg.bg}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: cfg.color,
          boxShadow: `0 0 8px ${cfg.color}`,
        }}
      />
      {cfg.label}
    </span>
  );
}
