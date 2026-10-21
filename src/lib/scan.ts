// Website scan (2026-10-21): the fixed, no-AI part of prospect research, pre-call research and the leak
// report. Fetches the home page plus up to 4 useful inner pages (contact, about/team, services/process,
// portfolio) and pulls out what can be SEEN from outside: forms, reply promises, booking/chat tools,
// tracking, emails, social links, minimums, service words. Every signal keeps the page it came from, so
// anything built on top can cite evidence instead of guessing. Never submits a form or contacts anyone.

export type ScanPage = { url: string; kind: 'home' | 'contact' | 'about' | 'services' | 'portfolio'; title: string; text: string };
export type Seen = { what: string; url: string };
export type Scan = {
  ok: boolean; error?: string; site: string; fetchedAt: string;
  pages: ScanPage[];
  forms: { url: string; fields: number; labels: string[]; provider?: string }[];
  replyPromise?: Seen; minimum?: Seen;
  booking: Seen[]; chat: Seen[]; tracking: string[]; platform?: string;
  emails: string[]; phones: string[];
  instagram?: string; linkedin: string[]; houzz?: string; facebook?: string; pinterest?: string;
  newsletter: boolean; testimonials: boolean; viewport: boolean;
  services: string[]; usSignals: string[]; portfolioCta?: boolean;
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** http(s) only, and never an internal address (the URLs come from Maps listings and booking forms). */
export function safeUrl(raw?: string): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return null;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':')) return null; // no IP literals at all
    return u;
  } catch { return null; }
}

async function get(url: string, ms = 9000): Promise<{ url: string; html: string } | null> {
  const u = safeUrl(url);
  if (!u) return null;
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(ms), cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null;
    if (!safeUrl(res.url)) return null;
    const html = (await res.text()).slice(0, 1_500_000);
    return { url: res.url, html };
  } catch { return null; }
}

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;/g, '’').replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, ' ');
export function visibleText(html: string): string {
  return decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<svg[\s\S]*?<\/svg>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h\d|\/section)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
const titleOf = (html: string) => decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim().slice(0, 120);

function links(html: string, base: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try { out.push({ href: new URL(m[1], base).toString(), text: visibleText(m[2]).slice(0, 60).toLowerCase() }); } catch { /* bad href */ }
  }
  return out;
}

const KINDS: [ScanPage['kind'], RegExp][] = [
  ['contact', /contact|inquir|enquir|get-in-touch|start|work-with|book|consult/i],
  ['about', /about|team|studio|who-we-are|our-story|people/i],
  ['services', /services|process|approach|how-we-work|offer|full-service|what-we-do|pricing|investment/i],
  ['portfolio', /portfolio|projects|work|gallery|residential/i],
];

/** One sentence around the first match, for evidence. */
function sentence(text: string, re: RegExp): string | undefined {
  const m = re.exec(text);
  if (!m) return undefined;
  const start = Math.max(text.lastIndexOf('.', m.index) + 1, text.lastIndexOf('\n', m.index) + 1, m.index - 160);
  let end = text.slice(m.index).search(/[.!?\n]/);
  end = end < 0 ? Math.min(text.length, m.index + 160) : m.index + end + 1;
  return text.slice(start, Math.min(end, m.index + 200)).trim();
}

const BOOKING: [string, RegExp][] = [
  ['Calendly', /calendly\.com/i], ['Cal.com', /cal\.com\//i], ['Acuity', /acuityscheduling\.com|as\.me\//i], ['HubSpot meetings', /meetings\.hubspot\.com/i],
  ['HoneyBook scheduler', /honeybook\.com\/.*(schedul|book)/i], ['Dubsado scheduler', /dubsado\.com\/public\/appointment/i], ['Square appointments', /squareup\.com\/appointments/i],
  ['Squarespace scheduling', /squarespacescheduling\.com/i], ['TidyCal', /tidycal\.com/i], ['Google booking page', /calendar\.app\.google|calendar\.google\.com\/calendar\/appointments/i],
];
const CHAT: [string, RegExp][] = [
  ['Intercom', /widget\.intercom\.io|intercomcdn/i], ['Drift', /js\.driftt\.com/i], ['Tawk.to', /embed\.tawk\.to/i], ['Crisp', /client\.crisp\.chat/i],
  ['Tidio', /code\.tidio\.co/i], ['LiveChat', /cdn\.livechatinc\.com/i], ['HubSpot chat', /js\.usemessages\.com/i], ['Facebook Messenger chat', /customerchat/i],
];
const TRACKING: [string, RegExp][] = [
  ['Meta pixel', /connect\.facebook\.net\/[^"']*fbevents|fbq\(['"]init/i], ['Google Analytics', /gtag\/js\?id=G-|google-analytics\.com\/(analytics|ga)\.js|['"]G-[A-Z0-9]{6,}['"]/i],
  ['Google Tag Manager', /googletagmanager\.com\/gtm\.js/i], ['Google Ads tag', /['"]AW-\d{6,}/i], ['HubSpot tracking', /js\.hs-scripts\.com|js\.hs-analytics\.net/i],
  ['Pinterest tag', /s\.pinimg\.com\/ct\/core\.js|pintrk\(/i], ['Microsoft Clarity', /clarity\.ms\/tag/i], ['Hotjar', /static\.hotjar\.com/i],
];
const FORM_PROVIDERS: [string, RegExp][] = [
  ['HoneyBook', /honeybook/i], ['Dubsado', /dubsado/i], ['Jotform', /jotform/i], ['Typeform', /typeform/i], ['HubSpot form', /hsforms|hbspt\.forms/i],
  ['Gravity Forms', /gform_/i], ['Contact Form 7', /wpcf7/i], ['Squarespace form', /sqs-block-form|form-block|formSubmitButtonText/i], ['Wix form', /wixforms|wix-forms/i], ['Google Form', /docs\.google\.com\/forms/i],
];
const PLATFORM: [string, RegExp][] = [
  ['Squarespace', /squarespace/i], ['Wix', /wixstatic|wix\.com/i], ['Showit', /showit/i], ['WordPress', /wp-content|wp-includes/i], ['Shopify', /cdn\.shopify/i], ['Webflow', /webflow/i],
];
const SERVICES: [string, RegExp][] = [
  ['full-service', /full[- ]service/i], ['e-design', /\be-?design\b|virtual design|online design/i], ['styling only', /\bstyling (services|only)\b|decorat(ing|or) only/i],
  ['procurement', /procure/i], ['installation', /install(ation)?\b/i], ['renovation', /renovat|remodel/i], ['new construction', /new (build|construction)|ground[- ]up/i],
  ['residential', /residential|homes?\b/i], ['commercial', /commercial|hospitality|office|retail spaces?/i], ['staging', /\bstag(ing|er)\b/i],
  ['kitchen and bath', /kitchen (and|&) bath/i], ['furnishing', /furnish/i],
];
const REPLY = /(respond|reply|get back|be in touch|hear (back )?from us|contact you|reach out)[^.\n]{0,60}?(within|in (the next )?|up to )\s*(\d+|one|two|three|four|five|a few|24|48|72)[-\s]*(business |working )?(hours?|days?|weeks?)|(\d+|one|two|three|24|48|72)[-\s]*(business |working )?(hours?|days?)[^.\n]{0,40}(respond|reply|get back|response)/i;
const MINIMUM = /(project )?minimum[^.\n]{0,80}\$\s?[\d,]+[kK]?|\$\s?[\d,]+[kK]?[^.\n]{0,40}minimum|(design fees?|consultation|investment)[^.\n]{0,40}(start|begin)s? at[^.\n]{0,20}\$\s?[\d,]+|(paid|\$\s?\d[\d,]*) (initial )?consultation/i;
const US = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}\b|\(\d{3}\)\s?\d{3}-\d{4}|\b\d{3}[.-]\d{3}[.-]\d{4}\b/;

const handle = (url: string, host: RegExp) => {
  const m = new RegExp(`${host.source}/([A-Za-z0-9._-]+)`, 'i').exec(url);
  return m && !/^(p|reel|explore|share|sharer|tr|intent|pin|plugins|dialog|stories)$/i.test(m[1]) ? m[1] : undefined;
};

/** Scan a firm's website. ok=false when the home page can't be fetched (dead site, blocked, not HTML). */
export async function scanSite(website: string): Promise<Scan> {
  const fetchedAt = new Date().toISOString();
  const empty: Scan = { ok: false, site: website, fetchedAt, pages: [], forms: [], booking: [], chat: [], tracking: [], emails: [], phones: [], linkedin: [], newsletter: false, testimonials: false, viewport: false, services: [], usSignals: [] };
  const home = await get(website, 15000);
  if (!home) return { ...empty, error: 'The website could not be loaded.' };
  const host = new URL(home.url).hostname.replace(/^www\./, '');
  const all = links(home.html, home.url);
  const picked = new Map<ScanPage['kind'], string>();
  for (const [kind, re] of KINDS) {
    const hit = all.find((l) => { try { const u = new URL(l.href); return u.hostname.replace(/^www\./, '') === host && u.pathname !== '/' && !/login|signin|account|cart|checkout|privacy|terms|\.(pdf|jpe?g|png)$/i.test(u.pathname) && (re.test(u.pathname) || re.test(l.text)) && ![...picked.values()].includes(l.href); } catch { return false; } });
    if (hit) picked.set(kind, hit.href);
  }
  const inner = await Promise.all([...picked.entries()].map(async ([kind, url]) => ({ kind, r: await get(url, 8000) })));
  // Drop inner pages that redirected to a login wall (e.g. a members-only bookings page).
  const raw = [{ kind: 'home' as const, r: home }, ...inner].filter((x): x is { kind: ScanPage['kind']; r: { url: string; html: string } } => !!x.r && (x.kind === 'home' || !/login|signin|account/i.test(new URL(x.r.url).pathname)));

  const pages: ScanPage[] = raw.map(({ kind, r }) => ({ url: r.url, kind, title: titleOf(r.html), text: visibleText(r.html).slice(0, 3500) }));
  const htmlAll = raw.map((x) => x.r.html).join('\n');
  const hrefs = raw.flatMap(({ r }) => links(r.html, r.url).map((l) => l.href));
  const seen = (pairs: [string, RegExp][]) => pairs.flatMap(([what, re]) => { const p = raw.find(({ r }) => re.test(r.html)); return p ? [{ what, url: p.r.url }] : []; });

  const forms = raw.flatMap(({ r }) => [...r.html.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((m) => {
    const f = m[0];
    const fields = [...f.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)].filter((x) => !/type=["']?(hidden|submit|button)/i.test(x[2]));
    const labels = [...f.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/gi)].map((x) => visibleText(x[1]).slice(0, 40)).filter(Boolean).slice(0, 12);
    return { url: r.url, fields: fields.length, labels, provider: FORM_PROVIDERS.find(([, re]) => re.test(f))?.[0], raw: f };
  }).filter((f) => !/type=["']?password/i.test(f.raw) && f.fields >= 2 && !(f.fields <= 2 && /search/i.test(f.labels.join(' '))))
    .map(({ raw: _raw, ...f }): Scan['forms'][number] => f));
  // Embedded form tools (iframes/scripts) count as a form even without a <form> tag.
  for (const { r } of raw) {
    const prov = FORM_PROVIDERS.find(([n, re]) => ['HoneyBook', 'Dubsado', 'Jotform', 'Typeform', 'HubSpot form', 'Google Form', 'Squarespace form', 'Wix form'].includes(n) && re.test(r.html));
    if (prov && !forms.some((f) => f.url === r.url)) forms.push({ url: r.url, fields: 0, labels: [], provider: prov[0] });
  }

  const textOf = (p: ScanPage) => p.text;
  const findSeen = (re: RegExp): Seen | undefined => { for (const p of pages) { const s = sentence(textOf(p), re); if (s) return { what: s, url: p.url }; } return undefined; };
  const ig = hrefs.map((h) => handle(h, /instagram\.com/)).find(Boolean);
  const textAll = pages.map(textOf).join('\n');
  const emails = [...new Set([...htmlAll.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1]).toLowerCase())
    .concat([...textAll.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((m) => m[0].toLowerCase())))]
    .filter((e) => !/\.(png|jpe?g|gif|webp|svg)$|sentry|wixpress|example\.|godaddy|domain\.com/.test(e)).slice(0, 5);
  const portfolio = pages.find((p) => p.kind === 'portfolio');

  return {
    ok: true, site: home.url, fetchedAt, pages, forms,
    replyPromise: findSeen(REPLY), minimum: findSeen(MINIMUM),
    booking: seen(BOOKING), chat: seen(CHAT), tracking: TRACKING.filter(([, re]) => re.test(htmlAll)).map(([n]) => n),
    platform: PLATFORM.find(([, re]) => re.test(home.html))?.[0],
    emails, phones: [...new Set([...htmlAll.matchAll(/tel:([+\d().\s-]{7,20})/gi)].map((m) => m[1].trim()))].slice(0, 3),
    instagram: ig, linkedin: [...new Set(hrefs.filter((h) => /linkedin\.com\/(in|company)\//i.test(h)).map((h) => h.split('?')[0]))].slice(0, 3),
    houzz: hrefs.find((h) => /houzz\.com\//i.test(h)), facebook: hrefs.find((h) => /facebook\.com\/(?!sharer|tr|plugins|dialog)/i.test(h)), pinterest: hrefs.find((h) => /pinterest\.com\//i.test(h)),
    newsletter: /newsletter|subscribe|join (our|the) (list|mailing)/i.test(textAll) && /type=["']?email/i.test(htmlAll),
    testimonials: /testimonial|kind words|what (our )?clients say|reviews?\b/i.test(textAll),
    viewport: /<meta[^>]+name=["']viewport/i.test(home.html),
    services: SERVICES.filter(([, re]) => re.test(textAll)).map(([n]) => n),
    usSignals: [...new Set([...textAll.matchAll(new RegExp(US.source, 'g'))].map((m) => m[0]))].slice(0, 3),
    portfolioCta: portfolio ? /contact|inquire|enquire|start (a|your) project|work with|book/i.test(portfolio.text.slice(-1200)) : undefined,
  };
}

/** Compact, labelled summary of a scan for an AI prompt (facts only, each with where it was seen). */
export function scanFacts(s: Scan): string {
  if (!s.ok) return `Website: could not be loaded (${s.site}).`;
  const L: string[] = [`Website: ${s.site}${s.platform ? ` (built on ${s.platform})` : ''}`];
  L.push(`Pages read: ${s.pages.map((p) => `${p.kind} ${p.url}`).join(' | ')}`);
  L.push(s.forms.length ? `Enquiry forms: ${s.forms.map((f) => `${f.url} (${f.fields ? `${f.fields} fields${f.labels.length ? `: ${f.labels.join(', ')}` : ''}` : 'embedded'}${f.provider ? `, ${f.provider}` : ''})`).join(' | ')}` : 'Enquiry forms: none found on the pages read.');
  L.push(s.replyPromise ? `Reply promise: "${s.replyPromise.what}" (${s.replyPromise.url})` : 'Reply promise: none found (nothing tells an enquirer when they will hear back).');
  L.push(s.booking.length ? `Booking tools: ${s.booking.map((b) => `${b.what} (${b.url})`).join(', ')}` : 'Booking tools: none found (no way to book a call directly).');
  L.push(s.chat.length ? `Live chat: ${s.chat.map((c) => c.what).join(', ')}` : 'Live chat: none.');
  L.push(`Tracking installed: ${s.tracking.length ? s.tracking.join(', ') : 'none detected'}`);
  if (s.minimum) L.push(`Published minimum or fee: "${s.minimum.what}" (${s.minimum.url})`);
  L.push(`Email capture / newsletter: ${s.newsletter ? 'yes' : 'none found'}. Testimonials or reviews on site: ${s.testimonials ? 'yes' : 'none found'}.`);
  if (s.portfolioCta !== undefined) L.push(`Portfolio page ends with a call to action: ${s.portfolioCta ? 'yes' : 'no'}`);
  L.push(`Service words on the site: ${s.services.join(', ') || 'none matched'}`);
  L.push(`Contact: emails ${s.emails.join(', ') || 'none'}; phones ${s.phones.join(', ') || 'none'}; Instagram ${s.instagram ? `@${s.instagram}` : 'not linked'}; LinkedIn ${s.linkedin.join(', ') || 'not linked'}; Houzz ${s.houzz ? 'yes' : 'no'}`);
  if (s.usSignals.length) L.push(`US address/phone seen: ${s.usSignals.join(', ')}`);
  L.push(`Mobile viewport tag: ${s.viewport ? 'yes' : 'missing'}`);
  return L.join('\n');
}

/** Page text for the AI, trimmed to a budget. */
export const scanText = (s: Scan, budget = 9000) => s.pages.map((p) => `--- ${p.kind.toUpperCase()} ${p.url}\n${p.text}`).join('\n\n').slice(0, budget);
