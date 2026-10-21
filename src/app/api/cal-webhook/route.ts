import { NextRequest, NextResponse, after } from 'next/server';
import { preCallResearch } from '@/lib/precall';
import crypto from 'node:crypto';
import { addToGroup, removeFromGroup, LEAK_MAP_GROUP, ENQUIRED_GROUP, BOOKED_GROUP } from '@/lib/mailerlite';
import { upsertContact, ensureDeal, splitName, STAGE, hubspotUrl, linkCompany, addNote, openDealForEmail } from '@/lib/hubspot';
import { priorityOf, CAL_URL } from '@/lib/booking';
import { getMailer } from '@/lib/mailer';
import { preCallEmail, noShowEmail } from '@/lib/emails';
import { preCallBrief } from '@/lib/brief';
import { notify, line, alertError } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';
import { logEvent } from '@/lib/events';

export const maxDuration = 120;

// The owner's time zone, for the call time in alerts.
const OWNER_TZ = FUNNEL.ownerTz;

// Cal.com webhook (BOOKING_CREATED / RESCHEDULED / CANCELLED), signed with CAL_WEBHOOK_SECRET.
// Booking stops the Leak Map course and the questionnaire nudges (MailerLite sequences, started and
// stopped purely by group membership), sends the "before we talk" email from contact@, and moves the
// HubSpot deal to "Audit booked". Failures and high-value bookings go to Telegram via lib/alert.

// "Tuesday 14 October, 3:00 pm (New York time)" in the booker's own time zone, for the pre-call email.
function formatCallTime(iso?: string, timeZone?: string): string | undefined {
  if (!iso) return undefined;
  const zone = timeZone || 'UTC';
  try {
    const when = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone }).format(new Date(iso));
    const city = zone.split('/').pop()?.replace(/_/g, ' ');
    return `${when} (${city} time)`;
  } catch {
    return new Date(iso).toUTCString();
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const sig = req.headers.get('x-cal-signature-256') ?? '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });

  const event = JSON.parse(raw) as { triggerEvent?: string; payload?: { attendees?: { email?: string; name?: string; timeZone?: string; noShow?: boolean }[]; responses?: Record<string, { value?: unknown }>; startTime?: string; metadata?: { videoCallUrl?: string }; location?: string } };
  const trigger = event.triggerEvent;
  if (trigger !== 'BOOKING_CREATED' && trigger !== 'BOOKING_RESCHEDULED' && trigger !== 'BOOKING_CANCELLED' && trigger !== 'BOOKING_NO_SHOW_UPDATED') return NextResponse.json({ ignored: true });

  const attendees = (event.payload?.attendees ?? []).filter((a): a is { email: string; name?: string; timeZone?: string; noShow?: boolean } => !!a.email);

  // No-show (Naufal marks the attendee absent in Cal.com; Google Meet can't detect it): a no-guilt rebook
  // email from contact@, a HubSpot note, and a heads-up on Telegram. Unmarking sends nothing.
  if (trigger === 'BOOKING_NO_SHOW_UPDATED') {
    const mailer = getMailer();
    const absent = attendees.filter((a) => a.noShow);
    for (const a of absent) await logEvent('noshow', `No-show · ${a.name ?? 'attendee'}`);
    for (const a of absent) {
      const firstName = a.name?.split(/\s+/)[0];
      if (mailer) {
        const mail = noShowEmail({ firstName, rebookUrl: `${CAL_URL}?email=${encodeURIComponent(a.email)}` });
        try {
          await mailer.transporter.sendMail({ from: `Naufal at Naunas <${mailer.from}>`, to: a.email, subject: mail.subject, text: mail.text, html: mail.html });
        } catch (err) {
          await alertError('CalWebhook: no-show email', err, `${a.email} did NOT get the rebook email.`);
        }
      }
      let dealId: string | undefined;
      try {
        const found = await openDealForEmail(a.email);
        dealId = found?.dealId ?? undefined;
        if (found) await addNote(found.contactId, '<p><strong>No-show</strong> on the free audit. Rebook email sent.</p>', dealId);
      } catch (err) {
        await alertError('CalWebhook: HubSpot no-show note', err);
      }
      await notify({
        level: 'lead',
        title: 'No-show: rebook email sent',
        lines: [line('👤', 'Name', a.name), line('✉️', 'Email', a.email)],
        next: 'If they don’t rebook within 2 days, a personal message usually does it.',
        buttons: [{ text: dealId ? 'Open deal in HubSpot' : 'Open HubSpot', url: dealId ? hubspotUrl.deal(dealId) : hubspotUrl.contacts() }],
      });
    }
    return NextResponse.json({ success: true, noShows: absent.length });
  }
  const callTime = (timeZone?: string) => formatCallTime(event.payload?.startTime, timeZone);

  // Cancelled: leave the "Audit booked" group. Nothing else changes (the HubSpot deal stays put for Naufal).
  if (trigger === 'BOOKING_CANCELLED') {
    await logEvent('cancel', `Call cancelled · ${attendees.map((a) => a.name ?? 'attendee').join(', ')}`);
    for (const a of attendees) {
      try { await removeFromGroup(a.email, BOOKED_GROUP); } catch (err) { await alertError('CalWebhook: MailerLite remove (booked)', err); }
    }
    return NextResponse.json({ success: true, cancelled: attendees.length });
  }

  // Booked or rescheduled: the pre-call email goes straight from contact@ (a one-off send doesn't need a
  // MailerLite automation slot), and the "Audit booked" group keeps the call time for later sequences.
  // A first booking also stops the Leak Map course and the questionnaire nudges.
  const mailer = getMailer();
  const stopped: string[] = [];
  for (const a of attendees) {
    const firstName = a.name?.split(/\s+/)[0];
    const when = callTime(a.timeZone);
    if (mailer) {
      const email = preCallEmail({ firstName, callTime: when, rescheduled: trigger === 'BOOKING_RESCHEDULED' });
      try {
        await mailer.transporter.sendMail({ from: `Naufal at Naunas <${mailer.from}>`, to: a.email, subject: email.subject, text: email.text, html: email.html });
      } catch (err) {
        await alertError('CalWebhook: pre-call email', err, `The booking is fine, but ${a.email} did NOT get the pre-call email.`);
      }
    } else {
      await alertError('CalWebhook: pre-call email', new Error('Missing ZOHO_SMTP_* env'), `The booking is fine, but ${a.email} did NOT get the pre-call email.`);
    }
    try {
      await addToGroup({ email: a.email, name: firstName, group: BOOKED_GROUP, fields: { call_time: when } });
    } catch (err) {
      await alertError('CalWebhook: MailerLite add (booked)', err);
    }
    if (trigger !== 'BOOKING_CREATED') continue;
    for (const group of [LEAK_MAP_GROUP, ENQUIRED_GROUP]) {
      try {
        if (await removeFromGroup(a.email, group)) stopped.push(`${a.email}:${group}`);
      } catch (err) {
        await alertError(`CalWebhook: MailerLite remove (${group})`, err);
      }
    }
  }
  if (trigger !== 'BOOKING_CREATED') {
    await logEvent('reschedule', `Call rescheduled · ${attendees.map((a) => a.name ?? 'attendee').join(', ')} → ${formatCallTime(event.payload?.startTime, OWNER_TZ) ?? ''}`);
    return NextResponse.json({ success: true, rescheduled: attendees.length });
  }
  // CRM: the booker's deal moves to "Audit booked" (created there if they skipped the questionnaire).
  const r = event.payload?.responses ?? {};
  const val = (k: string) => (typeof r[k]?.value === 'string' ? (r[k]!.value as string) : undefined);
  const booker = event.payload?.attendees?.[0];
  const priority = priorityOf(val('client-value'), val('monthly-revenue'));
  if (booker?.email) {
    let dealId: string | undefined;
    let contactId: string | undefined;
    const business = val('business-type');
    try {
      contactId = await upsertContact({
        email: booker.email, ...splitName(booker.name ?? val('name') ?? ''), website: val('website'),
        business_type: business, client_value: val('client-value'), monthly_revenue_band: val('monthly-revenue'),
        whats_not_working: val('whats-not-working'), leadSource: 'audit_questionnaire',
      });
      dealId = await ensureDeal({ contactId, name: `${booker.name ?? booker.email}${business ? ` · ${business}` : ''}`, stage: STAGE.auditBooked, leadSource: 'audit_questionnaire', priority });
    } catch (err) {
      await alertError('CalWebhook: HubSpot', err, 'The booking and pre-call email went through, but the deal is NOT updated in HubSpot.');
    }
    if (contactId) {
      try {
        await linkCompany({ website: val('website'), contactId, dealId });
      } catch (err) {
        await alertError('CalWebhook: HubSpot company', err, 'The deal is fine; only the company record is missing.');
      }
    }

    // Pre-call brief: emailed to Naufal and pinned to the deal, so he walks in prepared.
    const brief = preCallBrief({
      name: booker.name ?? val('name') ?? booker.email, email: booker.email, callTime: formatCallTime(event.payload?.startTime, OWNER_TZ),
      business, clientValue: val('client-value'), revenue: val('monthly-revenue'), website: val('website'), whatsNotWorking: val('whats-not-working'),
      meetingUrl: event.payload?.metadata?.videoCallUrl ?? (event.payload?.location?.startsWith('http') ? event.payload.location : undefined),
      dealUrl: dealId ? hubspotUrl.deal(dealId) : undefined,
    });
    if (mailer) {
      try {
        await mailer.transporter.sendMail({ from: `Naunas briefs <${mailer.from}>`, to: process.env.BRIEF_TO || mailer.from, subject: brief.subject, html: brief.html });
      } catch (err) {
        await alertError('CalWebhook: pre-call brief email', err, 'The booking is fine; only your brief email failed.');
      }
    }
    if (contactId) {
      try {
        await addNote(contactId, brief.html, dealId);
      } catch (err) {
        await alertError('CalWebhook: HubSpot brief note', err);
      }
    }
    // Website research brief (was the routine's job 2): runs after the response, about 30 seconds.
    after(() => preCallResearch({ name: booker.name ?? val('name') ?? booker.email ?? 'Booker', website: val('website'), business, whatsNotWorking: val('whats-not-working'), contactId, dealId, callTime: formatCallTime(event.payload?.startTime, OWNER_TZ) }));
    // High-value bookings ping Naufal's phone with the call time in his own time zone.
    if (priority === 'high') {
      await notify({
        level: 'lead',
        title: 'High-value audit booked',
        lines: [
          line('🗓️', 'Call', formatCallTime(event.payload?.startTime, OWNER_TZ)),
          line('👤', 'Name', booker.name ?? val('name')),
          line('✉️', 'Email', booker.email),
          line('🏢', 'Business', val('business-type')),
          line('💰', 'Client value', val('client-value')),
          line('📈', 'Revenue', val('monthly-revenue') ? `${val('monthly-revenue')} a month` : undefined),
          line('🌐', 'Website', val('website')),
        ],
        quote: val('whats-not-working'),
        next: 'Pre-call email sent. Look at their site before the call.',
        buttons: [{ text: dealId ? 'Open deal in HubSpot' : 'Open HubSpot', url: dealId ? hubspotUrl.deal(dealId) : hubspotUrl.contacts() }],
      });
    }
  }
  await logEvent('booking', `Audit booked · ${booker?.name ?? val('name') ?? 'someone'} · ${formatCallTime(event.payload?.startTime, OWNER_TZ) ?? ''}`);
  return NextResponse.json({ success: true, stopped: stopped.length });
}
