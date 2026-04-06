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

function LifecycleVisual() {
  return (
    <Terminal
      filename="lifecycle-install.sh"
      lines={[
        { type: 'cmd',   text: 'install lifecycle --client=example' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'CRM schema created (14 fields)' },
        { type: 'ok',    text: 'Lead capture webhook connected' },
        { type: 'ok',    text: 'Pre-call nurture sequence active' },
        { type: 'ok',    text: 'Post-call follow-up configured' },
        { type: 'ok',    text: 'Onboarding trigger set' },
        { type: 'ok',    text: 'Retention check-in scheduled' },
        { type: 'blank', text: '' },
        { type: 'run',   text: '6 automations running · 0 errors' },
      ]}
    />
  );
}

function AutomationsVisual() {
  return (
    <Terminal
      filename="deploy-workflows.sh"
      lines={[
        { type: 'cmd',   text: 'deploy workflows --env=production' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'Trigger: lead form submitted' },
        { type: 'ok',    text: 'CRM record created' },
        { type: 'ok',    text: 'Internal alert → new-leads' },
        { type: 'ok',    text: 'Email sequence initiated' },
        { type: 'ok',    text: 'Payment link sent' },
        { type: 'blank', text: '' },
        { type: 'run',   text: '5 workflows live · 0 errors' },
      ]}
    />
  );
}

function BuildsVisual() {
  return (
    <Terminal
      filename="build.sh"
      lines={[
        { type: 'cmd',   text: 'build client-portal --stack=next' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: 'Auth layer configured' },
        { type: 'ok',    text: 'Dashboard routes created' },
        { type: 'ok',    text: 'API endpoints connected' },
        { type: 'ok',    text: 'Database schema migrated' },
        { type: 'ok',    text: 'Deployed to production' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'Build complete · 1.2s' },
      ]}
    />
  );
}

function OptimisationVisual() {
  return (
    <Terminal
      filename="health-check.sh"
      lines={[
        { type: 'cmd',   text: 'run system-health-check --all' },
        { type: 'blank', text: '' },
        { type: 'ok',    text: '8/8 workflows operational' },
        { type: 'ok',    text: '0 failed runs (last 30 days)' },
        { type: 'ok',    text: 'Lead → close: 1.8 days avg' },
        { type: 'ok',    text: 'Onboard time: < 2 hours' },
        { type: 'blank', text: '' },
        { type: 'run',   text: 'Retention rate: 94%' },
        { type: 'up',    text: 'Revenue +£22K vs baseline' },
      ]}
    />
  );
}

/* ── Services data ── */

const SERVICES = [
  {
    number: '01',
    title: 'Lifecycle Infrastructure',
    description: 'Most businesses lose revenue not because of bad products — but because their ops have no structure. Leads go cold, onboarding is delayed, clients churn silently. We install the full lifecycle from first touch to retained client, built on your existing stack.',
    deliverables: ['CRM schema + field mapping', 'Pre-call & post-call nurture sequences', 'FSM-driven deal routing logic', 'Automated onboarding trigger flows', 'Retention check-in + upsell automation'],
    stat: { value: '£18K+', label: 'avg. monthly revenue leak fixed' },
    tags: ['CRM Setup', 'Automated Sequences', 'FSM Logic'],
    Visual: LifecycleVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Custom Automations',
    description: 'Every hour your team spends copy-pasting, chasing updates, or manually triggering tasks is an hour stolen from growth. We map your entire operation and eliminate every manual bottleneck — custom-built pipelines scoped to your existing stack.',
    deliverables: ['Full ops audit + automation map', 'Automation workflow builds', 'Webhook + API integrations', 'Scheduled job pipelines', 'Notification + alert routing'],
    stat: { value: '40hrs+', label: 'avg. manual work eliminated per week' },
    tags: ['Automation Workflows', 'API Integrations', 'Scheduled Jobs'],
    Visual: AutomationsVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="15" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Bespoke Builds',
    description: "Sometimes the tool you need simply doesn't exist. Off-the-shelf software forces you to adapt your process to their constraints. We build exactly what you need — internal dashboards, client-facing portals, AI-powered agents, and scraping tools scoped to your exact workflow.",
    deliverables: ['Custom internal dashboards', 'Client-facing portals', 'AI agents + GPT-4o integrations', 'Data scrapers + enrichment tools', 'Full technical documentation'],
    stat: { value: '100%', label: 'built to your exact specification' },
    tags: ['Internal Tools', 'Client Portals', 'AI Agents'],
    Visual: BuildsVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M6 8l-4 4 4 4M14 8l4 4-4 4M11 4l-2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Ongoing Optimisation',
    description: 'A system installed is not a system maintained. Without regular iteration, automations break, data goes stale, and the infrastructure you paid to build quietly stops performing. Our retainer keeps everything running, improving, and adapting as your business scales.',
    deliverables: ['Monthly performance reviews', 'System health monitoring', 'Workflow iteration + improvements', 'New automation scoping', 'Priority support + response SLA'],
    stat: { value: '94%', label: 'client retention rate on retainer' },
    tags: ['Monthly Retainer', 'Performance Reviews', 'System Updates'],
    Visual: OptimisationVisual,
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v3M10 14v3M3 10h3M14 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
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
              Services.
            </h2>
            <p className="text-[var(--muted)] text-sm max-w-[260px] text-right leading-relaxed hidden md:block">
              Everything your business needs to run on autopilot — from first lead to retained client.
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
