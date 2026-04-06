'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const TIERS = [
  {
    name: 'Website',
    price: 'From £500',
    cadence: 'per project',
    description: 'A bespoke, conversion-focused website built to spec — no templates, no page builders, fully handed over.',
    cta: 'Get a quote',
    ctaTarget: 'contact',
    featured: false,
    items: [
      'Custom design — no templates',
      'Built on your stack',
      'Mobile-first + performance optimised',
      'Integrated with your existing tools',
      'Full handover + documentation',
    ],
  },
  {
    name: 'Full Install',
    price: 'From £2,500',
    cadence: 'per project',
    description: 'End-to-end lifecycle infrastructure designed, built, and installed on your stack — fully documented and handed over.',
    cta: 'Start your install',
    ctaTarget: 'contact',
    featured: true,
    items: [
      'Custom CRM schema + automations',
      'Automation workflows connected end-to-end',
      'Intake → onboarding → retention flows',
      'Full QA + live environment testing',
      'System documentation + SOPs',
      'Team training + walkthrough',
    ],
  },
  {
    name: 'Custom Automations',
    price: 'From £800',
    cadence: 'per month',
    description: 'Ongoing custom automation on retainer — built, maintained, and iterated as your business grows.',
    cta: 'Start a retainer',
    ctaTarget: 'contact',
    featured: false,
    items: [
      'Custom automation workflows',
      'Integrated into your existing stack',
      'Ongoing builds + iterations',
      'Full documentation + SOPs',
      'Monthly retainer — cancel anytime',
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

function CheckIcon({ dark }: { dark: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
      <path d="M2 7.5l3.5 3.5 6.5-6.5" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="py-24"
      style={{ background: '#F5F5F5' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
            Investment
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#0C0C0C' }}>
              Simple, transparent pricing.
            </h2>
            <p className="text-sm md:text-base max-w-xs md:text-right leading-relaxed" style={{ color: '#888' }}>
              No retainers forced on you. Start with the audit, scale from there.
            </p>
          </div>
        </motion.div>

        {/* Tiers — unequal grid, featured wider */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-[1fr_1.45fr_1fr] gap-4 items-stretch"
        >
            {TIERS.map((tier) => (
              <motion.div
                key={tier.name}
                variants={cardVariants}
                className="flex flex-col rounded-2xl p-8"
                style={
                  tier.featured
                    ? {
                        background: '#0C0C0C',
                        border: '1px solid #0C0C0C',
                      }
                    : {
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                      }
                }
              >
                {/* Tier name */}
                <p
                  className="text-xs font-medium uppercase tracking-widest mb-6"
                  style={{ color: tier.featured ? 'rgba(255,255,255,0.4)' : '#aaa' }}
                >
                  {tier.name}
                </p>

                {/* Price */}
                <div className="mb-2">
                  <p
                    className="font-bold leading-none"
                    style={{ fontSize: '2.25rem', color: tier.featured ? '#fff' : '#0C0C0C' }}
                  >
                    {tier.price}
                  </p>
                  <p
                    className="text-xs mt-1.5"
                    style={{ color: tier.featured ? 'rgba(255,255,255,0.35)' : '#aaa' }}
                  >
                    {tier.cadence}
                  </p>
                </div>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed mt-4 mb-8 flex-1"
                  style={{ color: tier.featured ? 'rgba(255,255,255,0.55)' : '#666' }}
                >
                  {tier.description}
                </p>

                {/* CTA */}
                <button
                  onClick={() => document.getElementById(tier.ctaTarget)?.scrollIntoView({ behavior: 'smooth' })}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98] mb-8${tier.featured ? ' glow-accent' : ''}`}
                  style={
                    tier.featured
                      ? { background: '#F2613F', color: '#0C0C0C', fontWeight: 600 }
                      : { background: 'transparent', color: '#0C0C0C', border: '1px solid rgba(0,0,0,0.15)' }
                  }
                >
                  {tier.cta} →
                </button>

                {/* Divider */}
                <div
                  className="mb-6"
                  style={{
                    height: '1px',
                    background: tier.featured ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                  }}
                />

                {/* Items */}
                <ul className="flex flex-col gap-3">
                  {tier.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckIcon dark={tier.featured} />
                      <span
                        className="text-sm leading-snug"
                        style={{ color: tier.featured ? 'rgba(255,255,255,0.6)' : '#555' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-xs mt-10"
          style={{ color: '#bbb' }}
        >
          All projects scoped individually. Final pricing confirmed after your free audit.
        </motion.p>

      </div>
    </section>
  );
}
