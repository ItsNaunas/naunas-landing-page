'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { track } from '@vercel/analytics';
import { Avatar } from '@/components/ui/Avatar';

const INSTAGRAM_URL = 'https://www.instagram.com/naunas_builds/';
const TIKTOK_URL = 'https://www.tiktok.com/@naunas_builds';
const LINKEDIN_URL = 'https://www.linkedin.com/in/naufal-nassor-0a1b6936b/';
const PROMPT_PACK_URL = 'https://naunas8.gumroad.com/l/fuxpbw';
const SETUP_KIT_URL = 'https://naunas8.gumroad.com/l/vzrehp';

const secondaryClass =
  'w-full block text-center rounded-2xl px-5 py-4 transition-colors active:scale-[0.98] bg-[var(--card-raised)] border border-[var(--border)] hover:border-[var(--accent)]';

const SOCIAL_LINKS = [
  {
    target: 'instagram',
    label: 'Instagram',
    href: INSTAGRAM_URL,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    target: 'tiktok',
    label: 'TikTok',
    href: TIKTOK_URL,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.27 0 .57.04.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
      </svg>
    ),
  },
  {
    target: 'linkedin',
    label: 'LinkedIn',
    href: LINKEDIN_URL,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
  },
];

export function LinksHub() {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSrc(params.get('src') ?? '');
  }, []);

  const forwardedSrc = encodeURIComponent(src ? `links-${src}` : 'links');
  const mentorshipUrl = `https://calendly.com/its-naunas/30min?utm_source=${forwardedSrc}&utm_medium=mentorship`;
  const promptPackUrl = `${PROMPT_PACK_URL}?src=${forwardedSrc}`;
  const setupKitUrl = `${SETUP_KIT_URL}?src=${forwardedSrc}`;

  function handleClick(target: string) {
    track('link_click', { target, src: src || 'direct' });
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

      <main className="relative max-w-md mx-auto px-6 pt-12 pb-16" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar size={96} />
            <Link href="/" className="text-3xl font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Naunas<span className="text-[var(--accent)]">.</span>
            </Link>
            <p className="text-sm -mt-1" style={{ color: 'var(--muted)' }}>
              AI systems for service businesses
            </p>

            {/* Proof chip — text-only (no placeholder avatars; real client faces can be added later) */}
            <div className="flex items-center justify-center gap-2.5">
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>12+ systems installed</span>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
              <div className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="#F2613F">
                  <path d="M6 1l1.2 3.7H11L8.4 6.9l.9 3.6L6 8.4l-3.3 2 .9-3.6L1 4.7h3.8L6 1z" />
                </svg>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>5.0</span>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <Link
              href={`/audit?src=${forwardedSrc}`}
              onClick={() => handleClick('audit')}
              className="w-full block text-center rounded-2xl px-5 py-4 transition-colors active:scale-[0.98] glow-accent"
              style={{ background: 'var(--accent)', color: '#0C0C0C' }}
            >
              <span className="block text-base font-semibold">Book a call about your business</span>
              <span className="block text-xs mt-1" style={{ color: 'rgba(12,12,12,0.72)' }}>
                Service business owners. Free audit of where you&apos;re leaking, 2 min fit check first.
              </span>
            </Link>

            <a
              href={mentorshipUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick('mentorship')}
              className={secondaryClass}
            >
              <span className="block text-base font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>Book a mentorship intro</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Building this stuff yourself? Let&apos;s talk. No forms.
              </span>
            </a>

            <a
              href={promptPackUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick('prompt_pack')}
              className={secondaryClass}
            >
              <span className="block text-base font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>The Builder Prompt Pack &middot; $39</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--muted)' }}>
                50+ prompts to take a vibe-coded app to production. Spec to ship.
              </span>
            </a>

            <a
              href={setupKitUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick('setup_kit')}
              className={secondaryClass}
            >
              <span className="block text-base font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>The Setup Kit &middot; free</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Claude Code from zero. Pay what you want.
              </span>
            </a>

            <Link
              href={`/newsletter?src=${forwardedSrc}`}
              onClick={() => handleClick('newsletter')}
              className={secondaryClass}
            >
              <span className="block text-base font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>The newsletter</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Every system I build + the resources. Free, weekly.
              </span>
            </Link>

            <Link
              href={`/managed?src=${forwardedSrc}`}
              onClick={() => handleClick('managed')}
              className={secondaryClass}
            >
              <span className="block text-base font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>Managed: AI talent manager</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--muted)' }}>
                For creators. Handles your brand deals. Join the waitlist.
              </span>
            </Link>

            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.target}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  onClick={() => handleClick(link.target)}
                  className="flex-1 flex items-center justify-center rounded-2xl py-3.5 min-h-[52px] transition-colors active:scale-[0.98] bg-[var(--card-raised)] border border-[var(--border)] hover:border-[var(--accent)]"
                  style={{ color: 'rgba(255,255,255,0.92)' }}
                >
                  {link.icon}
                </a>
              ))}
            </div>

            <a
              href="mailto:contact@naunas.co.uk"
              onClick={() => handleClick('email')}
              className="text-center text-sm underline underline-offset-4 mt-2 transition-colors hover:text-[var(--accent)]"
              style={{ color: 'var(--muted)' }}
            >
              Email me
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
