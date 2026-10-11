'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

// "Business is simple. It's just long." The 8 layers from the Leak Map, with the free guide as the CTA.
const LAYERS = [
  { n: '01', name: 'Attention', leak: 'They like your work, then find nowhere obvious to go next.' },
  { n: '02', name: 'Capture', leak: 'The enquiry waits hours for a reply. They ask someone else.' },
  { n: '03', name: 'Pipeline', leak: 'Enquiries scattered across DMs, email and missed calls.' },
  { n: '04', name: 'Follow-up', leak: 'Booked calls no-show. Maybes get forgotten.' },
  { n: '05', name: 'Conversion', leak: '"Loved the proposal", then weeks of chasing the deposit.' },
  { n: '06', name: 'Fulfilment', leak: 'Onboarding by hand. Clients keep asking what happens next.' },
  { n: '07', name: 'Retention', leak: 'The handover ends with an invoice. No review, no referral.' },
  { n: '08', name: 'Attribution', leak: 'No idea which source brings the biggest clients.' },
];

export function LeakMapSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section ref={ref} id="leak-map" className="py-24" style={{ background: '#0C0C0C' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
        >
          <div>
            <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">The Leak Map</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
              Business is simple.<br />It&apos;s just long.
            </h2>
            <p className="text-sm md:text-base mt-4 max-w-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Eight steps between someone seeing your work and referring a friend. Most businesses are great at one or two and leak in the rest.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => window.dispatchEvent(new Event('open-leak-map'))}
              className="inline-flex items-center justify-center text-sm font-semibold text-[#0C0C0C] px-6 py-3 rounded-full glow-accent"
              style={{ background: '#F2613F' }}
            >
              Get the free Leak Map →
            </button>
            <Link
              href="/audit?src=leak-map-section"
              className="inline-flex items-center justify-center text-sm font-medium px-6 py-3 rounded-full transition-colors hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
            >
              Find my weakest layer
            </Link>
          </div>
        </motion.div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {LAYERS.map((l, i) => (
            <motion.div
              key={l.n}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 bg-[#0C0C0C]"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ width: 36, height: 36, border: '1.5px solid #F2613F', color: '#fff' }}
                >
                  {l.n}
                </span>
                <span className="text-lg font-bold" style={{ color: '#fff' }}>{l.name}</span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mt-5" style={{ color: '#F2613F' }}>The leak</p>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{l.leak}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
