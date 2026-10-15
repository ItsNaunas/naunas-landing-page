'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import { getAttribution } from '@/lib/attribution';

// Footer newsletter sign-up: email + an explicit opt-in tick (required), posts to /api/subscribe.
export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent, src: 'footer', attribution: getAttribution() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      track('newsletter_signup');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return <p className="text-sm text-[var(--fg)] mt-6">You’re in. Check your inbox for a welcome from me.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-2" aria-label="Newsletter sign-up">
      <p className="text-[11px] font-medium text-[var(--label)] uppercase tracking-widest">One leak at a time, in your inbox</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@business.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          className="min-w-0 flex-1 bg-transparent border border-[var(--border)] rounded-full px-4 py-2.5 text-sm text-[var(--fg)] placeholder:text-white/30 outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'sending' || !consent}
          className="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] text-sm font-semibold px-4 py-2.5 rounded-full transition-colors disabled:opacity-50"
        >
          {status === 'sending' ? '…' : 'Join'}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-[var(--muted)] leading-snug cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
        <span>Yes, email me short practical notes from Naunas. Unsubscribe any time.</span>
      </label>
      {status === 'error' && <p className="text-xs text-[var(--accent)]">{error}</p>}
    </form>
  );
}
