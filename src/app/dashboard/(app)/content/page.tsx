import { campaignsData, routineData } from '@/lib/dashboard';
import { PageHeader, Errors, Card, Empty, Badge, ago, linkProps } from '@/components/dashboard/ui';
import { HBars } from '@/components/dashboard/charts';

export const dynamic = 'force-dynamic';

export default async function Content() {
  const [{ errors, topPosts }, routine] = await Promise.all([campaignsData(), routineData(10)]);
  const drafts = routine.reports.flatMap((r) => r.items.filter((i) => i.job === 'content').map((i) => ({ ...i, runAt: r.runAt })));

  return (
    <>
      <PageHeader title="Content" sub="What’s bringing people in, and this week’s drafts from the routine (Mondays)." />
      <Errors errors={[...errors, ...routine.errors]} />

      <div className="grid lg:grid-cols-5 gap-3 md:gap-4">
        <Card title="Posts that brought leads" className="lg:col-span-2">
          {topPosts.length ? (
            <HBars rows={topPosts.map((p): [string, number] => [p.url.replace(/^https:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, ''), p.leads])} />
          ) : <Empty>No keyword comments yet. Every post with a “comment LEAK” call to action will rank here by leads.</Empty>}
          {topPosts.length > 0 && (
            <div className="mt-4 flex flex-col gap-1">
              {topPosts.map((p) => <a key={p.url} href={p.url} {...linkProps} className="text-xs text-white/40 hover:text-white truncate">{p.url} ↗</a>)}
            </div>
          )}
        </Card>

        <Card title="Drafts" className="lg:col-span-3" action={drafts.length ? <Badge>{drafts.length}</Badge> : undefined}>
          {drafts.length ? (
            <div className="flex flex-col gap-3">
              {drafts.map((dr, i) => (
                <details key={i} className="group rounded-xl border border-white/[0.06] bg-[#161616] open:bg-[#181818]" open={i === 0}>
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium">{dr.title}</span>
                    <span className="text-[11px] text-white/35 whitespace-nowrap">{ago(dr.runAt)}</span>
                  </summary>
                  {dr.detail && <p className="px-4 pb-4 text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">{dr.detail}</p>}
                </details>
              ))}
            </div>
          ) : <Empty>The first 3 drafts arrive with Monday’s run: a Leak post, a hot take and a build-in-public post, each with its comment keyword.</Empty>}
        </Card>
      </div>
    </>
  );
}
