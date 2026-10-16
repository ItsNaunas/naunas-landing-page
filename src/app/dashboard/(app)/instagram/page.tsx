import { instagramData } from '@/lib/ops/tabs';
import { storeReady } from '@/lib/store';
import { demoOn } from '@/lib/ops/demo';
import { DEFAULT_CAMPAIGN } from '@/lib/campaigns';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, SectionError, RangeChips, errFor } from '@/components/dashboard/kit';
import { toggleCampaign, deleteCampaign } from '../../actions';
import { CampaignEditor } from './CampaignEditor';

export const dynamic = 'force-dynamic';

const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const TYPE: Record<string, string> = { VIDEO: 'Reel', CAROUSEL_ALBUM: 'Carousel', IMAGE: 'Post' };

const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['0', 'All time']] as const;

export default async function Instagram({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = (await searchParams).range ?? '30';
  const d = await instagramData(Number(range));
  const span = RANGES.find(([v]) => v === range)?.[1] ?? 'All time';
  const ready = storeReady() || demoOn();
  const t = d.campaigns.reduce((s, c) => ({ triggers: s.triggers + c.stats.comments, dms: s.dms + c.stats.dms, clicks: s.clicks + c.stats.clicks }), { triggers: 0, dms: 0, clicks: 0 });

  return (
    <>
      <PageHeader title="Instagram"
        sub={d.profile ? `@${d.profile.username} · keyword campaigns and which posts bring leads` : 'Keyword campaigns and which posts bring leads'}
        action={<CampaignEditor site={FUNNEL.site} disabled={!ready} />} />
      <Errors errors={d.errors} />
      <RangeChips path="/dashboard/instagram" param="range" value={range} options={RANGES} />
      {!d.connected && <ConnectCard title="Connect Instagram" why="Needed for keyword DMs and post stats." steps={['Follow RUNBOOK §8 (Meta app, Instagram API with Instagram Login)']} env="IG_ACCESS_TOKEN" />}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Followers" value={d.profile?.followers_count?.toLocaleString('en-GB') ?? '—'} foot={<span className="text-xs text-white/40">{d.insights ? `${(d.insights.reach ?? 0).toLocaleString('en-GB')} reach · ${(d.insights.profile_views ?? 0).toLocaleString('en-GB')} profile views (${Math.min(30, Number(range) || 30)}d)` : d.profile?.media_count ? `${d.profile.media_count} posts` : ''}</span>} />
        <Kpi label="Keyword triggers" value={t.triggers} foot={<span className="text-xs text-white/40">{t.dms} DMs sent</span>} />
        <Kpi label="Link clicks" value={t.clicks} foot={<span className="text-xs text-white/40">{rate(t.clicks, t.dms)} of DMs</span>} />
        <Kpi label={`Leads from Instagram · ${span}`} value={d.totalLeads} foot={<span className="text-xs text-white/40">tagged in HubSpot</span>} href={`/dashboard/leads?source=instagram_dm&range=${range}`} />
      </div>

      {d.connected && !d.insights && <p className="text-xs text-white/35 -mt-2">Reach and profile views appear here once the Meta app has the <code className="text-white/55">instagram_business_manage_insights</code> permission (then regenerate the token).</p>}

      <SectionTitle>Keyword campaigns</SectionTitle>
      <SectionError errors={errFor(d.errors, 'Instagram leads')} />
      {!ready && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200/90">Storage isn’t connected, so campaigns can’t be edited. The default Leak Map campaign still runs.</div>}
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[780px]">
            <thead>
              <tr className="text-left text-xs text-white/35">
                <th className="font-normal px-5 py-3">Campaign</th><th className="font-normal px-3 py-3">Keywords</th>
                <th className="font-normal px-3 py-3 text-right">Triggers</th><th className="font-normal px-3 py-3 text-right">DMs</th>
                <th className="font-normal px-3 py-3 text-right">Clicks</th><th className="font-normal px-3 py-3 text-right">Leads</th>
                <th className="font-normal px-3 py-3 text-right">With deal</th><th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {d.campaigns.map((c) => {
                const ended = c.endsAt && Date.parse(c.endsAt) < Date.now();
                const live = c.active && !ended;
                return (
                  <tr key={c.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${live ? 'bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60' : 'bg-white/20'}`} />
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[11px] text-white/35">{live ? 'Live' : ended ? 'Ended' : 'Paused'}</span>
                      </div>
                      <p className="text-xs text-white/35 mt-1 pl-4">
                        {c.channel === 'both' ? 'Comments + DMs' : c.channel === 'dm' ? 'DMs' : 'Comments'} · {c.postIds.length ? `${c.postIds.length} post${c.postIds.length > 1 ? 's' : ''}` : 'all posts'}
                      </p>
                    </td>
                    <td className="px-3 py-3.5"><div className="flex flex-wrap gap-1">{c.keywords.map((k) => <Badge key={k}>{k}</Badge>)}</div></td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.comments}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.dms}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums">{c.stats.clicks} <span className="text-[11px] text-white/35">{rate(c.stats.clicks, c.stats.dms)}</span></td>
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

      <SectionTitle>Posts · {span}</SectionTitle>
      <SectionError errors={errFor(d.errors, 'Instagram posts', 'Instagram profile')} />
      {d.posts.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {d.posts.map((p) => (
            <a key={p.id} href={p.permalink} {...linkProps} className="group rounded-2xl border border-white/[0.07] bg-[#121212] overflow-hidden flex flex-col hover:border-white/20">
              <div className="aspect-square bg-white/[0.04] relative overflow-hidden">
                {(p.thumbnail_url || (p.media_type !== 'VIDEO' && p.media_url))
                  ? <img src={p.thumbnail_url ?? p.media_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover group-hover:scale-[1.03] transition-transform" />
                  : <div className="absolute inset-0 grid place-items-center text-xs text-white/30 p-3 text-center">{p.caption?.slice(0, 80)}</div>}
                {p.leads > 0 && <span className="absolute top-2 left-2"><Badge tone="accent">{p.leads} lead{p.leads > 1 ? 's' : ''}</Badge></span>}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="text-[11px] text-white/40">{TYPE[p.media_type] ?? 'Post'} · {ago(p.timestamp)}</p>
                <p className="text-xs text-white/70 tabular-nums">♥ {p.like_count ?? 0} · 💬 {p.comments_count ?? 0}</p>
              </div>
            </a>
          ))}
        </div>
      ) : <Card><Empty>No posts in this period.</Empty></Card>}
    </>
  );
}
