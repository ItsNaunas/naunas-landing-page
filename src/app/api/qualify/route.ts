import { NextRequest, NextResponse } from 'next/server';

type Path = 'services' | 'builder';

interface QualifyPayload {
  path: Path;
  business: string;
  leads: string;
  revenue: string;
  leadHandling: string;
  topFix: string;
  decisionMaker: string;
  building: string;
  experience: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
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
    path, business, leads, revenue, leadHandling, topFix, decisionMaker,
    building, experience, name, email, phone, website, instagram, src, utm,
  } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const isBuilder = path === 'builder';

  if (!isBuilder && (!business || !leads || !revenue || !leadHandling || !topFix || !decisionMaker)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const qualified = !isBuilder &&
    QUALIFYING_BUSINESS.includes(business ?? '') &&
    QUALIFYING_REVENUE.includes(revenue ?? '') &&
    QUALIFYING_LEADS.includes(leads ?? '') &&
    QUALIFYING_DECISION.includes(decisionMaker ?? '');

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

  const contact = isBuilder ? (instagram ?? '') : (website ?? '');

  const row = {
    Name: name,
    Email: email,
    Phone: phone ?? '',
    Path: isBuilder ? 'builder' : 'services',
    'Business Type': business ?? '',
    'Leads Per Month': leads ?? '',
    'Monthly Revenue': revenue ?? '',
    'Lead Handling': leadHandling ?? '',
    'Top Fix': topFix ?? '',
    'Decision Maker': decisionMaker ?? '',
    Building: building ?? '',
    Experience: experience ?? '',
    Website: contact,
    Source: source,
    Qualified: isBuilder ? 'n/a' : qualified ? 'yes' : 'no',
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
    const error = await res.text();
    console.error('[Qualify] Baserow error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  return NextResponse.json({ success: true, qualified, path: isBuilder ? 'builder' : 'services' });
}
