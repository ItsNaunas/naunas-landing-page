'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const ROWS = [
  { label: 'Cost',                 inhouse: '£40K+/yr salary',     freelancer: 'Variable, unclear',  naunas: 'Fixed project fee'    },
  { label: 'Time to value',        inhouse: '3–6 months',          freelancer: 'Weeks to months',    naunas: '2–4 weeks'            },
  { label: 'Accountability',       inhouse: 'High (employee)',      freelancer: 'Low, no guarantees', naunas: 'High, defined scope'  },
  { label: 'System ownership',     inhouse: 'You own it',          freelancer: 'Often unclear',      naunas: 'You own everything'   },
  { label: 'Full lifecycle scope', inhouse: 'Maybe, over time',    freelancer: 'Rarely',             naunas: 'Always, end-to-end'   },
  { label: 'Ongoing support',      inhouse: 'Yes (costly)',        freelancer: 'Rarely included',    naunas: 'Optional retainer'    },
  { label: 'Documentation',        inhouse: 'Inconsistent',        freelancer: 'Usually none',       naunas: 'Full SOPs + training' },
];

export function Comparison() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="comparison"
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
            Why Naunas
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#0C0C0C' }}>
              How we compare.
            </h2>
            <p className="text-sm md:text-base max-w-xs md:text-right leading-relaxed" style={{ color: '#666' }}>
              Done-for-you infrastructure vs the alternatives.
            </p>
          </div>
        </motion.div>

        <div>

          {/* ── Mobile layout ── */}
          <div className="md:hidden flex flex-col rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            {/* Column labels */}
            <div className="grid grid-cols-3 bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['In-house', 'Freelancer', 'Naunas'].map((col, i) => (
                <div
                  key={col}
                  className="py-3 text-center"
                  style={{
                    borderLeft: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    background: i === 2 ? 'rgba(242,97,63,0.04)' : 'transparent',
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: i === 2 ? '#F2613F' : '#0C0C0C' }}>
                    {col}
                  </p>
                </div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <div key={row.label} style={{ background: i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.015)' }}>
                {/* Label */}
                <div className="px-4 pt-3 pb-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#0C0C0C' }}>{row.label}</span>
                </div>
                {/* Values */}
                <div className="grid grid-cols-3 pb-3">
                  <div className="px-3 py-1 text-center">
                    <span className="text-[11px] leading-snug" style={{ color: '#999' }}>{row.inhouse}</span>
                  </div>
                  <div className="px-3 py-1 text-center" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
                    <span className="text-[11px] leading-snug" style={{ color: '#999' }}>{row.freelancer}</span>
                  </div>
                  <div className="px-3 py-1 text-center" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', background: 'rgba(242,97,63,0.03)' }}>
                    <span className="text-[11px] font-medium leading-snug" style={{ color: '#F2613F' }}>{row.naunas}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop layout ── */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            {/* Column headers */}
            <div className="grid grid-cols-4 bg-white">
              <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }} />
              {['In-house hire', 'Freelancer', 'Naunas Systems'].map((col, i) => (
                <div
                  key={col}
                  className="px-4 py-4 text-center border-b border-l"
                  style={{
                    borderColor: 'rgba(0,0,0,0.08)',
                    background: i === 2 ? 'rgba(242,97,63,0.04)' : 'transparent',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: i === 2 ? '#F2613F' : '#0C0C0C' }}>
                    {col}
                  </p>
                  {i === 2 && (
                    <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: 'rgba(242,97,63,0.7)' }}>
                      Recommended
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07, ease: 'easeOut' as const }}
                className="grid grid-cols-4"
                style={{ background: i % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.015)' }}
              >
                <div className="px-6 py-4 border-b flex items-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <span className="text-sm font-medium" style={{ color: '#0C0C0C' }}>{row.label}</span>
                </div>
                <div className="px-4 py-4 border-b border-l flex items-center justify-center text-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <span className="text-xs leading-snug" style={{ color: '#888' }}>{row.inhouse}</span>
                </div>
                <div className="px-4 py-4 border-b border-l flex items-center justify-center text-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <span className="text-xs leading-snug" style={{ color: '#888' }}>{row.freelancer}</span>
                </div>
                <div className="px-4 py-4 border-b border-l flex items-center justify-center text-center" style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'rgba(242,97,63,0.03)' }}>
                  <span className="text-xs font-medium leading-snug" style={{ color: '#F2613F' }}>{row.naunas}</span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-10 pt-8"
          style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
        >
          <p className="text-sm" style={{ color: '#888' }}>
            Ready to see what the right system looks like for your business?
          </p>
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0C0C0C] px-5 py-2.5 rounded-full transition-colors active:scale-[0.98] glow-accent w-full sm:w-auto"
            style={{ background: '#F2613F' }}
          >
            Get your free audit →
          </button>
        </motion.div>

      </div>
    </section>
  );
}
