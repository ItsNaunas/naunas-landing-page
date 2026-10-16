import { campaignsData } from '@/lib/dashboard';
import { storeReady } from '@/lib/store';
import { demoOn } from '@/lib/dashboardDemo';
import { DEFAULT_CAMPAIGN } from '@/lib/campaigns';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Errors, Badge, Card, Kpi } from '@/components/dashboard/ui';
import { toggleCampaign, deleteCampaign } from '../../actions';
import { CampaignEditor } from './CampaignEditor';

export const dynamic = 'force-dynamic';

const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default async function Campaigns() {
  const { errors, campaigns } = await campaignsData();
  const ready = storeReady() || demoOn();
  const totals = campaigns.reduce((t, c) => ({
    triggers: t.triggers + c.stats.comments, dms: t.dms + c.stats.dms, clicks: t.clicks + c.stats.clicks, leads: t.leads + c.stats.leads,
  }), { triggers: 0, dms: 0, clicks: 0, leads: 0 });

  return (
    <>
      <PageHeader
        title="Campaigns"
        sub="Comment or DM a keyword on Instagram → they get that campaign’s DM and tracked link."
        action={<CampaignEditor site={FUNNEL.site} disabled={!ready} />}
      />
      <Errors errors={errors} />
      {!ready && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200/90">Storage isn’t connected, so campaigns can’t be edited. The default Leak Map campaign still runs.</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Keyword triggers" value={totals.triggers} foot={<span className="text-xs text-white/40">comments + DMs matched</span>} />
        <Kpi label="DMs sent" value={totals.dms} foot={<span className="text-xs text-white/40">{rate(totals.dms, totals.triggers)} of triggers</span>} />
        <Kpi label="Link clicks" value={totals.clicks} foot={<span className="text-xs text-white/40">{rate(totals.clicks, totals.dms)} of DMs</span>} />
        <Kpi label="Leads in HubSpot" value={totals.leads} foot={<span className="text-xs text-white/40">tagged with a campaign</span>} />
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-white/35">
                <th className="font-normal px-5 py-3">Campaign</th><th className="font-normal px-3 py-3">Keywords</th>
                <th className="font-normal px-3 py-3 text-right">Triggers</th><th className="font-normal px-3 py-3 text-right">DMs</th>
                <th className="font-normal px-3 py-3 text-right">Clicks</th><th className="font-normal px-3 py-3 text-right">Leads</th>
                <th className="font-normal px-3 py-3 text-right">With deal</th><th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const ended = c.endsAt && Date.parse(c.endsAt) < Date.now();
                return (
                  <tr key={c.id} className="border-t border-white/[0.05] hover:bg-white/[0.02] align-middle">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${c.active && !ended ? 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60' : 'bg-white/20'}`} />
                        <span className="font-medium">{c.name}</span>
                      </div>
                      <p className="text-xs text-white/35 mt-1 pl-4">
                        {c.channel === 'both' ? 'Comments + DMs' : c.channel === 'dm' ? 'DMs' : 'Comments'} · {c.postIds.length ? `${c.postIds.length} post${c.postIds.length > 1 ? 's' : ''}` : 'all posts'}
                        {c.endsAt ? ` · ${ended ? 'ended' : 'ends'} ${new Date(c.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-3.5"><div className="flex flex-wrap gap-1">{c.keywords.map((k) => <Badge key={k}>{k}</Badge>)}</div></td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.comments}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.dms}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.clicks}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums font-medium">{c.stats.leads}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.deals}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-4">
                        <CampaignEditor campaign={c} site={FUNNEL.site} disabled={!ready} />
                        <form action={toggleCampaign}><input type="hidden" name="id" value={c.id} />
                          <button disabled={!ready} className="text-xs text-white/55 hover:text-white disabled:opacity-30">{c.active ? 'Pause' : 'Go live'}</button>
                        </form>
                        {c.id !== DEFAULT_CAMPAIGN.id && (
                          <form action={deleteCampaign}><input type="hidden" name="id" value={c.id} />
                            <button disabled={!ready} className="text-xs text-white/30 hover:text-rose-300 disabled:opacity-30">Delete</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-white/30 -mt-2">
        Triggers, DMs and clicks are counted by the site. Leads and “with deal” come from HubSpot. A post ID is the number in the post’s link in Meta; ask Claude if you need one looked up.
      </p>
    </>
  );
}
