import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function MagneticLink({
  to,
  children,
  className = '',
  style = {},
  strength = 0.25,
  title,
  ...props
}) {
  const linkRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseMove = (e) => {
    if (!linkRef.current) return;
    const rect = linkRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    setPosition({ x: deltaX, y: deltaY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  // Physical tactile offsets: Resting (0px), Hovered (-3px lift), Pressed (-1px press down)
  const translateYOffset = isPressed ? -1 : isHovered ? -3 : 0;

  return (
    <Link
      ref={linkRef}
      to={to}
      title={title}
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
        textDecoration: 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
