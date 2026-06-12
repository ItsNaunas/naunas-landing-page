import { NextRequest, NextResponse } from 'next/server';

const MAILERLITE_GROUP_ID = '190096378194560944';
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

interface SubscribePayload {
  email: string;
  name: string;
  src: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SubscribePayload>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const token = process.env.MAILERLITE_API_TOKEN;
  if (!token) {
    console.error('[Subscribe] Missing MAILERLITE_API_TOKEN');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // body.src is accepted but not forwarded — MailerLite custom fields must
  // pre-exist in the account, so source attribution stays client-side for now.
  const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      ...(name ? { fields: { name } } : {}),
      groups: [MAILERLITE_GROUP_ID],
    }),
  });

  // MailerLite upserts: 201 = new subscriber, 200 = already subscribed. Both are success.
  if (!res.ok) {
    console.error('[Subscribe] MailerLite error:', res.status, await res.text());
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
