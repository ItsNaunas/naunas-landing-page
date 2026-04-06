'use client';

import { useState } from 'react';
import { useInView } from '@/hooks/useInView';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-end mb-3">
        <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
        <span className="text-2xl font-bold" style={{ color: '#fff' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calc-slider w-full"
        style={{ '--slider-fill': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

const DEAL_PRESETS = [1000, 2500, 5000, 10000, 25000];

export function RevenueCalculator() {
  const { ref, inView } = useInView();
  const [leads, setLeads] = useState(50);
  const [customLeads, setCustomLeads] = useState('');
  const [closeRate, setCloseRate] = useState(15);
  const [dealValue, setDealValue] = useState(5000);
  const [customDealValue, setCustomDealValue] = useState('');

  const activeLeads = customLeads ? Number(customLeads) : leads;
  const activeDealValue = customDealValue ? Number(customDealValue) : dealValue;
  const leadsLost = Math.round(activeLeads * 0.44);
  const extraCloses = Math.round(leadsLost * (closeRate / 100));
  const leak = extraCloses * activeDealValue;
  const annualLeak = leak * 12;
  const currentAnnualRevenue = Math.round(activeLeads * (closeRate / 100) * activeDealValue * 12);
  const recoveredRevenue = annualLeak;
  const potentialAnnualRevenue = currentAnnualRevenue + recoveredRevenue;
  const percentageIncrease = currentAnnualRevenue > 0
    ? Math.round((recoveredRevenue / currentAnnualRevenue) * 100)
    : 0;

  const total = (activeLeads * (closeRate / 100) * activeDealValue) + leak;
  const leakPct = total > 0 ? Math.round((leak / total) * 100) : 0;
  const capturedPct = 100 - leakPct;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24"
      style={{ background: '#0C0C0C', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className={`mb-14 will-animate ${inView ? 'is-visible anim-up' : ''}`}>
          <span style={{ color: '#F2613F', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Revenue Leak Calculator
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: '#fff' }}>
              Find out what<br />you&apos;re losing.
            </h2>
            <p className="text-sm max-w-xs leading-relaxed md:text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>
              44% of leads never get a second follow-up. Enter your numbers to see the real cost.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className={`grid md:grid-cols-2 gap-10 md:items-stretch will-animate ${inView ? 'is-visible anim-up delay-100' : ''}`}>

          {/* ── Inputs ── */}
          <div className="flex flex-col gap-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>

            <div className="py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Slider
                label="Monthly leads received"
                value={customLeads ? Number(customLeads) : leads}
                min={5}
                max={500}
                step={5}
                onChange={(v) => { setLeads(v); setCustomLeads(''); }}
              />
              <div className="mt-4">
                <input
                  type="number"
                  placeholder="Custom number"
                  value={customLeads}
                  min={1}
                  onChange={(e) => setCustomLeads(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-lg transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: customLeads ? '1px solid #F2613F' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#F2613F')}
                  onBlur={(e) => !customLeads && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            <div className="py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Slider label="Current close rate" value={closeRate} min={1} max={60} step={1} format={(v) => `${v}%`} onChange={setCloseRate} />
            </div>

            <div className="py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Average deal value</label>
                <span className="text-2xl font-bold" style={{ color: '#fff' }}>
                  £{(customDealValue ? Number(customDealValue) : dealValue).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {DEAL_PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setDealValue(v); setCustomDealValue(''); }}
                    className="py-2.5 text-xs font-medium rounded-lg transition-all"
                    style={{
                      background: !customDealValue && dealValue === v ? '#F2613F' : 'rgba(255,255,255,0.08)',
                      color: !customDealValue && dealValue === v ? '#0C0C0C' : 'rgba(255,255,255,0.6)',
                      border: !customDealValue && dealValue === v ? '1px solid #F2613F' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    £{v >= 1000 ? `${v / 1000}k` : v}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>£</span>
                <input
                  type="number"
                  placeholder="Custom value"
                  value={customDealValue}
                  min={100}
                  onChange={(e) => setCustomDealValue(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-sm rounded-lg transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: customDealValue ? '1px solid #F2613F' : '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#F2613F')}
                  onBlur={(e) => !customDealValue && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* Breakdown */}
            <div className="py-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Leads lost to no follow-up</span>
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>{leadsLost} / month</span>
            </div>
            <div className="py-6 flex justify-between items-center">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Potential closes missed</span>
              <span className="text-sm font-semibold" style={{ color: '#fff' }}>{extraCloses} / month</span>
            </div>

          </div>

          {/* ── Result card ── */}
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }} className="flex flex-col">
            <div style={{ height: '3px', background: '#F2613F' }} />
            <div className="p-8 md:p-10 flex flex-col h-full">

              {/* Monthly leak — hero number */}
              <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Leaking each month
              </p>
              <p className="font-bold leading-none mb-8" style={{ fontSize: 'clamp(2.8rem, 6vw, 4rem)', color: '#fff' }}>
                £{leak.toLocaleString()}
              </p>

              {/* Before / After two columns */}
              <div className="grid grid-cols-2 gap-0 mb-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Current */}
                <div className="p-5" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Current</p>
                  <p className="text-xl font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    £{currentAnnualRevenue.toLocaleString()}
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>/ year</p>
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xl font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      £{annualLeak.toLocaleString()}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>leaking / year</p>
                  </div>
                </div>

                {/* With Systems */}
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: '#F2613F' }}>With Systems</p>
                  <p className="text-xl font-bold mb-0.5" style={{ color: '#fff' }}>
                    £{potentialAnnualRevenue.toLocaleString()}
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>/ year</p>
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xl font-bold mb-0.5 flex items-center gap-1" style={{ color: '#F2613F' }}>
                      <span>↑</span> £{recoveredRevenue.toLocaleString()}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>recovered / year</p>
                  </div>
                </div>
              </div>

              {/* % increase — hero callout */}
              <div
                className="text-center py-5 mb-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Potential revenue increase
                </p>
                <p className="font-bold leading-none" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', color: '#F2613F' }}>
                  +{percentageIncrease}%
                </p>
              </div>

              {/* Leak bar */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Revenue captured</span>
                <span className="text-[10px]" style={{ color: 'rgba(242,97,63,0.7)' }}>Revenue leaking</span>
              </div>
              <div className="h-1.5 w-full flex rounded-full overflow-hidden mb-8">
                <div className="transition-all duration-500" style={{ width: `${capturedPct}%`, background: 'rgba(255,255,255,0.1)' }} />
                <div className="transition-all duration-500" style={{ width: `${leakPct}%`, background: 'linear-gradient(to right, rgba(242,97,63,0.6), #F2613F)' }} />
              </div>

              <div className="mt-auto">
                <a
                  href="https://calendly.com/its-naunas/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full font-semibold px-6 py-4 rounded-full text-sm text-[#0C0C0C] glow-accent"
                  style={{ background: '#F2613F' }}
                >
                  Fix This Now →
                </a>
                <p className="text-center text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  Free audit · No commitment
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
