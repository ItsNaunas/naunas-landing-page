import { routineData } from '@/lib/dashboard';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Errors, Card, Empty, Badge, ago, linkProps } from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

const JOBS = ['replies', 'calls', 'proposals', 'retention', 'content'] as const;

export default async function Routine() {
  const { errors, reports } = await routineData(14);
  const last = reports[0];
  const stale = !last || Date.now() - Date.parse(last.runAt) > 26 * 3600_000;

  return (
    <>
      <PageHeader
        title="Routine"
        sub="The daily Claude operator: reply triage, pre-call research, recaps + proposals, retention asks, Monday content. It drafts; it never contacts anyone."
        action={<a href={FUNNEL.routine.url} {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Open routine ↗</a>}
      />
      <Errors errors={errors} />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={stale ? 'bad' : 'good'}>{stale ? 'No run in 26h' : 'Running'}</Badge>
        <span className="text-white/45">{last ? `Last run ${ago(last.runAt)}` : 'No runs logged yet'} · daily at 13:00 Zanzibar</span>
      </div>

      {reports.length ? (
        <div className="flex flex-col gap-3">
          {reports.map((r, i) => (
            <Card key={r.runAt} title={new Date(r.runAt).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FUNNEL.ownerTz })}
              action={<div className="flex gap-1.5">{JOBS.filter((j) => r.counts[j]).map((j) => <Badge key={j} tone="accent">{r.counts[j]} {j}</Badge>)}</div>}>
              {r.needsYou.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-white/40 mb-1.5">Needs you</p>
                  <ul className="flex flex-col gap-1 text-[13px]">{r.needsYou.map((n, j) => <li key={j}>• {n}</li>)}</ul>
                </div>
              )}
              {r.items.length ? (
                <ul className="flex flex-col divide-y divide-white/[0.05]">
                  {r.items.map((it, j) => (
                    <li key={j} className="py-2 flex items-start gap-3 text-[13px]">
                      <Badge tone="muted">{it.job}</Badge>
                      {it.link ? <a href={it.link} {...linkProps} className="text-white/80 hover:text-white">{it.title} ↗</a> : <span className="text-white/80">{it.title}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[13px] text-white/40">{i === 0 ? 'Quiet day: nothing needed doing.' : 'Nothing needed doing.'}</p>}
            </Card>
          ))}
        </div>
      ) : <Card><Empty>The first report appears after the next run. Each run logs what it found here, even on quiet days, so you can see it’s alive.</Empty></Card>}
    </>
  );
}
