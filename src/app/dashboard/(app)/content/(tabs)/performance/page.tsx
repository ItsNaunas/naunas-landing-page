import Link from 'next/link';
import { instagramData } from '@/lib/ops/tabs';
import { demoOn } from '@/lib/ops/demo';
import { CHANNELS, CHANNEL_CODE } from '@/lib/content';
import { postPerformance, evergreen, type PostPerf } from '@/lib/performance';
import { videoStats, type VideoStats } from '@/lib/videoWatch';
import { tiktokConfigured, tiktokConnected, tiktokUser, tiktokVideos, type TikTokUser, type TikTokVideo } from '@/lib/tiktok';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, SectionError, RangeChips, errFor } from '@/components/dashboard/kit';
import { refreshPostStats, duplicateContentPost } from '@/app/dashboard/actions';

export const dynamic = 'force-dynamic';

const TYPE: Record<string, string> = { VIDEO: 'Reel', CAROUSEL_ALBUM: 'Carousel', IMAGE: 'Post' };
const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['0', 'All time']] as const;
const n = (v?: number) => (v ?? 0).toLocaleString('en-GB');

function demoPerf(): PostPerf[] {
  const d = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  const rows = [
    { idea: 'Most design studios lose the client between the first call and the deposit.', when: d(-2) },
    { idea: 'Why your proposal sits unread for days.', when: d(-26) },
    { idea: 'I rebuilt a studio’s enquiry form in a day. Here’s the before and after.', when: d(-24 * 100) },
  ];
  return rows.map((r, i) => ({
    id: 'demo', createdAt: r.when, status: 'done' as const, kind: 'video' as const, channels: { linkedin: 'posted' as const, instagram: 'posted' as const }, ...r,
    clicks: { linkedin: 14 - i * 4, instagram: 9 - i * 3, tiktok: 0 }, totalClicks: 23 - i * 7, leads: 3 - i, deals: i ? 0 : 1, score: 0,
    insights: { reach: 2100 - i * 600, views: 3400 - i * 900, likes: 88 - i * 20, comments: 12 - i * 3, saved: 9 - i * 2, shares: 4, at: r.when },
  }));
}

async function attempt<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch { return null; }
}

export default async function Performance({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = (await searchParams).range ?? '30';
  const span = RANGES.find(([v]) => v === range)?.[1] ?? 'All time';
  const [perf, d, tt] = await Promise.all([
    demoOn() ? { rows: demoPerf(), errors: [] as string[] } : postPerformance(365).catch(() => ({ rows: [] as PostPerf[], errors: ['Post performance failed to load'] })),
    instagramData(Number(range)),
    (async () => {
      if (demoOn() || !tiktokConfigured() || !(await tiktokConnected())) return null;
      const [user, videos] = await Promise.all([attempt<TikTokUser>(tiktokUser()), attempt<TikTokVideo[]>(tiktokVideos(20))]);
      return { user, videos };
    })(),
  ]);
  const vs: VideoStats = demoOn() ? { days: 30, plays: 42, q50: 27, ends: 15, popups: 14, signups: 4, today: { play: 3 } } : await videoStats(30).catch(() => ({ days: 30, plays: 0, q50: 0, ends: 0, popups: 0, signups: 0, today: {} }));
  const board = perf.rows.filter((r) => Date.parse(r.when) >= Date.now() - 120 * 86_400_000).slice(0, 10);
  const again = evergreen(perf.rows);
  const ttViews = (tt?.videos ?? []).reduce((s, v) => s + (v.view_count ?? 0), 0);

  return (
    <>
      <TabIntro sub="Which posts bring people in: clicks, leads and deals per post, then each platform’s own numbers." />
      <Errors errors={[...perf.errors, ...d.errors]} />

      {/* What's working */}
      <SectionTitle action={<form action={refreshPostStats}><button className="text-xs text-white/60 hover:text-white">Refresh Instagram stats ↻</button></form>}>Post leaderboard · last 120 days</SectionTitle>
      <Card pad={false}>
        {board.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[640px]">
              <thead><tr className="text-left text-[11px] text-white/60 border-b border-white/[0.06]">
                <th className="px-5 py-2.5 font-normal">Post</th>
                <th className="px-2 py-2.5 font-normal text-right" title="Tracked-link clicks per channel">Clicks LI · IG · TT</th>
                <th className="px-2 py-2.5 font-normal text-right" title="Instagram reach / views">IG reach</th>
                <th className="px-2 py-2.5 font-normal text-right">Leads</th>
                <th className="px-5 py-2.5 font-normal text-right">Deals</th>
              </tr></thead>
              <tbody className="divide-y divide-white/[0.05]">
                {board.map((r, j) => (
                  <tr key={r.id + j} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 max-w-0 w-1/2">
                      <Link href={`/dashboard/content/${r.id}`} className="block truncate text-white/85 hover:text-[#F2613F]">{r.idea || 'Untitled'}</Link>
                      <span className="text-[11px] text-white/55">{ago(r.when)}{CHANNELS.filter((c) => r.urls?.[c]).map((c) => <a key={c} href={r.urls![c]} {...linkProps} className="ml-2 hover:text-white">{CHANNEL_CODE[c].toUpperCase()} ↗</a>)}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">{r.clicks.linkedin ?? 0} · {r.clicks.instagram ?? 0} · {r.clicks.tiktok ?? 0}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">{r.insights ? (r.insights.reach ?? r.insights.views ?? 0).toLocaleString() : '—'}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-medium">{r.leads || <span className="text-white/55">0</span>}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{r.deals ? <span className="text-emerald-300">{r.deals}</span> : <span className="text-white/55">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Once posts go out from here, each one ranks by the leads, deals and clicks it brings. LinkedIn has no stats API, so it counts clicks on the post’s tracked link.</Empty>}
      </Card>


        <Card title="Worth posting again">
          {again.length ? (
            <ul className="flex flex-col divide-y divide-white/[0.05] -my-2">
              {again.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center gap-3">
                  <span className="flex-1 min-w-0"><span className="block truncate text-[13px] text-white/85">{r.idea || 'Untitled'}</span><span className="text-[11px] text-white/60">{r.leads} lead{r.leads > 1 ? 's' : ''} · {ago(r.when)}</span></span>
                  <form action={duplicateContentPost}><input type="hidden" name="id" value={r.id} /><button className="text-xs rounded-lg bg-white/[0.08] hover:bg-white/[0.14] px-2.5 py-1.5">Re-post as draft</button></form>
                </li>
              ))}
            </ul>
          ) : <Empty>Posts older than 90 days that brought leads show up here. Same idea, new hook: it’s a new audience by then.</Empty>}
        </Card>

      <SectionTitle>Landing video · last 30 days</SectionTitle>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Pressed play" value={vs.plays} foot={<span className="text-xs text-white/60">{vs.today.play ?? 0} today</span>} />
        <Kpi label="Reached halfway" value={vs.q50} foot={<span className="text-xs text-white/60">{vs.plays ? `${Math.round((vs.q50 / vs.plays) * 100)}% of plays` : 'no plays yet'}</span>} />
        <Kpi label="Watched to the end" value={vs.ends} foot={<span className="text-xs text-white/60">{vs.plays ? `${Math.round((vs.ends / vs.plays) * 100)}% of plays` : 'no plays yet'}</span>} />
        <Kpi label="Scorecard sign-ups after it" value={vs.signups} foot={<span className="text-xs text-white/60">{vs.popups ? `${vs.popups} saw the pop-up` : 'pop-up opens when the video ends'}</span>} />
      </div>

      <SectionTitle>Instagram and TikTok</SectionTitle>
      <RangeChips path="/dashboard/content/performance" param="range" value={range} options={RANGES} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Instagram followers" value={d.profile?.followers_count?.toLocaleString('en-GB') ?? '—'} foot={<span className="text-xs text-white/60">{d.profile ? `@${d.profile.username}` : ''}</span>} />
        <Kpi label="Instagram reach" value={d.insights ? n(d.insights.reach) : '—'} foot={<span className="text-xs text-white/60">{d.insights ? `${n(d.insights.profile_views)} profile views` : 'needs the insights permission'}</span>} />
        <Kpi label={`Leads from Instagram · ${span}`} value={d.totalLeads} href={`/dashboard/leads?source=instagram_dm&range=${range}`} />
        <Kpi label="TikTok followers" value={tt?.user ? n(tt.user.follower_count) : '—'} foot={<span className="text-xs text-white/60">{tt?.videos?.length ? `${n(ttViews)} views, last ${tt.videos.length} videos` : tt ? '' : <Link href="/dashboard/tiktok" className="hover:text-white">Connect TikTok →</Link>}</span>} />
      </div>
      <SectionTitle>Posts · {span}</SectionTitle>
      <SectionError errors={errFor(d.errors, 'Instagram posts', 'Instagram profile')} />
      {d.posts.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {d.posts.map((p) => (
            <a key={p.id} href={p.permalink} {...linkProps} className="group rounded-2xl border border-white/[0.07] bg-[#121212] overflow-hidden flex flex-col hover:border-white/20">
              <div className="aspect-square bg-white/[0.04] relative overflow-hidden">
                {(p.thumbnail_url || (p.media_type !== 'VIDEO' && p.media_url))
                  ? <img src={p.thumbnail_url ?? p.media_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover group-hover:scale-[1.03] transition-transform" />
                  : <div className="absolute inset-0 grid place-items-center text-xs text-white/55 p-3 text-center">{p.caption?.slice(0, 80)}</div>}
                {p.leads > 0 && <span className="absolute top-2 left-2"><Badge tone="accent">{p.leads} lead{p.leads > 1 ? 's' : ''}</Badge></span>}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="text-[11px] text-white/60">{TYPE[p.media_type] ?? 'Post'} · {ago(p.timestamp)}</p>
                <p className="text-xs text-white/70 tabular-nums">♥ {p.like_count ?? 0} · 💬 {p.comments_count ?? 0}</p>
              </div>
            </a>
          ))}
        </div>
      ) : <Card><Empty>No posts in this period.</Empty></Card>}

      {tt?.videos?.length ? (
        <>
          <SectionTitle>TikTok · recent videos</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {tt.videos.map((v) => (
              <a key={v.id} href={v.share_url} {...linkProps} className="group rounded-2xl border border-white/[0.07] bg-[#121212] overflow-hidden flex flex-col hover:border-white/20">
                <div className="aspect-[9/16] bg-white/[0.04] relative overflow-hidden">
                  {v.cover_image_url && <img src={v.cover_image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
                  <span className="absolute bottom-2 left-2"><Badge>▶ {n(v.view_count)}</Badge></span>
                </div>
                <p className="p-3 text-xs text-white/70 tabular-nums">♥ {n(v.like_count)} · 💬 {n(v.comment_count)} · ↗ {n(v.share_count)}</p>
              </a>
            ))}
          </div>
        </>
      ) : null}
      <p className="text-xs text-white/55">LinkedIn doesn’t give apps stats on personal posts, so LinkedIn here means clicks on each post’s tracked link and the leads it brought.</p>
    </>
  );
}
