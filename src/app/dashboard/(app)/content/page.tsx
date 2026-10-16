import { contentData } from '@/lib/ops/tabs';
import { contentPlus } from '@/lib/ops/more';
import { PageHeader, Errors, Card, Empty, Badge, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, Meter } from '@/components/dashboard/kit';
import { CopyButton } from '@/components/dashboard/client';

export const dynamic = 'force-dynamic';

const KIND = (title: string) => /^leak/i.test(title) ? 'Leak post' : /^hot take/i.test(title) ? 'Hot take' : /^build/i.test(title) ? 'Build in public' : 'Draft';

export default async function Content() {
  const d = await contentData();
  const x = await contentPlus(d.drafts, d.posts);
  const byRun = d.drafts.reduce<Record<string, typeof d.drafts>>((a, r) => ({ ...a, [r.runAt]: [...(a[r.runAt] ?? []), r] }), {});
  const gaps = x.coverage.filter((c) => !c.drafts);

  return (
    <>
      <PageHeader title="Content" sub="What to post today, drafts written from your leads’ own words, and which posts actually bring people in." />
      <Errors errors={[...d.errors, ...x.errors]} />

      {/* This week */}
      <div className="grid lg:grid-cols-[1fr_260px] gap-3 md:gap-4">
        <Card title="This week’s plan" pad={false}>
          <div className="grid grid-cols-7 min-w-0 overflow-x-auto">
            {x.plan.map((p, i) => (
              <div key={p.day} className={`px-3 py-3 border-r border-white/[0.05] last:border-r-0 min-w-[110px] ${i === x.todayIdx ? 'bg-[#F2613F]/[0.08]' : ''}`}>
                <p className={`text-xs font-semibold ${i === x.todayIdx ? 'text-[#ff8a6d]' : 'text-white/45'}`}>{p.day}{i === x.todayIdx ? ' · today' : ''}</p>
                <p className="text-[13px] mt-2 text-white/90">{p.a}</p>
                <p className="text-[11px] text-white/40 mt-1">{p.b}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Posts this week">
          <p className="text-3xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{x.postsThisWeek}<span className="text-base text-white/35">/{x.weeklyTarget}</span></p>
          <div className="mt-3"><Meter value={x.postsThisWeek} max={x.weeklyTarget} /></div>
          <p className="text-[11px] text-white/40 mt-2">Floor: 3 a day (1 buyer, 2 builder). Batch-film and schedule.</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <SectionTitle>Drafts to post</SectionTitle>
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
