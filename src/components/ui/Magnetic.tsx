'use client';

import { useRef } from 'react';

interface MagneticProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Magnetic({ children, strength = 0.22, className, style }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transition = 'transform 0.12s linear';
  };

  const handleMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translate(0, 0)';
    el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
