'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Terminal visual component ── */

type LogLine = { type: 'cmd' | 'ok' | 'run' | 'up' | 'blank'; text: string };

function Terminal({ filename, lines }: { filename: string; lines: LogLine[] }) {
  return (
    <div
      className="w-full h-full rounded-xl flex flex-col overflow-hidden font-mono text-xs"
      style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#111' }}
      >
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>{filename}</span>
      </div>

      {/* Log output */}
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        {lines.map((line, i) => {
          if (line.type === 'blank') return <div key={i} className="h-2" />;
          if (line.type === 'cmd') return (
            <p key={i} style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span style={{ color: 'rgba(242,97,63,0.6)' }}>$</span> {line.text}
            </p>
          );
          const prefix =
            line.type === 'ok'  ? <span style={{ color: '#4ade80' }}>[✓]</span> :
            line.type === 'run' ? <span style={{ color: '#F2613F' }}>[→]</span> :
                                  <span style={{ color: '#60a5fa' }}>[↑]</span>;
          return (
            <p key={i} className="flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {prefix}
              <span>{line.text}</span>
            </p>
          );
        })}
        {/* Blinking cursor */}
        <p className="mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <span style={{ color: 'rgba(242,97,63,0.6)' }}>$</span>{' '}
          <span className="animate-pulse">▌</span>
        </p>
      </div>
    </div>
  );
}

function EnquiryVisual() {
  return (
    <Terminal
      filename="new-enquiry.flow"
      lines={[
        { type: 'cmd',   text: 'on enquiry.submitted' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'Qualifying answers saved to CRM' },
        { type: 'ok',    text: 'Source captured (instagram / bio)' },
        { type: 'ok',    text: 'Auto-reply sent with booking link (0 min)' },
        { type: 'ok',    text: 'Alert sent to your phone (0 min)' },
        { type: 'ok',    text: 'No booking in 24h: follow-up queued' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'Nothing waits for someone to remember' },
      ]}
    />
  );
}

function ProposalVisual() {
  return (
    <Terminal
      filename="proposal-to-payment.flow"
      lines={[
        { type: 'cmd',   text: 'on proposal.sent' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'One link: read, accept, sign, pay' },
        { type: 'ok',    text: 'Alert when the client opens it' },
        { type: 'ok',    text: 'No reply: follow-ups day 2, 5, 10' },
        { type: 'ok',    text: 'Deposit or instalments via Stripe' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'Signed and paid in one sitting' },
      ]}
    />
  );
}

function PortalVisual() {
  return (
    <Terminal
      filename="deposit-paid.flow"
      lines={[
        { type: 'cmd',   text: 'on deposit.paid' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'Contract copy + welcome email sent' },
        { type: 'ok',    text: 'Client portal access created' },
        { type: 'ok',    text: 'What-happens-next checklist sent' },
        { type: 'ok',    text: 'Kickoff booking link sent' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'Weekly update every Friday, automatically' },
      ]}
    />
  );
}

function RetentionVisual() {
  return (
    <Terminal
      filename="handover.flow"
      lines={[
        { type: 'cmd',   text: 'on final_payment.received' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'Handover pack sent' },
        { type: 'ok',    text: 'Review request at the high point' },
        { type: 'ok',    text: '+2 weeks: referral ask' },
        { type: 'ok',    text: '+12 months: anniversary check-in' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'Every finished client asked, every time' },
      ]}
    />
  );
}

function DashboardVisual() {
  return (
    <Terminal
      filename="command-centre.report"
      lines={[
        { type: 'cmd',   text: 'report revenue --by=source --month' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'Enquiries by source' },
        { type: 'ok',    text: 'Calls booked and attended' },
        { type: 'ok',    text: 'Won deals and revenue by channel' },
        { type: 'ok',    text: 'Campaigns that sold, and what they sold' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'One screen, every number traced' },
      ]}
    />
  );
}

/* ── The Client System: building blocks ── */

const SERVICES = [
  {
    number: '01',
    title: 'Enquiry & booking',
    description: 'Every enquiry gets an instant reply with a booking link, you get an alert, and nobody waits until morning. Qualifying questions up front mean the calls you take are worth taking.',
    deliverables: ['Qualifying enquiry form', 'Instant auto-reply with booking link', 'Alerts to your phone', "Follow-up when someone doesn't book", 'Every source tracked'],
    stat: { value: 'Instant', label: 'reply and booking link on every enquiry' },
    tags: ['Forms', 'Booking', 'Auto-reply'],
    Visual: EnquiryVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14v10H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3 6l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Proposal to payment',
    description: '"Loved the proposal" shouldn\'t turn into three weeks of chasing. The proposal, agreement and deposit sit behind one link, you know the moment it\'s opened, and the follow-ups send themselves.',
    deliverables: ['Proposal, e-signature and deposit in one link', '"Opened" alerts', 'Automatic follow-ups', 'Instalments for big projects', 'Payments on Stripe, in your account'],
    stat: { value: '1 link', label: 'to read, sign and pay the deposit' },
    tags: ['Proposals', 'E-sign', 'Stripe'],
    Visual: ProposalVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M5 2h7l4 4v12H5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 11l2 2 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Client portal & onboarding',
    description: 'The deposit starts everything: contract, welcome, portal access and next steps go out within minutes. Clients see their project in one place, so they stop texting "any update?".',
    deliverables: ['Deposit-triggered onboarding', 'White-label client portal', 'Weekly automatic updates', 'Approvals in one place', 'Kickoff booking'],
    stat: { value: 'Deposit', label: 'triggers contract, portal and next steps automatically' },
    tags: ['Onboarding', 'Client portal', 'Updates'],
    Visual: PortalVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="3.5" width="15" height="13" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 7.5h15M6 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Retention & referrals',
    description: 'Your best marketing moment is the handover, and most businesses mark it with an invoice. Review and referral asks go out at the right time, and past clients hear from you again.',
    deliverables: ['Handover pack', 'Review request at the high point', 'Referral ask two weeks later', 'Check-ins and anniversary notes', 'Win-back campaigns'],
    stat: { value: '$250', label: "from two emails to a client's inactive list, in 2-3 days" },
    tags: ['Reviews', 'Referrals', 'Win-back'],
    Visual: RetentionVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M4 10a6 6 0 1 0 2-4.5M4 3v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'Command-centre dashboard',
    description: 'One screen for the whole business: enquiries, bookings, revenue and campaigns, with every sale traced to where it came from. You stop guessing which channel brings the big clients.',
    deliverables: ['Revenue by source', 'Pipeline at a glance', 'Campaign performance', 'Alerts when something stalls', 'Built on the tools you already use'],
    stat: { value: '$26,736', label: "one client event's gross, every ticket traced to its source" },
    tags: ['Dashboard', 'Attribution', 'Reporting'],
    Visual: DashboardVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M3 17V9M8 17V4M13 17v-6M18 17H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

/* ── Main component ── */

export function WhatYouGet() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const totalScrollable = wrapper.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      const index = Math.min(Math.floor(progress * SERVICES.length), SERVICES.length - 1);
      setActiveIndex(index);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={wrapperRef} style={{ height: `${SERVICES.length * 60}vh` }}>
      <section
        id="services"
        className="sticky top-0 min-h-screen py-8 md:py-12"
        style={{ background: '#0C0C0C' }}
      >
        <div className="max-w-7xl mx-auto px-6">

          {/* Header */}
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-bold text-[var(--fg)] leading-none tracking-tight">
              The Client System.
            </h2>
            <p className="text-[var(--muted)] text-sm max-w-[260px] text-right leading-relaxed hidden md:block">
              Five building blocks from first enquiry to the referral after the job. Start with the one that hurts most, or connect them all.
            </p>
          </div>

          {/* Pillars */}
          <div className="flex flex-col">
            {SERVICES.map((s, i) => {
              const isActive = activeIndex === i;
              const { Visual } = s;
              return (
                <div
                  key={s.number}
                  className="relative border-t border-[var(--border)] overflow-hidden transition-all duration-500"
                  style={{ borderLeft: isActive ? '4px solid #F2613F' : '4px solid transparent' }}
                >
                  {/* Row header — always visible */}
                  <div className={`flex items-center gap-5 transition-all duration-300 ${isActive ? 'pt-7 pb-4 px-6' : 'py-5 px-6'}`}>
                    <span className={`font-mono text-xs shrink-0 transition-colors duration-300 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--label)]'}`}>
                      {s.number}
                    </span>
                    <span className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-[var(--accent)]' : 'text-[var(--label)]'}`}>
                      {s.icon}
                    </span>
                    <span className={`flex-1 font-bold transition-all duration-300 leading-tight ${isActive ? 'text-[var(--fg)] text-3xl md:text-4xl lg:text-5xl' : 'text-[var(--label)] text-lg'}`}>
                      {s.title}
                    </span>
                    {isActive && (
                      <div className="hidden md:flex flex-col items-end shrink-0">
                        <span className="text-2xl font-bold text-[var(--accent)]">{s.stat.value}</span>
                        <span className="text-[var(--muted)] text-xs mt-0.5 text-right max-w-[140px]">{s.stat.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Expanded body */}
                  <div
                    className="overflow-hidden transition-all duration-500 ease-in-out"
                    style={{ maxHeight: isActive ? '480px' : '0px', opacity: isActive ? 1 : 0 }}
                  >
                    <div className="px-6 pb-8 grid md:grid-cols-2 gap-8 items-start">
                      {/* Text */}
                      <div>
                        <p className="text-[var(--muted)] text-base leading-relaxed mb-6">
                          {s.description}
                        </p>
                        <ul className="flex flex-col gap-2 mb-6">
                          {s.deliverables.map((d) => (
                            <li key={d} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                              <span className="text-[var(--accent)] mt-0.5 shrink-0">→</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                          {s.tags.map((tag) => (
                            <span key={tag} className="text-xs text-[var(--muted)] border border-[var(--border)] bg-[var(--card)] rounded-full px-3 py-1.5">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Visual */}
                      <div className="h-[220px] md:h-[280px]">
                        <Visual />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-[var(--border)]" />
          </div>

          {/* CTA */}
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 mt-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Want all of this installed in your business?
            </p>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#0C0C0C] px-5 py-2.5 rounded-full transition-colors active:scale-[0.98] glow-accent w-full sm:w-auto"
              style={{ background: '#F2613F' }}
            >
              Get your free audit →
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
