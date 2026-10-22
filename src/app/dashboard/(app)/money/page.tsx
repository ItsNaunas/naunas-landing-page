import { moneyData } from '@/lib/ops/tabs';
import { hubspotUrl } from '@/lib/hubspot';
import { PageHeader, Errors, Badge, Card, Kpi, Empty, gbp, compactGbp, linkProps } from '@/components/dashboard/ui';
import { SectionTitle, ConnectCard, Meter, when, SectionError, RangeChips, errFor } from '@/components/dashboard/kit';
import { overdueInvoices, writtenOff, chaseText, canSendReminders, money, type Overdue, type WrittenOff } from '@/lib/invoices';
import { demoOn } from '@/lib/ops/demo';
import { CopyButton } from '@/components/dashboard/client';
import { ActionForm } from '@/components/dashboard/ActionForm';
import { writeOffInvoice } from '@/app/dashboard/actions';
import { ReminderButton } from './ReminderButton';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; tone: 'good' | 'bad' | 'neutral' | 'muted' }> = {
  paid: { label: 'Paid', tone: 'good' }, failed: { label: 'Failed', tone: 'bad' }, refunded: { label: 'Refunded', tone: 'muted' },
  'part-refunded': { label: 'Part refunded', tone: 'neutral' }, disputed: { label: 'Disputed', tone: 'bad' },
};

const RANGES = [['3', '3 months'], ['6', '6 months'], ['12', '12 months']] as const;

export default async function Money({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const months = (await searchParams).months ?? '6';
  const d = await moneyData(Number(months) || 6);

  if (!d.connected) {
    return (
      <>
        <PageHeader title="Money" sub="Payments, retainers, outstanding invoices and revenue by month." />
        <Errors errors={d.errors} />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <Kpi label="Won this month (HubSpot)" value={compactGbp(d.wonMonth)} />
        </div>
        <ConnectCard
          title="Connect Stripe (read-only) to see your money"
          why="Revenue by month, MRR from retainers, failed payments, refunds and open invoices, each linked to its deal."
          steps={[
            'Stripe → Developers → API keys → Create restricted key',
            'Name it “Naunas dashboard (read-only)”',
            'Set READ on: Charges, PaymentIntents, Checkout Sessions, Invoices, Subscriptions, Balance. Leave everything else as None.',
            'Create, then copy the key (starts rk_live_)',
          ]}
          env="STRIPE_SECRET_KEY"
        />
      </>
    );
  }

  const [overdue, off] = demoOn() ? [[] as Overdue[], {} as Record<string, WrittenOff>] : await Promise.all([overdueInvoices().catch(() => [] as Overdue[]), writtenOff()]);
  const offList = Object.entries(off);
  const k = d.kpis;
  const range = <RangeChips path="/dashboard/money" param="months" value={months} options={RANGES} />;
  const top = Math.max(1, k.goal, ...d.months.map((m) => m.value));
  return (
    <>
      <PageHeader title="Money" sub="Payments, retainers, outstanding invoices and revenue by month."
        action={<a href="https://dashboard.stripe.com/payments" {...linkProps} className="text-sm rounded-full border border-white/10 px-4 py-2 text-white/70 hover:text-white hover:border-white/25">Open Stripe ↗</a>} />
      <Errors errors={d.errors} />
      <SectionError errors={errFor(d.errors, 'Balance', 'Subscriptions')} />
      {range}

      {overdue.length > 0 && (
        <div id="overdue" className="scroll-mt-20 flex flex-col gap-3">
          <SectionTitle action={<span className="text-xs text-white/60">Copy the message, or have Stripe re-send the invoice</span>}>Overdue · {overdue.length}</SectionTitle>
          {overdue.map((o) => (
            <Card key={o.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{o.who} · {money(o.amount, o.currency)}</p>
                  <p className="text-xs text-white/60 mt-0.5">Invoice {o.number} · <span className={o.daysOverdue > 21 ? 'text-rose-300' : o.daysOverdue > 7 ? 'text-amber-300' : ''}>{o.daysOverdue} days overdue</span>{o.reminded[0] ? ` · last reminder ${when(o.reminded[0]).split(',')[0]}` : ' · no reminder yet'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {o.url && <a href={o.url} {...linkProps} className="text-xs text-white/65 hover:text-white">Invoice ↗</a>}
                  <CopyButton text={chaseText(o)} label="Copy chase message" />
                  {canSendReminders() && <ReminderButton id={o.id} who={o.who} />}
                  <ActionForm action={writeOffInvoice}>
                    <input type="hidden" name="id" value={o.id} /><input type="hidden" name="number" value={o.number} /><input type="hidden" name="who" value={o.who} />
                    <input type="hidden" name="amount" value={o.amount} /><input type="hidden" name="currency" value={o.currency} />
                    <button className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:border-white/30" title="Stop chasing it here. The invoice stays open in Stripe.">Write off</button>
                  </ActionForm>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-white/70 whitespace-pre-wrap rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">{chaseText(o)}</p>
            </Card>
          ))}
        </div>
      )}
      {offList.length > 0 && (
        <details className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <summary className="cursor-pointer px-5 py-3 text-sm text-white/65 hover:text-white">Written off · {offList.length} (still open in Stripe, not chased here)</summary>
          <ul className="divide-y divide-white/[0.05] px-5 pb-2">
            {offList.map(([id, o]) => (
              <li key={id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{o.who} · {money(o.amount, o.currency)} <span className="text-white/55">· invoice {o.number} · written off {when(o.at).split(',')[0]}</span></span>
                <ActionForm action={writeOffInvoice}>
                  <input type="hidden" name="id" value={id} /><input type="hidden" name="number" value={o.number} /><input type="hidden" name="who" value={o.who} /><input type="hidden" name="undo" value="1" />
                  <button className="text-xs text-white/65 hover:text-white underline-offset-2 hover:underline">Undo</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Kpi label="Paid this month" value={compactGbp(k.thisMonth)} foot={<span className="text-xs text-white/60">{Math.round((k.thisMonth / k.goal) * 100)}% of {compactGbp(k.goal)}</span>} />
        <Kpi label="Retainers (MRR)" value={compactGbp(k.mrr)} foot={<span className="text-xs text-white/60">goal {compactGbp(k.mrrGoal)}/mo · {d.subscriptions} active</span>} />
        <Kpi label="In Stripe" value={compactGbp(k.available)} foot={<span className="text-xs text-white/60">{compactGbp(k.pending)} on the way</span>} />
        <Kpi label="Owed to you" value={compactGbp(k.outstanding)} foot={<span className="text-xs text-white/60">{d.invoices.length} open invoice{d.invoices.length === 1 ? '' : 's'}</span>} />
      </div>

      <Card title="Revenue by month" action={<span className="flex flex-wrap gap-x-3 text-xs text-white/60"><span><span className="inline-block size-2 rounded-sm bg-emerald-400/80 mr-1" aria-hidden />hit the {compactGbp(k.goal)} goal</span><span><span className="inline-block size-2 rounded-sm bg-[#F2613F] mr-1" aria-hidden />this month so far</span></span>}>
        <div className="relative flex items-end gap-3 md:gap-6 h-52 pt-4">
          {d.months.map((m, i) => (
            <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
              <span className="text-[11px] tabular-nums text-white/60">{m.value ? compactGbp(m.value) : ''}</span>
              <div className={`w-full max-w-16 rounded-t-md ${m.value >= k.goal ? 'bg-emerald-400/80' : i === d.months.length - 1 ? 'bg-[#F2613F]' : 'bg-white/15'}`} style={{ height: `${Math.max(m.value ? 3 : 1, (m.value / top) * 82)}%` }} />
              <span className="text-[11px] text-white/60">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
        <div className="lg:col-span-2 flex flex-col gap-3 min-w-0">
          <SectionTitle>Payments</SectionTitle>
          <SectionError errors={errFor(d.errors, 'Charges', 'Checkout')} />
          <Card pad={false}>
            {d.payments.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[520px]">
                  <tbody>
                    {d.payments.map((p) => (
                      <tr key={p.id} className="border-t border-white/[0.04] first:border-t-0">
                        <td className="px-5 py-3 whitespace-nowrap text-white/65">{when(p.at)}</td>
                        <td className="px-3 py-3">{p.who}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium">{new Intl.NumberFormat('en-GB', { style: 'currency', currency: p.currency.toUpperCase() }).format(p.amount)}</td>
                        <td className="px-3 py-3"><Badge tone={STATUS[p.status]?.tone ?? 'neutral'}>{STATUS[p.status]?.label ?? p.status}</Badge></td>
                        <td className="px-5 py-3 text-right">{p.dealId ? <a href={hubspotUrl.deal(p.dealId)} {...linkProps} className="text-xs text-white/65 hover:text-white">Deal ↗</a> : <span className="text-xs text-white/55">no deal</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>No payments in this period.</Empty>}
          </Card>
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <SectionTitle>Open invoices</SectionTitle>
          <SectionError errors={errFor(d.errors, 'Invoices')} />
          <Card>
            {d.invoices.length ? (
              <ul className="flex flex-col divide-y divide-white/[0.05] -my-2">
                {d.invoices.map((i) => (
                  <li key={i.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{i.who || i.number}</p>
                      <p className="text-xs text-white/60">{i.number}{i.due ? ` · due ${when(i.due, undefined, true).split(',')[0]}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{gbp(i.amount)}</p>
                      {i.url && <a href={i.url} {...linkProps} className="text-[11px] text-white/60 hover:text-white">Open ↗</a>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nothing owed. 🎉</Empty>}
          </Card>
          <Card title="Retainer goal">
            <p className="text-sm mb-2 tabular-nums">{gbp(k.mrr)} of {gbp(k.mrrGoal)} a month</p>
            <Meter value={k.mrr} max={k.mrrGoal} tone="good" />
          </Card>
        </div>
      </div>
    </>
  );
}
