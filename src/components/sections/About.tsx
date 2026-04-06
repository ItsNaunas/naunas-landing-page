'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: '12+', label: 'Systems installed' },
  { value: '£18K+', label: 'Avg. revenue recovered' },
  { value: '100%', label: 'Done-for-you' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function About() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      id="about"
      className="py-24 overflow-hidden"
      style={{ background: '#F5F5F5' }}
    >
      <div className="max-w-7xl mx-auto px-6">
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-center"
      >
        {/* ── Left ── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          <span className="text-[11px] font-medium text-[var(--accent)] uppercase tracking-widest">
            About Naunas Systems
          </span>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#0C0C0C' }}>
            Built by an operator.<br />For operators.
          </h2>

          <p className="text-base md:text-lg leading-relaxed max-w-md" style={{ color: '#555' }}>
            Naunas Systems is a one-person infrastructure studio. No account managers, no hand-offs.
            I come in, map your entire client lifecycle, and install the system that runs it — end to end.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] text-sm font-semibold px-5 py-2.5 rounded-full transition-colors active:scale-[0.98] w-full sm:w-auto"
            >
              Book a free audit
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium px-5 py-2.5 rounded-full transition-colors hover:bg-black/5 w-full sm:w-auto"
              style={{ border: '1px solid rgba(0,0,0,0.2)', color: '#0C0C0C' }}
            >
              See how it works
            </button>
          </div>

          {/* Stat row */}
          <div
            className="flex flex-wrap gap-x-10 gap-y-4 pt-6 mt-2"
            style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}
          >
            {STATS.map((s) => (
              <div key={s.value} className="flex flex-col gap-0.5">
                <span className="text-xl font-bold" style={{ color: '#0C0C0C' }}>{s.value}</span>
                <span className="text-xs" style={{ color: '#888' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Right ── */}
        <motion.div variants={itemVariants} className="relative flex justify-center">

          {/* Radial glow behind figure */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 70% at 50% 60%, rgba(242,97,63,0.12) 0%, transparent 70%)',
            }}
          />

          {/* Person image */}
          <div className="relative z-10" style={{ width: '145%', marginLeft: '-22.5%' }}>
            <Image
              src="/assets/sections/hero/hero-image.png"
              alt="Naunas — founder of Naunas Systems"
              width={1000}
              height={1200}
              className="w-full h-auto object-contain"
              style={{ mixBlendMode: 'multiply' }}
            />
            {/* Bottom fade */}
            <div
              className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
              style={{
                height: '35%',
                background: 'linear-gradient(to bottom, transparent, #F5F5F5)',
              }}
            />
          </div>

          {/* Floating card — top left: Revenue metric */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: -10 }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' as const }}
            className="absolute top-4 left-0 z-20 rounded-xl p-4 min-w-[170px] hidden md:block"
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#888' }}>
                Revenue Recovered
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(242,97,63,0.15)', color: 'var(--accent)' }}
              >
                +18.2%
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#0C0C0C' }}>£18K+</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#888' }}>per client, avg.</p>
          </motion.div>

          {/* Floating card — bottom right: Active flows */}
          <motion.div
            initial={{ opacity: 0, x: 20, y: 10 }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' as const }}
            className="absolute bottom-8 right-0 z-20 rounded-xl p-4 min-w-[160px] hidden md:block"
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#888' }}>
                Active Flows
              </span>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-8 mb-2">
              {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    background: i === 5 ? 'var(--accent)' : 'rgba(242,97,63,0.2)',
                  }}
                />
              ))}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold" style={{ color: '#0C0C0C' }}>82%</span>
              <span className="text-[10px]" style={{ color: 'var(--accent)' }}>↑ 38%</span>
            </div>
            <p className="text-[10px]" style={{ color: '#888' }}>automation rate</p>
          </motion.div>

        </motion.div>
      </motion.div>
      </div>
    </section>
  );
}
