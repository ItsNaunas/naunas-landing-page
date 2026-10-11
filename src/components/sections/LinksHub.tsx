'use client';

import Link from 'next/link';
import { track } from '@vercel/analytics';
import { Avatar } from '@/components/ui/Avatar';
import { CASE_STUDIES } from '@/lib/caseStudies';

// Link-in-bio page. Each platform's bio uses its own short link (/ig, /tt, /li, /yt — see
// next.config.ts), which lands here with UTM tags. The attribution tracker stores them, so a
// visitor who taps through to the audit or the Leak Map reaches HubSpot tagged with that platform.

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/naunas_builds/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@naunas_builds',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.27 0 .57.04.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/naufal-nassor-0a1b6936b/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
      </svg>
    ),
  },
];

const border = { border: '1px solid rgba(255,255,255,0.08)' };
const rowClass = 'group w-full flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]';

function source() {
  try { return new URLSearchParams(window.location.search).get('utm_source') ?? 'direct'; } catch { return 'direct'; }
}
function clicked(target: string) {
  track('link_click', { target, src: source() });
}

function Arrow() {
  return <span className="text-sm transition-transform group-hover:translate-x-0.5" style={{ color: '#F2613F' }}>→</span>;
}

export function LinksHub() {
  const quote = CASE_STUDIES.find((c) => c.slug === 'nelia-rose-designs')?.quote;

  return (
    <div className="relative min-h-screen" style={{ background: '#0C0C0C' }}>
      <main className="relative max-w-md mx-auto px-5 pt-12 pb-16 flex flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <Avatar size={88} />
          <Link href="/" onClick={() => clicked('home-logo')} className="text-3xl font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Naunas<span className="text-[var(--accent)]">.</span>
          </Link>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            I build the Client System for project businesses: enquiry to payment to referral, set up in your own accounts.
          </p>
        </header>

        <div className="flex flex-col" style={border}>
          <Link
            href="/audit"
            onClick={() => clicked('audit')}
            className="group block px-5 py-5 transition-opacity hover:opacity-90"
            style={{ background: '#F2613F', color: '#0C0C0C' }}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="text-base font-semibold">Get your free audit</span>
              <span className="text-sm transition-transform group-hover:translate-x-0.5">→</span>
            </span>
            <span className="block text-xs mt-1.5" style={{ color: 'rgba(12,12,12,0.72)' }}>
              30 minutes. A few quick questions, then pick a time.
            </span>
          </Link>

          <button
            type="button"
            onClick={() => { clicked('leak-map'); window.dispatchEvent(new Event('open-leak-map')); }}
            className={`${rowClass} text-left`}
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span>
              <span className="block text-base font-semibold" style={{ color: '#fff' }}>The Leak Map</span>
              <span className="block text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Free 24-page guide: the 8 places businesses with big clients quietly lose them, and what to do at each one.
              </span>
            </span>
            <Arrow />
          </button>

          <Link
            href="/case-studies"
            onClick={() => clicked('case-studies')}
            className={rowClass}
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-base font-semibold" style={{ color: '#fff' }}>Case studies</span>
            <Arrow />
          </Link>
        </div>

        {quote && (
          <figure className="px-5 py-5" style={{ ...border, background: '#0f0f0f' }}>
            <blockquote className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <figcaption className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {quote.author}, Nelia Rose Designs
            </figcaption>
          </figure>
        )}

        <div className="flex flex-col" style={border}>
          <Link href="/" onClick={() => clicked('website')} className={rowClass}>
            <span className="text-sm font-semibold" style={{ color: '#fff' }}>The website</span>
            <Arrow />
          </Link>
        </div>

        <footer className="flex flex-col items-center gap-4">
          <div className="grid grid-cols-3 w-full" style={border}>
            {SOCIALS.map((s, i) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                onClick={() => clicked(s.label.toLowerCase())}
                className="flex items-center justify-center py-3.5 min-h-[52px] transition-colors hover:bg-white/[0.03] hover:text-[#F2613F]"
                style={{ color: 'rgba(255,255,255,0.85)', borderLeft: i ? '1px solid rgba(255,255,255,0.08)' : undefined }}
              >
                {s.icon}
              </a>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Or email <a href="mailto:contact@naunas.co.uk" onClick={() => clicked('email')} className="underline underline-offset-4 hover:text-[#F2613F]">contact@naunas.co.uk</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
