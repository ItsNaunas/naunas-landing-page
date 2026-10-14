'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';
import { getAttribution } from '@/lib/attribution';

// Free-resource pop-up: offers the Leak Map ~10s after landing (after Dot's hero intro has played), once per visitor.
// Not auto-shown on /audit (they're already mid-enquiry) or /links (it has its own Leak Map button).
const SEEN_KEY = 'leakmap_popup_seen_v1';
const HIDDEN_ON = ['/audit', '/links'];
const CLIENT_VALUE = ['Under $5k', '$5k-25k', '$25k-100k', '$100k+'];

type Status = 'idle' | 'sending' | 'done' | 'error';

const inputClass =
  'w-full bg-transparent px-4 py-3 text-sm text-[var(--fg)] placeholder:text-white/30 outline-none transition-colors focus:border-[#F2613F]';
const inputStyle = { border: '1px solid rgba(255,255,255,0.12)' };

function seen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: fine */ }
}

export function LeadMagnetPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', clientValue: '' });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (HIDDEN_ON.some((p) => pathname?.startsWith(p)) || seen()) return;
    const t = setTimeout(() => {
      // Don't stack on top of another open dialog (e.g. the audit pop-up).
      if (document.querySelector('[role="dialog"]')) return;
      setOpen(true);
      markSeen();
      track('leakmap_popup_shown');
    }, 10000);
    return () => clearTimeout(t);
  }, [pathname]);

  // Buttons anywhere on the site can open it: window.dispatchEvent(new Event('open-leak-map'))
  useEffect(() => {
    const openNow = () => { setOpen(true); markSeen(); track('leakmap_popup_opened'); };
    window.addEventListener('open-leak-map', openNow);
    return () => window.removeEventListener('open-leak-map', openNow);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const src = new URLSearchParams(window.location.search).get('src') ?? '';
      const res = await fetch('/api/leak-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, src: `popup${pathname ?? ''}${src ? `:${src}` : ''}`, attribution: getAttribution() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      track('leakmap_signup');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

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
          <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: '#F2613F' }}>Free · email course + PDF</span>
          <h3 id="leakmap-title" className="text-2xl font-semibold text-[var(--fg)] mt-2 leading-tight">
            The Leak Map
          </h3>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            The 8 places businesses with big clients quietly lose them, and exactly what to do at each one: steps, scripts and tools.
          </p>

          {status === 'done' ? (
            <div className="mt-6 flex flex-col gap-3">
              <p className="text-base font-semibold text-[var(--fg)]">You&apos;re in. The PDF is on its way to your inbox, and the course starts tomorrow.</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Or grab it right now:</p>
              <a
                href="/leak-map.pdf"
                target="_blank"
                rel="noopener"
                onClick={() => track('leakmap_download')}
                className="inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-5 py-3 rounded-full glow-accent"
                style={{ background: '#F2613F' }}
              >
                Download the Leak Map →
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
              <input required placeholder="First name" autoComplete="given-name" value={form.name} onChange={set('name')} className={inputClass} style={inputStyle} />
              <input required type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={set('email')} className={inputClass} style={inputStyle} />
              <select value={form.clientValue} onChange={set('clientValue')} className={inputClass} style={{ ...inputStyle, appearance: 'none', color: form.clientValue ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                <option value="" style={{ background: '#111' }}>What&apos;s a new client worth to you? (optional)</option>
                {CLIENT_VALUE.map((o) => <option key={o} value={o} style={{ background: '#111', color: '#fff' }}>{o}</option>)}
              </select>
              {status === 'error' && <p className="text-xs" style={{ color: '#F2613F' }}>{error}</p>}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full text-sm font-semibold text-[#0C0C0C] px-5 py-3.5 rounded-full transition-opacity disabled:opacity-60 glow-accent"
                style={{ background: '#F2613F' }}
              >
                {status === 'sending' ? 'Sending…' : 'Send me the Leak Map →'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-xs underline" style={{ color: 'rgba(255,255,255,0.4)' }}>
                No thanks
              </button>
              <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                A free email course with the 24-page PDF as your resource. Unsubscribe any time.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
