'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import { getAttribution } from '@/lib/attribution';

// The Leak Map sign-up form, shared by the pop-up (LeadMagnetPopup) and the /scorecard page. One POST to
// /api/leak-map (MailerLite group → course, HubSpot, Telegram for high-value answers), then the download link.
// `src` says where the sign-up came from (popup, scorecard-page, video_end…); it is kept in MailerLite and the activity feed.

export const CLIENT_VALUE = ['Under $5k', '$5k-25k', '$25k-100k', '$100k+'];
export const SIGNED_UP_KEY = 'leakmap_signed_up_v1';
export const signedUp = () => { try { return localStorage.getItem(SIGNED_UP_KEY) === '1'; } catch { return false; } };

type Status = 'idle' | 'sending' | 'done' | 'error';
const inputClass = 'w-full bg-transparent px-4 py-3 text-sm text-[var(--fg)] placeholder:text-white/30 outline-none transition-colors focus:border-[#F2613F]';
const inputStyle = { border: '1px solid rgba(255,255,255,0.12)' };

export function LeakMapForm({ src, variant = 'leakmap', onDismiss, onDone }: { src: string; variant?: 'leakmap' | 'scorecard'; onDismiss?: () => void; onDone?: () => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', clientValue: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const q = new URLSearchParams(window.location.search).get('src') ?? '';
      const res = await fetch('/api/leak-map', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, src: `${src}${q ? `:${q}` : ''}`, attribution: getAttribution() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      track('leakmap_signup', { src });
      try { localStorage.setItem(SIGNED_UP_KEY, '1'); } catch { /* private mode */ }
      setStatus('done');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <p className="text-base font-semibold text-[var(--fg)]">You&apos;re in. The PDF is on its way to your inbox, and the course starts tomorrow.</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{variant === 'scorecard' ? 'The scorecard is page 19. Grab it right now:' : 'Or grab it right now:'}</p>
        <a href="/leak-map.pdf" target="_blank" rel="noopener" onClick={() => track('leakmap_download')}
          className="inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-5 py-3 rounded-full glow-accent" style={{ background: '#F2613F' }}>
          Download the Leak Map →
        </a>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <input required placeholder="First name" autoComplete="given-name" value={form.name} onChange={set('name')} className={inputClass} style={inputStyle} />
      <input required type="email" placeholder="Email" autoComplete="email" value={form.email} onChange={set('email')} className={inputClass} style={inputStyle} />
      <select value={form.clientValue} onChange={set('clientValue')} className={inputClass} style={{ ...inputStyle, appearance: 'none', color: form.clientValue ? '#fff' : 'rgba(255,255,255,0.3)' }}>
        <option value="" style={{ background: '#111' }}>What&apos;s a new client worth to you? (optional)</option>
        {CLIENT_VALUE.map((o) => <option key={o} value={o} style={{ background: '#111', color: '#fff' }}>{o}</option>)}
      </select>
      {status === 'error' && <p className="text-xs" style={{ color: '#F2613F' }}>{error}</p>}
      <button type="submit" disabled={status === 'sending'}
        className="w-full text-sm font-semibold text-[#0C0C0C] px-5 py-3.5 rounded-full transition-opacity disabled:opacity-60 glow-accent" style={{ background: '#F2613F' }}>
        {status === 'sending' ? 'Sending…' : variant === 'scorecard' ? 'Send me the scorecard →' : 'Send me the Leak Map →'}
      </button>
      {onDismiss && <button type="button" onClick={onDismiss} className="text-xs underline" style={{ color: 'rgba(255,255,255,0.4)' }}>No thanks</button>}
      <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>A free email course with the 24-page PDF as your resource. Unsubscribe any time.</p>
    </form>
  );
}
