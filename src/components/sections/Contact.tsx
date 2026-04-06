'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const BUSINESS_TYPES = [
  'Agency',
  'Coaching / Consulting',
  'E-commerce',
  'SaaS',
  'Service Business',
  'Other',
];

const WHAT_YOU_GET = [
  { label: 'Full lifecycle gap analysis', sub: 'Every stage from lead to retained client' },
  { label: 'Automation opportunity map', sub: 'Exactly what to automate and in what order' },
  { label: 'Tool stack assessment', sub: 'What to keep, replace, or connect' },
  { label: 'Priority action list', sub: 'Ranked by revenue impact, delivered in writing' },
];

const inputClass = `
  w-full rounded-xl px-4 py-3 text-sm transition-colors min-h-[48px]
  focus:outline-none
`.trim();

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
};

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = {
      name:         (form.elements.namedItem('name')         as HTMLInputElement).value,
      email:        (form.elements.namedItem('email')        as HTMLInputElement).value,
      businessType: (form.elements.namedItem('businessType') as HTMLSelectElement).value,
      message:      (form.elements.namedItem('message')      as HTMLTextAreaElement).value,
    };
    await fetch('/api/audit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="py-24"
      style={{ background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24"
        >

          {/* ── Left: sell the audit ── */}
          <div className="flex flex-col justify-center gap-8">
            <div>
              <span className="text-[11px] font-medium text-[#F2613F] uppercase tracking-widest">
                Free Systems Audit
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mt-3" style={{ color: '#fff' }}>
                Find out exactly<br />what's leaking.
              </h2>
              <p className="text-base md:text-lg leading-relaxed mt-4 max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Submit your details and we'll analyse your current ops. You'll get a written breakdown — no sales call required to receive it.
              </p>
            </div>

            {/* What you get */}
            <div className="flex flex-col gap-4">
              {WHAT_YOU_GET.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -16 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-4"
                >
                  <div
                    className="shrink-0 mt-0.5 rounded-full flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      background: 'rgba(242,97,63,0.15)',
                      border: '1px solid rgba(242,97,63,0.25)',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5l3 3 5-5" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#fff' }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trust line */}
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Delivered in writing within 48 hours · Based on your actual setup, not a template
            </p>
          </div>

          {/* ── Right: form ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl p-8 md:p-10"
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(242,97,63,0.15)', border: '1px solid rgba(242,97,63,0.3)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#F2613F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold" style={{ color: '#fff' }}>Request received</h3>
                <p className="text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  We'll analyse your setup and send your audit within 48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-semibold mb-1" style={{ color: '#fff' }}>
                    Get your free audit
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Takes 2 minutes. No commitment.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Full name
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="Your name"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#F2613F')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Email address
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@company.com"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#F2613F')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Business type
                  </label>
                  <select
                    name="businessType"
                    required
                    defaultValue=""
                    className={inputClass}
                    style={{ ...inputStyle, appearance: 'none' as const }}
                    onFocus={(e) => (e.target.style.borderColor = '#F2613F')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    <option value="" disabled style={{ background: '#111' }}>Select one</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t} style={{ background: '#111' }}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Current setup <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Describe your current tools and where things break down"
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = '#F2613F')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-sm glow-accent"
                  style={{ background: '#F2613F', color: '#0C0C0C' }}
                >
                  {loading ? 'Sending...' : 'Request my free audit →'}
                </button>

                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  No sales call required · Reply within 48 hours
                </p>
              </form>
            )}
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
