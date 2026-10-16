import { automationsData } from '@/lib/ops/tabs';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Errors, Badge, Card, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, Feed, Chips, EVENT_META, when, SectionError, errFor } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

const JOBS = ['replies', 'calls', 'proposals', 'retention', 'content'] as const;
const DAY = 86_400_000;

function Freshness({ at, warnAfterDays }: { at: string | null; warnAfterDays: number }) {
  if (!at) return <Badge tone="muted">No events yet</Badge>;
  const old = Date.now() - Date.parse(at) > warnAfterDays * DAY;
  return <Badge tone={old ? 'neutral' : 'good'}>Last {ago(at)}</Badge>;
}

export default async function Automations({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const d = await automationsData(kind);
  const last = d.reports[0];
  const stale = !last || Date.now() - Date.parse(last.runAt) > 26 * 3600_000;

  return (
    <>
      <PageHeader title="Automations" sub="Every moving part of the system, when it last ran, and everything that has happened." />
      <Errors errors={d.errors} />

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <Card title="Claude funnel operator" action={<a href={FUNNEL.routine.url} {...linkProps} className="text-xs text-white/40 hover:text-white">Open ↗</a>}>
          <SectionError errors={errFor(d.errors, 'Routine')} />
          <div className="flex items-center gap-2 mb-3">
            <Badge tone={stale ? 'bad' : 'good'}>{stale ? 'No run in 26h' : 'Running'}</Badge>
            <span className="text-xs text-white/40">{last ? `last run ${ago(last.runAt)}` : 'no runs logged yet'} · daily 13:00 Zanzibar</span>
          </div>
          <p className="text-xs text-white/45 leading-relaxed">Triage replies, research upcoming calls, recap + proposal after calls, testimonial and referral asks, Monday content. It drafts; it never contacts anyone.</p>
          {last?.needsYou.length ? (
            <div className="mt-4">
              <p className="text-xs text-white/40 mb-1.5">Needs you from the last run</p>
              <ul className="flex flex-col gap-1 text-[13px]">{last.needsYou.map((n, i) => <li key={i}>• {n}</li>)}</ul>
            </div>
          ) : null}
        </Card>

        <Card title="Email sequences (MailerLite)" action={<a href="https://dashboard.mailerlite.com/automations" {...linkProps} className="text-xs text-white/40 hover:text-white">Open ↗</a>}>
          <SectionError errors={errFor(d.errors, 'MailerLite')} />
          <ul className="flex flex-col divide-y divide-white/[0.05] -my-2">
            {d.mailerlite.map((a) => (
              <li key={a.name} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                <span className={a.expected ? 'text-white/85' : 'text-white/45'}>{a.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-white/35 tabular-nums">{a.sent} sent · {a.inQueue} in queue</span>
                  <Badge tone={a.enabled ? (a.expected ? 'good' : 'accent') : a.expected ? 'bad' : 'muted'}>{a.enabled ? 'On' : 'Off'}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <SectionTitle>Webhooks and schedules</SectionTitle>
      <Card pad={false}>
        <ul className="divide-y divide-white/[0.05]">
          {d.webhooks.map((w) => (
            <li key={w.name} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-sm">{w.name}</p><p className="text-xs text-white/40">{w.detail}</p></div>
              <Freshness at={w.last} warnAfterDays={7} />
            </li>
          ))}
          {d.crons.map((c) => (
            <li key={c.name} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-sm">{c.name}</p><p className="text-xs text-white/40">{c.schedule}</p></div>
              <span className="flex items-center gap-2">{c.ok === false && <Badge tone="bad">Found problems</Badge>}<Freshness at={c.last} warnAfterDays={1.2} /></span>
            </li>
          ))}
        </ul>
      </Card>

      {d.reports.length > 0 && (
        <>
          <SectionTitle>Routine runs</SectionTitle>
          <div className="flex flex-col gap-2">
            {d.reports.map((r) => (
              <details key={r.runAt} className="rounded-2xl border border-white/[0.07] bg-[#121212] open:bg-[#141414]">
                <summary className="cursor-pointer list-none px-5 py-3.5 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium w-44">{when(r.runAt)}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {JOBS.filter((j) => r.counts[j]).map((j) => <Badge key={j} tone="accent">{r.counts[j]} {j}</Badge>)}
                    {!JOBS.some((j) => r.counts[j]) && <Badge tone="muted">Quiet day</Badge>}
                  </span>
                </summary>
                <ul className="px-5 pb-4 flex flex-col gap-1.5">
                  {r.items.map((it, j) => (
                    <li key={j} className="flex items-start gap-3 text-[13px]">
                      <span className="w-20 shrink-0"><Badge tone="muted">{it.job}</Badge></span>
                      {it.link ? <a href={it.link} {...linkProps} className="text-white/80 hover:text-white">{it.title} ↗</a> : <span className="text-white/80">{it.title}</span>}
                    </li>
                  ))}
                  {!r.items.length && <li className="text-[13px] text-white/40">Nothing needed doing.</li>}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Activity log</SectionTitle>
      <Chips active={kind ? `/dashboard/automations?kind=${kind}` : '/dashboard/automations'} items={[
        { label: 'Everything', href: '/dashboard/automations' },
        ...Object.entries(d.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: EVENT_META[k]?.label ?? k, href: `/dashboard/automations?kind=${k}`, count: n })),
      ]} />
      <Card><SectionError errors={errFor(d.errors, 'Activity')} />{d.feed.length ? <Feed events={d.feed} /> : <Empty>No activity yet.</Empty>}</Card>
    </>
  );
}
