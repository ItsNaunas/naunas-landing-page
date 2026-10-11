import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { removeFromGroup, LEAK_MAP_GROUP } from '@/lib/mailerlite';
import { upsertContact, ensureDeal, splitName, STAGE } from '@/lib/hubspot';
import { priorityOf } from '@/lib/booking';

// Cal.com webhook (BOOKING_CREATED). When someone books the free audit, stop the Leak Map course
// for them by removing them from the MailerLite group. Signed with CAL_WEBHOOK_SECRET.

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const sig = req.headers.get('x-cal-signature-256') ?? '';
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const ok = sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: 'Bad signature' }, { status: 401 });

  const event = JSON.parse(raw) as { triggerEvent?: string; payload?: { attendees?: { email?: string; name?: string }[]; responses?: Record<string, { value?: unknown }>; startTime?: string } };
  if (event.triggerEvent !== 'BOOKING_CREATED') return NextResponse.json({ ignored: true });

  const emails = (event.payload?.attendees ?? []).map((a) => a.email).filter((e): e is string => !!e);
  const stopped: string[] = [];
  for (const email of emails) {
    try {
      if (await removeFromGroup(email, LEAK_MAP_GROUP)) stopped.push(email);
    } catch (err) {
      console.error('[CalWebhook] MailerLite remove failed:', err);
    }
  }
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
