'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { CAL_LINK } from '@/lib/booking';

// Free-audit flow: questions first, then (if qualified) the Cal.com calendar with every answer
// prefilled, so nothing is typed twice. Option text must match the Cal.com booking fields exactly.
const BUSINESS = [
  'Design, architecture or interiors',
  'Construction, remodel or trades',
  'Property or real estate',
  'Agency or B2B service',
  'Academy, education or coaching programme',
  'Professional services (finance, insurance, legal, consulting)',
  'Other',
];
const CLIENT_VALUE = ['Under $5k', '$5k-25k', '$25k-100k', '$100k+'];
const REVENUE = ['Under $20k', '$20k-75k', '$75k-250k', '$250k+'];

type Stage = 'form' | 'sending' | 'calendar' | 'emailOnly' | 'booked';

const inputClass =
  'w-full bg-transparent px-4 py-3 text-sm text-[var(--fg)] placeholder:text-white/30 outline-none transition-colors focus:border-[#F2613F]';
const inputStyle = { border: '1px solid rgba(255,255,255,0.12)' };

declare global {
  interface Window { Cal?: ((...args: unknown[]) => void) & { ns?: Record<string, (...args: unknown[]) => void>; loaded?: boolean; q?: unknown[] } }
}

function loadCal() {
  if (window.Cal) return;
  /* Official Cal.com embed loader */
  (function (C: Window & typeof globalThis, A: string, L: string) {
    const p = (a: { q: unknown[] }, ar: unknown) => { a.q.push(ar); };
    const d = C.document;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (C as any).Cal = (C as any).Cal || function (this: unknown, ...ar: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cal = (C as any).Cal;
      if (!cal.loaded) {
        cal.ns = {}; cal.q = cal.q || [];
        d.head.appendChild(d.createElement('script')).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api: any = function (...a: unknown[]) { p(api, a); };
        const namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === 'string') {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ['initNamespace', namespace]);
        } else p(cal, ar);
        return;
      }
      p(cal, ar);
    };
  })(window, 'https://app.cal.com/embed/embed.js', 'init');
}

export function AuditFlow({ origin = 'site', onWide }: { origin?: string; onWide?: (wide: boolean) => void }) {
  const [src, setSrc] = useState(origin);
  const [stage, setStage] = useState<Stage>('form');
  const [error, setError] = useState('');
  const [a, setA] = useState({ name: '', email: '', business: '', clientValue: '', revenue: '', website: '', message: '' });
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('src');
    if (fromUrl) setSrc(`${origin}:${fromUrl}`);
  }, [origin]);

  useEffect(() => {
    onWide?.(stage === 'calendar');
    if (stage !== 'calendar' || !calRef.current) return;
    loadCal();
    const Cal = window.Cal!;
    Cal('init', 'free-audit', { origin: 'https://cal.com' });
    const ns = Cal.ns!['free-audit'];
    ns('inline', {
      elementOrSelector: '#cal-inline',
      calLink: CAL_LINK,
      config: {
        layout: 'month_view',
        theme: 'dark',
        name: a.name,
        email: a.email,
        'business-type': a.business,
        'client-value': a.clientValue,
        'monthly-revenue': a.revenue,
        website: a.website,
        'whats-not-working': a.message,
        utm_source: src,
      },
    });
    ns('ui', { theme: 'dark', hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { dark: { 'cal-brand': '#F2613F' } } });
    ns('on', { action: 'bookingSuccessful', callback: () => { track('audit_booked', { src }); setStage('booked'); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const set = (k: keyof typeof a) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setA((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage('sending');
    setError('');
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...a, src }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      track('audit_answers', { src, qualified: !!data.qualified });
      setStage(data.qualified ? 'calendar' : 'emailOnly');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStage('form');
    }
  };

  if (stage === 'calendar' || stage === 'booked') {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-lg font-semibold text-[var(--fg)]">
            {stage === 'booked' ? 'You’re booked. See you then.' : `Thanks, ${a.name.split(' ')[0]}. Now pick a time.`}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {stage === 'booked'
              ? 'A confirmation with the call link is on its way to your inbox.'
              : 'Your answers are already filled in. Just choose a slot that suits you.'}
          </p>
        </div>
        {stage === 'calendar' && <div id="cal-inline" ref={calRef} style={{ width: '100%', minHeight: 560, overflow: 'auto' }} />}
      </div>
    );
  }

  if (stage === 'emailOnly') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold text-[var(--fg)]">Thanks, {a.name.split(' ')[0]}. Got it.</p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          I&apos;ll look at your answers myself and reply by email within 48 hours with what I&apos;d fix first. A confirmation is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required placeholder="Your name" autoComplete="name" value={a.name} onChange={set('name')} className={inputClass} style={inputStyle} />
        <input required type="email" placeholder="Email" autoComplete="email" value={a.email} onChange={set('email')} className={inputClass} style={inputStyle} />
      </div>
      <select required value={a.business} onChange={set('business')} className={inputClass} style={{ ...inputStyle, appearance: 'none', color: a.business ? '#fff' : 'rgba(255,255,255,0.3)' }}>
        <option value="" disabled style={{ background: '#111' }}>What kind of business do you run?</option>
        {BUSINESS.map((o) => <option key={o} value={o} style={{ background: '#111', color: '#fff' }}>{o}</option>)}
      </select>
      <div className="grid grid-cols-1 gap-3">
        <select required value={a.clientValue} onChange={set('clientValue')} className={inputClass} style={{ ...inputStyle, appearance: 'none', color: a.clientValue ? '#fff' : 'rgba(255,255,255,0.3)' }}>
          <option value="" disabled style={{ background: '#111' }}>What’s a new client worth to you?</option>
          {CLIENT_VALUE.map((o) => <option key={o} value={o} style={{ background: '#111', color: '#fff' }}>{o}</option>)}
        </select>
        <select required value={a.revenue} onChange={set('revenue')} className={inputClass} style={{ ...inputStyle, appearance: 'none', color: a.revenue ? '#fff' : 'rgba(255,255,255,0.3)' }}>
          <option value="" disabled style={{ background: '#111' }}>Roughly how much does the business make a month?</option>
          {REVENUE.map((o) => <option key={o} value={o} style={{ background: '#111', color: '#fff' }}>{o}</option>)}
        </select>
      </div>
      <input placeholder="Website or Instagram (optional)" autoComplete="url" value={a.website} onChange={set('website')} className={inputClass} style={inputStyle} />
      <textarea
        required
        rows={3}
        placeholder="What’s not working right now? e.g. enquiries going cold, chasing deposits, clients asking for updates"
        value={a.message}
        onChange={set('message')}
        className={`${inputClass} resize-none`}
        style={inputStyle}
      />
      {error && (
        <p className="text-xs" style={{ color: '#F2613F' }}>
          {error} You can also email contact@naunas.co.uk.
        </p>
      )}
      <button
        type="submit"
        disabled={stage === 'sending'}
        className="mt-1 w-full text-sm font-semibold text-[#0C0C0C] px-5 py-3.5 rounded-full transition-opacity disabled:opacity-60 glow-accent"
        style={{ background: '#F2613F' }}
      >
        {stage === 'sending' ? 'Sending…' : 'Continue →'}
      </button>
      <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Takes about a minute. Goes straight to Naufal.
      </p>
    </form>
  );
}
