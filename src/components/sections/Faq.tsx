'use client';

import { useState } from 'react';
import { useInView } from '@/hooks/useInView';

const FAQS = [
  {
    q: 'What type of businesses do you work with?',
    a: 'Agencies, coaching businesses, and service operators with an established offer and active lead flow. If you have a repeatable service and want to scale it without burning out, we can install the infrastructure to do that.',
  },
  {
    q: 'How long does a full lifecycle install take?',
    a: 'Most installs take 2–4 weeks depending on scope. Automation-only projects can be done in under a week. Bespoke builds are scoped individually.',
  },
  {
    q: "What if I'm already using tools like n8n, Airtable, or HubSpot?",
    a: "We build on top of your existing stack wherever possible. We're tool-agnostic — if it has an API, we can work with it.",
  },
  {
    q: 'Do you offer ongoing support after the install?',
    a: 'Yes. We offer a post-install optimisation period as standard. Ongoing retainers are available for businesses that want continuous improvement.',
  },
  {
    q: 'What is the free AI audit?',
    a: "Submit your details and we'll analyse your current ops using AI-assisted review. You'll receive a breakdown of your lifecycle gaps, automation opportunities, and a priority action list — at no cost.",
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
