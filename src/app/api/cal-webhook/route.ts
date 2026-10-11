import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { removeFromGroup, LEAK_MAP_GROUP } from '@/lib/mailerlite';

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

  const event = JSON.parse(raw) as { triggerEvent?: string; payload?: { attendees?: { email?: string }[] } };
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
  return NextResponse.json({ success: true, stopped: stopped.length });
}
