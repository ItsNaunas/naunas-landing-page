import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { addToGroup, removeFromGroup, LEAK_MAP_GROUP, ENQUIRED_GROUP, BOOKED_GROUP } from '@/lib/mailerlite';
import { upsertContact, ensureDeal, splitName, STAGE } from '@/lib/hubspot';
import { priorityOf } from '@/lib/booking';

// Cal.com webhook (BOOKING_CREATED / RESCHEDULED / CANCELLED), signed with CAL_WEBHOOK_SECRET.
// Booking stops the Leak Map course and the questionnaire nudges, starts the "before we talk" email
// and moves the HubSpot deal to "Audit booked". Each email sequence lives in MailerLite and is started
// or stopped purely by group membership.

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

  const event = JSON.parse(raw) as { triggerEvent?: string; payload?: { attendees?: { email?: string; name?: string; timeZone?: string }[]; responses?: Record<string, { value?: unknown }>; startTime?: string } };
  const trigger = event.triggerEvent;
  if (trigger !== 'BOOKING_CREATED' && trigger !== 'BOOKING_RESCHEDULED' && trigger !== 'BOOKING_CANCELLED') return NextResponse.json({ ignored: true });

  const attendees = (event.payload?.attendees ?? []).filter((a): a is { email: string; name?: string; timeZone?: string } => !!a.email);
  const callTime = (timeZone?: string) => formatCallTime(event.payload?.startTime, timeZone);

  // Cancelled: stop the "before we talk" email. Nothing else changes (the HubSpot deal stays put for Naufal).
  if (trigger === 'BOOKING_CANCELLED') {
    for (const a of attendees) {
      try { await removeFromGroup(a.email, BOOKED_GROUP); } catch (err) { console.error('[CalWebhook] MailerLite remove (booked) failed:', err); }
    }
    return NextResponse.json({ success: true, cancelled: attendees.length });
  }

  // Booked or rescheduled: (re)join "Audit booked" with the call time, which starts or updates the
  // pre-call email. A first booking also stops the Leak Map course and the questionnaire nudges.
  const stopped: string[] = [];
  for (const a of attendees) {
    try {
      await addToGroup({ email: a.email, name: a.name?.split(/\s+/)[0], group: BOOKED_GROUP, fields: { call_time: callTime(a.timeZone) } });
    } catch (err) {
      console.error('[CalWebhook] MailerLite add (booked) failed:', err);
    }
    if (trigger !== 'BOOKING_CREATED') continue;
    for (const group of [LEAK_MAP_GROUP, ENQUIRED_GROUP]) {
      try {
        if (await removeFromGroup(a.email, group)) stopped.push(`${a.email}:${group}`);
      } catch (err) {
        console.error('[CalWebhook] MailerLite remove failed:', group, err);
      }
    }
  }
  if (trigger !== 'BOOKING_CREATED') return NextResponse.json({ success: true, rescheduled: attendees.length });
  // CRM: the booker's deal moves to "Audit booked" (created there if they skipped the questionnaire).
  const r = event.payload?.responses ?? {};
  const val = (k: string) => (typeof r[k]?.value === 'string' ? (r[k]!.value as string) : undefined);
  const booker = event.payload?.attendees?.[0];
  if (booker?.email) {
    try {
      const business = val('business-type');
      const contactId = await upsertContact({
        email: booker.email, ...splitName(booker.name ?? val('name') ?? ''), website: val('website'),
        business_type: business, client_value: val('client-value'), monthly_revenue_band: val('monthly-revenue'),
        whats_not_working: val('whats-not-working'), leadSource: 'audit_questionnaire',
      });
      await ensureDeal({ contactId, name: `${booker.name ?? booker.email}${business ? ` · ${business}` : ''}`, stage: STAGE.auditBooked, leadSource: 'audit_questionnaire', priority: priorityOf(val('client-value'), val('monthly-revenue')) });
    } catch (err) {
      console.error('[CalWebhook] HubSpot failed:', err);
    }
  }
  return NextResponse.json({ success: true, stopped: stopped.length });
}
