import React, { useEffect } from 'react';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import MagneticButton from './MagneticButton';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Destructive Action',
  description = 'Are you sure you want to proceed with this action?',
  resourceId,
  resourceName,
  confirmText = 'Confirm Cleanup',
  confirmVariant = 'danger', // 'danger' | 'primary'
  loading = false,
}) {
  // Handle Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = confirmVariant === 'danger';

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(4, 7, 13, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
        animation: 'cardSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="card-glass-cyan depth-layer-3"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2.2rem',
          borderRadius: '28px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a1a1aa',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header Icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
          }}
        >
          {isDanger ? <AlertTriangle size={28} /> : <ShieldCheck size={28} />}
        </div>

        {/* Modal Title & Description */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          {description}
        </p>

        {/* Target Resource Summary Box */}
        {resourceId && (
          <div
            style={{
              backgroundColor: 'rgba(6, 9, 14, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              marginBottom: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Target Resource Identifier
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: '800', color: '#ffffff' }}>
              {resourceId}
            </div>
            {resourceName && (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500' }}>
                Name: {resourceName}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
          <MagneticButton
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-outline-cyan"
            strength={0.2}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              color: '#94a3b8',
              borderColor: 'rgba(255, 255, 255, 0.15)',
              background: 'transparent',
            }}
          >
            Cancel
          </MagneticButton>

          <MagneticButton
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={isDanger ? '' : 'btn-cyan-glow'}
            strength={0.3}
            style={{
              padding: '0.75rem 1.75rem',
              fontSize: '0.9rem',
              backgroundColor: isDanger ? '#f43f5e' : undefined,
              color: isDanger ? '#ffffff' : undefined,
              border: isDanger ? 'none' : undefined,
              boxShadow: isDanger ? '0 0 20px rgba(244, 63, 94, 0.35)' : undefined,
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
