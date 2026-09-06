import React, { useRef, useState } from 'react';

export default function MagneticButton({
  children,
  className = '',
  style = {},
  onClick,
  disabled = false,
  strength = 0.25, // Subtle tactile tracking
  type = 'button',
  title,
  ...props
}) {
  const buttonRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e) => {
    if (!buttonRef.current || disabled) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = () => {
    if (!disabled) setIsPressed(true);
  };

  const handleMouseUp = () => {
    if (!disabled) setIsPressed(false);
  };

  // Physical tactile offsets: Resting (0px), Hovered (-3px lift), Pressed (-1px press down)
  const translateYOffset = isPressed ? -1 : isHovered ? -3 : 0;

  return (
    <button
      ref={buttonRef}
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translate3d(${position.x}px, ${position.y + translateYOffset}px, 0)`,
        filter: isHovered ? 'brightness(1.08)' : 'brightness(1)',
        transition: isPressed
          ? 'transform 80ms ease-in, filter 80ms ease-in, box-shadow 80ms ease-in'
          : isHovered
          ? 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), filter 200ms ease-out, box-shadow 200ms ease-out'
          : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), filter 240ms ease-out, box-shadow 240ms ease-out',
        willChange: 'transform, filter, box-shadow',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
