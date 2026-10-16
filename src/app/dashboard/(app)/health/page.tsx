import { runChecks } from '@/lib/health';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Card, Badge, linkProps } from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

export default async function Health() {
  const checks = await runChecks();
  const bad = checks.filter((c) => !c.ok).length;
  return (
    <>
      <PageHeader
        title="System health"
        sub="The same checks the daily 09:00 cron runs. Any failure also goes to Telegram."
        action={<a href={FUNNEL.logsUrl} {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Vercel logs ↗</a>}
      />
      <div><Badge tone={bad ? 'bad' : 'good'}>{bad ? `${bad} problem${bad > 1 ? 's' : ''}` : 'All systems working'}</Badge></div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {checks.map((c) => (
          <Card key={c.name}>
            <div className="flex items-start gap-3">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${c.ok ? 'bg-emerald-400 shadow-[0_0_10px] shadow-emerald-400/50' : 'bg-rose-400 shadow-[0_0_10px] shadow-rose-400/50'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className={`text-xs mt-1 break-words ${c.ok ? 'text-white/40' : 'text-rose-300/80'}`}>{c.detail ?? (c.ok ? 'OK' : 'Failed')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
