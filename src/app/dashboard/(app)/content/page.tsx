import Link from 'next/link';
import { contentData } from '@/lib/ops/tabs';
import { contentPlus } from '@/lib/ops/more';
import { getIndex, CHANNELS, CHANNEL_LABEL, CHANNEL_CODE, type IndexRow, type ChannelStatus } from '@/lib/content';
import { tiktokApproved } from '@/lib/publish';
import { demoOn } from '@/lib/ops/demo';
import { PageHeader, Errors, Card, Empty, Badge, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, Meter } from '@/components/dashboard/kit';
import { CopyButton } from '@/components/dashboard/client';
import { newContentPost } from '../../actions';
import { SendHeldButton } from './HeldTray';

export const dynamic = 'force-dynamic';

const KIND = (title: string) => /^leak/i.test(title) ? 'Leak post' : /^hot take/i.test(title) ? 'Hot take' : /^build/i.test(title) ? 'Build in public' : 'Draft';

const TZ = 'Africa/Dar_es_Salaam';
const dayKey = (t: string | number) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });
const DOT: Record<ChannelStatus, string> = {
  off: 'bg-white/10', ready: 'bg-white/40', scheduled: 'bg-sky-400', publishing: 'bg-amber-300', posted: 'bg-emerald-400', failed: 'bg-rose-400', held: 'bg-amber-400',
};
const POST_TONE: Record<string, 'good' | 'bad' | 'muted' | 'accent' | 'neutral'> = { done: 'good', partial: 'accent', scheduled: 'neutral', draft: 'muted', publishing: 'neutral' };
const POST_LABEL: Record<string, string> = { done: 'Posted', partial: 'Partly posted', scheduled: 'Scheduled', draft: 'Draft', publishing: 'Publishing' };

function demoRows(): IndexRow[] {
  const d = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  return [
    { id: 'demo', createdAt: d(-30), when: d(20), status: 'scheduled', idea: 'The follow-up most studios never send (and the one that books the call).', kind: 'video', channels: { linkedin: 'scheduled', instagram: 'scheduled', tiktok: 'scheduled' } },
    { id: 'demo', createdAt: d(-26), when: d(-2), status: 'partial', idea: 'Most design studios lose the client between the first call and the deposit.', kind: 'video', channels: { linkedin: 'posted', instagram: 'posted', tiktok: 'held' } },
    { id: 'demo', createdAt: d(-50), when: d(-26), status: 'done', idea: 'Why your proposal sits unread for 6 days.', kind: 'image', channels: { linkedin: 'posted', instagram: 'posted', tiktok: 'off' } },
    { id: 'demo', createdAt: d(-80), when: d(-50), status: 'partial', idea: 'I rebuilt a studio’s enquiry form in a day. Here’s the before and after.', kind: 'video', channels: { linkedin: 'posted', instagram: 'failed', tiktok: 'held' } },
  ];
}

function PostRow({ r }: { r: IndexRow }) {
  return (
    <li>
      <Link href={`/dashboard/content/${r.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
        <span className="text-xs text-white/40 w-[92px] shrink-0 tabular-nums">{new Date(r.when).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <span className="flex-1 min-w-0 truncate text-[13px] text-white/85">{r.idea || 'Untitled'}</span>
        <span className="hidden sm:flex gap-2 shrink-0">
          {CHANNELS.filter((c) => r.channels[c] && r.channels[c] !== 'off').map((c) => (
            <span key={c} className="flex items-center gap-1 text-[10.5px] text-white/55" title={`${CHANNEL_LABEL[c]}: ${r.channels[c]}`}>
              <span className={`size-1.5 rounded-full ${DOT[r.channels[c]!]}`} />{CHANNEL_CODE[c].toUpperCase()}
            </span>
          ))}
        </span>
        <Badge tone={POST_TONE[r.status] ?? 'muted'}>{POST_LABEL[r.status] ?? r.status}</Badge>
      </Link>
    </li>
  );
}

export default async function Content() {
  const d = await contentData();
  const x = await contentPlus(d.drafts, d.posts);
  const byRun = d.drafts.reduce<Record<string, typeof d.drafts>>((a, r) => ({ ...a, [r.runAt]: [...(a[r.runAt] ?? []), r] }), {});
  const gaps = x.coverage.filter((c) => !c.drafts);

  const rows = demoOn() ? demoRows() : await getIndex().catch(() => [] as IndexRow[]);
  const todayIdx = (new Date(new Date().toLocaleString('en-US', { timeZone: TZ })).getDay() + 6) % 7;
  const weekDays = Array.from({ length: 7 }, (_, i) => dayKey(Date.now() + (i - todayIdx) * 86_400_000));
  const byDay = (k: string) => rows.filter((r) => dayKey(r.when) === k && r.status !== 'draft');
  const postedThisWeek = rows.filter((r) => weekDays.includes(dayKey(r.when)) && Object.values(r.channels).includes('posted')).length;
  const held = rows.filter((r) => r.channels.tiktok === 'held');
  const upcoming = rows.filter((r) => r.status === 'scheduled').sort((a, b) => a.when.localeCompare(b.when));
  const recent = rows.filter((r) => r.status !== 'scheduled').slice(0, 12);

  return (
    <>
      <PageHeader title="Content" sub="Post once to LinkedIn, Instagram and TikTok, plan the week, and see which posts actually bring people in."
        action={<form action={newContentPost}><button className="rounded-lg bg-[#F2613F] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7553]">+ New post</button></form>} />
      <Errors errors={[...d.errors, ...x.errors]} />

      {/* This week */}
      <div className="grid lg:grid-cols-[1fr_260px] gap-3 md:gap-4">
        <Card title="This week" pad={false}>
          <div className="grid grid-cols-[repeat(7,minmax(112px,1fr))] min-w-0 overflow-x-auto">
            {x.plan.map((p, i) => (
              <div key={p.day} className={`px-3 py-3 border-r border-white/[0.05] last:border-r-0 ${i === todayIdx ? 'bg-[#F2613F]/[0.08]' : ''}`}>
                <p className={`text-xs font-semibold ${i === todayIdx ? 'text-[#ff8a6d]' : 'text-white/45'}`}>{p.day}{i === todayIdx ? ' · today' : ''}</p>
                <p className="text-[13px] mt-2 text-white/90">{p.a}</p>
                <p className="text-[11px] text-white/40 mt-1">{p.b}</p>
                <div className="mt-2 flex flex-col gap-1">
                  {byDay(weekDays[i]).map((r, j) => (
                    <Link key={r.id + j} href={`/dashboard/content/${r.id}`} className="rounded-md bg-white/[0.05] hover:bg-white/[0.09] px-1.5 py-1 text-[10.5px] leading-tight text-white/75 flex items-start gap-1">
                      <span className="flex gap-0.5 mt-[3px] shrink-0">{CHANNELS.map((c) => <span key={c} className={`size-1.5 rounded-full ${DOT[r.channels[c] ?? 'off']}`} />)}</span>
                      <span className="line-clamp-2">{r.status === 'scheduled' ? `${new Date(r.when).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} · ` : ''}{r.idea || 'Untitled'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Posts this week">
          <p className="text-3xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{postedThisWeek}<span className="text-base text-white/35">/{x.weeklyTarget}</span></p>
          <div className="mt-3"><Meter value={postedThisWeek} max={x.weeklyTarget} /></div>
          <p className="text-[11px] text-white/40 mt-2">Published from here (about 1 a day). {x.postsThisWeek} Instagram post{x.postsThisWeek === 1 ? '' : 's'} in total this week.</p>
          <p className="text-[11px] text-white/35 mt-2 flex flex-wrap gap-x-2">
            {(['posted', 'scheduled', 'held', 'failed'] as ChannelStatus[]).map((s) => <span key={s} className="flex items-center gap-1"><span className={`size-1.5 rounded-full ${DOT[s]}`} />{s}</span>)}
          </p>
        </Card>
      </div>

      {held.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium">⏳ {held.length} post{held.length > 1 ? 's' : ''} waiting for TikTok</p>
              <p className="text-sm text-white/50 mt-1">LinkedIn and Instagram already went out. TikTok only allows public posts once it approves the app. Then send these in one go, or open one and drop it if it’s stale.</p>
            </div>
            <SendHeldButton approved={tiktokApproved()} count={held.length} />
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-3 md:gap-4">
        <Card title="Scheduled" pad={false}>
          {upcoming.length ? <ul className="divide-y divide-white/[0.05]">{upcoming.map((r, j) => <PostRow key={r.id + j} r={r} />)}</ul>
            : <Empty>Nothing scheduled. Press New post, write it once, then Schedule for an exact time.</Empty>}
        </Card>
        <Card title="Recent posts" pad={false}>
          {recent.length ? <ul className="divide-y divide-white/[0.05]">{recent.map((r, j) => <PostRow key={r.id + j} r={r} />)}</ul>
            : <Empty>Posts you publish from here show up with each channel’s result.</Empty>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <SectionTitle>Drafts from the routine</SectionTitle>
          {Object.keys(byRun).length ? Object.entries(byRun).map(([runAt, drafts]) => (
            <div key={runAt} className="flex flex-col gap-3">
              <p className="text-xs text-white/40">Written {ago(runAt)}</p>
              {drafts.map((dr, i) => (
                <Card key={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex gap-1.5">
                        <Badge tone="accent">{KIND(dr.title)}</Badge>
                        {dr.detail?.match(/Layer:\s*(\d\s*\w[\w-]*)/)?.[1] && <Badge>Layer {dr.detail.match(/Layer:\s*(\d\s*\w[\w-]*)/)![1]}</Badge>}
                      </div>
                      <p className="text-[15px] font-medium mt-2">{dr.title.replace(/^(leak post|hot take|build)[:\s]*/i, '')}</p>
                    </div>
                    {dr.detail && <CopyButton text={dr.detail} />}
                  </div>
                  {dr.detail && <p className="mt-3 text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">{dr.detail}</p>}
                </Card>
              ))}
            </div>
          )) : <Card><Empty>The first three drafts arrive with Monday’s run: a Leak post, a hot take and a build-in-public post, each with its comment keyword.</Empty></Card>}

          <SectionTitle>Idea bank · your leads’ own words</SectionTitle>
          <Card pad={false}>
            {x.ideas.length ? (
              <ul className="divide-y divide-white/[0.05]">
                {x.ideas.map((i, n) => (
                  <li key={n} className="px-5 py-3.5 flex items-start gap-3">
                    <span className="text-[#F2613F] text-lg leading-none mt-0.5" aria-hidden>“</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-white/85">{i.text}</p>
                      <p className="text-[11px] text-white/35 mt-1">{i.who} · {ago(i.at)}</p>
                    </div>
                    <CopyButton text={i.text} label="Copy" />
                  </li>
                ))}
              </ul>
            ) : <Empty>Every “what’s not working” answer from the audit form lands here: ready-made hooks in your buyers’ words.</Empty>}
          </Card>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>Leak Map coverage</SectionTitle>
          <Card>
            <ul className="flex flex-col gap-2">
              {x.coverage.map((c) => (
                <li key={c.n} className="flex items-center justify-between text-[13px]">
                  <span className={c.drafts ? 'text-white/80' : 'text-white/40'}>{c.n} · {c.name}</span>
                  {c.drafts ? <Badge tone="good">{c.drafts} draft{c.drafts > 1 ? 's' : ''}</Badge> : <Badge tone="muted">gap</Badge>}
                </li>
              ))}
            </ul>
            {gaps.length > 0 && <p className="text-[11px] text-white/40 mt-3">Nothing yet on {gaps.map((g) => g.name).join(', ')}. Worth a post.</p>}
          </Card>

          <SectionTitle>Posts that brought leads</SectionTitle>
          <Card>
            {d.topPosts.length ? (
              <ol className="flex flex-col divide-y divide-white/[0.05] -my-2">
                {d.topPosts.map((p, i) => (
                  <li key={p.id} className="py-3 flex items-start gap-3">
                    <span className="text-lg font-semibold text-white/25 tabular-nums w-5" style={{ fontFamily: 'var(--font-display)' }}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <a href={p.permalink} {...linkProps} className="text-[13px] text-white/85 hover:text-[#F2613F] line-clamp-2">{p.caption || p.permalink}</a>
                      <p className="text-[11px] text-white/40 mt-1">{p.leads} lead{p.leads > 1 ? 's' : ''} · ♥ {p.like_count ?? 0} · {ago(p.timestamp)}</p>
                      {i < 2 && <p className="text-[11px] text-[#ff8a6d] mt-1">Repurpose: carousel + LinkedIn version</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty>Posts with a keyword call to action rank here by the leads they bring.</Empty>}
          </Card>

          <SectionTitle>Hook bank</SectionTitle>
          <Card pad={false}>
            <ul className="divide-y divide-white/[0.05]">
              {x.hooks.map((h) => (
                <li key={h.hook} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div><p className="text-[13px] text-white/85">{h.hook}</p><p className="text-[11px] text-white/35 mt-0.5">{h.note}</p></div>
                  <CopyButton text={h.hook} label="Copy" />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
