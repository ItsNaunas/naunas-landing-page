'use client';

import { useInView } from '@/hooks/useInView';
import { useCountUp } from '@/hooks/useCountUp';

function CountStat({ target, format, label, inView, borderRight }: { target: number; format: (n: number) => string; label: string; inView: boolean; borderRight?: boolean }) {
  const count = useCountUp(target, 1600, inView);
  return (
    <div className="py-8 text-center" style={{ borderRight: borderRight ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
      <p className="font-bold leading-none" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--fg)' }}>
        {format(count)}
      </p>
      <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
    </div>
  );
}

interface CtaBannerProps {
  onAuditClick: () => void;
}

export function CtaBanner({ onAuditClick }: CtaBannerProps) {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 md:py-32 relative z-20"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Subtle accent glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(242,97,63,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-end will-animate ${inView ? 'is-visible anim-up' : ''}`}
        >
          {/* Left — headline */}
          <div>
            <h2
              className="font-bold leading-[1.0] tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: 'var(--fg)' }}
            >
              Stop patching.<br />
              <span style={{ color: 'var(--accent)' }}>Start building.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed max-w-sm" style={{ color: 'var(--muted)' }}>
              Book a discovery call or get a free AI audit to see exactly where your ops are leaking money.
            </p>
          </div>

          {/* Right — CTAs + trust line */}
          <div className="flex flex-col gap-4">
            <a
              href="https://calendly.com/its-naunas/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 font-medium px-8 py-4 rounded-full transition-colors active:scale-[0.98] text-sm w-full glow-accent"
              style={{ background: 'var(--accent)', color: 'var(--fg)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
            >
              Book your free audit →
            </a>
            <button
              onClick={onAuditClick}
              className="inline-flex items-center justify-center font-medium px-8 py-4 rounded-full transition-all active:scale-[0.98] text-sm w-full"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--muted)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)';
                (e.currentTarget as HTMLElement).style.color = 'var(--fg)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
              }}
            >
              Free AI Audit
            </button>
            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              No commitment · Audit delivered within 48 hours
            </p>
          </div>
        </div>

        {/* Bottom stat strip */}
        <div
          className="grid grid-cols-3 gap-0 mt-20"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <CountStat target={12} format={(n) => `${n}+`} label="Systems installed" inView={inView} borderRight />
          <div className="py-8 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-bold leading-none" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--fg)' }}>{'< 48hrs'}</p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Avg. onboarding time</p>
          </div>
          <CountStat target={100} format={(n) => `${n}%`} label="Done-for-you" inView={inView} />
        </div>
      </div>
    </section>
  );
}
