import { leadsData, personData } from '@/lib/ops/tabs';
import { SOURCE_LABEL, STAGE_LABEL, OPEN_STAGES } from '@/lib/ops/common';
import { hubspotUrl } from '@/lib/hubspot';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Card, Badge, Empty, Errors, gbp, ago, linkProps } from '@/components/dashboard/ui';
import { Chips, Drawer, Field, when, SectionError, errFor } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

type SP = Promise<{ q?: string; source?: string; stage?: string; range?: string; person?: string; view?: string }>;
const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['0', 'All time']] as const;
const PRIORITY: Record<string, { label: string; tone: 'neutral' | 'muted' }> = {
  high: { label: '★ High value', tone: 'neutral' }, normal: { label: 'Normal', tone: 'muted' }, small: { label: 'Small', tone: 'muted' },
};
// Imported LinkedIn connections are people you know, not enquiries: hidden by default, one click away (Network).
const NETWORK = 'linkedin';
const VIEWS = [['', 'Enquiries'], ['network', 'Network (LinkedIn)'], ['all', 'Everyone']] as const;
const TL_ICON: Record<string, string> = { note: '✎', booking: '◷', payment: '£', created: '✦', email: '✉' };

export default async function Leads({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const range = sp.range ?? '30';
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ q: sp.q, view: sp.view, source: sp.source, stage: sp.stage, range, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/dashboard/leads${p.size ? `?${p}` : ''}`;
  };
  const [list, detail] = await Promise.all([
    leadsData({ q: sp.q, source: sp.source, stage: sp.stage, range: Number(range) }),
    sp.person ? personData(sp.person) : Promise.resolve(null),
  ]);
  const p = detail?.person;
  // A search or a chosen source shows everything that matches; otherwise the view decides.
  const view = sp.q || sp.source ? 'all' : sp.view ?? '';
  const rows = view === 'all' ? list.rows : list.rows.filter((r) => (view === 'network' ? r.source === NETWORK : r.source !== NETWORK));
  const networkCount = list.rows.filter((r) => r.source === NETWORK).length;
  // Columns that are empty for every row are dropped rather than shown as a wall of dashes.
  const show = { priority: rows.some((r) => PRIORITY[r.priority]), stage: rows.some((r) => r.stage), value: rows.some((r) => r.clientValue) };
  const moreFilters = !!(sp.source || sp.stage);

  return (
    <>
      <PageHeader title="Leads" sub={sp.q ? `Results for “${sp.q}”` : 'Everyone who has come into the funnel. Click a person for their full story across every tool.'} />
      <Errors errors={list.errors} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {!sp.q && !sp.source && <Chips active={qs({})} items={VIEWS.map(([v, l]) => ({ label: l, href: qs({ view: v || undefined }), count: v === 'network' ? networkCount : v === 'all' ? list.rows.length : list.rows.length - networkCount }))} />}
          {!sp.q && <Chips active={qs({})} items={RANGES.map(([v, l]) => ({ label: l, href: qs({ range: v }) }))} />}
        </div>
        <details open={moreFilters} className="group">
          <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-xs text-white/65 hover:text-white">
            <span className="group-open:rotate-90 transition-transform" aria-hidden>›</span> More filters: source and stage{moreFilters ? ' (on)' : ''}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Chips active={qs({})} items={[
              { label: 'All sources', href: qs({ source: undefined }) },
              ...Object.entries(list.sources).sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ label: SOURCE_LABEL[s] ?? s, href: qs({ source: s }), count: n })),
            ]} />
            <Chips active={qs({})} items={[
              { label: 'Any stage', href: qs({ stage: undefined }) },
              { label: 'No deal yet', href: qs({ stage: 'none' }) },
              ...OPEN_STAGES.map(([id, l]) => ({ label: l, href: qs({ stage: id }) })),
              { label: 'Won', href: qs({ stage: '6213348572' }) },
            ]} />
          </div>
        </details>
      </div>

      <SectionError errors={errFor(list.errors, 'Leads', 'Deals')} />
      <Card pad={false}>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-white/60 border-b border-white/[0.05]">
                  <th className="font-normal px-5 py-3">Person</th><th className="font-normal px-3 py-3">Source</th>
                  {show.priority && <th className="font-normal px-3 py-3">Priority</th>}
                  {show.stage && <th className="font-normal px-3 py-3">Stage</th>}
                  {show.value && <th className="font-normal px-3 py-3">Client value</th>}
                  <th className="font-normal px-3 py-3 text-right">Came in</th><th className="font-normal px-5 py-3 text-right">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  // A handle-only lead is named "@handle" already; don't repeat it underneath.
                  const sub = r.business || r.email || (r.ig && !r.name.startsWith('@') ? `@${r.ig}` : '');
                  return (
                  <tr key={r.id} className={`border-t border-white/[0.04] hover:bg-white/[0.025] ${sp.person === r.id ? 'bg-white/[0.04]' : ''}`}>
                    <td className="px-5 py-3">
                      <a href={`/dashboard/leads/${r.id}`} className="block group">
                        <span className="font-medium group-hover:text-[#ff8a6d]">{r.name}</span>
                        {sub && <span className="block text-xs text-white/60 truncate max-w-[260px]">{sub}</span>}
                      </a>
                    </td>
                    <td className="px-3 py-3"><Badge>{SOURCE_LABEL[r.source] ?? r.source}</Badge></td>
                    {show.priority && <td className="px-3 py-3">{PRIORITY[r.priority] ? <Badge tone={PRIORITY[r.priority].tone}>{PRIORITY[r.priority].label}</Badge> : null}</td>}
                    {show.stage && <td className="px-3 py-3">{r.stage ? <span className={r.stage === '6213348572' ? 'text-emerald-300' : 'text-white/80'}>{STAGE_LABEL[r.stage] ?? ''}{r.amount ? <span className="text-white/60"> · {gbp(r.amount)}</span> : null}</span> : <span className="text-white/55">No deal</span>}</td>}
                    {show.value && <td className="px-3 py-3 text-white/70">{r.clientValue}</td>}
                    <td className="px-3 py-3 text-right text-white/65 tabular-nums whitespace-nowrap">{ago(r.createdAt)}</td>
                    <td className="px-5 py-3 text-right text-white/65 tabular-nums whitespace-nowrap">{ago(r.lastActivity)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty>{sp.q ? 'Nobody matches that search.' : view === 'network' ? 'No LinkedIn connections imported in this range.' : 'No enquiries in this range yet. Try a longer range, or Everyone.'}</Empty>}
        <p className="px-5 py-3 text-xs text-white/60 border-t border-white/[0.04]">Showing {rows.length} of {list.total}{view === '' && networkCount ? ` · ${networkCount} LinkedIn connections under Network` : ''}. Test sign-ups (its.naunas+…) are hidden unless you search for them.</p>
      </Card>

      {p && (
        <Drawer
          closeHref={qs({ person: undefined })}
          title={
            <div>
              <p className="text-lg font-semibold truncate">{p.name}</p>
              <p className="text-xs text-white/60 truncate">{[p.business, p.email, p.ig && `@${p.ig}`].filter(Boolean).join(' · ')}</p>
            </div>
          }
          footer={
            <div className="flex flex-wrap gap-2">
              <a href={`/dashboard/leads/${p.id}`} className="rounded-full bg-[#F2613F] text-[#0C0C0C] text-sm font-semibold px-4 py-2">Open full profile</a>
              <a href={hubspotUrl.contact(p.id)} {...linkProps} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">HubSpot ↗</a>
              {p.email && <a href={`mailto:${p.email}`} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">Email</a>}
              {p.ig && <a href={`https://instagram.com/${p.ig}`} {...linkProps} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">Instagram</a>}
              {p.email && <a href={`https://cal.com/${FUNNEL.cal.link}?email=${encodeURIComponent(p.email)}&name=${encodeURIComponent(p.name)}`} {...linkProps} className="rounded-full border border-white/15 text-sm px-4 py-2 hover:border-white/30">Booking link</a>}
            </div>
          }
        >
          <SectionError errors={detail?.errors ?? []} />
          <div className="flex flex-wrap gap-1.5">
            {p.priority && PRIORITY[p.priority] && <Badge tone={PRIORITY[p.priority].tone}>{PRIORITY[p.priority].label}</Badge>}
            {p.source && <Badge>{SOURCE_LABEL[p.source] ?? p.source}</Badge>}
            {p.deal && <Badge tone={p.deal.stage === '6213348572' ? 'good' : 'neutral'}>{STAGE_LABEL[p.deal.stage] ?? 'Deal'}{p.deal.amount ? ` · ${gbp(p.deal.amount)}` : ''}</Badge>}
            {p.email_status && <Badge tone="muted">Email: {p.email_status.status}</Badge>}
          </div>

          {p.notWorking && (
            <blockquote className="rounded-xl bg-white/[0.03] border-l-2 border-[#F2613F] px-4 py-3 text-sm text-white/80 whitespace-pre-wrap">
              <span className="block text-[11px] text-white/60 mb-1">In their words</span>{p.notWorking}
            </blockquote>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field label="Client value">{p.clientValue}</Field>
            <Field label="Monthly revenue">{p.revenue}</Field>
            <Field label="Website">{p.website && <a href={/^https?:/.test(p.website) ? p.website : `https://${p.website}`} {...linkProps} className="hover:text-[#F2613F]">{p.website} ↗</a>}</Field>
            <Field label="First touch">{p.firstTouch}</Field>
            <Field label="Instagram campaign">{p.campaign}</Field>
            <Field label="Came from post">{p.post && <a href={p.post} {...linkProps} className="hover:text-[#F2613F]">Open post ↗</a>}</Field>
            <Field label="Email sequences">{p.email_status ? `${p.email_status.groups.join(', ') || 'none'} · ${p.email_status.opens} opens · ${p.email_status.clicks} clicks` : ''}</Field>
            <Field label="Deal">{p.deal && <a href={hubspotUrl.deal(p.deal.id)} {...linkProps} className="hover:text-[#F2613F]">{p.deal.name} ↗</a>}</Field>
          </dl>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/60 mb-3">Timeline</p>
            {p.timeline.length ? (
              <ol className="relative border-l border-white/10 ml-3.5 flex flex-col gap-5">
                {p.timeline.map((t, i) => (
                  <li key={i} className="pl-6 relative">
                    <span className="absolute -left-3.5 top-0 size-7 rounded-lg bg-[#1b1b1b] border border-white/10 grid place-items-center text-[12px] text-white/60" aria-hidden>{TL_ICON[t.kind] ?? '•'}</span>
                    <p className="text-[13px] text-white/90">{t.title}</p>
                    <p className="text-[11px] text-white/55">{when(t.at)}</p>
                    {t.body && t.body !== t.title && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-xs text-white/60 hover:text-white">Show note</summary>
                        <p className="mt-2 text-[13px] text-white/70 whitespace-pre-wrap rounded-lg bg-white/[0.03] p-3">{t.body}</p>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-white/60">No history yet.</p>}
          </div>
        </Drawer>
      )}
    </>
  );
}
