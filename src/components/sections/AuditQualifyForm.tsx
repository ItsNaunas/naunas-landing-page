'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://calendly.com/its-naunas/30min';
const LEAD_MAGNET_URL = process.env.NEXT_PUBLIC_LEAD_MAGNET_URL ?? '#';
const INSTAGRAM_URL = 'https://www.instagram.com/naunas_builds/';
const REDIRECT_DELAY_MS = 2500;

const BUSINESS_OPTIONS = ['Agency', 'Coach/consultant', 'Service business', 'Creative/design studio', "I'm learning to build this myself", 'Other'];
const LEADS_OPTIONS = ['0–5', '5–20', '20–50', '50+'];
const REVENUE_OPTIONS = ['Under £2k', '£2–5k', '£5–15k', '£15k+'];
const LEAD_HANDLING_OPTIONS = ['Manual follow-up', 'Messy CRM', 'Mostly falls through', 'Not sure'];
const DECISION_OPTIONS = ['Yes', 'Partly', 'No'];

type Stage = 'form' | 'qualified' | 'notQualified';

interface Answers {
  business: string;
  leads: string;
  revenue: string;
  leadHandling: string;
  leadHandlingNote: string;
  topFix: string;
  decisionMaker: string;
  name: string;
  email: string;
  phone: string;
  website: string;
}

const EMPTY_ANSWERS: Answers = {
  business: '', leads: '', revenue: '', leadHandling: '', leadHandlingNote: '',
  topFix: '', decisionMaker: '', name: '', email: '', phone: '', website: '',
};

const inputClass = 'w-full rounded-xl px-4 py-3 text-sm transition-colors min-h-[48px] bg-white/5 border border-white/10 text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)]';

interface OptionGroupProps {
  options: string[];
  value: string;
  onSelect: (option: string) => void;
  columns?: string;
}

function OptionGroup({ options, value, onSelect, columns = 'grid-cols-1 sm:grid-cols-2' }: OptionGroupProps) {
  return (
    <div className={cn('grid gap-2.5', columns)}>
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              'text-left px-4 py-3.5 rounded-xl text-sm border transition-all active:scale-[0.98]',
              isSelected
                ? 'bg-[rgba(242,97,63,0.1)] border-[rgba(242,97,63,0.5)] text-[var(--fg)]'
                : 'bg-white/[0.04] border-white/[0.08] text-white/75 hover:border-white/20'
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface QuestionProps {
  number: string;
  label: string;
  error?: boolean;
  children: React.ReactNode;
}

function Question({ number, label, error, children }: QuestionProps) {
  return (
    <div className="flex flex-col gap-3" data-question={number}>
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--accent)' }}>{number}</span>
        <p className="text-sm font-semibold" style={{ color: '#fff' }}>{label}</p>
        {error && <span className="text-xs" style={{ color: 'var(--error)' }}>Required</span>}
      </div>
      {children}
    </div>
  );
}

export function AuditQualifyForm() {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [stage, setStage] = useState<Stage>('form');
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const sourceRef = useRef<{ src: string; utm: Record<string, string> }>({ src: 'site', utm: {} });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith('utm_')) utm[key] = value;
    });
    sourceRef.current = { src: params.get('src') ?? 'site', utm };
  }, []);

  useEffect(() => {
    if (stage !== 'qualified') return;
    const t = setTimeout(() => window.location.assign(BOOKING_URL), REDIRECT_DELAY_MS);
    return () => clearTimeout(t);
  }, [stage]);

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  const missing = {
    business: !answers.business,
    leads: !answers.leads,
    revenue: !answers.revenue,
    leadHandling: !answers.leadHandling,
    topFix: !answers.topFix.trim(),
    decisionMaker: !answers.decisionMaker,
    name: !answers.name.trim(),
    email: !/\S+@\S+\.\S+/.test(answers.email),
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (Object.values(missing).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    setLoading(true);
    setSubmitError(false);
    try {
      const res = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, ...sourceRef.current }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: { qualified: boolean } = await res.json();
      setStage(data.qualified ? 'qualified' : 'notQualified');
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90vw',
          height: '60vh',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(242,97,63,0.14) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <header className="relative max-w-2xl mx-auto px-6 h-16 flex items-center" style={{ zIndex: 10 }}>
        <Link href="/" className="text-lg font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Naunas<span className="text-[var(--accent)]">.</span>
        </Link>
      </header>

      <main className="relative max-w-2xl mx-auto px-6 pt-10 pb-24" style={{ zIndex: 10 }}>

        {stage === 'form' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
              Free Systems Audit
            </span>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
              Let&apos;s see if this is a fit.
            </h1>
            <p className="text-base leading-relaxed mt-4 max-w-md" style={{ color: 'rgba(255,255,255,0.5)' }}>
              2 minutes. This tells me if I can actually help — and preps your audit so the call isn&apos;t wasted.
            </p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10 mt-12">

              <Question number="01" label="What's your business?" error={showErrors && missing.business}>
                <OptionGroup
                  options={BUSINESS_OPTIONS}
                  value={answers.business}
                  onSelect={(v) => set('business', v)}
                />
              </Question>

              <Question number="02" label="Roughly how many leads/enquiries a month?" error={showErrors && missing.leads}>
                <OptionGroup
                  options={LEADS_OPTIONS}
                  value={answers.leads}
                  onSelect={(v) => set('leads', v)}
                  columns="grid-cols-2 sm:grid-cols-4"
                />
              </Question>

              <Question number="03" label="Rough monthly revenue?" error={showErrors && missing.revenue}>
                <OptionGroup
                  options={REVENUE_OPTIONS}
                  value={answers.revenue}
                  onSelect={(v) => set('revenue', v)}
                  columns="grid-cols-2 sm:grid-cols-4"
                />
              </Question>

              <Question number="04" label="What happens after a lead comes in right now?" error={showErrors && missing.leadHandling}>
                <OptionGroup
                  options={LEAD_HANDLING_OPTIONS}
                  value={answers.leadHandling}
                  onSelect={(v) => set('leadHandling', v)}
                />
                <input
                  type="text"
                  placeholder="Anything else worth knowing? (optional)"
                  value={answers.leadHandlingNote}
                  onChange={(e) => set('leadHandlingNote', e.target.value)}
                  className={inputClass}
                />
              </Question>

              <Question number="05" label="The #1 thing you'd want fixed?" error={showErrors && missing.topFix}>
                <input
                  type="text"
                  placeholder="e.g. leads go cold before I ever reply"
                  value={answers.topFix}
                  onChange={(e) => set('topFix', e.target.value)}
                  className={inputClass}
                />
              </Question>

              <Question number="06" label="Are you the decision-maker?" error={showErrors && missing.decisionMaker}>
                <OptionGroup
                  options={DECISION_OPTIONS}
                  value={answers.decisionMaker}
                  onSelect={(v) => set('decisionMaker', v)}
                  columns="grid-cols-3"
                />
              </Question>

              <Question number="07" label="Where do I send things?" error={showErrors && (missing.name || missing.email)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Full name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={answers.name}
                      onChange={(e) => set('name', e.target.value)}
                      className={cn(inputClass, showErrors && missing.name && 'border-[var(--error)]')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Email address</label>
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={answers.email}
                      onChange={(e) => set('email', e.target.value)}
                      className={cn(inputClass, showErrors && missing.email && 'border-[var(--error)]')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Phone <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+44 7700 000000"
                      value={answers.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Website or Instagram <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="yoursite.com or @handle"
                      value={answers.website}
                      onChange={(e) => set('website', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </Question>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-sm glow-accent"
                  style={{ background: '#F2613F', color: '#0C0C0C' }}
                >
                  {loading ? 'Checking...' : 'See if we’re a fit →'}
                </button>
                {showErrors && Object.values(missing).some(Boolean) && (
                  <p className="text-center text-xs" style={{ color: 'var(--error)' }}>
                    A few answers are missing — check the questions marked above.
                  </p>
                )}
                {submitError && (
                  <p className="text-center text-xs" style={{ color: 'var(--error)' }}>
                    Something went wrong sending your answers. Please try again.
                  </p>
                )}
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  No spam, no mailing list — this only preps your audit.
                </p>
              </div>

            </form>
          </motion.div>
        )}

        {stage === 'qualified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-5 pt-20"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(242,97,63,0.15)', border: '1px solid rgba(242,97,63,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
              You&apos;re a fit — pick a time.
            </h1>
            <p className="text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Your answers are in. Taking you to the calendar now — your audit call will be built around what you just told me.
            </p>
            <a
              href={BOOKING_URL}
              className="font-semibold px-8 py-3.5 rounded-full transition-colors active:scale-[0.98] text-sm glow-accent mt-2"
              style={{ background: '#F2613F', color: '#0C0C0C' }}
            >
              Book your free audit →
            </a>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Redirecting you automatically...
            </p>
          </motion.div>
        )}

        {stage === 'notQualified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-5 pt-20"
          >
            <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
              Thanks — here&apos;s the honest answer.
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Based on your answers, a paid build isn&apos;t the right fit for where you&apos;re at yet — and I&apos;d rather tell you that than waste your time on a sales call. But here&apos;s the free version: it covers the exact system I install, so you can build it yourself.
            </p>
            <a
              href={LEAD_MAGNET_URL}
              className="font-semibold px-8 py-3.5 rounded-full transition-colors active:scale-[0.98] text-sm glow-accent mt-2"
              style={{ background: '#F2613F', color: '#0C0C0C' }}
            >
              Get the free breakdown →
            </a>
            <p className="text-xs max-w-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              And if you want to watch how these systems get built day to day, follow the build at{' '}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors hover:text-[var(--accent)]"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                @naunas_builds
              </a>
              .
            </p>
          </motion.div>
        )}

      </main>
    </div>
  );
}
