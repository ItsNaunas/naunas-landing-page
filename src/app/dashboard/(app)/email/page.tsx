import { emailData } from '@/lib/ops/tabs';
import { PageHeader, Errors, Badge, Card, Kpi, Empty, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, Meter, pct } from '@/components/dashboard/kit';

export const dynamic = 'force-dynamic';

const LABEL: Record<string, { title: string; what: string }> = {
  'map leak': { title: 'Leak Map course', what: 'Starts when someone takes the Leak Map. Finishers move to the newsletter.' },
  'Audit enquiry: booking nudge': { title: 'Booking nudge', what: 'Qualified audit enquiries who haven’t booked yet. Booking stops it.' },
  'Newsletter: welcome': { title: 'Newsletter welcome', what: 'Everyone who joins the newsletter.' },
};

export default async function Email() {
  const d = await emailData();
  const list = d.groups.find((g) => g.name === 'Naunas Newsletter');
  const inSequences = d.automations.reduce((s, a) => s + a.inQueue, 0);
  const sent = d.automations.reduce((s, a) => s + a.sent, 0);

  return (
    <>
      <PageHeader title="Email" sub="Your three MailerLite sequences, how each email performs, and who’s in them now."
        action={<a href="https://dashboard.mailerlite.com/automations" {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Open MailerLite ↗</a>} />
      <Errors errors={d.errors} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Newsletter readers" value={list?.active ?? '—'} foot={list ? <span className="text-xs text-white/40">{pct(list.openRate)} open rate</span> : undefined} />
        <Kpi label="In a sequence now" value={inSequences} foot={<span className="text-xs text-white/40">waiting for their next email</span>} />
        <Kpi label="Sequence emails sent" value={sent} />
        <Kpi label="Sequences running" value={`${d.automations.filter((a) => a.enabled).length}/3`} foot={<span className="text-xs text-white/40">MailerLite free allows 3</span>} />
      </div>

      {d.automations.map((a) => {
        const meta = LABEL[a.name] ?? { title: a.name, what: '' };
        const top = Math.max(1, ...a.emails.map((e) => e.sent));
        return (
          <div key={a.id} className="flex flex-col gap-3">
            <SectionTitle action={<Badge tone={a.enabled ? 'good' : 'bad'}>{a.enabled ? 'Running' : 'Off'}</Badge>}>{meta.title}</SectionTitle>
            <Card pad={false}>
              <div className="px-5 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-5 gap-4 border-b border-white/[0.05]">
                <p className="col-span-2 sm:col-span-1 text-xs text-white/45 leading-relaxed">{meta.what}</p>
                {[['In it now', a.inQueue], ['Finished', a.completed], ['Open rate', pct(a.openRate)], ['Click rate', pct(a.clickRate)]].map(([l, v]) => (
                  <div key={l as string}><p className="text-[11px] text-white/40">{l}</p><p className="text-lg font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{v}</p></div>
                ))}
              </div>
              {a.emails.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] min-w-[620px]">
                    <thead><tr className="text-left text-xs text-white/35"><th className="font-normal px-5 py-2 w-8">#</th><th className="font-normal px-3 py-2">Email</th><th className="font-normal px-3 py-2 w-40">Reached</th><th className="font-normal px-3 py-2 text-right">Opened</th><th className="font-normal px-5 py-2 text-right">Clicked</th></tr></thead>
                    <tbody>
                      {a.emails.map((e, i) => (
                        <tr key={i} className="border-t border-white/[0.04]">
                          <td className="px-5 py-2.5 text-white/35 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-2.5">{e.subject}</td>
                          <td className="px-3 py-2.5"><div className="flex items-center gap-2"><Meter value={e.sent} max={top} /><span className="tabular-nums text-white/60 w-8 text-right">{e.sent}</span></div></td>
                          <td className={`px-3 py-2.5 text-right tabular-nums ${e.sent && e.openRate < 0.3 ? 'text-rose-300' : ''}`}>{e.sent ? pct(e.openRate) : '—'}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{e.sent ? pct(e.clickRate) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>No emails in this sequence.</Empty>}
            </Card>
          </div>
        );
      })}

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <Card title="Groups (who is where)" pad={false}>
          <table className="w-full text-[13px]">
            <tbody>
              {d.groups.map((g) => (
                <tr key={g.name} className="border-t border-white/[0.04] first:border-t-0">
                  <td className="px-5 py-2.5">{g.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{g.active}</td>
                  <td className="px-5 py-2.5 text-right text-xs text-white/40">{pct(g.openRate)} open · {g.unsubs} unsub</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Other automations">
          {d.otherAutomations.length ? (
            <ul className="flex flex-col gap-2 text-[13px]">
              {d.otherAutomations.map((a) => <li key={a.id} className="flex justify-between"><span className="text-white/70">{a.name}</span><Badge tone={a.enabled ? 'accent' : 'muted'}>{a.enabled ? 'On (uses a slot)' : 'Off'}</Badge></li>)}
            </ul>
          ) : <Empty>None.</Empty>}
          <p className="text-[11px] text-white/30 mt-4">One-off emails (pre-call, no-show, onboarding) are sent by the site from contact@, not MailerLite.</p>
        </Card>
      </div>
    </>
  );
}
