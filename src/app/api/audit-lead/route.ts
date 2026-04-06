import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const token = process.env.BASEROW_TOKEN;
  const tableId = process.env.BASEROW_TABLE_ID;

  if (!token || !tableId) {
    console.error('[Audit Lead] Missing BASEROW_TOKEN or BASEROW_TABLE_ID');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const res = await fetch(
    `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Name: name,
        Email: email,
        Phone: phone ?? '',
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    console.error('[Audit Lead] Baserow error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
