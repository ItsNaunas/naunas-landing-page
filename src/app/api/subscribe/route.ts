import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import nodemailer from 'nodemailer';

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

  if (res.status === 201) {
    after(() => sendWelcome(email, name));
  }

  return NextResponse.json({ success: true });
}

async function sendWelcome(email: string, name: string): Promise<void> {
  const host = process.env.ZOHO_SMTP_HOST;
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;
  if (!host || !user || !pass) return;

  const first = name ? name.split(/\s+/)[0] : '';
  const greeting = first ? `Hi ${first},` : 'Hi,';

  const text = [
    greeting,
    '',
    "You're on the Naunas newsletter. Confirmed, nothing else to do.",
    '',
    "What you'll get: what I'm building each week (client systems, automations, the numbers behind them), plus the resources I make along the way. No filler, no daily emails.",
    '',
    'While you wait for the first one, this is the most useful thing I can hand you today: the 6 places service businesses leak revenue, and what each leak costs.',
    'https://www.naunas.co.uk/six-leaks.pdf',
    '',
    'Got a question about your own setup? Just reply. I read everything.',
    '',
    'Naufal',
    'naunas.co.uk',
    '',
    "Didn't sign up? Reply with \"remove\" and you'll never hear from me again.",
  ].join('\n');

  const html = text
    .split('\n\n')
    .map((p) =>
      `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222">${p
        .replace(/https:\/\/www\.naunas\.co\.uk\/six-leaks\.pdf/, '<a href="https://www.naunas.co.uk/six-leaks.pdf" style="color:#F2613F">Get the free breakdown (PDF)</a>')
        .replace(/\n/g, '<br/>')}</p>`
    )
    .join('');

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.ZOHO_SMTP_PORT ?? 465),
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `Naufal at Naunas <${user}>`,
      to: email,
      subject: "You're in: the Naunas newsletter",
      text,
      html,
    });
  } catch (err) {
    console.error('[Subscribe] Welcome email failed:', err);
  }
}
