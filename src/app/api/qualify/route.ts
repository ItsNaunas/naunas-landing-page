import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';

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

  const created = (await res.json()) as { id?: number };
  const rowId = created.id;

  if (!isBuilder && qualified && rowId) {
    after(() =>
      generateBrief({
        rowId,
        tableId,
        token,
        website: typeof website === 'string' ? website.trim() : '',
        business: business ?? '',
        leads: leads ?? '',
        revenue: revenue ?? '',
        leadHandling: leadHandling ?? '',
        topFix: topFix ?? '',
        decisionMaker: decisionMaker ?? '',
      })
    );
  }

  return NextResponse.json({ success: true, qualified, path: isBuilder ? 'builder' : 'services' });
}

interface BriefInput {
  rowId: number;
  tableId: string;
  token: string;
  website: string;
  business: string;
  leads: string;
  revenue: string;
  leadHandling: string;
  topFix: string;
  decisionMaker: string;
}

const IG_PATTERN = /(^@)|instagram\.com/i;

function looksLikeInstagram(value: string): boolean {
  return IG_PATTERN.test(value);
}

function normaliseUrl(value: string): string | null {
  if (looksLikeInstagram(value)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

async function scrapeSite(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return htmlToText(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

async function generateBrief(input: BriefInput): Promise<void> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[Qualify] Missing OPENAI_API_KEY — skipping brief');
      return;
    }

    let siteText: string | null = null;
    let siteNote = '';
    if (!input.website.trim()) {
      siteNote = 'No website or handle given — brief built from form answers only. Worth a quick manual look before the call.';
    } else {
      const url = normaliseUrl(input.website);
      if (url) {
        siteText = await scrapeSite(url);
        if (!siteText) siteNote = 'Site fetch failed — brief built from form answers only.';
      } else {
        siteNote = 'Instagram-only (no website) — enrich from their IG before the call; brief here is from answers only.';
      }
    }

    const prompt = [
      'You are prepping Naunas for a sales call with an inbound qualified lead.',
      'Produce a TIGHT pre-call brief, max ~180 words, sharp and sales-useful (not generic).',
      'Use exactly these labelled parts:',
      '**Who they are** (1 line) · **Likely leaks** (2-3 bullets, specific to what you can infer) · **Probe on the call** (2 questions) · **Pitch angle** (1 line) · **Opening line** (1 sentence Naunas can literally say) · **Red flags** (if any).',
      '',
      'LEAD FORM ANSWERS:',
      `- Business type: ${input.business}`,
      `- Leads/month: ${input.leads}`,
      `- Monthly revenue: ${input.revenue}`,
      `- How they handle leads now: ${input.leadHandling}`,
      `- Top thing they want fixed: ${input.topFix}`,
      `- Decision maker: ${input.decisionMaker}`,
      `- Website/handle: ${input.website}`,
      '',
      siteNote ? `NOTE: ${siteNote}` : '',
      siteText ? `SCRAPED SITE TEXT:\n${siteText}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!aiRes.ok) {
      console.error('[Qualify] OpenAI error:', await aiRes.text());
      return;
    }

    const aiJson = (await aiRes.json()) as OpenAIChatResponse;
    const brief = aiJson.choices?.[0]?.message?.content?.trim();
    if (!brief) {
      console.error('[Qualify] OpenAI returned empty brief');
      return;
    }

    const patchRes = await fetch(
      `https://api.baserow.io/api/database/rows/table/${input.tableId}/${input.rowId}/?user_field_names=true`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Token ${input.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ Brief: brief }),
      }
    );
    if (!patchRes.ok) {
      console.error('[Qualify] Baserow PATCH error:', await patchRes.text());
    }

    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      const slackRes = await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: brief }),
      });
      if (!slackRes.ok) {
        console.error('[Qualify] Slack webhook error:', await slackRes.text());
      }
    }
  } catch (err) {
    console.error('[Qualify] Brief generation failed:', err);
  }
}
