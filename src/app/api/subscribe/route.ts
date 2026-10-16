import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { addToGroup, NEWSLETTER_GROUP } from '@/lib/mailerlite';
import { upsertContact, inferLeadSource } from '@/lib/hubspot';
import { alertError } from '@/lib/alert';
import { logEvent } from '@/lib/events';
import type { Attribution } from '@/lib/attribution';

// Footer newsletter sign-up. Explicit opt-in only (the checkbox is required). Joining the MailerLite
// "Naunas Newsletter" group starts the "Newsletter: welcome" automation; the contact also lands in HubSpot.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim().split(/\s+/)[0] : '';
  const src = typeof body.src === 'string' && body.src ? body.src : 'footer';
  const attribution = (body.attribution && typeof body.attribution === 'object' ? body.attribution : {}) as Attribution;

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please add a valid email.' }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: 'Please tick the box to confirm you want the emails.' }, { status: 400 });

  try {
    await addToGroup({ email, name: name || undefined, source: `newsletter:${src}`, group: NEWSLETTER_GROUP });
  } catch (err) {
    await alertError('Subscribe: MailerLite', err, `${email} tried to join the newsletter and was NOT added.`);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  after(async () => {
    await logEvent('subscribe', `Newsletter sign-up${name ? ` · ${name}` : ''}`);
    try {
      // HubSpot's "Lead source" dropdown has no Newsletter option yet, so these land as Other
      // (MailerLite keeps the exact source in signup_source).
      await upsertContact({ email, firstname: name || undefined, leadSource: inferLeadSource('other', attribution), attribution });
    } catch (err) {
      await alertError('Subscribe: HubSpot', err, 'They’re on the newsletter; only the HubSpot contact is missing.');
    }
  });

  return NextResponse.json({ success: true });
}
