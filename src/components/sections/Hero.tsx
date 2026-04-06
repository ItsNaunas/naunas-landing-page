'use client';

import { useState, useEffect } from 'react';
import { Magnetic } from '@/components/ui/Magnetic';

const PHRASES = ['Fix Your Lead Flow', 'Automate Onboarding', 'Retain Your Clients', 'Scale Your Business'];
const TYPING_SPEED = 72;
const DELETING_SPEED = 38;
const PAUSE_AFTER_TYPE = 2200;
const PAUSE_AFTER_DELETE = 380;

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const phrase = phrases[phraseIdx];

    if (!isDeleting && text === phrase) {
      const t = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      return () => clearTimeout(t);
    }

    if (isDeleting && text === '') {
      const t = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIdx((i) => (i + 1) % phrases.length);
      }, PAUSE_AFTER_DELETE);
      return () => clearTimeout(t);
    }

    const speed = isDeleting ? DELETING_SPEED : TYPING_SPEED;
    const t = setTimeout(() => {
      setText(isDeleting
        ? phrase.slice(0, text.length - 1)
        : phrase.slice(0, text.length + 1)
      );
    }, speed);
    return () => clearTimeout(t);
  }, [text, phraseIdx, isDeleting, phrases]);

  return text;
}

interface HeroProps {
  onAuditClick: () => void;
}

export function Hero({ onAuditClick }: HeroProps) {
  const displayText = useTypewriter(PHRASES);
  return (
    <section
      id="hero"
      className="relative min-h-[100svh] md:min-h-screen flex flex-col items-center justify-start overflow-hidden pt-16 pb-0"
    >
      {/* Background glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90vw',
          height: '75vh',
          background:
            'radial-gradient(ellipse at 50% 80%, rgba(220,160,30,0.42) 0%, rgba(242,97,63,0.22) 35%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Grid pattern — strongest near centre, fades toward edges */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] [mask-image:radial-gradient(ellipse_85%_75%_at_50%_80%,#000_0%,#000_28%,rgba(0,0,0,0.35)_52%,transparent_78%)] [-webkit-mask-image:radial-gradient(ellipse_85%_75%_at_50%_80%,#000_0%,#000_28%,rgba(0,0,0,0.35)_52%,transparent_78%)]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Mobile full-bleed image (hidden on md+) ── */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 1, height: '50vh' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/sections/hero/hero-image.png"
          alt=""
          className="w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'top center' }}
        />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-6 flex flex-col md:block min-h-[calc(100svh-4rem)] md:min-h-0" style={{ zIndex: 10 }}>

        {/* ── Headline ── */}
        <div className="text-center mb-8 relative" style={{ zIndex: 20 }}>
          <h1 className="text-[38px] leading-[1.05] sm:text-5xl md:text-7xl lg:text-[88px] font-bold text-[var(--fg)] tracking-tight">
            We Build Systems That
            <br />
            <span className="text-[var(--accent)]">
              {displayText}
              <span
                className="inline-block align-middle ml-1 animate-pulse"
                style={{ width: '3px', height: '0.75em', background: 'var(--accent)', borderRadius: '2px', verticalAlign: 'middle' }}
              />
            </span>
          </h1>
          <p className="mt-4 text-[var(--muted)] text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            Not sure where to start? Get an instant AI audit of your client lifecycle. We'll tell you exactly what's broken and what to fix first.
          </p>
        </div>

        {/* ── Desktop CTAs (hidden on mobile) ── */}
        <div className="relative hidden md:flex flex-row items-center justify-center" style={{ zIndex: 20 }}>
          <Magnetic>
            <button
              onClick={onAuditClick}
              className="inline-flex items-center justify-center gap-2 text-[var(--fg)] font-semibold px-8 py-3.5 rounded-full transition-all active:scale-[0.98] text-sm"
              style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 16px rgba(242,97,63,0.2), 0 0 32px rgba(242,97,63,0.08)' }}
            >
              Get instant AI audit
            </button>
          </Magnetic>
        </div>

        {/* ── MOBILE: CTAs below body text (hidden on md+) ── */}
        <div className="md:hidden flex flex-col gap-3 mt-6" style={{ zIndex: 20 }}>
          <button
            onClick={onAuditClick}
            className="inline-flex items-center justify-center gap-2 text-[var(--fg)] font-semibold px-7 py-4 rounded-full transition-all active:scale-[0.98] text-sm w-full"
            style={{ background: 'rgba(12,12,12,0.85)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', boxShadow: '0 0 16px rgba(242,97,63,0.15)' }}
          >
            Get instant AI audit
          </button>
          <a
            href="https://calendly.com/its-naunas/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-full transition-all active:scale-[0.98] text-sm w-full"
            style={{ background: 'var(--accent)', color: '#0C0C0C' }}
          >
            Book your free audit
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="#0C0C0C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* ── MOBILE: social proof pinned to bottom (hidden on md+) ── */}
        <div className="md:hidden mt-auto flex items-center justify-center gap-2.5 pb-8" style={{ zIndex: 20 }}>
          <div className="flex">
            {['rauchg', 'leerob', 'shadcn'].map((username, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={`https://github.com/${username}.png?size=64`}
                alt={username}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: '2px solid var(--bg)',
                  marginLeft: i > 0 ? -8 : 0,
                  objectFit: 'cover',
                }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold" style={{ color: '#fff' }}>12+ systems installed</span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="#F2613F">
              <path d="M6 1l1.2 3.7H11L8.4 6.9l.9 3.6L6 8.4l-3.3 2 .9-3.6L1 4.7h3.8L6 1z" />
            </svg>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>5.0</span>
          </div>
        </div>

        {/* ── DESKTOP floating cards (hidden on mobile) ── */}
        <div className="hidden md:block relative mt-6" style={{ height: '400px' }}>

          {/* LEFT — Merged shape social proof */}
          <div style={{
            position: 'absolute', left: '2%', top: '12%', width: 370, height: 230,
            filter: 'drop-shadow(0 0 20px rgba(242,97,63,0.45)) drop-shadow(0 0 48px rgba(242,97,63,0.18))',
          }}>

            {/* Shape 1 — main stat (tall left block) */}
            <div
              style={{
                position: 'absolute', left: 0, top: 0, width: 200, height: 230,
                background: '#111111',
                borderRadius: '30px 30px 0px 30px',
                padding: '24px',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '10px',
              }}
            >
              <p style={{ color: '#F2613F', fontSize: '3.25rem', fontWeight: 700, lineHeight: 1 }}>12+</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.45 }}>
                Systems installed for service businesses
              </p>
              {/* Avatars + stars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Avatar stack with +2 */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {['rauchg', 'leerob', 'shadcn'].map((username, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={`https://github.com/${username}.png?size=64`}
                      alt={username}
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: '2px solid #111111',
                        marginLeft: i > 0 ? -10 : 0,
                        objectFit: 'cover',
                        position: 'relative', zIndex: 3 - i,
                      }}
                    />
                  ))}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    border: '2px solid #111111', marginLeft: -10,
                    background: 'rgba(242,97,63,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: '#F2613F',
                  }}>
                    +2
                  </div>
                </div>
                {/* 5 stars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#F2613F">
                      <path d="M6 1l1.2 3.7H11L8.4 6.9l.9 3.6L6 8.4l-3.3 2 .9-3.6L1 4.7h3.8L6 1z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>

            {/* Bridge — smooth concave corner between shape 1 and shape 2 */}
            <svg
              style={{ position: 'absolute', left: 200, top: 30, width: 30, height: 30, pointerEvents: 'none' }}
              viewBox="0 0 30 30"
            >
              <path d="M 0 0 C 0 22.38 5.4 30 30 30 H 0 Z" fill="#111111" />
            </svg>

            {/* Shape 2 — secondary stat (bottom right) */}
            <div
              style={{
                position: 'absolute', left: 200, top: 60, width: 170, height: 170,
                background: '#111111',
                borderRadius: '0px 30px 30px 0px',
                padding: '20px', paddingTop: '71px',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '8px',
              }}
            >
              <p style={{ color: '#F2613F', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>100%</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.73rem', fontWeight: 500, lineHeight: 1.4 }}>
                Done-for-you delivery
              </p>
            </div>

            {/* Shape 3 — CTA link (top right, orange) */}
            <a
              href="https://calendly.com/its-naunas/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="glow-accent"
              style={{
                position: 'absolute', left: 210, top: 0, width: 160, height: 50,
                background: '#F2613F',
                borderRadius: '27px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                textDecoration: 'none',
              }}
            >
              <span style={{ color: '#0C0C0C', fontSize: '0.78rem', fontWeight: 700 }}>Book your free audit</span>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="#0C0C0C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

          </div>

          {/* CENTER — hero image */}
          <div
            className="absolute left-1/2"
            style={{ transform: 'translateX(-50%)', bottom: '-100px', width: '860px', zIndex: 'var(--z-float)' as unknown as number, pointerEvents: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/sections/hero/hero-image.png"
              alt="Naunas Systems"
              style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', height: 'auto', width: '100%', maxHeight: '720px', objectFit: 'contain', objectPosition: 'bottom', mixBlendMode: 'multiply' }}
            />
          </div>

          {/* RIGHT — Stats + descriptor grouped */}
          <div className="absolute flex flex-col gap-5" style={{ right: '4%', top: '12%' }}>

            {/* Raw stats inline */}
            <div className="flex gap-8 items-start">
              <div>
                <p className="text-[var(--fg)] text-5xl font-bold leading-none">100%</p>
                <p className="text-[var(--muted)] text-xs mt-1.5">Done-For-You</p>
              </div>
              <div>
                <p className="text-[var(--fg)] text-5xl font-bold leading-none">3×</p>
                <p className="text-[var(--muted)] text-xs mt-1.5">Service Pillars</p>
              </div>
            </div>

            {/* Descriptor card */}
            <div
              className="rounded-2xl backdrop-blur-sm overflow-hidden"
              style={{
                background: 'var(--card-raised)',
                border: '1px solid var(--border)',
                width: '260px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(242,97,63,0.3), 0 0 48px rgba(242,97,63,0.12)',
              }}
            >
              {/* Accent bar */}
              <div style={{ height: '3px', background: 'var(--accent)' }} />
              <div className="p-5">
                <p className="text-[var(--fg)] text-sm font-semibold mb-1">Full Lifecycle Install</p>
                <p className="text-[var(--muted)] text-xs leading-relaxed mb-4">
                  From first touch to retained client — every stage built, automated, and handed over.
                </p>
                {/* Checklist */}
                <ul className="flex flex-col gap-2">
                  {['Intake → onboarding → retention', 'Full SOPs + team training', '2–4 week delivery'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>✓</span>
                      <span className="text-[var(--muted)] text-[11px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

        </div>{/* end desktop floating */}


      </div>
    </section>
  );
}
