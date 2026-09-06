import React from 'react';

export default function TextReveal({
  text = '',
  className = '',
  style = {},
  delay = 0, // Delay in seconds before reveal starts
  stagger = 0.05, // Delay between consecutive words
  as: Component = 'h1',
}) {
  const words = text.split(' ');

  return (
    <Component
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35em',
        lineHeight: '1.15',
        ...style,
      }}
    >
      {words.map((word, index) => {
        const wordDelay = delay + index * stagger;
        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'top',
              paddingBottom: '0.1em',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: `textRevealUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${wordDelay}s forwards`,
                transform: 'translate3d(0, 115%, 0) rotate(4deg)',
                opacity: 0,
                willChange: 'transform, opacity',
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </Component>
  );
}
