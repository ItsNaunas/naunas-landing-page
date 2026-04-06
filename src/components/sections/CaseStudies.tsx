'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const CASES = [
  {
    id: 1,
    client: 'Alira Partners',
    industry: 'Growth Agency',
    challenge: 'Leads were captured across 3 different channels with no central CRM. Follow-up was manual — whoever remembered to call, called. Signed contracts took 5–7 days on average. Two salespeople were spending 20+ hours a week on admin.',
    solution: 'Installed a unified Airtable CRM pulling from all lead sources. Built n8n workflows to auto-qualify leads, send timed follow-up sequences, and trigger contract generation on verbal agreement. Connected Stripe for deposit collection.',
    results: [
      { metric: '< 48hrs', label: 'Lead to signed contract' },
      { metric: '20hrs/wk', label: 'Admin eliminated' },
      { metric: '£22K', label: 'Revenue recovered' },
      { metric: '3×', label: 'Faster lead response' },
    ],
    quote: 'Leads were falling through the cracks daily. Now the whole flow runs without us touching it.',
    author: 'Shuhayb Ramjany, Founder',
  },
  {
    id: 2,
    client: 'E-ctrl',
    industry: 'Technology',
    challenge: 'A 6-person creative agency with no standardised onboarding. New clients would wait up to 2 weeks for access, briefs, and kick-off calls to be arranged manually. The founder was personally handling all project setup and follow-up.',
    solution: 'Built a full client onboarding flow triggered the moment a contract was signed. Automated welcome sequences, portal access provisioning, brief templates, and kick-off scheduling via Calendly. Created a Slack workspace structure that auto-populated per client.',
    results: [
      { metric: '< 2hrs', label: 'Onboarding time (was 2 weeks)' },
      { metric: '12hrs/wk', label: 'Founder time reclaimed' },
      { metric: '+40%', label: 'Client retention' },
      { metric: '100%', label: 'Consistent experience' },
    ],
    quote: 'The onboarding flow made us look like a proper operation. Clients notice the difference immediately.',
    author: 'Fesal Saleh, Founder',
  },
];

export function CaseStudies() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const [activeId, setActiveId] = useState(CASES[0].id);

  const active = CASES.find((c) => c.id === activeId)!;

  return (
    <section
      ref={sectionRef}
      id="case-studies"
      className="py-24"
      style={{ background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
        >
          <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
            Case Studies
          </span>

          {/* Plain text switcher */}
          <div className="flex items-center gap-6">
            {CASES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="text-sm font-medium transition-colors pb-0.5"
                style={{
                  color: activeId === c.id ? '#fff' : 'rgba(255,255,255,0.3)',
                  borderBottom: activeId === c.id ? '1px solid #F2613F' : '1px solid transparent',
                }}
              >
                {c.client}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Case study content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex flex-col gap-12"
          >

            {/* Client name + industry */}
            <div className="flex items-baseline gap-4">
              <h3
                className="font-bold leading-none"
                style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', color: '#fff' }}
              >
                {active.client}
              </h3>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {active.industry}
              </span>
            </div>

            {/* Problem + Solution — two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="p-8 md:p-10" style={{ background: '#0C0C0C' }}>
                <p
                  className="text-[11px] font-medium uppercase tracking-widest mb-5"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  The Problem
                </p>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {active.challenge}
                </p>
              </div>
              <div className="p-8 md:p-10" style={{ background: '#0f0f0f' }}>
                <p
                  className="text-[11px] font-medium uppercase tracking-widest mb-5"
                  style={{ color: '#F2613F' }}
                >
                  What We Built
                </p>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {active.solution}
                </p>
              </div>
            </div>

            {/* Stat strip */}
            <div
              className="grid grid-cols-2 md:grid-cols-4"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.07)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                divideColor: 'rgba(255,255,255,0.07)',
              }}
            >
              {active.results.map((r) => (
                <div key={r.label} className="px-4 py-6 md:px-8 md:py-8" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                  <p
                    className="font-bold leading-none"
                    style={{ fontSize: 'clamp(1.25rem, 4vw, 2.25rem)', color: '#F2613F' }}
                  >
                    {r.metric}
                  </p>
                  <p className="text-xs mt-2 leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {r.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="flex flex-col gap-4 max-w-3xl">
              <p
                className="font-medium leading-relaxed"
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', color: 'rgba(255,255,255,0.7)' }}
              >
                &ldquo;{active.quote}&rdquo;
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                — {active.author}
              </p>
            </div>

            {/* CTA */}
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Want results like these for your business?
              </p>
              <button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0C0C0C] px-5 py-2.5 rounded-full transition-colors active:scale-[0.98] glow-accent w-full sm:w-auto"
                style={{ background: '#F2613F' }}
              >
                Get your free audit →
              </button>
            </div>

          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
