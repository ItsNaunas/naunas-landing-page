'use client';

import { useEffect, useRef, useState } from 'react';
import { AuditFlow } from '@/components/ui/AuditFlow';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnquiryModal({ isOpen, onClose }: EnquiryModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4"
      style={{ zIndex: 'var(--z-backdrop)' } as React.CSSProperties}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="enquiry-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />

      <div
        className={`relative w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'} max-h-[92svh] overflow-y-auto transition-all`}
        style={{ zIndex: 'var(--z-modal)' as unknown as number, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'var(--shadow-modal)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="px-6 pt-8 pb-6 sm:px-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: '#F2613F' }}>
            Free audit
          </span>
          <h3 id="enquiry-title" className="text-xl font-semibold text-[var(--fg)] mt-1">
            Find out where your business is leaking
          </h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            30 minutes, no cost. Answer a few quick questions, then pick a time. I&apos;ll come prepared with where I think it&apos;s leaking.
          </p>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <AuditFlow origin="audit-popup" onWide={setWide} />
        </div>
      </div>
    </div>
  );
}
