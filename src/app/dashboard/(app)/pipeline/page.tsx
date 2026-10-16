import { pipelineData, SOURCE_LABEL } from '@/lib/dashboard';
import { hubspotUrl } from '@/lib/hubspot';
import { PageHeader, Errors, Badge, gbp, compactGbp, ago, linkProps } from '@/components/dashboard/ui';

export const dynamic = 'force-dynamic';

export default async function Pipeline() {
  const { errors, stages } = await pipelineData();
  const total = stages.reduce((s, st) => s + st.total, 0);
  const value = stages.reduce((s, st) => s + st.value, 0);

  return (
    <>
      <PageHeader
        title="Pipeline"
        sub={`${total} open deal${total === 1 ? '' : 's'} · ${gbp(value)} in play`}
        action={<a href={hubspotUrl.contacts().replace('/objects/0-1/', '/objects/0-3/')} {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Open in HubSpot ↗</a>}
      />
      <Errors errors={errors} />

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
        {stages.map((st) => (
          <div key={st.id} className="snap-start shrink-0 w-[78vw] sm:w-[260px] md:flex-1 md:w-auto md:min-w-[200px] rounded-2xl bg-[#101010] border border-white/[0.06] flex flex-col">
            <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-white/[0.05]">
              <p className="text-[13px] font-medium">{st.label} <span className="text-white/35 tabular-nums ml-1">{st.total}</span></p>
              {st.value > 0 && <span className="text-xs text-white/40 tabular-nums">{compactGbp(st.value)}</span>}
            </div>
            <div className="p-2.5 flex flex-col gap-2 min-h-[140px]">
              {st.deals.length ? st.deals.map((dl) => (
                <a key={dl.id} href={hubspotUrl.deal(dl.id)} {...linkProps}
                  className="group rounded-xl bg-[#161616] border border-white/[0.06] p-3 flex flex-col gap-2 hover:border-[#F2613F]/50 transition-colors">
                  <p className="text-[13px] font-medium leading-snug group-hover:text-white">{dl.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {dl.amount > 0 && <Badge tone="good">{gbp(dl.amount)}</Badge>}
                    {dl.priority === 'high' && <Badge tone="accent">High value</Badge>}
                    {dl.source && <Badge tone="muted">{SOURCE_LABEL[dl.source] ?? dl.source}</Badge>}
                  </div>
                  <p className="text-[11px] text-white/35">Created {ago(dl.createdAt)}</p>
                </a>
              )) : <p className="text-xs text-white/25 text-center py-8">Empty</p>}
              {st.total > st.deals.length && <p className="text-xs text-white/35 text-center">+{st.total - st.deals.length} more in HubSpot</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
