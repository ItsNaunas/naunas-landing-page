import { callsData } from '@/lib/ops/tabs';
import { hubspotUrl } from '@/lib/hubspot';
import { FUNNEL } from '@/config/funnel';
import { PageHeader, Errors, Badge, Card, Kpi, Empty, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, when, untilOrAgo } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

const tzName = (tz?: string) => tz?.split('/').pop()?.replace(/_/g, ' ') ?? '';

export default async function Calls() {
  const d = await callsData();

  if (!d.connected) {
    return (
      <>
        <PageHeader title="Calls" sub="Your free audits: what’s coming up, who showed, and what came of it." />
        <Errors errors={d.errors} />
        <ConnectCard
          title="Connect Cal.com to see your calls"
          why="Call times in your time zone and theirs, show-up rate, no-shows and links straight to each person."
          steps={['Cal.com → Settings → Developer → API keys → New', 'Name it “Naunas dashboard”, no expiry, then copy the key']}
          env="CAL_API_KEY"
        />
        <SectionTitle>Booked right now (from HubSpot)</SectionTitle>
        <Card>
          {d.booked.length ? (
            <ul className="divide-y divide-white/[0.05] -my-2">
              {d.booked.map((b) => <li key={b.id} className="py-2.5"><a href={hubspotUrl.deal(b.id)} {...linkProps} className="text-sm hover:text-[#F2613F]">{b.name} ↗</a></li>)}
            </ul>
          ) : <Empty>No deals in Audit booked.</Empty>}
        </Card>
      </>
    );
  }

  const s = d.stats;
  return (
    <>
      <PageHeader title="Calls" sub="Your free audits: what’s coming up, who showed, and what came of it."
        action={<a href={`https://app.cal.com/bookings/upcoming`} {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Open Cal.com ↗</a>} />
      <Errors errors={d.errors} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Coming up" value={s.upcoming} />
        <Kpi label="Show-up rate · 90 days" value={s.showRate === null ? '—' : `${s.showRate}%`} foot={<span className="text-xs text-white/40">{s.held} held</span>} />
        <Kpi label="No-shows · 90 days" value={s.noShows} foot={<span className="text-xs text-white/40">each got the rebook email</span>} />
        <Kpi label="Cancelled · 90 days" value={s.cancelled} />
      </div>

      <SectionTitle>Coming up</SectionTitle>
      <Card pad={false}>
        {d.upcoming.length ? (
          <ul className="divide-y divide-white/[0.05]">
            {d.upcoming.map((b) => {
              const a = b.attendees[0];
              return (
                <li key={b.uid} className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="w-[150px] shrink-0">
                    <p className="text-sm font-medium">{when(b.start)}</p>
                    <p className="text-xs text-white/40">{untilOrAgo(b.start)} · your time</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{a?.name ?? b.title}</p>
                    <p className="text-xs text-white/40">{a?.timeZone ? `${when(b.start, a.timeZone, false)} for them · ${tzName(a.timeZone)}` : a?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {a?.email && <a href={`/dashboard/leads?q=${encodeURIComponent(a.email)}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:border-white/25">Brief & history</a>}
                    {b.meetingUrl && <a href={b.meetingUrl} {...linkProps} className="rounded-full bg-white text-black px-3 py-1.5 text-xs font-medium">Join</a>}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <Empty>No calls booked. Share {FUNNEL.site.replace('https://', '')}/audit or comment AUDIT campaigns to fill this.</Empty>}
      </Card>

      <SectionTitle>Recent calls</SectionTitle>
      <Card pad={false}>
        {d.past.length ? (
          <table className="w-full text-[13px]">
            <tbody>
              {d.past.map((b) => {
                const a = b.attendees[0];
                return (
                  <tr key={b.uid} className="border-t border-white/[0.04] first:border-t-0">
                    <td className="px-5 py-3 whitespace-nowrap text-white/50">{when(b.start)}</td>
                    <td className="px-3 py-3">{a?.email ? <a href={`/dashboard/leads?q=${encodeURIComponent(a.email)}`} className="hover:text-[#F2613F]">{a.name}</a> : a?.name}</td>
                    <td className="px-5 py-3 text-right">{a?.absent ? <Badge tone="bad">No-show</Badge> : <Badge tone="good">Held</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <Empty>No past calls yet.</Empty>}
      </Card>
    </>
  );
}
