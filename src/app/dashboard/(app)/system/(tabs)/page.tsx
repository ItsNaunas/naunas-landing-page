import { systemData } from '@/lib/ops/tabs';
import { FUNNEL } from '@/config/funnel';
import { TabIntro, Card, Badge, linkProps } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

export default async function System() {
  const { checks } = await systemData();
  const bad = checks.filter((c) => !c.ok).length;
  return (
    <>
      <TabIntro sub="Is every service accepting our keys? The same checks run every morning at 09:00 Zanzibar time and alert Telegram." />

      <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${bad ? 'border-rose-400/30 bg-rose-400/[0.06]' : 'border-emerald-400/25 bg-emerald-400/[0.05]'}`}>
        <span className={`size-3 rounded-full ${bad ? 'bg-rose-400 shadow-[0_0_12px] shadow-rose-400/60' : 'bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60'}`} />
        <p className="font-medium">{bad ? `${bad} problem${bad > 1 ? 's' : ''}: leads may be slipping through until fixed` : 'All systems working'}</p>
      </div>

      <SectionTitle>Live checks</SectionTitle>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {checks.map((c) => (
          <Card key={c.name}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${c.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className={`text-xs mt-1 break-words ${c.ok ? 'text-white/40' : 'text-rose-300/85'}`}>{c.detail ?? (c.ok ? 'Working' : 'Failed')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </>
  );
}
