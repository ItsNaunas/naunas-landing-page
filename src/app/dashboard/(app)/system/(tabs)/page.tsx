import { systemData } from '@/lib/ops/tabs';
import { FUNNEL } from '@/config/funnel';
import { TabIntro, Card, Badge, linkProps } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';
import { storeKind, getJSON } from '@/lib/store';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { migrateStore } from '@/app/dashboard/actions';
import { ago } from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

export default async function System() {
  const { checks } = await systemData();
  const bad = checks.filter((c) => !c.ok).length;
  // Postgres is the store and Blob still has the old files: offer the one-time copy (idempotent).
  const canCopy = storeKind() === 'postgres' && !!process.env.BLOB_READ_WRITE_TOKEN;
  const last = canCopy ? await getJSON<{ at: string; copied: number; skipped: number; failed: string[] } | null>('meta/store-migration.json', null) : null;
  return (
    <>
      <TabIntro sub="Is every service accepting our keys? The same checks run every morning at 09:00 Zanzibar time and alert Telegram." />

      <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 ${bad ? 'border-rose-400/30 bg-rose-400/[0.06]' : 'border-emerald-400/25 bg-emerald-400/[0.05]'}`}>
        <span className={`size-3 rounded-full ${bad ? 'bg-rose-400 shadow-[0_0_12px] shadow-rose-400/60' : 'bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60'}`} />
        <p className="font-medium">{bad ? `${bad} problem${bad > 1 ? 's' : ''}: leads may be slipping through until fixed` : 'All systems working'}</p>
      </div>

      {canCopy && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Store moved to Postgres</p>
              <p className="text-xs text-white/65 mt-1">{last ? `Last copy ${ago(last.at)}: ${last.copied} copied, ${last.skipped} already there${last.failed.length ? `, ${last.failed.length} failed` : ''}.` : 'Copy every file still in Vercel Blob into Postgres once. Safe to run again: it only copies what isn’t there yet.'}</p>
              {!!last?.failed.length && <p className="text-xs text-rose-300 mt-1">{last.failed.slice(0, 3).join(' · ')}</p>}
            </div>
            <ActionForm action={migrateStore}><button className="rounded-lg bg-white text-black text-sm font-medium px-4 py-2">{last ? 'Copy again' : 'Copy from Blob'}</button></ActionForm>
          </div>
        </Card>
      )}

      <SectionTitle>Live checks</SectionTitle>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {checks.map((c) => (
          <Card key={c.name}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${c.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <p className={`text-xs mt-1 break-words ${c.ok ? 'text-white/60' : 'text-rose-300/85'}`}>{c.detail ?? (c.ok ? 'Working' : 'Failed')}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

    </>
  );
}
