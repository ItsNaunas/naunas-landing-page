'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const TESTIMONIALS = [
  {
    quote: "I've had a play around and just know you are never leaving. You are so amazing at what you do!",
    name: 'Uche Ibeh',
    company: 'Founder, Nelia Rose Designs',
    initials: 'U',
  },
  {
    quote: "I appreciate your brain, man. You're making things make sense. I'm part of the team at this point.",
    name: 'Derick Prosper',
    company: 'Founder, Soul in the Horn',
    initials: 'D',
  },
  {
    quote: "I send him templates, microcopy, everything, all the time. He doesn't reply — he just gives me 30 minutes and comes back with a full update. Who does that?",
    name: 'Haider',
    company: 'Content strategist',
    initials: 'H',
  },
  {
    quote: "Oh my days… that gives us better options of different cleaners. That's cold, that is cold.",
    name: 'Abdullah Said',
    company: 'Co-founder, SAAFI Cleaning',
    initials: 'A',
  },
  {
    quote: "When it comes to incorporating AI, he's a master — a wizard in that field. Exceptional service as always, and brilliant at delivering on time.",
    name: 'Shuheyb',
    company: 'CEO, Alira',
    initials: 'S',
  },
  {
    quote: 'Super super responsive, very quick, and completely blew my expectations out of the water. Highly recommend — if you’re ever considering it, just give it a go.',
    name: 'Fesal',
    company: 'Founder, E-ctrl',
    initials: 'F',
  },
];

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });


  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="py-24"
      style={{ background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-stretch">

          {/* Left: heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="md:col-span-4 flex flex-col justify-center"
          >
            <div>
              <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
                In their words
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
                What it&apos;s like to work with me.
              </h2>
              <p className="text-sm md:text-base leading-relaxed mt-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Real clients, real projects. No scripts.
              </p>
            </div>
          </motion.div>

          {/* Right: auto-scrolling marquee (pauses on hover, static if reduced motion) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-8 min-w-0 group overflow-hidden motion-reduce:overflow-x-auto"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              maskImage: 'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)',
            }}
          >
            <div
              className="flex group-hover:[animation-play-state:paused] motion-reduce:[animation:none]"
              style={{ width: 'max-content', animation: 'testimonialMarquee 60s linear infinite' }}
            >
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <figure
                  key={i}
                  aria-hidden={i >= TESTIMONIALS.length}
                  className="shrink-0 w-[300px] sm:w-[340px] flex flex-col justify-between p-7"
                  style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <blockquote className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="flex items-center gap-3 mt-8">
                    <div
                      className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
                      style={{
                        width: 36, height: 36,
                        background: 'rgba(242,97,63,0.1)',
                        color: '#F2613F',
                        border: '1px solid rgba(242,97,63,0.2)',
                      }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#fff' }}>{t.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.company}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
            <style>{`
              @keyframes testimonialMarquee {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
