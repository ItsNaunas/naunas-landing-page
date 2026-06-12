'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { track } from '@vercel/analytics';

const INSTAGRAM_URL = 'https://www.instagram.com/naunas_builds/';
const TIKTOK_URL = 'https://www.tiktok.com/@naunas_builds';
const LINKEDIN_URL = 'https://www.linkedin.com/in/naufal-nassor-0a1b6936b/';

const primaryClass = 'w-full block text-center font-semibold py-4 rounded-2xl transition-colors active:scale-[0.98] text-base glow-accent';
const secondaryClass = 'w-full block text-center py-4 rounded-2xl text-base transition-colors min-h-[52px] bg-white/5 border border-white/10 text-[var(--fg)] hover:border-[var(--accent)] active:scale-[0.98]';

export function LinksHub() {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSrc(params.get('src') ?? '');
  }, []);

  const forwardedSrc = encodeURIComponent(src ? `links-${src}` : 'links');

  function handleClick(target: string) {
    track('link_click', { target, src: src || 'direct' });
  }

  const externalLinks = [
    { target: 'instagram', label: 'Instagram', href: INSTAGRAM_URL },
    { target: 'tiktok', label: 'TikTok', href: TIKTOK_URL },
    { target: 'linkedin', label: 'LinkedIn', href: LINKEDIN_URL },
  ];

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

      <main className="relative max-w-md mx-auto px-6 pt-16 pb-20" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-10"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="text-3xl font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Naunas<span className="text-[var(--accent)]">.</span>
            </Link>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              AI systems for service businesses
            </p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <Link
              href={`/audit?src=${forwardedSrc}`}
              onClick={() => handleClick('audit')}
              className={primaryClass}
              style={{ background: '#F2613F', color: '#0C0C0C' }}
            >
              Get a free audit of your business
            </Link>
            <Link
              href={`/newsletter?src=${forwardedSrc}`}
              onClick={() => handleClick('newsletter')}
              className={secondaryClass}
            >
              The newsletter: every system I build + the resources, free
            </Link>
            {externalLinks.map((link) => (
              <a
                key={link.target}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick(link.target)}
                className={secondaryClass}
              >
                {link.label}
              </a>
            ))}
            <a
              href="mailto:contact@naunas.co.uk"
              onClick={() => handleClick('email')}
              className={secondaryClass}
            >
              Email me
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
