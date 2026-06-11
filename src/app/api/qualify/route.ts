import { NextRequest, NextResponse } from 'next/server';

interface QualifyPayload {
  business: string;
  leads: string;
  revenue: string;
  leadHandling: string;
  leadHandlingNote: string;
  topFix: string;
  decisionMaker: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  src: string;
  utm: Record<string, string>;
}

const QUALIFYING_BUSINESS = ['Agency', 'Coach/consultant', 'Service business', 'Creative/design studio'];
const QUALIFYING_REVENUE = ['£2–5k', '£5–15k', '£15k+'];
const QUALIFYING_LEADS = ['5–20', '20–50', '50+'];
const QUALIFYING_DECISION = ['Yes', 'Partly'];

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<QualifyPayload>;
  const {
    business, leads, revenue, leadHandling, leadHandlingNote,
    topFix, decisionMaker, name, email, phone, website, src, utm,
  } = body;

  if (!name || !email || !business || !leads || !revenue || !leadHandling || !topFix || !decisionMaker) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const qualified =
    QUALIFYING_BUSINESS.includes(business) &&
    QUALIFYING_REVENUE.includes(revenue) &&
    QUALIFYING_LEADS.includes(leads) &&
    QUALIFYING_DECISION.includes(decisionMaker);

  const token = process.env.BASEROW_TOKEN;
  const tableId = process.env.BASEROW_TABLE_ID;

  if (!token || !tableId) {
    console.error('[Qualify] Missing BASEROW_TOKEN or BASEROW_TABLE_ID');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const utmString = utm && typeof utm === 'object'
    ? Object.entries(utm).map(([k, v]) => `${k}=${v}`).join('&')
    : '';
  const source = [typeof src === 'string' && src ? src : 'site', utmString]
    .filter(Boolean)
    .join(' | ');

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
        'Business Type': business,
        'Leads Per Month': leads,
        'Monthly Revenue': revenue,
        'Lead Handling': leadHandling,
        'Lead Handling Notes': leadHandlingNote ?? '',
        'Top Fix': topFix,
        'Decision Maker': decisionMaker,
        Website: website ?? '',
        Source: source,
        Qualified: qualified ? 'yes' : 'no',
        Date: new Date().toISOString(),
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    console.error('[Qualify] Baserow error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  return NextResponse.json({ success: true, qualified });
}
