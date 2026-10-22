// Invoice chasing (2026-10-23): open Stripe invoices past their due date, with a chase message that gets firmer
// the longer it's overdue, and a button that makes Stripe re-send the invoice email (POST /invoices/:id/send).
// Shown on Money and flagged on Overview + the morning brief. Key: STRIPE_KEY (one restricted key for the whole
// dashboard), else STRIPE_READ_KEY for reading only.

import { getJSON, updateJSON } from '@/lib/store';

/** The full-access key (STRIPE_SECRET_KEY) or a restricted STRIPE_KEY; STRIPE_READ_KEY only reads. */
const writeKey = () => process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;
export const stripeKey = () => writeKey() || process.env.STRIPE_READ_KEY;
/** Re-sending needs write access to Invoices. */
export const canSendReminders = () => !!writeKey();

export type Overdue = {
  id: string; number: string; who: string; email?: string; amount: number; currency: string;
  dueAt: string; daysOverdue: number; url?: string; reminded: string[];
};
const LOG = 'money/invoice-chase.json';

type Inv = { id: string; number?: string; amount_due: number; currency: string; customer_name?: string; customer_email?: string; due_date?: number; hosted_invoice_url?: string };

export async function overdueInvoices(): Promise<Overdue[]> {
  const key = stripeKey();
  if (!key) return [];
  const res = await fetch('https://api.stripe.com/v1/invoices?status=open&limit=100', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Stripe invoices ${res.status}`);
  const log = await getJSON<Record<string, string[]>>(LOG, {});
  const now = Date.now();
  return ((await res.json()) as { data: Inv[] }).data
    .filter((i) => i.due_date && i.due_date * 1000 < now && i.amount_due > 0)
    .map((i) => ({
      id: i.id, number: i.number ?? i.id, who: i.customer_name ?? i.customer_email ?? 'Client', email: i.customer_email,
      amount: i.amount_due / 100, currency: i.currency, dueAt: new Date(i.due_date! * 1000).toISOString(),
      daysOverdue: Math.floor((now - i.due_date! * 1000) / 86_400_000), url: i.hosted_invoice_url, reminded: log[i.id] ?? [],
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export const money = (n: number, c: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c.toUpperCase() }).format(n);

/** Friendly first, firmer after a week, final after three. */
export function chaseText(o: Overdue): string {
  const first = o.who.split(/\s+/)[0];
  const amt = money(o.amount, o.currency);
  const link = o.url ? `\n\n${o.url}` : '';
  if (o.daysOverdue <= 7) return `Hi ${first},\n\nA quick nudge on invoice ${o.number} for ${amt}, which was due ${o.daysOverdue === 0 ? 'today' : `${o.daysOverdue} day${o.daysOverdue === 1 ? '' : 's'} ago`}. Easy to miss, so here’s the link again:${link}\n\nThanks,\nNaufal`;
  if (o.daysOverdue <= 21) return `Hi ${first},\n\nInvoice ${o.number} for ${amt} is now ${o.daysOverdue} days overdue. Could you let me know when it will be paid, or if there’s anything holding it up? The link is here:${link}\n\nThanks,\nNaufal`;
  return `Hi ${first},\n\nInvoice ${o.number} for ${amt} is ${o.daysOverdue} days overdue and I haven’t heard back. Please settle it this week, or reply so we can agree a date. If there’s a problem with the work, tell me and I’ll put it right.${link}\n\nNaufal`;
}

/** Stripe re-sends its own invoice email to the customer. */
export async function sendReminder(id: string): Promise<void> {
  if (!canSendReminders()) throw new Error('Needs STRIPE_SECRET_KEY (or a STRIPE_KEY with write access to Invoices).');
  if (!/^in_[A-Za-z0-9]+$/.test(id)) throw new Error('Bad invoice id.');
  const res = await fetch(`https://api.stripe.com/v1/invoices/${id}/send`, { method: 'POST', headers: { Authorization: `Bearer ${writeKey()}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Stripe: ${((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? res.status}`);
  await updateJSON<Record<string, string[]>>(LOG, {}, (log) => ({ ...log, [id]: [new Date().toISOString(), ...(log[id] ?? [])].slice(0, 10) }));
}
