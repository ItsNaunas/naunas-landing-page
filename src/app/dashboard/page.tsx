import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASH_COOKIE, validSession } from '@/lib/dashAuth';
import { dashboardData, SOURCE_LABEL, type RoutineReport } from '@/lib/dashboard';
import { runChecks } from '@/lib/health';
import { storeReady } from '@/lib/store';
import { hubspotUrl } from '@/lib/hubspot';
import { FUNNEL } from '@/config/funnel';
import { logout, toggleCampaign, deleteCampaign } from './actions';
import { CampaignForm } from './CampaignForm';

// Naunas Ops: the acquisition + automation half of the business, live. (Delivery, invoices and capacity
// live in the vault cockpit, linked at the top.) Read-only except the campaign editor.

export const dynamic = 'force-dynamic';

const gbp = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
const when = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FUNNEL.ownerTz }).format(new Date(iso));

function Panel({ title, children, className = '', aside }: { title: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={`p-5 md:p-6 flex flex-col gap-4 min-w-0 ${className}`} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-[#F2613F]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-white/45">{label}</span>
      <span className="text-2xl md:text-3xl font-bold leading-none" style={{ fontFamily: 'var(--font-display)' }}>{value}</span>
      {sub && <span className="text-xs text-white/45">{sub}</span>}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-white/40">{children}</p>;

export default async function Dashboard() {
  if (!(await validSession((await cookies()).get(DASH_COOKIE)?.value))) redirect('/dashboard/login');
  const [data, checks] = await Promise.all([dashboardData(), runChecks()]);
  const red = checks.filter((c) => !c.ok);
  const lastRun: RoutineReport | undefined = data.reports[0];
  const stale = !lastRun || Date.now() - Date.parse(lastRun.runAt) > 26 * 3600_000;
  const content = data.reports.flatMap((r) => r.items.filter((i) => i.job === 'content').map((i) => ({ ...i, runAt: r.runAt }))).slice(0, 6);
  const pct = Math.min(100, Math.round((data.goal.wonMonth / data.goal.target) * 100));

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div>
          <p className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Naunas<span className="text-[#F2613F]">.</span> Ops
          </p>
          <p className="text-xs text-white/40">Live from HubSpot, MailerLite, Instagram and the routine · {when(new Date().toISOString())}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a href={FUNNEL.cockpitUrl} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">Vault cockpit ↗</a>
          <form action={logout}><button className="text-white/40 hover:text-white">Sign out</button></form>
        </div>
      </header>

      {data.errors.length > 0 && (
        <div className="p-4 text-sm text-white/70" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
          Some numbers couldn’t load: {data.errors.join(' · ')}
        </div>
      )}

      {red.length > 0 && (
        <div className="p-4 text-sm" style={{ background: 'rgba(242,97,63,0.1)', border: '1px solid rgba(242,97,63,0.4)' }} role="alert">
          <b className="text-[#F2613F]">{red.length} system problem{red.length > 1 ? 's' : ''}:</b>{' '}
          {red.map((c) => `${c.name} (${c.detail ?? 'failed'})`).join(' · ')}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Today">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="New leads (24h)" value={data.today.leads24} />
            <Stat label="Deposits (7 days)" value={gbp(data.today.deposits7.value)} sub={`${data.today.deposits7.count} paid`} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-white/45">Calls booked, not yet held</span>
            {data.today.auditBooked.length ? data.today.auditBooked.map((d) => (
              <a key={d.id} href={hubspotUrl.deal(d.id)} target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-[#F2613F] truncate">{d.name} →</a>
            )) : <Empty>None right now.</Empty>}
          </div>
        </Panel>

        <Panel title="This week">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Leads" value={data.week.leads} />
            <Stat label="Won" value={data.week.won} />
            <Stat label="Lost" value={data.week.lost} />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.week.bySource.length ? data.week.bySource.map(([k, n]) => (
              <span key={k} className="text-xs px-2.5 py-1 rounded-full text-white/70" style={{ background: 'rgba(255,255,255,0.06)' }}>{SOURCE_LABEL[k] ?? k} · {n}</span>
            )) : <Empty>No leads yet this week. Attention is the bottleneck: post, DM, push the Leak Map.</Empty>}
          </div>
          {data.week.lost > 0 && (
            <p className="text-xs text-white/45">Lost because: {Object.entries(data.week.lostWhy).map(([k, n]) => `${k} ${n}`).join(', ')}</p>
          )}
        </Panel>

        <Panel title={`Goal · ${gbp(data.goal.target)} / month`}>
          <Stat label="Won this month" value={gbp(data.goal.wonMonth)} sub={data.goal.gap ? `${gbp(data.goal.gap)} to go` : 'Target hit 🎉'} />
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full bg-[#F2613F]" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/45">
            Open pipeline {gbp(data.goal.openValue)}
            {data.goal.coverage !== null && <> · {data.goal.coverage.toFixed(1)}× the gap (aim for {data.goal.coverageTarget}×{data.goal.coverage < data.goal.coverageTarget ? ': need more deals in play' : ''})</>}
          </p>
        </Panel>
      </div>

      <Panel title="Pipeline now" aside={<a href={hubspotUrl.contacts().replace('/objects/0-1/', '/objects/0-3/')} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white">HubSpot ↗</a>}>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {data.pipeline.map((st) => (
            <div key={st.id} className="flex flex-col gap-2 min-w-0">
              <span className="text-xs text-white/45">{st.label} · {st.total}</span>
              {st.deals.slice(0, 6).map((d) => (
                <a key={d.id} href={hubspotUrl.deal(d.id)} target="_blank" rel="noopener noreferrer" className="text-sm p-2 truncate hover:border-[#F2613F]" style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {d.name}{d.amount ? <span className="text-white/40"> · {gbp(d.amount)}</span> : null}
                </a>
              ))}
              {st.total > 6 && <span className="text-xs text-white/40">+{st.total - 6} more</span>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Comment & DM campaigns" aside={!storeReady() && <span className="text-xs text-[#F2613F]">Connect the Blob store to edit</span>}>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-white/45">
                <th className="font-normal p-2">Campaign</th><th className="font-normal p-2">Keywords</th><th className="font-normal p-2">Where</th>
                <th className="font-normal p-2 text-right">Triggers</th><th className="font-normal p-2 text-right">DMs</th><th className="font-normal p-2 text-right">Clicks</th>
                <th className="font-normal p-2 text-right">Leads</th><th className="font-normal p-2 text-right">With deal</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c.id} className="border-t border-white/5 align-top">
                  <td className="p-2">
                    <span className={c.active ? 'text-white' : 'text-white/40'}>{c.name}</span>
                    <span className="block text-xs text-white/35">{c.postIds.length ? `${c.postIds.length} post${c.postIds.length > 1 ? 's' : ''}` : 'all posts'}{c.endsAt ? ` · ends ${c.endsAt.slice(0, 10)}` : ''}</span>
                  </td>
                  <td className="p-2 text-white/70">{c.keywords.join(', ')}</td>
                  <td className="p-2 text-white/50">{c.channel === 'both' ? 'comments + DMs' : c.channel === 'dm' ? 'DMs' : 'comments'}</td>
                  <td className="p-2 text-right">{c.stats.comments}</td>
                  <td className="p-2 text-right">{c.stats.dms}</td>
                  <td className="p-2 text-right">{c.stats.clicks}</td>
                  <td className="p-2 text-right">{c.stats.leads}</td>
                  <td className="p-2 text-right">{c.stats.deals}</td>
                  <td className="p-2">
                    <div className="flex gap-3 justify-end text-xs">
                      <form action={toggleCampaign}><input type="hidden" name="id" value={c.id} /><button disabled={!storeReady()} className="text-white/50 hover:text-white disabled:opacity-30">{c.active ? 'Pause' : 'Go live'}</button></form>
                      {c.id !== 'leak-map' && <form action={deleteCampaign}><input type="hidden" name="id" value={c.id} /><button disabled={!storeReady()} className="text-white/30 hover:text-[#F2613F] disabled:opacity-30">Delete</button></form>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="group">
          <summary className="cursor-pointer text-sm text-[#F2613F] select-none">+ New campaign</summary>
          <div className="pt-4"><CampaignForm site={FUNNEL.site} /></div>
        </details>
        {data.campaigns.map((c) => (
          <details key={c.id}>
            <summary className="cursor-pointer text-xs text-white/40 hover:text-white select-none">Edit “{c.name}”</summary>
            <div className="pt-4"><CampaignForm campaign={c} site={FUNNEL.site} /></div>
          </details>
        ))}
        <p className="text-xs text-white/35">
          Triggers = comments/DMs that matched. Leads and “with deal” come from HubSpot (people tagged with the campaign). A post ID is the number at the end of the post’s link in Meta, or ask Claude for it.
        </p>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Content">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/45">Posts that brought leads</span>
            {data.topPosts.length ? data.topPosts.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-[#F2613F] truncate">{p.leads} lead{p.leads > 1 ? 's' : ''} · {p.url.replace('https://www.instagram.com/', '')}</a>
            )) : <Empty>No keyword comments yet. Every post with a “comment LEAK” call to action shows up here.</Empty>}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-white/45">Drafts from the routine (Mondays)</span>
            {content.length ? content.map((i, n) => (
              <details key={n} className="text-sm">
                <summary className="cursor-pointer text-white/80">{i.title}</summary>
                {i.detail && <p className="whitespace-pre-wrap text-white/60 pt-2">{i.detail}</p>}
              </details>
            )) : <Empty>The first drafts arrive with Monday’s run.</Empty>}
          </div>
        </Panel>

        <Panel title="Routine · funnel operator" aside={<a href="https://claude.ai/code/routines/trig_01N9LKgkPiRCBtzTgJuWeQCX" target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white">Open ↗</a>}>
          {stale && <p className="text-sm text-[#F2613F]">{lastRun ? 'No report in the last 26 hours: check the routine.' : 'No reports yet. The routine reports here after its next run (13:00 Zanzibar).'}</p>}
          {lastRun && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {(['replies', 'calls', 'proposals', 'retention', 'content'] as const).map((k) => (
                  <span key={k} className="px-2.5 py-1 rounded-full text-white/70" style={{ background: 'rgba(255,255,255,0.06)' }}>{k} · {lastRun.counts[k] ?? 0}</span>
                ))}
              </div>
              {lastRun.needsYou.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-white/45">Needs you</span>
                  {lastRun.needsYou.map((n, i) => <p key={i} className="text-sm">• {n}</p>)}
                </div>
              )}
            </>
          )}
          <div className="flex flex-col gap-1">
            {data.reports.map((r) => (
              <details key={r.runAt} className="text-sm">
                <summary className="cursor-pointer text-white/60">{when(r.runAt)} · {r.items.length} item{r.items.length === 1 ? '' : 's'}</summary>
                <ul className="pt-2 flex flex-col gap-1">
                  {r.items.map((i, n) => (
                    <li key={n} className="text-white/70">
                      <span className="text-white/35 text-xs uppercase mr-2">{i.job}</span>
                      {i.link ? <a href={i.link} target="_blank" rel="noopener noreferrer" className="hover:text-[#F2613F]">{i.title} ↗</a> : i.title}
                    </li>
                  ))}
                  {!r.items.length && <li className="text-white/40">Nothing needed doing.</li>}
                </ul>
              </details>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="System health">
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {checks.map((c) => (
            <div key={c.name} className="text-sm flex gap-2 min-w-0">
              <span className={c.ok ? 'text-emerald-400' : 'text-[#F2613F]'}>{c.ok ? '●' : '✕'}</span>
              <span className="min-w-0"><span className="text-white/80">{c.name}</span>{c.detail && <span className="block text-xs text-white/40 break-words">{c.detail}</span>}</span>
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}
