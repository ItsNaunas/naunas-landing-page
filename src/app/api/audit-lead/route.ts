import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // TODO: wire to Airtable
  console.log('[Audit Lead]', { name, email, phone });

  return NextResponse.json({ success: true });
}
