import React from 'react';

export default function BubbleBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Top-Left Ambient White Mesh Light Leak */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '55vw',
          height: '55vh',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 45%, transparent 70%)',
          filter: 'blur(90px)',
          borderRadius: '50%',
        }}
      />

      {/* Center-Right Ambient Silver Light Leak */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          right: '-15%',
          width: '60vw',
          height: '60vh',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 50%, transparent 75%)',
          filter: 'blur(100px)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}
