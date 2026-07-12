'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { track } from '@vercel/analytics';

const PROMPT_PACK_URL = 'https://naunas8.gumroad.com/l/fuxpbw';
const CRM_GUIDE_URL = 'https://naunas8.gumroad.com/l/ivsdmt';
const SETUP_KIT_URL = 'https://naunas8.gumroad.com/l/vzrehp';

type Product = {
  key: string;
  name: string;
  price: string;
  tagline: string;
  url: string;
  tag?: string;
};

const PRODUCTS: Product[] = [
  {
    key: 'prompt_pack',
    name: 'The Builder Prompt Pack',
    price: '$39',
    tagline:
      '50+ prompts sequenced as one pipeline: spec, schema, architecture, build, debug, harden. Each one names the exact AI failure it prevents.',
    url: PROMPT_PACK_URL,
    tag: 'Start here',
  },
  {
    key: 'crm_guide',
    name: 'Build a CRM That Survives Real Users',
    price: '£100',
    tagline:
      'The full build guide plus the deployable Pipeline repo: a secure, multi-tenant, AI-scored CRM built the Claude Code way, not an insecure CRUD toy.',
    url: CRM_GUIDE_URL,
  },
  {
    key: 'setup_kit',
    name: 'The Setup Kit',
    price: 'Free',
    tagline: 'Claude Code from zero. The exact setup I build on, pay what you want.',
    url: SETUP_KIT_URL,
  },
];

const COMING_SOON = ['The Automation Pack (n8n)'];

export function KitShowcase() {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSrc(params.get('src') ?? '');
  }, []);

  const forwardedSrc = encodeURIComponent(src ? `kit-${src}` : 'kit');

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-8 pt-6"
        >
          <div className="flex flex-col gap-4">
            <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--accent)' }}>
              The Kit
            </span>
            <h1 className="text-3xl md:text-4xl font-bold leading-snug" style={{ color: '#fff' }}>
              You vibe-coded an app. Now make it survive real users.
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              The prompts, guides and systems I use to take AI-built apps from &ldquo;works on my machine&rdquo; to production.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {PRODUCTS.map((product) => (
              <a
                key={product.key}
                href={`${product.url}?src=${forwardedSrc}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('kit_click', { target: product.key, src: src || 'direct' })}
                className="group block rounded-2xl px-5 py-5 transition-colors active:scale-[0.99] bg-[var(--card-raised)] border border-[var(--border)] hover:border-[var(--accent)]"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-semibold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      {product.name}
                    </span>
                    {product.tag && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                        {product.tag}
                      </span>
                    )}
                  </div>
                  <span className="text-base font-semibold shrink-0" style={{ color: '#fff' }}>
                    {product.price}
                  </span>
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {product.tagline}
                </p>
                <span className="inline-block text-xs font-semibold mt-3 transition-colors group-hover:text-[var(--accent)]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Get it →
                </span>
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Landing soon
            </span>
            <ul className="flex flex-col gap-1.5">
              {COMING_SOON.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  <span style={{ color: 'rgba(242,97,63,0.55)' }}>→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={`/newsletter?src=${forwardedSrc}`}
            onClick={() => track('kit_click', { target: 'newsletter', src: src || 'direct' })}
            className="text-center text-sm underline underline-offset-4 transition-colors hover:text-[var(--accent)]"
            style={{ color: 'var(--muted)' }}
          >
            Get told first when a new pack drops
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
