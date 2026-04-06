'use client';

import { useEffect, useRef } from 'react';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    let tx = -600, ty = -600;
    let cx = -600, cy = -600;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.left = `${cx}px`;
        glowRef.current.style.top = `${cy}px`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed pointer-events-none hidden md:block"
      style={{
        zIndex: 9998,
        width: '600px',
        height: '600px',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(242,97,63,0.055) 0%, transparent 65%)',
      }}
    />
  );
}
