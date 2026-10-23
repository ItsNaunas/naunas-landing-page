import Link from 'next/link';
import { todayData } from '@/lib/ops/tabs';
import { missing, type Flag } from '@/lib/ops/missing';
import { demoOn } from '@/lib/ops/demo';
import { Card, Kpi, Delta, Badge, Empty, Errors, compactGbp, linkProps, type Tone } from '@/components/dashboard/ui';
import { Feed, SectionTitle, when, untilOrAgo, OWNER_TZ, SectionError, errFor } from '@/components/dashboard/kit';
import { Sparkline } from '@/components/dashboard/charts';
import { TodaySection } from './outreach/TodaySection';
import { OutreachSettings } from './outreach/OutreachSettings';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { dismissNeed } from '@/app/dashboard/actions';
import { getDismissed, type Dismissed } from '@/lib/dismiss';

export const dynamic = 'force-dynamic';

// Today (2026-10-23: Overview and Outreach → Today merged, login lands here). Top to bottom: four numbers, what
// needs Naufal (calls, money, broken things, replies, quiet deals, content), then the day's contact list with the
// messages to send, then what's happening and the calls coming up. Nothing is listed twice: flags that only point
// at the contact list are dropped because the list itself is on this page.

type Item = { rank: number; key: string; badge: string; tone: Tone; title: string; sub?: string; href?: string };

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: OWNER_TZ }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

const ACTION: Record<string, { badge: string; tone: Tone; rank: number }> = {
  call: { badge: 'Call', tone: 'good', rank: 0 }, money: { badge: 'Money', tone: 'bad', rank: 1 }, system: { badge: 'Fix', tone: 'bad', rank: 1 },
  routine: { badge: 'Reply / send', tone: 'accent', rank: 3 }, stale: { badge: 'Follow up', tone: 'neutral', rank: 4 },
};
const LEVEL: Record<Flag['level'], { tone: Tone; rank: number }> = { high: { tone: 'bad', rank: 2 }, medium: { tone: 'warn', rank: 4 }, low: { tone: 'muted', rank: 5 } };
/** Flags already shown as rows of the contact list below (promises, nudges, follow-ups, blocked email). */
const onList = (f: Flag) => f.id.startsWith('owed-') || f.href === '/dashboard/outreach';

export default async function Today() {
  const [d, m, dismissed] = await Promise.all([
    todayData(Date.now() - 86_400_000),
    demoOn() ? Promise.resolve({ flags: [] as Flag[] }) : missing().catch(() => ({ flags: [] as Flag[] })),
    getDismissed().catch(() => ({} as Dismissed)),
  ]);
  const k = d.kpis;
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', timeZone: OWNER_TZ });
  // The flags already cover deals going quiet (with better thresholds), so the queue's own stale-deal rows are dropped when flags exist.
  const all: Item[] = [
    ...d.actions.filter((a) => demoOn() || a.kind !== 'stale').map((a) => ({ ...ACTION[a.kind], key: `${a.kind}:${a.title}`, title: a.title, sub: a.sub && /^\d{4}-/.test(a.sub) ? `${when(a.sub)} · ${untilOrAgo(a.sub)}` : a.sub, href: a.href })),
    ...m.flags.filter((f) => !onList(f)).map((f) => ({ ...LEVEL[f.level], key: `flag:${f.id}`, badge: f.area, title: f.title, sub: f.detail, href: f.href })),
  ].sort((a, b) => a.rank - b.rank);
  // Rows you marked Done or Snoozed stay out until their time is up (lib/dismiss).
  const items = all.filter((i) => !dismissed[i.key]);
  const hidden = all.filter((i) => dismissed[i.key]);
  const top = items.slice(0, 8);
  /** The source name if any of these failed to load (errors are "Source: message"). */
  const failed = (...src: string[]) => src.find((x) => d.errors.some((e: string) => e.startsWith(`${x}:`))) ?? false;
  const rowAction = (a: Item, how: 'done' | 'snoozed' | 'restore', label: string, hint: string) => (
    <ActionForm action={dismissNeed}>
      <input type="hidden" name="key" value={a.key} /><input type="hidden" name="title" value={a.title} /><input type="hidden" name="how" value={how} />
      <button title={hint} className="min-h-7 rounded-lg px-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.06]">{label}</button>
    </ActionForm>
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{greeting()}, Naufal</h1>
          <p className="text-sm text-white/60 mt-1">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: OWNER_TZ })}
            {' · '}{items.length ? `${items.length} thing${items.length === 1 ? '' : 's'} need${items.length === 1 ? 's' : ''} you` : 'nothing needs you right now'}
          </p>
        </div>
        <OutreachSettings />
      </div>
      <Errors errors={d.errors} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="New leads · 7 days" value={k.leads7} chart={<Sparkline values={d.spark} />} foot={<Delta now={k.leads7} prev={k.leadsPrev7} />} href="/dashboard/leads?range=7" stale={failed('Leads')} />
        <Kpi label={d.agenda ? 'Calls coming up' : 'Calls booked'} value={k.calls} foot={<span className="text-xs text-white/60">{d.agenda ? 'from Cal.com' : 'deals in Audit booked'}</span>} href={d.agenda ? '/dashboard/pipeline/calls' : '/dashboard/pipeline'} stale={failed('Cal.com', 'Pipeline')} />
        <Kpi label={`Won in ${month}`} value={compactGbp(k.wonMonth)} foot={<span className="text-xs text-white/60">{d.goal.pct}% of {compactGbp(d.goal.target)} goal</span>} href="/dashboard/pipeline" stale={failed('Won deals')} />
        <Kpi label="Open pipeline" value={compactGbp(k.openValue)} foot={<span className="text-xs text-white/60">{k.openCount} open deal{k.openCount === 1 ? '' : 's'}</span>} href="/dashboard/pipeline" stale={failed('Pipeline')} />
      </div>
      <SectionError errors={errFor(d.errors, 'Leads', 'Won deals')} />

      <Card title="Needs you" action={items.length ? <Badge tone="accent">{items.length}</Badge> : undefined} pad={false}>
        <div className="px-5"><SectionError errors={errFor(d.errors, 'Pipeline', 'Routine', 'Cal.com')} /></div>
        {items.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {top.map((a, i) => {
              const inner = (
                <>
                  <span className="w-[86px] shrink-0"><Badge tone={a.tone}>{a.badge}</Badge></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white/90">{a.title}</span>
                    {a.sub && <span className="block text-xs text-white/60 mt-0.5">{a.sub}</span>}
                  </span>
                  {a.href && <span className="text-white/55 group-hover:text-white/70 text-lg" aria-hidden>›</span>}
                </>
              );
              return (
                <li key={i} className="flex items-center hover:bg-white/[0.025]">
                  {a.href
                    ? <a href={a.href} {...(a.href.startsWith('http') ? linkProps : {})} className="group min-w-0 flex-1 flex items-center gap-3 pl-5 pr-2 py-3">{inner}</a>
                    : <div className="min-w-0 flex-1 flex items-center gap-3 pl-5 pr-2 py-3">{inner}</div>}
                  <span className="flex shrink-0 items-center gap-0.5 pr-3">
                    {rowAction(a, 'done', '✓ Done', 'Handled. Hide it for 7 days (it comes back if it’s still true)')}
                    {rowAction(a, 'snoozed', 'Snooze', 'Hide until tomorrow')}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : <Empty>Nothing slipping. Calls, money, replies without a next step, quiet deals and anything broken show up here.</Empty>}
        {items.length > top.length && (
          <details className="border-t border-white/[0.05]">
            <summary className="cursor-pointer px-5 py-2.5 text-xs text-white/65 hover:text-white">{items.length - top.length} more</summary>
            <ul className="px-5 pb-3 flex flex-col gap-1.5 text-[13px]">
              {items.slice(top.length).map((a, i) => <li key={i} className="flex items-start gap-2"><Badge tone={a.tone}>{a.badge}</Badge>{a.href ? <a href={a.href} className="hover:text-[#ff8a6d]">{a.title}</a> : a.title}</li>)}
            </ul>
          </details>
        )}
        {hidden.length > 0 && (
          <details className="border-t border-white/[0.05]">
            <summary className="cursor-pointer px-5 py-2.5 text-xs text-white/60 hover:text-white">{hidden.length} hidden (done or snoozed)</summary>
            <ul className="px-5 pb-3 flex flex-col gap-1">
              {hidden.map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-white/70">{a.title} <span className="text-white/55">· {dismissed[a.key].how === 'snoozed' ? 'snoozed' : 'done'} until {when(dismissed[a.key].until).split(',').slice(0, 2).join(',')}</span></span>
                  {rowAction(a, 'restore', 'Bring back', 'Show it in the list again')}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <section id="today" className="flex flex-col gap-4 scroll-mt-20">
        <SectionTitle action={<Link href="/dashboard/outreach/prospects" className="text-xs text-white/60 hover:text-white">Prospects →</Link>}>Contact today</SectionTitle>
        <TodaySection />
      </section>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <SectionTitle action={<Link href="/dashboard/system/automations" className="text-xs text-white/60 hover:text-white">All activity →</Link>}>Live activity</SectionTitle>
          <Card><SectionError errors={errFor(d.errors, 'Activity')} /><Feed events={d.feed} /></Card>
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle action={d.agenda ? <Link href="/dashboard/pipeline/calls" className="text-xs text-white/60 hover:text-white">Calls →</Link> : undefined}>Coming up</SectionTitle>
          <Card>
            {d.agenda?.length ? (
              <ul className="flex flex-col divide-y divide-white/[0.05] -my-2">
                {d.agenda.slice(0, 5).map((b) => {
                  const a = b.attendees[0];
                  return (
                    <li key={b.uid} className="py-3">
                      <p className="text-sm font-medium">{a?.name ?? b.title}</p>
                      <p className="text-xs text-white/60 mt-0.5">{when(b.start)} your time · {untilOrAgo(b.start)}</p>
                      {a?.timeZone && <p className="text-[11px] text-white/55">{when(b.start, a.timeZone, false)} for them ({a.timeZone.split('/').pop()?.replace('_', ' ')})</p>}
                    </li>
                  );
                })}
              </ul>
            ) : <Empty>{d.agenda ? 'No calls booked.' : <>Connect Cal.com to see call times here. <Link href="/dashboard/system#connections" className="text-[#ff8a6d] hover:underline">Connections →</Link></>}</Empty>}
          </Card>
        </div>
      </div>
    </>
  );
}
