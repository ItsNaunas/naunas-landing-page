'use client';

import { useEffect, useRef, useState } from 'react';

type Stage = 'form' | 'questions' | 'generating' | 'result';
type PhaseStatus = 'red' | 'amber' | 'green';

interface Phase { name: string; status: PhaseStatus; note: string; }
interface Finding { title: string; body: string; fix: string; impact: 'high' | 'medium'; }
interface AuditResult {
  score: number;
  scoreLabel: string;
  monthlyLeakLow: number;
  monthlyLeakHigh: number;
  phases: Phase[];
  findings: Finding[];
  stackAssessment: string;
  priorityActions: string[];
}

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUESTIONS = [
  {
    id: 'industry',
    question: 'What industry are you in?',
    type: 'select',
    options: ['Marketing Agency', 'Coaching / Consulting', 'Web Design / Dev', 'Recruitment', 'Real Estate', 'Legal / Finance', 'Health & Wellness', 'E-commerce', 'Other'],
  },
  {
    id: 'leads',
    question: 'How many leads do you get per month?',
    type: 'select',
    options: ['1–10', '10–30', '30–100', '100–300', '300+'],
  },
  {
    id: 'closeRate',
    question: 'What percentage of those leads do you close?',
    type: 'select',
    options: ['Less than 10%', '10–20%', '20–40%', '40%+', "I don't track this"],
  },
  {
    id: 'dealValue',
    question: 'What is your average deal value?',
    type: 'select',
    options: ['Under £500', '£500–£1,500', '£1,500–£5,000', '£5,000–£15,000', '£15,000+'],
  },
  {
    id: 'biggestPain',
    question: 'Where do you feel the biggest leak is right now?',
    type: 'select',
    options: [
      'Leads go cold — no follow-up system',
      'Onboarding is slow and manual',
      'Clients churn before they should',
      'No visibility into my pipeline',
      'All of the above',
    ],
  },
  {
    id: 'tools',
    question: 'What tools are you currently using to manage clients?',
    type: 'text',
    placeholder: 'e.g. spreadsheets, Notion, HubSpot, nothing yet...',
  },
];

const STATUS_COLOURS: Record<PhaseStatus, string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#22c55e',
};

const SCORE_COLOURS: Record<string, string> = {
  Critical: '#ef4444',
  'Needs Work': '#f59e0b',
  'Getting There': '#F2613F',
  Strong: '#22c55e',
};

const GENERATING_STEPS = [
  'Analysing your pipeline...',
  'Calculating revenue leaks...',
  'Reviewing your stack...',
  'Building your report...',
];

function downloadAudit(name: string, email: string, answers: Record<string, string>, audit: AuditResult) {
  const scoreColour = SCORE_COLOURS[audit.scoreLabel] ?? '#F2613F';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Lifecycle Audit — ${name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0C0C0C; color: #fff; padding: 48px 32px; max-width: 800px; margin: 0 auto; }
  .header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 32px; margin-bottom: 32px; }
  .brand { font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #F2613F; margin-bottom: 8px; }
  .title { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 14px; color: rgba(255,255,255,0.4); }
  .score-block { display: flex; align-items: center; gap: 24px; padding: 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 24px; }
  .score-number { font-size: 56px; font-weight: 800; line-height: 1; color: ${scoreColour}; }
  .score-label { font-size: 18px; font-weight: 700; color: ${scoreColour}; }
  .score-desc { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .leak-block { padding: 20px 24px; background: rgba(242,97,63,0.08); border: 1px solid rgba(242,97,63,0.2); border-radius: 12px; margin-bottom: 32px; }
  .leak-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.35); margin-bottom: 6px; }
  .leak-number { font-size: 32px; font-weight: 800; color: #F2613F; }
  .leak-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.3); margin-bottom: 16px; font-weight: 600; }
  .phases { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 32px; }
  .phase { padding: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; text-align: center; }
  .phase-dot { width: 10px; height: 10px; border-radius: 50%; margin: 0 auto 8px; }
  .phase-name { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
  .phase-note { font-size: 10px; color: rgba(255,255,255,0.35); line-height: 1.4; }
  .finding { padding: 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 12px; }
  .finding-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .finding-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: #F2613F; }
  .finding-impact { font-size: 10px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
  .finding-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
  .finding-body { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 12px; }
  .fix-block { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
  .fix-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: #F2613F; white-space: nowrap; margin-top: 2px; }
  .fix-text { font-size: 13px; color: rgba(255,255,255,0.75); line-height: 1.5; }
  .stack-block { padding: 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 32px; }
  .stack-text { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }
  .actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 40px; }
  .action { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; }
  .action-num { font-size: 12px; font-weight: 700; color: #F2613F; white-space: nowrap; margin-top: 1px; }
  .action-text { font-size: 13px; color: rgba(255,255,255,0.75); line-height: 1.5; }
  .footer { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 13px; font-weight: 700; color: #F2613F; }
  .footer-text { font-size: 12px; color: rgba(255,255,255,0.25); }
  @media print { body { background: #fff; color: #000; } }
</style>
</head>
<body>
<div class="header">
  <div class="brand">Naunas Systems — Lifecycle Audit</div>
  <div class="title">Your Revenue Leak Report</div>
  <div class="subtitle">Prepared for ${name} · ${email} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</div>

<div class="score-block">
  <div class="score-number">${audit.score}</div>
  <div>
    <div class="score-label">${audit.scoreLabel}</div>
    <div class="score-desc">Lifecycle Health Score out of 100</div>
    <div class="score-desc" style="margin-top:8px">Industry: ${answers.industry ?? 'N/A'} · Leads: ${answers.leads ?? 'N/A'}/mo · Close rate: ${answers.closeRate ?? 'N/A'}</div>
  </div>
</div>

<div class="leak-block">
  <div class="leak-label">Estimated monthly revenue leak</div>
  <div class="leak-number">£${audit.monthlyLeakLow.toLocaleString()} – £${audit.monthlyLeakHigh.toLocaleString()}</div>
  <div class="leak-sub">£${(audit.monthlyLeakLow * 12).toLocaleString()} – £${(audit.monthlyLeakHigh * 12).toLocaleString()} per year left on the table</div>
</div>

<div class="section-title">Lifecycle Phase Breakdown</div>
<div class="phases">
${audit.phases.map(p => `  <div class="phase">
    <div class="phase-dot" style="background:${STATUS_COLOURS[p.status]}"></div>
    <div class="phase-name">${p.name}</div>
    <div class="phase-note">${p.note}</div>
  </div>`).join('\n')}
</div>

<div class="section-title" style="margin-bottom:16px">Findings</div>
${audit.findings.map((f, i) => `<div class="finding">
  <div class="finding-header">
    <span class="finding-badge">Finding ${i + 1}</span>
    <span class="finding-impact" style="background:${f.impact === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; color:${f.impact === 'high' ? '#ef4444' : '#f59e0b'}">${f.impact === 'high' ? 'High Impact' : 'Medium Impact'}</span>
  </div>
  <div class="finding-title">${f.title}</div>
  <div class="finding-body">${f.body}</div>
  <div class="fix-block">
    <span class="fix-label">Fix</span>
    <span class="fix-text">${f.fix}</span>
  </div>
</div>`).join('\n')}

<div class="section-title" style="margin-top:32px">Stack Assessment</div>
<div class="stack-block"><div class="stack-text">${audit.stackAssessment}</div></div>

<div class="section-title">Priority Actions</div>
<div class="actions">
${audit.priorityActions.map((a, i) => `<div class="action">
  <span class="action-num">${i + 1}</span>
  <span class="action-text">${a}</span>
</div>`).join('\n')}
</div>

<div class="footer">
  <span class="footer-brand">Naunas.</span>
  <span class="footer-text">naunas.co.uk · Ready to fix this? Book a call.</span>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Naunas-Audit-${name.replace(/\s+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditModal({ isOpen, onClose }: AuditModalProps) {
  const [stage, setStage] = useState<Stage>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textAnswer, setTextAnswer] = useState('');
  const [otherValue, setOtherValue] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [generatingStep, setGeneratingStep] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('naunas_lead');
    if (saved) {
      try {
        const { name: n, email: em, phone: ph } = JSON.parse(saved);
        if (n) setName(n);
        if (em) setEmail(em);
        if (ph) setPhone(ph);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('naunas_lead');
      setStage(saved ? 'questions' : 'form');
      setAudit(null);
      setQuestionIdx(0);
      setAnswers({});
      setTextAnswer('');
      setOtherValue('');
      setShowOtherInput(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (stage !== 'generating') return;
    setGeneratingStep(0);
    const intervals = GENERATING_STEPS.map((_, i) =>
      setTimeout(() => setGeneratingStep(i), i * 1400)
    );
    return () => intervals.forEach(clearTimeout);
  }, [stage]);

  if (!isOpen) return null;

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('naunas_lead', JSON.stringify({ name, email, phone }));
    fetch('/api/audit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    }).catch(() => {});
    setStage('questions');
  }

  function handleBack() {
    setShowOtherInput(false);
    setOtherValue('');
    if (questionIdx === 0) {
      setStage('form');
    } else {
      const prevIdx = questionIdx - 1;
      setQuestionIdx(prevIdx);
      setTextAnswer(answers[QUESTIONS[prevIdx].id] ?? '');
    }
  }

  function handleAnswer(answer: string) {
    if (answer === 'Other') {
      setShowOtherInput(true);
      return;
    }
    const updated = { ...answers, [QUESTIONS[questionIdx].id]: answer };
    setAnswers(updated);
    setTextAnswer('');
    setOtherValue('');
    setShowOtherInput(false);
    if (questionIdx < QUESTIONS.length - 1) {
      setQuestionIdx((i) => i + 1);
    } else {
      runAudit(updated);
    }
  }

  function handleOtherSubmit() {
    const value = otherValue.trim() || 'Other';
    handleAnswer(value);
  }

  async function runAudit(finalAnswers: Record<string, string>) {
    setStage('generating');
    try {
      const res = await fetch('/api/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, answers: finalAnswers }),
      });
      const data: AuditResult = await res.json();
      setAudit(data);
      setStage('result');
    } catch {
      setStage('result');
    }
  }

  const currentQ = QUESTIONS[questionIdx];
  const progress = (questionIdx / QUESTIONS.length) * 100;
  const isResult = stage === 'result';
  const scoreColour = audit ? (SCORE_COLOURS[audit.scoreLabel] ?? '#F2613F') : '#F2613F';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4"
      style={{ zIndex: 'var(--z-backdrop)' } as React.CSSProperties}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className={`relative w-full bg-[var(--card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl overflow-hidden transition-all duration-300 ${isResult ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        style={{ zIndex: 'var(--z-modal)' as unknown as number, boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Progress bar */}
        {stage === 'questions' && (
          <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: '#F2613F' }} />
          </div>
        )}

        {/* Header */}
        <div className="px-5 pt-5 pb-5 sm:px-8 sm:pt-8 sm:pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--fg)] transition-colors p-1"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: '#F2613F' }}>
              {isResult ? 'Your Lifecycle Audit' : 'Free AI Audit'}
            </span>
            {stage === 'questions' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors px-2.5 py-1.5 rounded-lg"
                style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}
          </div>

          <h3 className="text-xl font-semibold text-[var(--fg)] mt-1">
            {stage === 'form' && 'Find your revenue leaks'}
            {stage === 'questions' && currentQ.question}
            {stage === 'generating' && 'Building your report...'}
            {isResult && `Your report is ready, ${name.split(' ')[0]}`}
          </h3>

          {stage === 'questions' && (
            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Question {questionIdx + 1} of {QUESTIONS.length}
            </p>
          )}
        </div>

        {/* Body */}
        <div ref={resultRef} className="px-5 py-5 sm:px-8 sm:py-6 overflow-y-auto" style={{ maxHeight: isResult ? '75svh' : '65svh' }}>

          {/* ── Form ── */}
          {stage === 'form' && (
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              {[
                { label: 'Full name', name: 'name', type: 'text', placeholder: 'Your name', value: name, onChange: setName, required: true },
                { label: 'Email address', name: 'email', type: 'email', placeholder: 'you@company.com', value: email, onChange: setEmail, required: true },
              ].map((f) => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--muted)]">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    placeholder={f.placeholder}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    className="w-full bg-[var(--card-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[48px]"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--muted)]">
                  Phone number <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+44 7700 000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[var(--card-raised)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[48px]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] font-semibold py-3 rounded-xl transition-colors active:scale-[0.98] glow-accent mt-2"
              >
                Start my audit →
              </button>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                6 quick questions · Instant results · No commitment
              </p>
            </form>
          )}

          {/* ── Questions ── */}
          {stage === 'questions' && (
            <div key={questionIdx} className="flex flex-col gap-2.5" style={{ animation: 'fadeIn 0.25s ease' }}>
              {currentQ.type === 'select' && !showOtherInput && currentQ.options?.map((opt) => {
                const isSelected = answers[currentQ.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="w-full text-left px-4 py-4 rounded-xl text-sm transition-all active:scale-[0.98] flex items-center justify-between gap-3"
                    style={{
                      background: isSelected ? 'rgba(242,97,63,0.1)' : 'rgba(255,255,255,0.04)',
                      border: isSelected ? '1px solid rgba(242,97,63,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    <span>{opt}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      style={{ color: isSelected ? '#F2613F' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}
                    >
                      {isSelected
                        ? <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      }
                    </svg>
                  </button>
                );
              })}

              {/* Other — custom input */}
              {currentQ.type === 'select' && showOtherInput && (
                <div className="flex flex-col gap-3" style={{ animation: 'fadeIn 0.2s ease' }}>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Tell us a bit more:</p>
                  <input
                    type="text"
                    placeholder="Describe your industry or business type..."
                    value={otherValue}
                    onChange={(e) => setOtherValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOtherSubmit(); }}
                    autoFocus
                    className="w-full bg-[var(--card-raised)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-sm text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[52px]"
                  />
                  <button
                    onClick={handleOtherSubmit}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] font-semibold py-3.5 rounded-xl transition-colors active:scale-[0.98] glow-accent"
                  >
                    Continue →
                  </button>
                  <button
                    onClick={() => { setShowOtherInput(false); setOtherValue(''); }}
                    className="text-xs text-center py-1 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    ← Back to options
                  </button>
                </div>
              )}
              {currentQ.type === 'text' && (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder={currentQ.placeholder}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && textAnswer.trim()) handleAnswer(textAnswer.trim()); }}
                    autoFocus
                    className="w-full bg-[var(--card-raised)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-sm text-[var(--fg)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[52px]"
                  />
                  <button
                    onClick={() => handleAnswer(textAnswer.trim() || 'Not specified')}
                    className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] font-semibold py-3.5 rounded-xl transition-colors active:scale-[0.98] glow-accent"
                  >
                    Generate my audit →
                  </button>
                  <button
                    onClick={() => handleAnswer('Not specified')}
                    className="text-xs text-center transition-colors py-1"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Skip this question
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Generating ── */}
          {stage === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: '#F2613F', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <p key={generatingStep} className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)', animation: 'fadeIn 0.4s ease' }}>
                {GENERATING_STEPS[generatingStep]}
              </p>
            </div>
          )}

          {/* ── Result ── */}
          {isResult && audit && (
            <div className="flex flex-col gap-8">

              {/* Score + Leak row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${scoreColour}40` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>Lifecycle Health Score</p>
                  <p className="text-5xl sm:text-6xl font-black leading-none mb-2" style={{ color: scoreColour }}>{audit.score}</p>
                  <p className="text-sm font-bold" style={{ color: scoreColour }}>{audit.scoreLabel}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>out of 100</p>
                </div>
                <div className="rounded-xl p-5" style={{ background: 'rgba(242,97,63,0.06)', border: '1px solid rgba(242,97,63,0.25)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>Monthly Revenue Leak</p>
                  <p className="text-2xl sm:text-3xl font-black leading-none mb-2" style={{ color: '#F2613F' }}>
                    £{audit.monthlyLeakLow.toLocaleString()}
                    <span className="text-lg sm:text-xl">–£{audit.monthlyLeakHigh.toLocaleString()}</span>
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    £{(audit.monthlyLeakLow * 12).toLocaleString()}–£{(audit.monthlyLeakHigh * 12).toLocaleString()} per year
                  </p>
                </div>
              </div>

              {/* Phase breakdown — horizontal list */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Lifecycle Phase Breakdown</p>
                <div className="flex flex-col gap-0" style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                  {audit.phases.map((p, i) => (
                    <div
                      key={p.name}
                      className="flex items-start gap-4 px-4 py-3.5"
                      style={{ borderBottom: i < audit.phases.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                    >
                      <div className="flex items-center gap-2.5 w-28 sm:w-36 shrink-0 pt-0.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOURS[p.status] }} />
                        <span className="text-sm font-semibold" style={{ color: '#fff' }}>{p.name}</span>
                      </div>
                      <p className="text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Findings</p>
                <div className="flex flex-col gap-3">
                  {audit.findings.map((f, i) => (
                    <div key={i} className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#F2613F' }}>Finding {i + 1}</span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{
                          background: f.impact === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                          color: f.impact === 'high' ? '#ef4444' : '#f59e0b',
                        }}>
                          {f.impact === 'high' ? 'High Impact' : 'Medium Impact'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold mb-2" style={{ color: '#fff' }}>{f.title}</p>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>{f.body}</p>
                      <div className="flex gap-3 items-start pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <span className="text-[11px] font-bold uppercase tracking-wide shrink-0 mt-0.5" style={{ color: '#F2613F' }}>Fix</span>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{f.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stack assessment */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Stack Assessment</p>
                <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{audit.stackAssessment}</p>
                </div>
              </div>

              {/* Priority actions */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Priority Actions</p>
                <div className="flex flex-col gap-2.5">
                  {audit.priorityActions.map((a, i) => (
                    <div key={i} className="flex gap-4 items-start rounded-xl px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-sm font-black shrink-0 w-5 text-center" style={{ color: '#F2613F' }}>{i + 1}</span>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{a}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://calendly.com/its-naunas/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[#0C0C0C] font-semibold py-3 rounded-xl transition-colors active:scale-[0.98] glow-accent text-sm text-center"
                  >
                    Book a call to fix these →
                  </a>
                  <button
                    onClick={() => downloadAudit(name, email, answers, audit)}
                    className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1v8M4 6l3 3 3-3M1 10v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download report
                  </button>
                </div>
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  A copy of this audit has been sent to {email}
                </p>
              </div>

            </div>
          )}

          {isResult && !audit && (
            <div className="py-8 text-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Something went wrong. Please close and try again.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
