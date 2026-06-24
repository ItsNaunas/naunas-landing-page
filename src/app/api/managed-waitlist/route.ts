import { NextRequest, NextResponse } from 'next/server';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

interface WaitlistPayload {
  email: string;
  handle: string;
  src: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<WaitlistPayload>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const handle = typeof body.handle === 'string' ? body.handle.trim() : '';
  const src = typeof body.src === 'string' && body.src ? body.src : 'managed';

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const token = process.env.BASEROW_TOKEN;
  const tableId = process.env.BASEROW_TABLE_ID;

  if (!token || !tableId) {
    console.error('[ManagedWaitlist] Missing BASEROW_TOKEN or BASEROW_TABLE_ID');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const row = {
    Name: handle || email,
    Email: email,
    Website: handle,
    Path: 'managed-waitlist',
    Source: src,
    Date: new Date().toISOString(),
  };

  const res = await fetch(
    `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(row),
    }
  );

  if (!res.ok) {
    console.error('[ManagedWaitlist] Baserow error:', await res.text());
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
