import { tiktokConfigured, tiktokConnected, tiktokUser, tiktokVideos, creatorInfo, getPosts, SCOPES, type TikTokUser, type TikTokVideo, type CreatorInfo } from '@/lib/tiktok';
import { PageHeader, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, SectionError } from '@/components/dashboard/kit';
import { disconnectTikTok, refreshTikTokPosts } from '../../actions';
import { TikTokComposer } from './TikTokComposer';

export const dynamic = 'force-dynamic';
// Publishing reads the video from Blob and uploads it to TikTok inside the server action.
export const maxDuration = 300;

const n = (v?: number) => (v ?? 0).toLocaleString('en-GB');
const STATUS: Record<string, { label: string; tone: 'good' | 'bad' | 'muted' }> = {
  PUBLISH_COMPLETE: { label: 'Posted', tone: 'good' }, FAILED: { label: 'Failed', tone: 'bad' },
  PROCESSING_UPLOAD: { label: 'Processing', tone: 'muted' }, PROCESSING_DOWNLOAD: { label: 'Processing', tone: 'muted' },
  SEND_TO_USER_INBOX: { label: 'In TikTok inbox', tone: 'muted' },
};

async function attempt<T>(label: string, p: Promise<T>, errors: string[]): Promise<T | null> {
  try { return await p; } catch (err) { errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`); return null; }
}

export default async function TikTok({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const q = await searchParams;
  const configured = tiktokConfigured();
  const connected = configured && (await tiktokConnected());
  const errors: string[] = [];
  const [user, videos, creator, posts] = connected
    ? await Promise.all([
      attempt<TikTokUser>('TikTok profile', tiktokUser(), errors),
      attempt<TikTokVideo[]>('TikTok videos', tiktokVideos(20), errors),
      attempt<CreatorInfo>('TikTok posting', creatorInfo(), errors),
      getPosts(),
    ])
    : [null, null, null, []];
  const views = (videos ?? []).reduce((s, v) => s + (v.view_count ?? 0), 0);
  const pending = posts.some((p) => p.status !== 'PUBLISH_COMPLETE' && p.status !== 'FAILED');

  return (
    <>
      <a href="/dashboard/system/connections" className="text-xs text-white/45 hover:text-white -mb-3">← Connections</a>
      <PageHeader title="TikTok"
        sub={user ? `${user.display_name ?? 'Connected'}${user.username ? ` · @${user.username}` : ''} · post videos and see how they do` : 'Post videos and see how they do'}
        action={connected ? (
          <form action={disconnectTikTok}><button className="text-xs text-white/40 hover:text-rose-300">Disconnect</button></form>
        ) : undefined} />

      {q.connected && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200/90">TikTok connected.</div>}
      {q.error && <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200/90">TikTok didn’t connect: {q.error === 'state' ? 'the login took too long or came from another browser. Try again.' : q.error}</div>}

      {!configured && <ConnectCard title="Set up the TikTok app" why="Needed to post to TikTok and show video stats." steps={['developers.tiktok.com → your app → Sandbox (or Production once approved)', 'Copy the Client key and Client secret']} env="TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET" />}

      {configured && !connected && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <p className="font-medium">Connect your TikTok account</p>
              <p className="text-sm text-white/50 mt-1 max-w-xl">You’ll log in on TikTok and approve access. Naunas can then read your profile stats and videos, and post videos only when you press Publish here.</p>
              <div className="flex flex-wrap gap-1 mt-2.5">{SCOPES.map((s) => <Badge key={s} tone="muted">{s}</Badge>)}</div>
            </div>
            <a href="/dashboard/tiktok/connect" className="shrink-0 rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553]">Connect TikTok</a>
          </div>
        </Card>
      )}

      {connected && (
        <>
          <SectionError errors={errors.filter((e) => e.startsWith('TikTok profile:'))} />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            <Kpi label="Followers" value={user ? n(user.follower_count) : '—'} foot={<span className="text-xs text-white/40">following {user ? n(user.following_count) : '—'}</span>} />
            <Kpi label="Likes (all time)" value={user ? n(user.likes_count) : '—'} />
            <Kpi label="Videos" value={user ? n(user.video_count) : '—'} />
            <Kpi label="Views · last 20 videos" value={videos ? n(views) : '—'} foot={<span className="text-xs text-white/40">{videos?.length ? `${n(Math.round(views / videos.length))} per video` : ''}</span>} />
          </div>

          <SectionTitle>Publish a video</SectionTitle>
          <SectionError errors={errors.filter((e) => e.startsWith('TikTok posting:'))} />
          {creator ? <Card><TikTokComposer creator={creator} /></Card> : !errors.some((e) => e.startsWith('TikTok posting:')) && <Card><Empty>Posting isn’t available for this account right now.</Empty></Card>}

          {posts.length > 0 && (
            <>
              <SectionTitle action={pending ? <form action={refreshTikTokPosts}><button className="text-xs text-white/55 hover:text-white">Check status</button></form> : undefined}>Posted from here</SectionTitle>
              <Card pad={false}>
                <ul className="divide-y divide-white/[0.05]">
                  {posts.slice(0, 10).map((p) => {
                    const s = STATUS[p.status] ?? { label: p.status, tone: 'muted' as const };
                    return (
                      <li key={p.publishId} className="px-5 py-3 flex items-center gap-3 text-sm">
                        <Badge tone={s.tone}>{s.label}</Badge>
                        <span className="truncate flex-1 min-w-0">{p.caption || 'Untitled video'}</span>
                        <span className="text-xs text-white/35 shrink-0">{p.failReason ? `${p.failReason} · ` : ''}{ago(p.at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </>
          )}

          <SectionTitle>Recent videos</SectionTitle>
          <SectionError errors={errors.filter((e) => e.startsWith('TikTok videos:'))} />
          {videos?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {videos.map((v) => (
                <a key={v.id} href={v.share_url} {...linkProps} className="group rounded-2xl border border-white/[0.07] bg-[#121212] overflow-hidden flex flex-col hover:border-white/20">
                  <div className="aspect-[9/16] bg-white/[0.04] relative overflow-hidden">
                    {v.cover_image_url
                      ? <img src={v.cover_image_url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover group-hover:scale-[1.03] transition-transform" />
                      : <div className="absolute inset-0 grid place-items-center text-xs text-white/30 p-3 text-center">{(v.title || v.video_description)?.slice(0, 80)}</div>}
                    <span className="absolute bottom-2 left-2"><Badge>▶ {n(v.view_count)}</Badge></span>
                  </div>
                  <div className="p-3 flex flex-col gap-1">
                    <p className="text-[11px] text-white/40 truncate">{(v.title || v.video_description || 'Video')} · {ago(new Date(v.create_time * 1000).toISOString())}</p>
                    <p className="text-xs text-white/70 tabular-nums">♥ {n(v.like_count)} · 💬 {n(v.comment_count)} · ↗ {n(v.share_count)}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : videos && <Card><Empty>No public videos yet. Videos you post publicly show up here with their views, likes, comments and shares.</Empty></Card>}
        </>
      )}
    </>
  );
}
