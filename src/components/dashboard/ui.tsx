// Naunas Ops UI kit: server components only. Dark surfaces, one accent, numbers in the display face.

export const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
export const compactGbp = (n: number) => (n >= 10_000 ? `£${Math.round(n / 1000)}k` : gbp(n));

export function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}

export function Card({ title, action, children, className = '', pad = true }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-white/[0.07] bg-[#121212] min-w-0 flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
          <p className="text-[13px] font-medium text-white/60">{title}</p>
          {action}
        </div>
      )}
      <div className={pad ? 'p-5 pt-3 flex-1 flex flex-col' : 'flex-1 flex flex-col'}>{children}</div>
    </section>
  );
}

export function Delta({ now, prev, suffix = 'vs last week' }: { now: number; prev: number; suffix?: string }) {
  if (!prev && !now) return <span className="text-xs text-white/55">No change {suffix}</span>;
  const diff = now - prev;
  const pct = prev ? Math.round((diff / prev) * 100) : null;
  const up = diff >= 0;
  return (
    <span className="text-xs text-white/60">
      <span className={up ? 'text-emerald-400' : 'text-rose-400'}>{up ? '▲' : '▼'} {pct === null ? `+${diff}` : `${Math.abs(pct)}%`}</span> {suffix}
    </span>
  );
}

export function Kpi({ label, value, foot, chart, href }: { label: string; value: React.ReactNode; foot?: React.ReactNode; chart?: React.ReactNode; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-white/[0.07] bg-[#121212] p-5 flex flex-col gap-3 h-full transition-colors hover:border-white/15">
      <p className="text-[13px] text-white/55">{label}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[32px] leading-none font-semibold tabular-nums tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
        {chart}
      </div>
      {foot && <div className="min-h-4">{foot}</div>}
    </div>
  );
  return href ? <a href={href} className="block min-w-0">{body}</a> : <div className="min-w-0">{body}</div>;
}

/** Accent = "act here". Status uses its own colours: good, warn, bad, info. Never orange for a state. */
export type Tone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info' | 'muted';
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-white/[0.06] text-white/75',
    accent: 'bg-[#F2613F]/15 text-[#ff8a6d]',
    good: 'bg-emerald-400/10 text-emerald-300',
    warn: 'bg-amber-400/10 text-amber-200',
    bad: 'bg-rose-400/10 text-rose-300',
    info: 'bg-sky-400/10 text-sky-200',
    muted: 'bg-white/[0.04] text-white/60',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{title}</h1>
        {sub && <p className="text-sm text-white/60 mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** One line under a section's tabs: what this tab is for, plus its own button. */
export function TabIntro({ sub, action }: { sub?: React.ReactNode; action?: React.ReactNode }) {
  if (!sub && !action) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {sub ? <p className="text-sm text-white/60 max-w-3xl">{sub}</p> : <span />}
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 grid place-items-center text-center text-sm text-white/60 py-8 px-4">{children}</div>;
}

/** Page-level summary of failed sources; the affected sections show their own error too. */
export function Errors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  const sources = [...new Set(errors.map((e) => e.split(':')[0]))];
  return (
    <details className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200/90">
      <summary className="cursor-pointer">
        Some data couldn’t load ({sources.join(', ')}). The rest of the page is live; affected sections are marked.
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-amber-100/70 break-words">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </details>
  );
}

export const linkProps = { target: '_blank', rel: 'noopener noreferrer' } as const;
