import React from 'react';
import { SearchX, Inbox, RefreshCw, Sparkles } from 'lucide-react';
import MagneticButton from './MagneticButton';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No Items Found',
  description = 'There are currently no resources or events matching your selection.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
}) {
  return (
    <div
      className="card-glass-cyan"
      style={{
        padding: '3.5rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '24px',
        maxWidth: '560px',
        margin: '2rem auto',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          boxShadow: '0 0 25px rgba(255, 255, 255, 0.15)',
        }}
      >
        <Icon size={32} />
      </div>

      <h3 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        {title}
      </h3>

      <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', maxWidth: '420px', marginBottom: '1.75rem' }}>
        {description}
      </p>

      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {secondaryActionText && onSecondaryAction && (
          <MagneticButton
            onClick={onSecondaryAction}
            className="btn-outline-cyan"
            strength={0.25}
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.88rem' }}
          >
            {secondaryActionText}
          </MagneticButton>
        )}

        {actionText && onAction && (
          <MagneticButton
            onClick={onAction}
            className="btn-cyan-glow"
            strength={0.3}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem' }}
          >
            {actionText}
          </MagneticButton>
        )}
      </div>
    </div>
  );
}
