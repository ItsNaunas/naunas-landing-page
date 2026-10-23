import Link from 'next/link';
import { clientsData, STEPS, type Client } from '@/lib/clients';
import { PageHeader, Errors, Card, Kpi, Badge, Empty, gbp, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, when } from '@/components/dashboard/kit';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { toggleClientStep, saveClientNote } from '@/app/dashboard/actions';

export const dynamic = 'force-dynamic';

// Clients = won deals after the deposit: what's done for each, what's next, and the notes that would
// otherwise live in your head. Review and referral steps tick themselves when that ask is sent from Today.

function ClientCard({ c }: { c: Client }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold truncate">{c.name}</p>
          <p className="text-xs text-white/60 mt-0.5">Won {c.wonAt ? when(c.wonAt).split(',').slice(0, 2).join(',') : ''} · {c.days} day{c.days === 1 ? '' : 's'} ago{c.amount ? ` · ${gbp(c.amount)}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={c.progress === STEPS.length ? 'good' : 'info'}>{c.progress}/{STEPS.length} done</Badge>
          <a href={c.hubspot} {...linkProps} className="text-xs text-white/65 hover:text-white">HubSpot ↗</a>
        </div>
      </div>
      {c.nextStep && <p className="mt-3 text-sm"><span className="text-white/60">Next:</span> {c.nextStep}</p>}
      <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
        {STEPS.map((s) => {
          const at = c.done[s.key];
          const auto = 'auto' in s;
          return (
            <li key={s.key}>
              <ActionForm action={toggleClientStep}>
                <input type="hidden" name="dealId" value={c.dealId} /><input type="hidden" name="key" value={s.key} />
                <button disabled={auto && !!at} title={auto ? 'Ticks itself when the ask is marked Sent on Today' : undefined}
                  className={`w-full min-h-9 flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left text-[13px] transition-colors ${at ? 'border-emerald-400/20 bg-emerald-400/[0.05] text-white/85' : 'border-white/[0.07] text-white/70 hover:border-white/20'}`}>
                  <span className={`size-4 shrink-0 rounded grid place-items-center text-[11px] ${at ? 'bg-emerald-500 text-[#0C0C0C]' : 'border border-white/25'}`} aria-hidden>{at ? '✓' : ''}</span>
                  <span className="flex-1">{s.label}</span>
                  {at && <span className="text-[11px] text-white/55">{when(at).split(',')[1]?.trim() ?? ''}</span>}
                </button>
              </ActionForm>
            </li>
          );
        })}
      </ul>
      <ActionForm action={saveClientNote} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="dealId" value={c.dealId} />
        <label className="text-[11px] text-white/60" htmlFor={`note-${c.dealId}`}>Notes: deliverables, logins handed over, what they asked for next</label>
        <textarea id={`note-${c.dealId}`} name="note" rows={2} defaultValue={c.note} className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" placeholder="e.g. Portal live, Airtable shared with Uche, wants a second form in January" />
        <button className="self-end rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:border-white/30 hover:text-white">Save notes</button>
      </ActionForm>
    </Card>
  );
}

export default async function Clients() {
  const d = await clientsData();
  const value = d.clients.reduce((s, c) => s + c.amount, 0);
  const asksDue = d.active.filter((c) => (c.days >= 21 && !c.done.review) || (c.days >= 60 && !c.done.referral)).length;
  return (
    <>
      <PageHeader title="Clients" sub="Everyone who paid the deposit: onboarding steps, what's next, and your notes. Review and referral asks tick themselves when you send them from Today." />
      <Errors errors={d.errors} />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        <Kpi label="Being onboarded" value={d.active.length} foot={<span className="text-xs text-white/60">steps still open</span>} />
        <Kpi label="All clients" value={d.clients.length} foot={<span className="text-xs text-white/60">{gbp(value)} won in total · retainers on <Link href="/dashboard/money" className="underline-offset-2 hover:underline">Money</Link></span>} />
        <Kpi label="Asks due" value={asksDue} foot={<span className="text-xs text-white/60">review at 21 days, referral at 60</span>} href="/dashboard#today" />
      </div>

      <SectionTitle>Being onboarded · {d.active.length}</SectionTitle>
      {d.active.length ? <div className="grid xl:grid-cols-2 gap-3 md:gap-4">{d.active.map((c) => <ClientCard key={c.dealId} c={c} />)}</div>
        : <Card><Empty>No clients mid-onboarding. When a deal goes Won in HubSpot (the Stripe deposit does it), it appears here with its checklist.</Empty></Card>}

      {d.finished.length > 0 && (
        <details className="rounded-2xl border border-white/[0.07] bg-[#121212]">
          <summary className="cursor-pointer px-5 py-3 text-sm text-white/75 hover:text-white">Fully onboarded · {d.finished.length}</summary>
          <div className="grid xl:grid-cols-2 gap-3 md:gap-4 p-3">{d.finished.map((c) => <ClientCard key={c.dealId} c={c} />)}</div>
        </details>
      )}
    </>
  );
}
