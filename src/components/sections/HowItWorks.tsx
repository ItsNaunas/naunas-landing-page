'use client';

import { useState } from 'react';
import { useInView } from '@/hooks/useInView';
import { motion, useInView as useFramerInView } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  {
    number: '01',
    title: 'Free audit',
    timeline: '30 minutes',
    description: 'Answer a few questions, pick a time, and we walk through how enquiries, proposals and clients move through your business.',
    deliverables: [
      'Your weakest layer, named',
      'What it is likely costing you',
      'What I would fix first',
      'No cost, no obligation',
    ],
  },
  {
    number: '02',
    title: 'Written scope',
    timeline: 'Within 48 hours',
    description: 'You get a written scope: which building blocks, what changes for you and your clients, the timeline and the price. Nothing is built until you agree it.',
    deliverables: [
      'Blocks and features, in plain English',
      'Timeline with milestones',
      'Fixed price for the build',
      'What you need to provide',
    ],
  },
  {
    number: '03',
    title: 'Build & handover',
    timeline: 'Scoped per project',
    description: 'Built in your own accounts, tested on real cases, then handed over with training and plain-English docs. Optional monthly support after.',
    deliverables: [
      'Built in your accounts, you own it',
      'Tested on real cases before launch',
      'Training + walkthrough',
      'Optional monthly support',
    ],
  },
];

export function HowItWorks() {
  const { ref, inView } = useInView();
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useFramerInView(gridRef, { once: true, amount: 0.2 });
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section
      id="process"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-16 md:py-28"
      style={{ background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className={`mb-16 will-animate ${inView ? 'is-visible anim-up' : ''}`}>
          <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
            How It Works
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#fff' }}>
              Three steps.<br />No surprises.
            </h2>
            <p className="text-sm md:text-base max-w-xs md:text-right leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              A written scope before anything is built, and everything lives in your accounts.
            </p>
          </div>
        </div>

        {/* 3-column grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          {STEPS.map((step, i) => {
            const isActive = activeStep === i;
            return (
              <motion.button
                key={step.number}
                onClick={() => setActiveStep(i)}
                initial={{ opacity: 0, y: 32 }}
                animate={gridInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: i * 0.13, ease: [0.16, 1, 0.3, 1] }}
                className={`relative text-left px-5 py-8 md:px-8 md:py-10 transition-all duration-300 overflow-hidden group`}
                style={{
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  borderTop: isActive ? '2px solid #F2613F' : '2px solid transparent',
                  background: isActive ? 'rgba(242,97,63,0.03)' : 'transparent',
                }}
              >
                {/* Giant faded number — background decoration */}
                <span
                  className="absolute -top-2 right-6 font-bold leading-none select-none pointer-events-none transition-all duration-500"
                  style={{
                    fontSize: '6rem',
                    color: isActive ? 'rgba(242,97,63,0.1)' : 'rgba(255,255,255,0.04)',
                    lineHeight: 1,
                  }}
                >
                  {step.number}
                </span>

                {/* Step number + timeline */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <span
                    className="font-mono text-sm font-medium transition-colors"
                    style={{ color: isActive ? '#F2613F' : 'rgba(255,255,255,0.4)' }}
                  >
                    {step.number}
                  </span>
                  <span
                    className="text-xs font-medium transition-colors"
                    style={{ color: isActive ? 'rgba(242,97,63,0.8)' : 'rgba(255,255,255,0.35)' }}
                  >
                    {step.timeline}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="text-xl md:text-2xl font-bold mb-4 relative z-10 transition-colors duration-300"
                  style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.65)' }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed mb-8 relative z-10 transition-colors duration-300"
                  style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)' }}
                >
                  {step.description}
                </p>

                {/* Divider */}
                <div
                  className="mb-6 relative z-10 transition-colors duration-300"
                  style={{
                    height: '1px',
                    background: isActive ? 'rgba(242,97,63,0.2)' : 'rgba(255,255,255,0.06)',
                  }}
                />

                {/* Deliverables */}
                <ul className="flex flex-col gap-2.5 relative z-10">
                  {step.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-0.5 text-xs transition-colors duration-300"
                        style={{ color: isActive ? '#F2613F' : 'rgba(255,255,255,0.3)' }}
                      >
                        →
                      </span>
                      <span
                        className="text-xs leading-snug transition-colors duration-300"
                        style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}
                      >
                        {d}
                      </span>
                    </li>
                  ))}
                </ul>

              </motion.button>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 mt-2"
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Start with the free audit. It takes 30 minutes.
          </p>
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0C0C0C] px-5 py-2.5 rounded-full transition-colors active:scale-[0.98] glow-accent w-full sm:w-auto"
            style={{ background: '#F2613F' }}
          >
            Book a free audit
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
}
