import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getMailer } from '@/lib/mailer';
import { onboardingEmail } from '@/lib/emails';
import { markDealWon, openDealForEmail, addNote, hubspotUrl } from '@/lib/hubspot';
import { notify, line, alertError, type Button } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';
import { logEvent, type EventKind } from '@/lib/events';

// Stripe webhook, signed with STRIPE_WEBHOOK_SECRET. The single place Stripe events land (replaces the n8n
// "Stripe Alerts to Email" workflow). Every event does two things:
//  1. Telegram for Naufal (deposit paid, money at risk, churn).
//  2. The "Stripe: <event>" email the vault sync reads (to VAULT_ALERT_TO, default its.naunas@gmail.com),
//     body prefixed "PAYMENT RECEIVED" or "ACTION NEEDED — …", sent from contact@ (never a client's mailbox).
// Deposits (Checkout via Payment Links) also move the HubSpot deal to Won and send the onboarding email.
// Payment Links carry ?client_reference_id=<HubSpot deal id>; without it we match the payer's email to an
// open deal. Stripe retries until it gets a 200, so an already-Won deal is skipped (onboarding goes once).

const TOLERANCE_S = 300;
const STRIPE_PAYMENTS = 'https://dashboard.stripe.com/payments';
const STRIPE_DISPUTES = 'https://dashboard.stripe.com/disputes';

function verify(raw: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE_S) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return header.split(',').filter((kv) => kv.startsWith('v1=')).some((kv) => {
    const sig = kv.slice(3);
    return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

const money = (minor: number | null | undefined, currency: string | null | undefined) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: (currency ?? 'gbp').toUpperCase() }).format((minor ?? 0) / 100);

/** The email the vault sync parses. Keep the subject/prefix format exactly. */
async function vaultEmail(event: string, kind: 'PAYMENT RECEIVED' | `ACTION NEEDED — ${string}`, details: Record<string, string | undefined>) {
  const mailer = getMailer();
  if (!mailer) return;
  const body = `${kind}: ${event} | ${Object.entries(details).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' | ')} | Check Stripe + the vault cockpit.`;
  try {
    await mailer.transporter.sendMail({ from: `Naunas Stripe alerts <${mailer.from}>`, to: process.env.VAULT_ALERT_TO || FUNNEL.alerts.vaultEmail, subject: `Stripe: ${event}`, text: body });
  } catch (err) {
    await alertError('StripeWebhook: vault email', err, 'Telegram and HubSpot are fine; only the vault-sync email failed.');
  }
}

type Session = {
  id: string; client_reference_id?: string | null; amount_total?: number | null; currency?: string | null; payment_status?: string;
  customer_details?: { email?: string | null; name?: string | null } | null;
};
type Invoice = { id: string; number?: string | null; customer_email?: string | null; customer_name?: string | null; amount_paid?: number; amount_due?: number; currency?: string; hosted_invoice_url?: string | null };
type PaymentIntent = { id: string; amount?: number; currency?: string; receipt_email?: string | null; last_payment_error?: { message?: string } | null };
type Charge = { id: string; amount_refunded?: number; currency?: string; billing_details?: { email?: string | null; name?: string | null } };
type Dispute = { id: string; amount?: number; currency?: string; reason?: string; evidence_details?: { due_by?: number } };
type Subscription = { id: string; customer?: string };

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  if (!verify(raw, req.headers.get('stripe-signature') ?? '', secret)) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });

  const event = JSON.parse(raw) as { type?: string; data?: { object?: unknown } };
  const type = event.type ?? '';
  const obj = event.data?.object;
  await logStripe(type, obj as Record<string, unknown> | undefined);

  switch (type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return deposit(type, obj as Session);
    case 'checkout.session.async_payment_failed': {
      const s = obj as Session;
      const amt = money(s.amount_total, s.currency);
      await notify({ level: 'error', title: `Bank payment failed: ${amt}`, lines: [line('👤', 'From', s.customer_details?.name), line('✉️', 'Email', s.customer_details?.email)], next: 'Their bank payment bounced. Send them the link again.', buttons: [{ text: 'Open Stripe payments', url: STRIPE_PAYMENTS }] });
      await vaultEmail(type, 'ACTION NEEDED — PAYMENT FAILED', { customer: s.customer_details?.email ?? 'unknown', amount: amt });
      break;
    }
    case 'checkout.session.expired': {
      // Every visit to a Payment Link opens a session, so only report the ones we can tie to a person.
      const s = obj as Session;
      const email = s.customer_details?.email ?? undefined;
      if (!s.client_reference_id && !email) break;
      const found = email ? await openDealForEmail(email).catch(() => null) : null;
      const dealId = s.client_reference_id || found?.dealId || undefined;
      await notify({
        level: 'lead', title: `Opened the deposit link, didn’t pay (${money(s.amount_total, s.currency)})`,
        lines: [line('👤', 'Name', s.customer_details?.name), line('✉️', 'Email', email)],
        next: 'High intent. A short personal nudge today usually closes it.',
        buttons: [{ text: dealId ? 'Open deal in HubSpot' : 'Open HubSpot', url: dealId ? hubspotUrl.deal(dealId) : hubspotUrl.contacts() }],
      });
      break;
    }
    case 'payment_intent.payment_failed': {
      const p = obj as PaymentIntent;
      const amt = money(p.amount, p.currency);
      await notify({ level: 'error', title: `Card declined: ${amt}`, lines: [line('✉️', 'Email', p.receipt_email), line('⚠️', 'Reason', p.last_payment_error?.message)], next: 'Usually a card limit or 3D Secure. They can retry the same link.', buttons: [{ text: 'Open Stripe payments', url: STRIPE_PAYMENTS }] });
      await vaultEmail(type, 'ACTION NEEDED — PAYMENT FAILED', { customer: p.receipt_email ?? 'unknown', amount: amt, reason: p.last_payment_error?.message });
      break;
    }
    case 'invoice.paid': {
      const i = obj as Invoice;
      const amt = money(i.amount_paid, i.currency);
      const buttons: Button[] = i.hosted_invoice_url ? [{ text: 'Open invoice', url: i.hosted_invoice_url }] : [{ text: 'Open Stripe payments', url: STRIPE_PAYMENTS }];
      await notify({ level: 'money', title: `Invoice paid: ${amt}`, lines: [line('👤', 'Client', i.customer_name), line('✉️', 'Email', i.customer_email), line('🧾', 'Invoice', i.number)], buttons });
      await vaultEmail(type, 'PAYMENT RECEIVED', { customer: i.customer_email ?? i.customer_name ?? 'unknown', amount: amt, invoice: i.number ?? i.id });
      break;
    }
    case 'invoice.payment_failed': {
      const i = obj as Invoice;
      const amt = money(i.amount_due, i.currency);
      await notify({ level: 'error', title: `Invoice payment failed: ${amt}`, lines: [line('👤', 'Client', i.customer_name), line('✉️', 'Email', i.customer_email), line('🧾', 'Invoice', i.number)], next: 'Retainer at risk. Message them today, before Stripe’s retries run out.', buttons: i.hosted_invoice_url ? [{ text: 'Open invoice', url: i.hosted_invoice_url }] : [{ text: 'Open Stripe payments', url: STRIPE_PAYMENTS }] });
      await vaultEmail(type, 'ACTION NEEDED — PAYMENT FAILED', { customer: i.customer_email ?? i.customer_name ?? 'unknown', amount: amt, invoice: i.number ?? i.id });
      break;
    }
    case 'customer.subscription.deleted': {
      const s = obj as Subscription;
      await notify({ level: 'error', title: 'Subscription cancelled', lines: [line('🆔', 'Customer', s.customer), line('🔁', 'Subscription', s.id)], next: 'A retainer just ended. Find out why while it’s fresh.', buttons: [{ text: 'Open Stripe subscriptions', url: 'https://dashboard.stripe.com/subscriptions' }] });
      await vaultEmail(type, 'ACTION NEEDED — SUBSCRIPTION CANCELLED', { customer: s.customer ?? 'unknown', subscription: s.id });
      break;
    }
    case 'charge.dispute.created': {
      const d = obj as Dispute;
      const amt = money(d.amount, d.currency);
      const due = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toUTCString().slice(0, 16) : undefined;
      await notify({ level: 'error', title: `Chargeback opened: ${amt}`, lines: [line('⚠️', 'Reason', d.reason), line('⏳', 'Respond by', due)], next: 'Urgent: submit evidence in Stripe before the deadline or the money is lost.', buttons: [{ text: 'Open disputes', url: STRIPE_DISPUTES }] });
      await vaultEmail(type, 'ACTION NEEDED — DISPUTE', { amount: amt, reason: d.reason, respond_by: due });
      break;
    }
    case 'charge.refunded': {
      const c = obj as Charge;
      const amt = money(c.amount_refunded, c.currency);
      await notify({ level: 'ok', title: `Refund sent: ${amt}`, lines: [line('👤', 'To', c.billing_details?.name), line('✉️', 'Email', c.billing_details?.email)], buttons: [{ text: 'Open Stripe payments', url: STRIPE_PAYMENTS }] });
      await vaultEmail(type, 'ACTION NEEDED — REFUND ISSUED', { customer: c.billing_details?.email ?? 'unknown', amount: amt });
      break;
    }
    default:
      return NextResponse.json({ ignored: type });
  }
  return NextResponse.json({ success: true, handled: type });
}

/** Deposit paid via Checkout: HubSpot deal → Won, onboarding email, note, Telegram, vault email. */
// Activity feed line for every money event we handle (details stay in Stripe + HubSpot).
const STRIPE_FEED: Record<string, [EventKind, string]> = {
  'checkout.session.completed': ['payment', 'Payment received'],
  'checkout.session.async_payment_succeeded': ['payment', 'Bank payment cleared'],
  'checkout.session.async_payment_failed': ['payment_issue', 'Bank payment failed'],
  'checkout.session.expired': ['payment_issue', 'Checkout abandoned'],
  'payment_intent.payment_failed': ['payment_issue', 'Card declined'],
  'invoice.paid': ['payment', 'Invoice paid'],
  'invoice.payment_failed': ['payment_issue', 'Invoice payment failed'],
  'customer.subscription.deleted': ['payment_issue', 'Subscription cancelled'],
  'charge.dispute.created': ['payment_issue', 'Chargeback opened'],
  'charge.refunded': ['refund', 'Refund sent'],
};

async function logStripe(type: string, o?: Record<string, unknown>) {
  const feed = STRIPE_FEED[type];
  if (!feed || !o) return;
  if (type === 'checkout.session.completed' && o.payment_status !== 'paid') return;
  const cents = [o.amount_total, o.amount_paid, o.amount_due, o.amount_refunded, o.amount].find((v) => typeof v === 'number') as number | undefined;
  const who = (o.customer_details as { name?: string } | undefined)?.name ?? (o.customer_name as string | undefined);
  await logEvent(feed[0], `${feed[1]}${cents !== undefined ? ` · ${money(cents, (o.currency as string) ?? 'gbp')}` : ''}${who ? ` · ${who}` : ''}`);
}

async function deposit(type: string, s: Session) {
  if (!s || s.payment_status !== 'paid') return NextResponse.json({ ignored: 'not paid yet' });
  const email = s.customer_details?.email ?? undefined;
  const name = s.customer_details?.name ?? undefined;
  const amount = (s.amount_total ?? 0) / 100;
  const currency = s.currency ?? 'gbp';
  const amt = money(s.amount_total, currency);
  await vaultEmail(type, 'PAYMENT RECEIVED', { customer: email ?? name ?? 'unknown', amount: amt, deal: s.client_reference_id ?? undefined });

  // Which deal? The Payment Link's client_reference_id, else the payer's open deal.
  let dealId = s.client_reference_id || undefined;
  let contactId: string | undefined;
  if (email) {
    try {
      const found = await openDealForEmail(email);
      contactId = found?.contactId;
      dealId ??= found?.dealId ?? undefined;
    } catch (err) {
      await alertError('StripeWebhook: HubSpot lookup', err, `${amt} from ${email} was paid; matching it to a deal failed.`);
    }
  }

  if (!dealId) {
    await notify({
      level: 'money',
      title: `Payment received: ${amt}`,
      lines: [line('👤', 'From', name), line('✉️', 'Email', email), '⚠️ <b>No HubSpot deal matched</b>, so no onboarding email went out.'],
      next: 'Move their deal to Won and send the onboarding email by hand.',
      buttons: [{ text: 'Open Stripe payments', url: STRIPE_PAYMENTS }, { text: 'Open HubSpot', url: hubspotUrl.contacts() }],
    });
    return NextResponse.json({ success: true, matched: false });
  }

  let won: { alreadyWon: boolean; dealName: string };
  try {
    won = await markDealWon(dealId, amount, currency);
  } catch (err) {
    await alertError('StripeWebhook: mark deal Won', err, `${amt} from ${email ?? 'a client'} was paid, but the deal is NOT marked Won and no onboarding email went out.`);
    return NextResponse.json({ success: true, won: false });
  }
  if (won.alreadyWon) return NextResponse.json({ success: true, duplicate: true });

  let emailed = false;
  const mailer = getMailer();
  if (email && mailer) {
    const mail = onboardingEmail({ firstName: name?.split(/\s+/)[0] });
    try {
      await mailer.transporter.sendMail({ from: `Naufal at Naunas <${mailer.from}>`, to: email, subject: mail.subject, text: mail.text, html: mail.html });
      emailed = true;
    } catch (err) {
      await alertError('StripeWebhook: onboarding email', err, `The deal is Won, but ${email} did NOT get the onboarding email.`);
    }
  }
  if (contactId) {
    try {
      await addNote(contactId, `<p><strong>Deposit paid: ${amt}</strong> (Stripe ${s.id}). ${emailed ? 'Onboarding email sent.' : 'Onboarding email NOT sent.'}</p>`, dealId);
    } catch (err) {
      await alertError('StripeWebhook: HubSpot note', err);
    }
  }
  await notify({
    level: 'money',
    title: `Deposit paid: ${amt}`,
    lines: [line('🤝', 'Deal', won.dealName), line('👤', 'From', name), line('✉️', 'Email', email), line('📬', 'Onboarding email', emailed ? 'sent' : 'NOT sent')],
    next: 'Deal moved to Won. Send the kick-off form within 1 working day.',
    buttons: [{ text: 'Open deal in HubSpot', url: hubspotUrl.deal(dealId) }],
  });
  return NextResponse.json({ success: true, won: true, emailed });
}
