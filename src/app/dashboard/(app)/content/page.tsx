import { contentData } from '@/lib/ops/tabs';
import { PageHeader, Errors, Card, Empty, Badge, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle } from '@/components/dashboard/kit';
import { CopyButton } from '@/components/dashboard/client';

export const dynamic = 'force-dynamic';

const KIND = (title: string) => /^leak/i.test(title) ? 'Leak post' : /^hot take/i.test(title) ? 'Hot take' : /^build/i.test(title) ? 'Build in public' : 'Draft';

export default async function Content() {
  const d = await contentData();
  const byRun = d.drafts.reduce<Record<string, typeof d.drafts>>((a, x) => ({ ...a, [x.runAt]: [...(a[x.runAt] ?? []), x] }), {});

  return (
    <>
      <PageHeader title="Content" sub="Drafts the routine writes every Monday from your leads’ own words, and the posts that actually bring people in." />
      <Errors errors={d.errors} />

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
                      <Badge tone="accent">{KIND(dr.title)}</Badge>
                      <p className="text-[15px] font-medium mt-2">{dr.title.replace(/^(leak post|hot take|build)[:\s]*/i, '')}</p>
                    </div>
                    {dr.detail && <CopyButton text={dr.detail} />}
                  </div>
                  {dr.detail && <p className="mt-3 text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">{dr.detail}</p>}
                </Card>
              ))}
            </div>
          )) : <Card><Empty>The first three drafts arrive with Monday’s run: a Leak post, a hot take and a build-in-public post, each with its comment keyword.</Empty></Card>}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
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
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty>Posts with a keyword call to action rank here by the leads they bring.</Empty>}
          </Card>
          <Card title="Hooks that work for you">
            <ul className="flex flex-col gap-2 text-[13px] text-white/70">
              <li>“I cancelled X on purpose.”</li>
              <li>“A lead goes cold in 48 hours, and your follow-up is you remembering.”</li>
              <li>“6 moments deals die.”</li>
              <li>“There’s revenue sitting in your CRM you forgot about.”</li>
            </ul>
            <p className="text-[11px] text-white/30 mt-3">From your vault hook bank. Specific beats generic every time.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
