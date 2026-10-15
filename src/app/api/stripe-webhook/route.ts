import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getMailer } from '@/lib/mailer';
import { onboardingEmail } from '@/lib/emails';
import { markDealWon, openDealForEmail, addNote, hubspotUrl } from '@/lib/hubspot';
import { notify, line, alertError } from '@/lib/alert';

// Stripe webhook (checkout.session.completed / async_payment_succeeded), signed with STRIPE_WEBHOOK_SECRET.
// A deposit paid through a Payment Link → HubSpot deal Won with the amount → onboarding email from contact@
// → 💰 Telegram. Payment Links carry ?client_reference_id=<HubSpot deal id> (added when the proposal is
// drafted); without it we fall back to the payer's email. Stripe retries until it gets a 200, so a deal
// that is already Won is skipped and the onboarding email only ever goes once.

const TOLERANCE_S = 300;

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

type Session = {
  id: string;
  client_reference_id?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string;
  customer_details?: { email?: string | null; name?: string | null } | null;
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  if (!verify(raw, req.headers.get('stripe-signature') ?? '', secret)) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });

  const event = JSON.parse(raw) as { type?: string; data?: { object?: Session } };
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return NextResponse.json({ ignored: true });
  const s = event.data?.object;
  if (!s || s.payment_status !== 'paid') return NextResponse.json({ ignored: 'not paid yet' });

  const email = s.customer_details?.email ?? undefined;
  const name = s.customer_details?.name ?? undefined;
  const amount = (s.amount_total ?? 0) / 100;
  const currency = s.currency ?? 'gbp';
  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

  // Which deal? The Payment Link's client_reference_id, else the payer's open deal.
  let dealId = s.client_reference_id || undefined;
  let contactId: string | undefined;
  if (email) {
    try {
      const found = await openDealForEmail(email);
      contactId = found?.contactId;
      dealId ??= found?.dealId ?? undefined;
    } catch (err) {
      await alertError('StripeWebhook: HubSpot lookup', err, `${money} from ${email} was paid; matching it to a deal failed.`);
    }
  }

  if (!dealId) {
    await notify({
      level: 'money',
      title: `Payment received: ${money}`,
      lines: [line('👤', 'From', name), line('✉️', 'Email', email), '⚠️ <b>No HubSpot deal matched</b>, so no onboarding email went out.'],
      next: 'Move their deal to Won and send the onboarding email by hand.',
      buttons: [{ text: 'Open Stripe payments', url: 'https://dashboard.stripe.com/payments' }, { text: 'Open HubSpot', url: hubspotUrl.contacts() }],
    });
    return NextResponse.json({ success: true, matched: false });
  }

  let won: { alreadyWon: boolean; dealName: string };
  try {
    won = await markDealWon(dealId, amount, currency);
  } catch (err) {
    await alertError('StripeWebhook: mark deal Won', err, `${money} from ${email ?? 'a client'} was paid, but the deal is NOT marked Won and no onboarding email went out.`);
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
      await addNote(contactId, `<p><strong>Deposit paid: ${money}</strong> (Stripe ${s.id}). ${emailed ? 'Onboarding email sent.' : 'Onboarding email NOT sent.'}</p>`, dealId);
    } catch (err) {
      await alertError('StripeWebhook: HubSpot note', err);
    }
  }
  await notify({
    level: 'money',
    title: `Deposit paid: ${money}`,
    lines: [line('🤝', 'Deal', won.dealName), line('👤', 'From', name), line('✉️', 'Email', email), line('📬', 'Onboarding email', emailed ? 'sent' : 'NOT sent')],
    next: 'Deal moved to Won. Send the kick-off form within 1 working day.',
    buttons: [{ text: 'Open deal in HubSpot', url: hubspotUrl.deal(dealId) }],
  });
  return NextResponse.json({ success: true, won: true, emailed });
}
