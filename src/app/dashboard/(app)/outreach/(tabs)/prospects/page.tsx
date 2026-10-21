import { outreachData } from '@/lib/ops/more';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { STEP_DAYS, STEP_LABEL } from '@/lib/outreach';
import { TabIntro, Errors, Badge, Card, Kpi, Empty, ago, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, untilOrAgo, SectionError, errFor } from '@/components/dashboard/kit';
import { Funnel } from '@/components/dashboard/charts';
import { setProspect, markDmSent, setOutreachSending, refreshProspectSearches, bumpRepCount, markWarmed } from '@/app/dashboard/actions';
import { SearchForm, DraftEditor, CopyText } from '@/app/dashboard/(app)/outreach/OutreachClient';

export const dynamic = 'force-dynamic';

const FIT_TONE = (f: number) => (f >= 6 ? 'good' : f >= 4 ? 'accent' : 'muted') as 'good' | 'accent' | 'muted';

export default async function OutreachProspects() {
  const d = await outreachData();
  const q = d.queue;
  const inFlight = [...q.scheduled, ...q.active];
  const goodOnes = q.review.filter((p) => p.fit >= 5).map((p) => p.id);

  return (
    <>
      <TabIntro sub="Find firms, approve the good ones, and review Claude’s drafts before anything is scheduled." />
      <Errors errors={d.errors} />
      {/* Find */}
      <SectionTitle action={<ActionForm action={refreshProspectSearches}><button className="text-xs text-white/45 hover:text-white">Refresh searches ↻</button></ActionForm>}>Find prospects</SectionTitle>
      {!d.connected.apify ? <ConnectCard title="Connect Apify" why="Searches Google Maps for firms with a website, email and Instagram." steps={['Apify → Settings → Integrations → API token']} env="APIFY_TOKEN" /> : (
        <Card>
          <SearchForm />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/45">
            <span>About $0.007 per firm · this month ${d.spent.toFixed(2)} of ${d.settings.monthlyCapUsd} cap</span>
            <span>Skips stores, stagers and trades, and anyone already in HubSpot.</span>
          </div>
          {d.searches.length > 0 && (
            <ul className="mt-4 flex flex-col divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {d.searches.map((s) => (
                <li key={s.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <span>{s.term} · {s.location}</span>
                  <span className="flex items-center gap-2 text-xs text-white/45">
                    {s.status === 'SUCCEEDED' ? `${s.added ?? 0} new of ${s.found ?? 0} found` : s.status === 'RUNNING' || s.status === 'READY' ? 'Searching…' : s.status.toLowerCase()}
                    {s.costUsd !== undefined && <span>· ${s.costUsd.toFixed(2)}</span>}
                    <span>· {ago(s.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Review */}
      <SectionTitle action={goodOnes.length ? (
        <ActionForm action={setProspect}><input type="hidden" name="ids" value={goodOnes.join(',')} /><input type="hidden" name="status" value="approved" />
          <button className="text-xs text-[#ff8a6d] hover:text-white">Approve all {goodOnes.length} strong fits (5+)</button></ActionForm>
      ) : undefined}>To review · {q.review.length}</SectionTitle>
      <Card pad={false}>
        {q.review.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead><tr className="text-left text-xs text-white/35"><th className="font-normal px-5 py-3">Firm</th><th className="font-normal px-3 py-3">Fit</th><th className="font-normal px-3 py-3">Why</th><th className="font-normal px-3 py-3">Links</th><th className="px-5 py-3" /></tr></thead>
              <tbody>
                {q.review.map((p) => (
                  <tr key={p.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-5 py-3"><p className="font-medium">{p.firm}</p><p className="text-xs text-white/40">{[p.city, p.state].filter(Boolean).join(', ')}{p.rating ? ` · ${p.rating}★ (${p.reviews})` : ''}</p></td>
                    <td className="px-3 py-3"><Badge tone={FIT_TONE(p.fit)}>{p.fit}/7</Badge></td>
                    <td className="px-3 py-3 text-xs text-white/55 max-w-[260px]">{p.fitWhy.join(' · ')}</td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex gap-3">
                        {p.website && <a href={p.website} {...linkProps} className="text-white/60 hover:text-white">Site ↗</a>}
                        {p.instagram && <a href={`https://instagram.com/${p.instagram}`} {...linkProps} className="text-white/60 hover:text-white">IG ↗</a>}
                        {p.mapsUrl && <a href={p.mapsUrl} {...linkProps} className="text-white/60 hover:text-white">Maps ↗</a>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="approved" /><button className="rounded-full bg-white text-black text-xs font-medium px-3 py-1.5">Approve</button></ActionForm>
                        <ActionForm action={setProspect}><input type="hidden" name="ids" value={p.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-full border border-white/15 text-xs px-3 py-1.5 text-white/60 hover:text-white">Skip</button></ActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Nothing to review. Run a search above.</Empty>}
      </Card>
      {q.approved.length > 0 && <p className="text-xs text-white/40 -mt-2">{q.approved.length} approved and waiting for drafts. The 13:00 routine researches each firm and writes the emails and DM; they appear below.</p>}

      {/* Drafts */}
      <SectionTitle>Drafts to approve · {q.drafted.length}</SectionTitle>
      {q.drafted.length ? <div className="flex flex-col gap-3">{q.drafted.map((p) => <DraftEditor key={p.id} p={p} />)}</div>
        : <Card><Empty>No drafts waiting. Approve firms above and drafts arrive after the next daily run.</Empty></Card>}

    </>
  );
}
