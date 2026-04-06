'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const TESTIMONIALS = [
  {
    id: 1,
    metric: '< 48hrs',
    metricLabel: 'lead to signed contract',
    quote: 'Leads were falling through the cracks daily. Now the whole flow runs without us touching it.',
    name: 'James Rowe',
    role: 'Operations Director',
    company: 'Rowe Roofing',
    industry: 'Home Services',
    initials: 'JR',
  },
  {
    id: 2,
    metric: '12hrs/wk',
    metricLabel: 'back from manual follow-up',
    quote: 'I was chasing every lead myself. The system Naunas installed does it — and does it better than I did.',
    name: 'Sophie Mackenzie',
    role: 'Founder',
    company: 'Mackenzie Creative',
    industry: 'Agency',
    initials: 'SM',
  },
  {
    id: 3,
    metric: '+40%',
    metricLabel: 'client retention since install',
    quote: 'The onboarding flow made us look like a proper operation. Clients notice the difference immediately.',
    name: 'Tom Bellamy',
    role: 'MD',
    company: 'Bellamy Home Services',
    industry: 'Home Services',
    initials: 'TB',
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const featured = TESTIMONIALS[featuredIndex];
  const stacked = TESTIMONIALS.filter((_, i) => i !== featuredIndex);

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="py-24"
      style={{ background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-0"
        >
          <div>
            <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
              Client Results
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
              Outcomes, not promises.
            </h2>
          </div>
          <p className="text-sm md:text-base max-w-xs md:text-right leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Every result below came from a full done-for-you install.
          </p>
        </motion.div>

        {/* Featured + stacked — straight lines, no cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-5 mt-12"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >

          {/* Featured — left 3/5 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={featured.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="md:col-span-3 flex flex-col justify-between py-10 pr-0 md:pr-12"
              style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Metric */}
              <div className="mb-8">
                <p
                  className="font-bold leading-none tracking-tight"
                  style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', color: '#F2613F' }}
                >
                  {featured.metric}
                </p>
                <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {featured.metricLabel}
                </p>
              </div>

              {/* Quote */}
              <p
                className="text-lg md:text-xl leading-relaxed flex-1 mb-10"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                &ldquo;{featured.quote}&rdquo;
              </p>

              {/* Divider */}
              <div className="mb-6" style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

              {/* Author */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
                    style={{
                      width: 40, height: 40,
                      background: 'rgba(242,97,63,0.1)',
                      color: '#F2613F',
                      border: '1px solid rgba(242,97,63,0.2)',
                    }}
                  >
                    {featured.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#fff' }}>{featured.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {featured.role}, {featured.company}
                    </p>
                  </div>
                </div>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {featured.industry}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stacked — right 2/5 */}
          <div className="md:col-span-2 flex flex-col">
            {stacked.map((t, i) => (
              <motion.button
                key={t.id}
                onClick={() => setFeaturedIndex(TESTIMONIALS.indexOf(t))}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.25 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="group flex flex-col justify-between text-left py-10 pl-0 md:pl-10 transition-all duration-200 flex-1"
                style={{
                  borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.paddingLeft = '44px';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.paddingLeft = window.innerWidth >= 768 ? '40px' : '0px';
                }}
              >
                {/* Metric */}
                <div className="mb-4">
                  <p
                    className="font-bold leading-none transition-colors duration-200 group-hover:text-[#F2613F]"
                    style={{ fontSize: '2rem', color: 'rgba(255,255,255,0.4)' }}
                  >
                    {t.metric}
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {t.metricLabel}
                  </p>
                </div>

                {/* Quote */}
                <p
                  className="text-sm leading-relaxed mb-6 flex-1"
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{t.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{t.company}</p>
                  </div>
                  <span
                    className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#F2613F' }}
                  >
                    Expand →
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-10 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Ready to become the next result?
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
