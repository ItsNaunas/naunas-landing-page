'use client';

import { useState } from 'react';
import { useInView } from '@/hooks/useInView';
import { motion, useInView as useFramerInView } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  {
    number: '01',
    title: 'Audit & Map',
    timeline: 'Week 1–2',
    description: 'We analyse your current ops, identify every revenue leak, and map the full lifecycle from lead to retained client.',
    deliverables: [
      'Full ops + lifecycle audit',
      'Revenue leak identification report',
      'Tech stack + integration mapping',
      'Custom system architecture design',
    ],
  },
  {
    number: '02',
    title: 'Build & Install',
    timeline: 'Week 3–6',
    description: 'We build and install your lifecycle infrastructure — automations, workflows, CRM logic, and any custom tooling required.',
    deliverables: [
      'CRM schema + all automations installed',
      'Automation workflows connected end-to-end',
      'Intake → onboarding → retention flows',
      'Full QA + live environment testing',
    ],
  },
  {
    number: '03',
    title: 'Hand Off & Scale',
    timeline: 'Week 7+',
    description: 'You get a fully documented system with dashboards, team training, and an optional retainer for continuous improvement.',
    deliverables: [
      'Full system documentation + SOPs',
      'Team training + walkthrough session',
      'Dashboard + monitoring access',
      'Ongoing optimisation retainer option',
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
              Three phases.<br />Full system.
            </h2>
            <p className="text-sm md:text-base max-w-xs md:text-right leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Every install follows the same proven sequence — scoped to your stack.
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
            Ready to start phase 1?
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
