'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const inputClass = 'w-full rounded-xl px-4 py-3.5 text-base transition-colors min-h-[52px] bg-white/5 border border-white/10 text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)]';

const PERKS = [
  'Reads every inbound brand email and tells you which deals are worth your time.',
  'Drafts the reply, holds your line on rate, never sends without your say-so.',
  'Keeps the 20% a manager would take. First creators in get founding pricing.',
];

function isEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function ManagedWaitlist() {
  const [email, setEmail] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const srcRef = useRef('managed');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    srcRef.current = params.get('src') ?? 'managed';
  }, []);

  async function submit() {
    if (!isEmail(email)) return setError('Please add a valid email.');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/managed-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), handle: handle.trim(), src: srcRef.current }),
      });
      if (!res.ok) throw new Error('Request failed');
      setJoined(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '90vw', height: '60vh',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(242,97,63,0.14) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <header className="relative max-w-xl mx-auto px-6 h-16 flex items-center" style={{ zIndex: 10 }}>
        <Link href="/" className="text-lg font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Naunas<span className="text-[var(--accent)]">.</span>
        </Link>
      </header>

      <main className="relative max-w-xl mx-auto px-6 pt-10 pb-24" style={{ zIndex: 10 }}>
        {joined ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-5 pt-12"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(242,97,63,0.15)', border: '1px solid rgba(242,97,63,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
              You&apos;re on the list.
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              We&apos;re onboarding creators in small batches. When your spot opens you&apos;ll be the first to know, founding pricing included.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-8 pt-6"
          >
            <div className="flex flex-col gap-4">
              <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--accent)' }}>
                Managed
              </span>
              <h1 className="text-3xl md:text-4xl font-bold leading-snug" style={{ color: '#fff' }}>
                Your AI talent manager.
              </h1>
              <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Brand deals handled end to end. Managed triages the inbound, drafts the replies on your terms and gets you paid, without handing a manager 20%.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {PERKS.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <span style={{ color: '#F2613F' }}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) submit(); }}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="@your_handle (optional)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) submit(); }}
                className={inputClass}
              />
              {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="w-full font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base glow-accent"
                style={{ background: '#F2613F', color: '#0C0C0C' }}
              >
                {loading ? 'Joining...' : 'Join the waitlist →'}
              </button>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No spam. We only email you when there&apos;s a spot.
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
