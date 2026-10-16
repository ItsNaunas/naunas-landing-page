// Naunas Ops v3 UI kit (server components): feed, drawer, filters, connect cards. Builds on ./ui.

import { ago, Empty, linkProps } from './ui';

export const OWNER_TZ = 'Africa/Dar_es_Salaam';

export function when(iso: string, tz = OWNER_TZ, withDay = true) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { ...(withDay ? { weekday: 'short', day: 'numeric', month: 'short' } : {}), hour: '2-digit', minute: '2-digit', timeZone: tz });
}

export function untilOrAgo(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 0) return ago(iso);
  if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86_400) return `in ${Math.round(s / 3600)}h`;
  return `in ${Math.round(s / 86_400)}d`;
}

export const pct = (f: number) => `${Math.round(f * 100)}%`;

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 -mb-1 mt-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>{children}</h2>
      {action}
    </div>
  );
}

export function Chips({ items, active }: { items: { label: string; href: string; count?: number }[]; active?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const on = active === it.href;
        return (
          <a key={it.href} href={it.href} aria-current={on ? 'true' : undefined}
            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${on ? 'bg-white text-black font-medium' : 'bg-white/[0.05] text-white/65 hover:bg-white/[0.09] hover:text-white'}`}>
            {it.label}{it.count !== undefined && <span className={on ? 'text-black/50' : 'text-white/35'}> {it.count}</span>}
          </a>
        );
      })}
    </div>
  );
}

export function ConnectCard({ title, why, steps, env }: { title: string; why: string; steps: string[]; env: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.015] p-6 md:p-8 flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <span className="size-9 shrink-0 rounded-xl bg-[#F2613F]/15 text-[#ff8a6d] grid place-items-center text-lg" aria-hidden>+</span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-white/50">{why}</p>
        </div>
      </div>
      <ol className="flex flex-col gap-2 text-sm text-white/70 list-decimal pl-5">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <p className="text-xs text-white/40">
        Add it in Vercel → Settings → Environment Variables as{' '}
        <code className="text-white/75 bg-white/[0.06] px-1.5 py-0.5 rounded">{env}</code> (and Bitwarden), then redeploy.
      </p>
    </div>
  );
}

type Tone = 'good' | 'bad' | 'accent' | 'neutral';
export const EVENT_META: Record<string, { icon: string; label: string; tone: Tone }> = {
  lead: { icon: '✦', label: 'Lead', tone: 'accent' },
  enquiry: { icon: '✎', label: 'Enquiry', tone: 'accent' },
  subscribe: { icon: '✉', label: 'Newsletter', tone: 'neutral' },
  booking: { icon: '◷', label: 'Booked', tone: 'good' },
  reschedule: { icon: '↻', label: 'Rescheduled', tone: 'neutral' },
  cancel: { icon: '✕', label: 'Cancelled', tone: 'bad' },
  noshow: { icon: '∅', label: 'No-show', tone: 'bad' },
  payment: { icon: '£', label: 'Payment', tone: 'good' },
  payment_issue: { icon: '!', label: 'Payment issue', tone: 'bad' },
  refund: { icon: '↩', label: 'Refund', tone: 'neutral' },
  ig_comment: { icon: '◎', label: 'IG comment', tone: 'accent' },
  ig_dm: { icon: '◎', label: 'IG DM', tone: 'accent' },
  click: { icon: '↗', label: 'Link click', tone: 'neutral' },
  alert: { icon: '⚠', label: 'Alert', tone: 'bad' },
};
const TONE: Record<Tone, string> = {
  good: 'bg-emerald-400/15 text-emerald-300', bad: 'bg-rose-400/15 text-rose-300',
  accent: 'bg-[#F2613F]/15 text-[#ff8a6d]', neutral: 'bg-white/[0.07] text-white/60',
};

export function Feed({ events }: { events: { at: string; kind: string; title: string; href?: string }[] }) {
  if (!events.length) return <Empty>Nothing yet. Every sign-up, booking, payment, Instagram keyword and click appears here as it happens.</Empty>;
  return (
    <ol className="flex flex-col">
      {events.map((e, i) => {
        const m = EVENT_META[e.kind] ?? { icon: '•', label: e.kind, tone: 'neutral' as Tone };
        const body = (
          <>
            <span className={`size-7 shrink-0 rounded-lg grid place-items-center text-[13px] ${TONE[m.tone]}`} aria-hidden>{m.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-white/85 truncate">{e.title}</span>
              <span className="block text-[11px] text-white/35">{m.label} · {when(e.at)}</span>
            </span>
            <span className="text-[11px] text-white/35 whitespace-nowrap tabular-nums">{ago(e.at)}</span>
          </>
        );
        return (
          <li key={`${e.at}-${i}`} className="border-t border-white/[0.04] first:border-t-0">
            {e.href
              ? <a href={e.href} {...(e.href.startsWith('http') ? linkProps : {})} className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-white/[0.03]">{body}</a>
              : <div className="flex items-center gap-3 py-2.5">{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** Server-rendered side panel: shown when the page has a query param, closed by linking back without it. */
export function Drawer({ title, closeHref, children, footer }: { title: React.ReactNode; closeHref: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <a href={closeHref} aria-label="Close panel" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[640px] h-full overflow-y-auto bg-[#111] border-l border-white/10 flex flex-col">
        <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div className="min-w-0">{title}</div>
          <a href={closeHref} className="text-white/40 hover:text-white text-2xl leading-none -mt-1" aria-label="Close panel">×</a>
        </div>
        <div className="px-6 py-5 flex flex-col gap-6 flex-1">{children}</div>
        {footer && <div className="sticky bottom-0 bg-[#111]/95 backdrop-blur px-6 py-4 border-t border-white/[0.06]">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === '' || children === null || children === undefined) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-white/40">{label}</dt>
      <dd className="text-[13px] text-white/85 break-words mt-0.5">{children}</dd>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>{value}</p>
      {sub && <div className="text-[11px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Meter({ value, max = 1, tone = 'accent' }: { value: number; max?: number; tone?: 'accent' | 'good' }) {
  const w = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <div className={`h-full rounded-full ${tone === 'good' ? 'bg-emerald-400/80' : 'bg-[#F2613F]'}`} style={{ width: `${w}%` }} />
    </div>
  );
}
