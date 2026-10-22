'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import { LeakMapForm, signedUp } from './LeakMapForm';

// Free-resource pop-up: offers the Leak Map once per visitor, when they have read 45% of the page or move to leave
// (45 s at the latest, never while the landing video is playing). Buttons anywhere on the site can open it:
//   window.dispatchEvent(new CustomEvent('open-leak-map', { detail: { src: 'video_end', variant: 'scorecard' } }))
// The 'scorecard' variant (end of the video, 2026-10-22) frames the same sign-up as "find your weakest step".
// Not auto-shown on /audit (they're already mid-enquiry), /links or /scorecard (they have their own form).
const SEEN_KEY = 'leakmap_popup_seen_v1';
const HIDDEN_ON = ['/audit', '/links', '/dashboard', '/privacy', '/terms', '/scorecard', '/r/', '/p/'];

function seen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: fine */ }
}
const videoPlaying = () => [...document.querySelectorAll('video')].some((v) => !v.paused && !v.ended);

type Variant = 'leakmap' | 'scorecard';

export function LeadMagnetPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>('leakmap');
  const [src, setSrc] = useState('popup');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (HIDDEN_ON.some((p) => pathname?.startsWith(p)) || seen() || signedUp()) return;
    let t = 0;
    let shown = false;
    function cleanup() { clearTimeout(t); window.removeEventListener('scroll', onScroll); document.removeEventListener('mouseleave', onLeave); }
    function tryShow() {
      if (shown) return;
      // Don't stack on top of another open dialog (e.g. the audit pop-up); don't interrupt the video.
      if (document.querySelector('[role="dialog"]')) return;
      if (videoPlaying()) { clearTimeout(t); t = window.setTimeout(tryShow, 5000); return; }
      shown = true; cleanup();
      setVariant('leakmap'); setSrc(`popup${pathname ?? ''}`);
      setOpen(true);
      markSeen();
      track('leakmap_popup_shown');
    }
    function onScroll() { const d = document.documentElement; if ((d.scrollTop + window.innerHeight) / Math.max(1, d.scrollHeight) >= 0.45) tryShow(); }
    function onLeave(e: MouseEvent) { if (e.clientY <= 0) tryShow(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    t = window.setTimeout(tryShow, 45000);
    return cleanup;
  }, [pathname]);

  useEffect(() => {
    const openNow = (e: Event) => {
      const d = (e as CustomEvent<{ src?: string; variant?: Variant }>).detail ?? {};
      setVariant(d.variant === 'scorecard' ? 'scorecard' : 'leakmap');
      setSrc(d.src ? `${d.src}${pathname ?? ''}` : `button${pathname ?? ''}`);
      setOpen(true); markSeen();
      track('leakmap_popup_opened', { src: d.src ?? 'button' });
    };
    window.addEventListener('open-leak-map', openNow);
    return () => window.removeEventListener('open-leak-map', openNow);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const scorecard = variant === 'scorecard';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4"
      style={{ zIndex: 'var(--z-backdrop)' } as React.CSSProperties}
      onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leakmap-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />

      <div
        className="relative w-full sm:max-w-3xl max-h-[92svh] overflow-y-auto grid grid-cols-1 md:grid-cols-2"
        style={{ zIndex: 'var(--z-modal)' as unknown as number, background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'var(--shadow-modal)' }}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 z-10 text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Cover preview */}
        <div className="hidden md:flex items-center justify-center p-6" style={{ background: '#111111', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/leak-map-cover.png" alt="The Leak Map, page one" className="w-full" style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(242,97,63,0.15)' }} />
        </div>

        <div className="p-6 sm:p-8">
          <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: '#F2613F' }}>{scorecard ? 'Free · scorecard + email course' : 'Free · email course + PDF'}</span>
          <h3 id="leakmap-title" className="text-2xl font-semibold text-[var(--fg)] mt-2 leading-tight">
            {scorecard ? 'Find your weakest step.' : 'The Leak Map'}
          </h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {scorecard
              ? 'The scorecard is page 19 of the Leak Map: score yourself 0–2 on each of the eight steps in two minutes. The free email course then walks you through fixing the weakest one.'
              : 'The 8 places businesses with big clients quietly lose them, and exactly what to do at each one: steps, scripts and tools.'}
          </p>
          <LeakMapForm src={src} variant={variant} onDismiss={() => setOpen(false)}
            onDone={() => { if (src.startsWith('video_end')) navigator.sendBeacon?.('/api/video', new Blob([JSON.stringify({ e: 'signup' })], { type: 'application/json' })); }} />
        </div>
      </div>
    </div>
  );
}
