import React, { useState } from 'react';

export default function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children;

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-8px)' };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' };
      case 'top':
      default:
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' };
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            ...getPositionStyles(),
            backgroundColor: '#0c1017',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            color: '#ffffff',
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1100,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.8)',
            animation: 'cardSlideUp 0.15s ease-out forwards',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
