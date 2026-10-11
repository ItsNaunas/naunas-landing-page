'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { CASE_STUDIES, FEATURED_SLUGS } from '@/lib/caseStudies';

const FEATURED = FEATURED_SLUGS.map((s) => CASE_STUDIES.find((c) => c.slug === s)!);

export function CaseStudies() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="case-studies"
      className="py-24"
      style={{ background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
        >
          <div>
            <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
              Case Studies
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
              Systems I&apos;ve built.
            </h2>
          </div>
          <Link
            href="/case-studies"
            className="text-sm font-medium transition-colors hover:text-[#F2613F]"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            See all work →
          </Link>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {FEATURED.map((c, i) => (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 28 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/case-studies/${c.slug}`}
                className="group flex flex-col h-full p-7 transition-colors bg-[#0C0C0C] hover:bg-[#111111]"
              >
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {c.sector}
                </span>
                <h3 className="text-2xl font-bold mt-2" style={{ color: '#fff' }}>
                  {c.client}
                </h3>
                <p
                  className="font-bold leading-none mt-8"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', color: '#F2613F' }}
                >
                  {c.metric.value}
                </p>
                <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {c.metric.label}
                </p>
                <p className="text-sm leading-relaxed mt-6 flex-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {c.summary}
                </p>
                <span
                  className="text-sm font-medium mt-6 transition-colors group-hover:text-[#F2613F]"
                  style={{ color: '#fff' }}
                >
                  Read the case study →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
