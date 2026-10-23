import Link from 'next/link';
import { reviewData, type Metric } from '@/lib/ops/review';
import { PageHeader, Errors, Card, gbp } from '@/components/dashboard/ui';
import { when } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

// Weekly review: the last 7 days against the 7 before, one row per number, biggest moves called out at the top.

const fmt = (m: Metric, v: number) => (m.money ? gbp(v) : v.toLocaleString('en-GB'));

function Change({ m }: { m: Metric }) {
  const diff = m.now - m.prev;
  if (!diff) return <span className="text-white/55">same</span>;
  const better = m.goodWhenDown ? diff < 0 : diff > 0;
  const pct = m.prev ? `${diff > 0 ? '+' : ''}${Math.round((diff / m.prev) * 100)}%` : diff > 0 ? 'new' : '';
  return <span className={better ? 'text-emerald-300' : 'text-rose-300'}>{diff > 0 ? '▲' : '▼'} {m.money ? gbp(Math.abs(diff)) : Math.abs(diff)}{pct ? <span className="text-white/55"> · {pct}</span> : null}</span>;
}

export default async function WeeklyReview() {
  const d = await reviewData();
  const all = d.groups.flatMap((g) => g.metrics);
  const moved = all.filter((m) => m.now !== m.prev);
  const wins = moved.filter((m) => (m.goodWhenDown ? m.now < m.prev : m.now > m.prev));
  const slips = moved.filter((m) => (m.goodWhenDown ? m.now > m.prev : m.now < m.prev));
  return (
    <>
      <PageHeader title="Weekly review" sub={`${when(d.from).split(',').slice(0, 2).join(',')} to ${when(d.to).split(',').slice(0, 2).join(',')}, against the 7 days before. The same numbers go to Telegram on Mondays.`} />
      <Errors errors={d.errors} />

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <Card title="Up on last week">
          {wins.length ? <ul className="flex flex-wrap gap-1.5">{wins.map((m) => <li key={m.label} className="rounded-full bg-emerald-400/10 px-3 py-1 text-[13px] text-emerald-200">{m.label} {fmt(m, m.now)}</li>)}</ul>
            : <p className="text-sm text-white/60">Nothing up on last week.</p>}
        </Card>
        <Card title="Down on last week">
          {slips.length ? <ul className="flex flex-wrap gap-1.5">{slips.map((m) => <li key={m.label} className="rounded-full bg-rose-400/10 px-3 py-1 text-[13px] text-rose-200">{m.label} {fmt(m, m.now)}</li>)}</ul>
            : <p className="text-sm text-white/60">Nothing slipped.</p>}
        </Card>
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-xs text-white/60 border-b border-white/[0.06]">
                <th className="font-normal px-5 py-3">Number</th><th className="font-normal px-3 py-3 text-right">This week</th>
                <th className="font-normal px-3 py-3 text-right">Last week</th><th className="font-normal px-5 py-3 text-right">Change</th>
              </tr>
            </thead>
            {d.groups.map((g) => (
              <tbody key={g.title}>
                <tr><th colSpan={4} className="px-5 pt-4 pb-1.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">{g.title}</th></tr>
                {g.metrics.map((m) => (
                  <tr key={m.label} className="border-t border-white/[0.04]">
                    <td className="px-5 py-2.5">{m.href ? <Link href={m.href} className="hover:text-[#ff8a6d]">{m.label}</Link> : m.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{fmt(m, m.now)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-white/65">{fmt(m, m.prev)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-xs"><Change m={m} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
    </>
  );
}
