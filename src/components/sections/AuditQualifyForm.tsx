'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { AnimatePresence, motion } from 'framer-motion';
import { track } from '@vercel/analytics';
import { cn } from '@/lib/utils';

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://calendly.com/its-naunas/30min';
const MENTORSHIP_URL = 'https://calendly.com/its-naunas/30min?utm_source=audit-builder&utm_medium=mentorship';
const LEAD_MAGNET_URL = process.env.NEXT_PUBLIC_LEAD_MAGNET_URL ?? '/six-leaks.pdf';
const INSTAGRAM_URL = 'https://www.instagram.com/naunas_builds/';

declare global {
  interface Window {
    Calendly?: { initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void };
  }
}

const BUSINESS_OPTIONS = ['Agency', 'Coach/consultant', 'Service business', 'Creative/design studio', 'Other'];
const LEADS_OPTIONS = ['0–5', '5–20', '20–50', '50+'];
const REVENUE_OPTIONS = ['Under £2k', '£2–5k', '£5–15k', '£15k+'];
const LEAD_HANDLING_OPTIONS = ['Manual follow-up', 'Messy CRM', 'Mostly falls through', 'Not sure'];
const DECISION_OPTIONS = ['Yes', 'Partly', 'No'];
const EXPERIENCE_OPTIONS = ['Brand new', 'Some experience', 'Already building'];

type Path = 'services' | 'builder';
type Stage = 'form' | 'qualified' | 'notQualified' | 'builder' | 'booked';

const FAQS = [
  { q: 'What actually happens on the call?', a: "I map your lead-to-cash journey, show you where it's leaking and what it's costing, then exactly what I'd install to fix it. A map, not a hard pitch." },
  { q: 'How long is it?', a: '20–30 minutes. Come as you are — no prep deck needed.' },
  { q: 'What does it cost to work together after?', a: "The audit's free. If you want me to build the fix, installs typically start around £5k plus a monthly retainer — I'll give you exact numbers on the call, based on what we find." },
  { q: 'Do I need to prepare anything?', a: 'Just reply to your confirmation email with your website or booking link so I can pre-audit it before we talk.' },
  { q: "What if it turns out it's not for me?", a: "No pressure at all — you'll leave with the map either way." },
];

const EXPECT = [
  'A clear read on where your enquiries leak — and a rough £ on what it costs you monthly.',
  'The exact system I\'d install to plug it, built around the tools you already use.',
  'Zero obligation. If it\'s a fit we talk next steps; if not, you keep the map.',
];

interface Answers {
  fork: string;
  business: string;
  businessOther: string;
  leads: string;
  revenue: string;
  leadHandling: string;
  topFix: string;
  decisionMaker: string;
  building: string;
  experience: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
}

const EMPTY_ANSWERS: Answers = {
  fork: '', business: '', businessOther: '', leads: '', revenue: '', leadHandling: '', topFix: '',
  decisionMaker: '', building: '', experience: '', name: '', email: '',
  phone: '', website: '', instagram: '',
};

const inputClass = 'w-full rounded-xl px-4 py-3.5 text-base transition-colors min-h-[52px] bg-white/5 border border-white/10 text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)]';

const TRUST_LINE = '2 minutes · no spam · goes straight to Naufal.';

const FEATURED_TESTIMONIAL = {
  quote: "I send him templates, microcopy, everything, all the time. He doesn't reply — he just gives me 30 minutes and comes back with a full update. Who does that?",
  name: 'Haider',
  descriptor: 'Content strategist',
};

const SHUHEYB_TESTIMONIAL = {
  quote: "When it comes to incorporating AI, he's a master — a wizard in that field. Exceptional service as always, and brilliant at delivering on time.",
  name: 'Shuheyb',
  descriptor: 'CEO, Alira',
};

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-5 py-4 rounded-2xl text-base border transition-all active:scale-[0.98]',
        selected
          ? 'bg-[rgba(242,97,63,0.12)] border-[rgba(242,97,63,0.55)] text-[var(--fg)]'
          : 'bg-white/[0.04] border-white/[0.08] text-white/80 hover:border-white/25'
      )}
    >
      {label}
    </button>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.round(((current + 1) / total) * 100));
  return (
    <div className="w-full">
      <div className="h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent)' }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      </div>
      <p className="mt-2 text-[11px] tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Step {current + 1} of {total}
      </p>
    </div>
  );
}

function StepShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl md:text-3xl font-bold leading-snug" style={{ color: '#fff' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Testimonial({ quote, name, descriptor }: { quote: string; name: string; descriptor: string }) {
  return (
    <figure
      className="rounded-2xl px-5 py-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <blockquote className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <span className="font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{name}</span> — {descriptor}
      </figcaption>
    </figure>
  );
}

function isEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

const SERVICES_STEPS = ['fork', 'business', 'leads', 'revenue', 'leadHandling', 'topFix', 'decisionMaker', 'contact'] as const;
const BUILDER_STEPS = ['fork', 'building', 'experience', 'contact'] as const;

export function AuditQualifyForm() {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [path, setPath] = useState<Path | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState(false);
  const [direction, setDirection] = useState(1);
  const sourceRef = useRef<{ src: string; utm: Record<string, string> }>({ src: 'site', utm: {} });
  const calendlyRef = useRef<HTMLDivElement>(null);

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
    const init = () => {
      if (window.Calendly && calendlyRef.current) {
        calendlyRef.current.innerHTML = '';
        window.Calendly.initInlineWidget({ url: BOOKING_URL, parentElement: calendlyRef.current });
        return true;
      }
      return false;
    };
    if (init()) return;
    const id = window.setInterval(() => { if (init()) window.clearInterval(id); }, 300);
    const to = window.setTimeout(() => window.clearInterval(id), 8000);
    return () => { window.clearInterval(id); window.clearTimeout(to); };
  }, [stage]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as { event?: string } | null;
      if (typeof e.origin === 'string' && e.origin.includes('calendly.com') && data?.event === 'calendly.event_scheduled') {
        setStage('booked');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const steps = path === 'builder' ? BUILDER_STEPS : path === 'services' ? SERVICES_STEPS : (['fork'] as const);
  const currentStep = steps[stepIndex];
  const total = steps.length;

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setError('');
  }

  function goNext() {
    setDirection(1);
    setStepIndex((i) => i + 1);
    setError('');
  }

  function goBack() {
    setError('');
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
  }

  function pickFork(choice: Path) {
    setPath(choice);
    set('fork', choice === 'services' ? 'business' : 'builder');
    setDirection(1);
    setStepIndex(1);
  }

  function advanceOption<K extends keyof Answers>(key: K, value: Answers[K]) {
    set(key, value);
    setDirection(1);
    setStepIndex((i) => i + 1);
  }

  async function submit() {
    setLoading(true);
    setSubmitError(false);
    try {
      const business =
        answers.business === 'Other' && answers.businessOther.trim()
          ? `Other — ${answers.businessOther.trim()}`
          : answers.business;
      const res = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, business, path, ...sourceRef.current }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data: { qualified: boolean; path: Path } = await res.json();
      if (path === 'builder') setStage('builder');
      else setStage(data.qualified ? 'qualified' : 'notQualified');
    } catch {
      setSubmitError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleContactNext() {
    if (!answers.name.trim()) return setError('Please add your name.');
    if (!isEmail(answers.email)) return setError('Please add a valid email.');
    submit();
  }

  const firstName = answers.name.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '90vw', height: '60vh',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(242,97,63,0.14) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <header className="relative max-w-xl mx-auto px-6 h-16 flex items-center" style={{ zIndex: 10 }}>
        <Link href="/" className="text-lg font-semibold text-[var(--fg)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Naunas<span className="text-[var(--accent)]">.</span>
        </Link>
      </header>

      <main className="relative max-w-xl mx-auto px-6 pt-6 pb-24" style={{ zIndex: 10 }}>

        {stage === 'form' && (
          <>
            {/* No progress UI on the fork screen — no path chosen yet, so there is no honest count to show */}
            {stepIndex > 0 && (
              <div className="flex items-center gap-3 mb-8">
                <button
                  type="button"
                  onClick={goBack}
                  className="text-sm flex items-center gap-1.5 transition-colors hover:text-[var(--fg)]"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M11.5 7h-9M6 3.5L2.5 7 6 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>
                <div className="flex-1">
                  <ProgressBar current={stepIndex} total={total} />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${path ?? 'fork'}-${currentStep}`}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {currentStep === 'fork' && (
                  <StepShell title="What brings you here?">
                    <p className="text-sm leading-relaxed -mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Answer a few quick questions and I&apos;ll tell you exactly where your business is leaking. Two minutes.
                    </p>
                    <div className="flex flex-col gap-3">
                      <OptionButton
                        label="I run a business and I'm losing leads / enquiries"
                        selected={path === 'services'}
                        onClick={() => pickFork('services')}
                      />
                      <OptionButton
                        label="I want to learn to build this stuff myself"
                        selected={path === 'builder'}
                        onClick={() => pickFork('builder')}
                      />
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{TRUST_LINE}</p>
                    <Testimonial {...FEATURED_TESTIMONIAL} />
                  </StepShell>
                )}

                {currentStep === 'business' && (
                  <StepShell title="What's your business?">
                    <div className="flex flex-col gap-3">
                      {BUSINESS_OPTIONS.map((opt) => (
                        <OptionButton
                          key={opt}
                          label={opt}
                          selected={answers.business === opt}
                          onClick={() => (opt === 'Other' ? set('business', 'Other') : advanceOption('business', opt))}
                        />
                      ))}
                    </div>
                    {answers.business === 'Other' && (
                      <div className="flex flex-col gap-3">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Tell me what you do"
                          value={answers.businessOther}
                          onChange={(e) => set('businessOther', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && answers.businessOther.trim()) goNext(); }}
                          className={inputClass}
                        />
                        <button
                          type="button"
                          disabled={!answers.businessOther.trim()}
                          onClick={goNext}
                          className="w-full font-semibold py-4 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-base glow-accent"
                          style={{ background: '#F2613F', color: '#0C0C0C' }}
                        >
                          Continue →
                        </button>
                      </div>
                    )}
                  </StepShell>
                )}

                {currentStep === 'leads' && (
                  <StepShell title="Roughly how many leads/enquiries a month?">
                    <div className="grid grid-cols-2 gap-3">
                      {LEADS_OPTIONS.map((opt) => (
                        <OptionButton key={opt} label={opt} selected={answers.leads === opt} onClick={() => advanceOption('leads', opt)} />
                      ))}
                    </div>
                  </StepShell>
                )}

                {currentStep === 'revenue' && (
                  <StepShell title="Rough monthly revenue?">
                    <div className="grid grid-cols-2 gap-3">
                      {REVENUE_OPTIONS.map((opt) => (
                        <OptionButton key={opt} label={opt} selected={answers.revenue === opt} onClick={() => advanceOption('revenue', opt)} />
                      ))}
                    </div>
                  </StepShell>
                )}

                {currentStep === 'leadHandling' && (
                  <StepShell title="What happens after a lead comes in right now?">
                    <div className="flex flex-col gap-3">
                      {LEAD_HANDLING_OPTIONS.map((opt) => (
                        <OptionButton key={opt} label={opt} selected={answers.leadHandling === opt} onClick={() => advanceOption('leadHandling', opt)} />
                      ))}
                    </div>
                  </StepShell>
                )}

                {currentStep === 'topFix' && (
                  <StepShell title="The #1 thing you'd want fixed?">
                    <input
                      autoFocus
                      type="text"
                      placeholder="e.g. leads go cold before I ever reply"
                      value={answers.topFix}
                      onChange={(e) => set('topFix', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && answers.topFix.trim()) goNext(); }}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      disabled={!answers.topFix.trim()}
                      onClick={goNext}
                      className="w-full font-semibold py-4 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-base glow-accent"
                      style={{ background: '#F2613F', color: '#0C0C0C' }}
                    >
                      Continue →
                    </button>
                  </StepShell>
                )}

                {currentStep === 'decisionMaker' && (
                  <StepShell title="Are you the decision-maker?">
                    <div className="grid grid-cols-3 gap-3">
                      {DECISION_OPTIONS.map((opt) => (
                        <OptionButton key={opt} label={opt} selected={answers.decisionMaker === opt} onClick={() => advanceOption('decisionMaker', opt)} />
                      ))}
                    </div>
                  </StepShell>
                )}

                {currentStep === 'building' && (
                  <StepShell title="What are you working on / want to build?">
                    <input
                      autoFocus
                      type="text"
                      placeholder="an AI agency, automations for clients, my own SaaS…"
                      value={answers.building}
                      onChange={(e) => set('building', e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && answers.building.trim()) goNext(); }}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      disabled={!answers.building.trim()}
                      onClick={goNext}
                      className="w-full font-semibold py-4 rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-base glow-accent"
                      style={{ background: '#F2613F', color: '#0C0C0C' }}
                    >
                      Continue →
                    </button>
                  </StepShell>
                )}

                {currentStep === 'experience' && (
                  <StepShell title="Where are you starting from?">
                    <div className="flex flex-col gap-3">
                      {EXPERIENCE_OPTIONS.map((opt) => (
                        <OptionButton key={opt} label={opt} selected={answers.experience === opt} onClick={() => advanceOption('experience', opt)} />
                      ))}
                    </div>
                  </StepShell>
                )}

                {currentStep === 'contact' && (
                  <StepShell title={path === 'builder' ? 'Where do I send the invite?' : 'Where do I send your audit?'}>
                    <div className="flex flex-col gap-4">
                      <input
                        type="text"
                        placeholder="Your name"
                        value={answers.name}
                        onChange={(e) => set('name', e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={answers.email}
                        onChange={(e) => set('email', e.target.value)}
                        className={inputClass}
                      />
                      {path === 'services' ? (
                        <>
                          <input
                            type="tel"
                            placeholder="Phone (optional)"
                            value={answers.phone}
                            onChange={(e) => set('phone', e.target.value)}
                            className={inputClass}
                          />
                          <input
                            type="text"
                            placeholder="Website or Instagram (optional)"
                            value={answers.website}
                            onChange={(e) => set('website', e.target.value)}
                            className={inputClass}
                          />
                        </>
                      ) : (
                        <input
                          type="text"
                          placeholder="Instagram (optional)"
                          value={answers.instagram}
                          onChange={(e) => set('instagram', e.target.value)}
                          className={inputClass}
                        />
                      )}
                    </div>
                    {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
                    {submitError && (
                      <p className="text-xs" style={{ color: 'var(--error)' }}>
                        Something went wrong sending your answers. Please try again.
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleContactNext}
                      className="w-full font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-base glow-accent"
                      style={{ background: '#F2613F', color: '#0C0C0C' }}
                    >
                      {loading ? 'Sending...' : path === 'builder' ? 'Join the waitlist →' : 'See if we’re a fit →'}
                    </button>
                    <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{TRUST_LINE}</p>
                  </StepShell>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {stage === 'qualified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6 pt-6"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(242,97,63,0.15)', border: '1px solid rgba(242,97,63,0.3)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
                {firstName}, you&apos;re a fit — let&apos;s find a time.
              </h1>
              <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                On the call I&apos;ll walk you through exactly where your lead flow is leaking and what I&apos;d install to fix it — built around what you just told me.
              </p>
              <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Before we talk, reply to the confirmation with your website or booking link so I can pre-audit it.
              </p>
            </div>

            <Testimonial {...SHUHEYB_TESTIMONIAL} />

            <div
              ref={calendlyRef}
              className="rounded-2xl overflow-hidden"
              style={{ minWidth: '320px', height: '680px', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm underline transition-colors hover:text-[var(--accent)]"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Calendar not loading? Open it in a new tab →
            </a>
          </motion.div>
        )}

        {stage === 'booked' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-9 pt-6"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(242,97,63,0.15)', border: '1px solid rgba(242,97,63,0.3)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
                You&apos;re booked, {firstName}.
              </h1>
              <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Your calendar invite and the call link are on their way to your inbox.
              </p>
            </div>

            <div className="rounded-2xl px-5 py-5" style={{ background: 'rgba(242,97,63,0.08)', border: '1px solid rgba(242,97,63,0.25)' }}>
              <p className="text-sm font-semibold mb-1.5" style={{ color: '#F2613F' }}>One thing before we talk →</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Reply to your confirmation email with your website or booking link. I&apos;ll pre-audit it before the call, so we skip the warm-up and go straight to where you&apos;re leaking.
              </p>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>While you wait — the breakdown of the 6 places businesses leak revenue:</p>
              <a
                href={LEAD_MAGNET_URL}
                className="font-semibold px-7 py-3 rounded-full transition-colors active:scale-[0.98] text-sm glow-accent"
                style={{ background: '#F2613F', color: '#0C0C0C' }}
              >
                Get the free breakdown →
              </a>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest mb-4" style={{ color: '#F2613F' }}>What to expect</p>
              <ul className="flex flex-col gap-3">
                {EXPECT.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <span style={{ color: '#F2613F' }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Testimonial {...FEATURED_TESTIMONIAL} />

            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest mb-4" style={{ color: '#F2613F' }}>Common questions</p>
              <div className="flex flex-col">
                {FAQS.map((f, i) => (
                  <div key={f.q} className="py-4" style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-sm font-medium mb-1.5" style={{ color: '#fff' }}>{f.q}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-xs max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
              See how these systems get built day to day —{' '}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline transition-colors hover:text-[var(--accent)]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                @naunas_builds
              </a>
              .
            </p>
          </motion.div>
        )}

        {stage === 'notQualified' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-5 pt-12"
          >
            <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>
              {firstName}, here&apos;s the honest answer.
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              A paid build isn&apos;t the right fit for where you&apos;re at yet — and I&apos;d rather tell you that than waste your time on a sales call. But here&apos;s the free version: it covers the exact system I install, so you can build it yourself.
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
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline transition-colors hover:text-[var(--accent)]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                @naunas_builds
              </a>
              .
            </p>
          </motion.div>
        )}

        {stage === 'builder' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center gap-5 pt-12"
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
              You&apos;re on the list, {firstName}.
            </h1>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              The community isn&apos;t open yet — but you&apos;re on the waitlist, and I&apos;ll show you how I build this stuff the moment the doors open.
            </p>
            <a
              href={MENTORSHIP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('link_click', { target: 'mentorship', src: 'audit-builder' })}
              className="font-semibold px-7 py-3.5 rounded-full transition-colors active:scale-[0.98] text-sm mt-1 bg-[var(--card-raised)] border border-[var(--border)] text-[var(--fg)] hover:border-[var(--accent)]"
            >
              Book a mentorship intro →
            </a>
            <p className="text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              In the meantime, follow the build at{' '}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline transition-colors hover:text-[var(--accent)]" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
