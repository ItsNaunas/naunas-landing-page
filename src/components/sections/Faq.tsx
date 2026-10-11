'use client';

import { useState } from 'react';
import { useInView } from '@/hooks/useInView';

const FAQS = [
  {
    q: 'Who do you work with?',
    a: 'Businesses that sell a few big things rather than lots of small ones: design studios, construction and remodelling, property, agencies, academies and professional services. Usually a new client is worth $5k or more to you.',
  },
  {
    q: 'Do I have to change the tools I use?',
    a: "No. I build around what already works for you and only replace what's holding you back. If a tool has an API, I can connect it.",
  },
  {
    q: 'Who owns the system?',
    a: 'You do. Everything is built in your own accounts, with documentation, so nothing is locked to me.',
  },
  {
    q: 'How long does it take?',
    a: "It's scoped in writing before we start. One building block is much quicker than the full Client System, and you'll know the timeline before you commit.",
  },
  {
    q: "We're not technical. Is that a problem?",
    a: 'No. You get a walkthrough, training and plain-English docs at handover, and optional monthly support if you want someone looking after it.',
  },
  {
    q: 'Do you work outside the UK?',
    a: 'Yes. I work with owners in the US and the UK, remotely.',
  },
  {
    q: 'What is the free audit?',
    a: "Answer a few quick questions, pick a time, and in 30 minutes I'll walk through how enquiries, proposals and clients move through your business, show you where it's leaking and what I'd fix first. No cost, no obligation.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors"
        style={{ background: 'transparent' }}
      >
        <span className="text-sm font-medium pr-4" style={{ color: '#0C0C0C' }}>{q}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <path
            d="M9 3v12M3 9h12"
            stroke={open ? '#F2613F' : '#999'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm leading-relaxed" style={{ color: '#666' }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export function Faq() {
  const { ref, inView } = useInView();

  return (
    <section
      id="faq"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-16 md:py-24"
      style={{ background: '#F5F5F5' }}
    >
      <div className="max-w-3xl mx-auto px-6">

        <div className={`text-center mb-8 md:mb-12 will-animate ${inView ? 'is-visible anim-up' : ''}`}>
          <span className="text-[11px] font-medium text-[var(--accent)] uppercase tracking-widest">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3" style={{ color: '#0C0C0C' }}>Common questions</h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => (
            <div
              key={item.q}
              className={`will-animate ${inView ? `is-visible anim-up delay-${Math.min(i * 100, 400)}` : ''}`}
            >
              <FaqItem q={item.q} a={item.a} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
