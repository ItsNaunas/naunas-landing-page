'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useInView } from '@/hooks/useInView';

/* ── Shared card sub-components ── */

function MetricBar({ label, value, max, inView = true, delay = 0 }: { label: string; value: number; max: number; inView?: boolean; delay?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/8 last:border-0">
      <span className="text-[#A0A0A0] text-sm flex-1">{label}</span>
      <div className="flex items-center gap-2.5">
        <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: inView ? `${pct}%` : '0%',
              background: '#F2613F',
              opacity: pct > 60 ? 1 : pct > 30 ? 0.65 : 0.4,
              transition: `width 0.9s ease-out ${delay}ms`,
            }}
          />
        </div>
        <span className="text-white text-sm font-medium w-5 text-right">{value}</span>
        <div className="w-2 h-2 rounded-full" style={{ background: pct > 60 ? '#555' : '#F2613F' }} />
      </div>
    </div>
  );
}

function CardFooter({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <p className="text-[var(--accent)] text-xs font-medium mb-1">{label}</p>
      <p className="text-white text-2xl font-bold mb-3">{value}</p>
      {/* Full-width segmented gradient bar */}
      <div className="flex gap-0.5 h-2 w-full overflow-hidden rounded-full">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-sm"
            style={{
              background: i < 16
                ? `rgba(242,97,63,${0.4 + (i / 16) * 0.6})`
                : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ label, state }: { label: string; state: 'neutral' | 'warn' | 'error' }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {state === 'neutral' && <div className="w-2.5 h-2.5 rounded-full bg-[#555] shrink-0" />}
      {state === 'warn' && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0" />}
      {state === 'error' && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
          <path d="M6 1L11 10H1L6 1Z" stroke="#F2613F" strokeWidth="1.2" fill="rgba(242,97,63,0.15)" />
          <path d="M6 4.5v2.5" stroke="#F2613F" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6" cy="8.5" r="0.5" fill="#F2613F" />
        </svg>
      )}
      <span className={`text-sm ${state === 'neutral' ? 'text-[#888]' : 'text-[#CCC]'}`}>{label}</span>
    </div>
  );
}

/* ── Dark UI Cards ── */

function LeadFunnelCard() {
  const { ref, inView } = useInView();
  const metrics = [
    { label: 'New Leads', value: 42, max: 42 },
    { label: 'Qualified', value: 18, max: 42 },
    { label: 'Calls Booked', value: 9, max: 42 },
    { label: 'Closed', value: 3, max: 42 },
  ];
  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-6"
      style={{ background: '#141414' }}
    >
      <p className="text-white text-sm font-semibold mb-4">Lead Funnel</p>
      <div className="flex flex-col">
        {metrics.map((m, i) => <MetricBar key={m.label} {...m} inView={inView} delay={i * 120} />)}
      </div>
      <CardFooter label="Revenue Leakage Detected" value="£18,400 / month" />
    </motion.div>
  );
}

function OnboardingCard() {
  const { ref, inView } = useInView();
  const items: { label: string; state: 'neutral' | 'warn' | 'error' }[] = [
    { label: 'Deal Won', state: 'neutral' },
    { label: 'Manual Setup', state: 'warn' },
    { label: 'Missing Details', state: 'warn' },
    { label: 'Client Waiting', state: 'warn' },
    { label: 'Delivery Delayed', state: 'error' },
  ];
  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-6"
      style={{ background: '#141414' }}
    >
      <p className="text-white text-sm font-semibold mb-4">Onboarding Timeline</p>
      <div className="flex flex-col">
        {items.map((item) => <TimelineItem key={item.label} {...item} />)}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-[#888] text-xs mb-1">Avg Delay</p>
        <p className="text-[var(--accent)] text-lg font-bold mb-3">5–10 days</p>
        <div className="flex gap-0.5 h-2 w-full overflow-hidden rounded-full">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full rounded-sm"
              style={{
                background: i < 12
                  ? `rgba(242,97,63,${0.35 + (i / 12) * 0.65})`
                  : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RetentionCard() {
  const { ref, inView } = useInView();
  const metrics = [
    { label: 'Active Clients', value: 14, max: 14 },
    { label: 'Renewal Risk', value: 5, max: 14 },
    { label: 'Upsell Opportunities', value: 3, max: 14 },
  ];
  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-6"
      style={{ background: '#141414' }}
    >
      <p className="text-white text-sm font-semibold mb-4">Client Lifecycle Health</p>
      <div className="flex flex-col">
        {metrics.map((m, i) => <MetricBar key={m.label} {...m} inView={inView} delay={i * 120} />)}
      </div>
      <CardFooter label="Missed Expansion Revenue" value="£27,000" />
    </motion.div>
  );
}

/* ── Row layouts — each observes itself ── */

function RowTextLeft({
  number, title, body, highlight, href, card,
}: {
  number: string; title: string; body: string[]; highlight: string[]; href: string;
  card: React.ReactNode;
}) {
  const { ref, inView } = useInView();
  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center py-14 md:py-16 border-b border-[#E5E5E5]"
    >
      {/* Text side */}
      <div className="relative overflow-hidden">
        <span className="absolute text-[140px] font-bold leading-none select-none pointer-events-none"
          style={{ color: 'rgba(242,97,63,0.12)', zIndex: 0, bottom: '-1rem', right: '1rem' }}>{number}</span>
        <div className="relative" style={{ zIndex: 1 }}>
          <h3 className="text-2xl md:text-3xl font-bold text-[#111] mb-4 leading-snug">{title}</h3>
          <div className="flex flex-col gap-1 mb-4">
            {body.map((line, i) => (
              <p key={i} className="text-[#6B7280] text-sm leading-relaxed">{line}</p>
            ))}
          </div>
          <div className="mb-5">
            {highlight.map((line, i) => (
              <p key={i} className="text-[#111] text-sm font-semibold leading-relaxed">{line}</p>
            ))}
          </div>
          <a href={href} className="inline-flex items-center gap-2 text-sm text-[#111] font-medium hover:text-[var(--accent)] transition-colors group">
            See how we fix it
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
      {/* Card side */}
      <div>{card}</div>
    </motion.div>
  );
}

function RowCardLeft({
  number, title, body, highlight, href, card,
}: {
  number: string; title: string; body: string[]; highlight: string[]; href: string;
  card: React.ReactNode;
}) {
  const { ref, inView } = useInView();
  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center py-14 md:py-16 border-b border-[#E5E5E5]"
    >
      {/* Card side — first on desktop */}
      <div className="order-2 md:order-1">{card}</div>
      {/* Text side — second on desktop */}
      <div className="relative order-1 md:order-2 overflow-hidden">
        <span className="absolute text-[140px] font-bold leading-none select-none pointer-events-none"
          style={{ color: 'rgba(242,97,63,0.12)', zIndex: 0, bottom: '-1rem', right: '1rem' }}>{number}</span>
        <div className="relative" style={{ zIndex: 1 }}>
          <h3 className="text-2xl md:text-3xl font-bold text-[#111] mb-4 leading-snug">{title}</h3>
          <div className="flex flex-col gap-1 mb-4">
            {body.map((line, i) => (
              <p key={i} className="text-[#6B7280] text-sm leading-relaxed">{line}</p>
            ))}
          </div>
          <div className="mb-5">
            {highlight.map((line, i) => (
              <p key={i} className="text-[#111] text-sm font-semibold leading-relaxed">{line}</p>
            ))}
          </div>
          <a href={href} className="inline-flex items-center gap-2 text-sm text-[#111] font-medium hover:text-[var(--accent)] transition-colors group">
            See how we fix it
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main section ── */

export function Problem() {
  const { ref, inView } = useInView();

  return (
    <section
      id="problem"
      ref={ref as React.RefObject<HTMLElement>}
      className="relative"
    >
      <div className="py-24 md:py-32" style={{ background: '#F5F5F5' }}>
        <div className="max-w-7xl mx-auto px-6">

          {/* Header — fires when section top enters view */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-14 md:mb-20"
          >
            <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-widest">
              The Problem
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111] mt-3 leading-tight">
              Your business isn&apos;t broken<br />Your systems are
            </h2>
            <p className="mt-4 text-[#6B7280] text-base leading-relaxed max-w-lg mx-auto">
              Leads arrive. Calls happen. Deals close. But without structure, revenue{' '}
              <strong className="text-[#111]">leaks at every stage.</strong>
            </p>
          </motion.div>

          {/* Rows — each fires independently as you scroll */}
          <div className="flex flex-col border-t border-[#E5E5E5]">
            <RowTextLeft
              number="01"
              title="Leads fall through the cracks"
              body={[
                'Leads come in from forms, ads, referrals, and DMs.',
                'They sit in inboxes. Follow ups happen randomly.',
                'Hot prospects go cold simply because no system exists.',
              ]}
              highlight={["That's not a lead problem.", "That's a lifecycle problem."]}
              href="#services"
              card={<LeadFunnelCard />}
            />
            <RowCardLeft
              number="02"
              title="Onboarding is slow and inconsistent"
              body={[
                'Deals close but delivery starts late.',
                "Files are missing. Expectations aren't clear.",
                'Clients feel uncertainty from day one.',
              ]}
              highlight={['This is where trust is lost.', 'And churn begins before delivery even starts.']}
              href="#services"
              card={<OnboardingCard />}
            />
            <RowTextLeft
              number="03"
              title="Retention is reactive, not systematic"
              body={[
                'Clients are delivered to… then forgotten.',
                'No renewal reminders. No referral triggers.',
                'No upsell opportunities.',
                'Revenue stops when delivery ends.',
              ]}
              highlight={['The best businesses grow from retention.', 'Not constant new leads.']}
              href="#services"
              card={<RetentionCard />}
            />
          </div>

        </div>
      </div>


    </section>
  );
}
