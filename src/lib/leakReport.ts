// Leak report (2026-10-21): for a firm that replied, a short page on naunas.co.uk/r/<token> showing the gaps
// that can be SEEN from outside, mapped to the 8 Leak Map layers, each with the page it was seen on, plus a
// Loom script and questions for the call (the layers that can't be seen from outside). Built from the same
// website scan as research; one AI call writes it from those facts only. Private until Naufal presses
// Publish; editable before then. Nothing is sent anywhere: he shares the link or records the Loom himself.

import { randomBytes } from 'node:crypto';
import { getJSON, putJSON } from '@/lib/store';
import { aiJSON, aiReady } from '@/lib/ai';
import { scanSite, scanFacts, scanText } from '@/lib/scan';
import { getScan, scanPath, igProfile } from '@/lib/research';
import { updateProspect, getProspects } from '@/lib/outreach';

export const LAYERS = ['Attention', 'Capture', 'Pipeline', 'Follow-up', 'Conversion', 'Fulfilment', 'Retention', 'Attribution'] as const;
export type Finding = { layer: number; title: string; seen: string; url: string; why: string; fix: string };
export type LeakReport = {
  token: string; prospectId: string; firm: string; firstName?: string; site: string;
  createdAt: string; updatedAt: string; published: boolean; publishedAt?: string;
  intro: string; findings: Finding[]; quickWin: string; askOnCall: string[]; loom: string;
};

const path = (token: string) => `reports/${token}.json`;
export const getReport = (token: string) => (/^[a-f0-9]{24}$/.test(token) ? getJSON<LeakReport | null>(path(token), null) : Promise.resolve(null));
export const saveReport = (r: LeakReport) => putJSON(path(r.token), { ...r, updatedAt: new Date().toISOString() });

const SYSTEM = `You write a short "leak report" for Naufal (Naunas, naunas.co.uk) to send a US interior design firm that replied to him. Naunas installs the system between an enquiry and a signed, onboarded client.

The 8 Leak Map layers: 1 Attention (people like the work, then find nowhere obvious to go next), 2 Capture (the enquiry waits for a reply), 3 Pipeline (enquiries scattered across DMs, email, calls), 4 Follow-up (maybes forgotten, no-shows), 5 Conversion (proposal to deposit), 6 Fulfilment (onboarding by hand), 7 Retention (no review or referral ask), 8 Attribution (no idea which source brings the best clients).

You get FACTS from a scan of their website and Instagram (each with the page it was seen on) and the site TEXT. Rules:
- Only findings that are SEEN in the facts or text. Each finding: layer (1-8), title (under 10 words), seen (exactly what was seen, quoting their wording when there is some), url (the page it was seen on, copied from the facts), why (why that loses enquiries or clients, in plain words), fix (what would fix it, one or two sentences, concrete).
- 3 to 5 findings, most costly first. Layers 3-7 usually can't be seen from outside: don't guess them; put them in askOnCall as questions instead (3 questions).
- NEVER invent numbers, percentages, statistics, prices, client results or facts about them or other firms. No "studies show". If a number isn't in their own text, don't use one.
- Tone: Naufal's voice, warm, direct, respectful of their work, UK spelling, no hype, no exclamation marks, never salesy. Address them by first name if known.
- intro: 2-3 sentences: what you looked at and that these are the gaps visible from outside.
- quickWin: one thing they could change this week themselves.
- loom: a 90-second Loom script as short lines: an opening line by name, then which page to open and what to point at for each finding (in order), then a close that asks one easy question. No placeholders, no brackets.`;

const str = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['intro', 'findings', 'quickWin', 'askOnCall', 'loom'],
  properties: {
    intro: str, quickWin: str, loom: str, askOnCall: { type: 'array', items: str },
    findings: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['layer', 'title', 'seen', 'url', 'why', 'fix'], properties: { layer: { type: 'integer' }, title: str, seen: str, url: str, why: str, fix: str } } },
  },
};

/** Build (or rebuild) the report for a prospect. Reuses the research scan when it's under a week old. */
export async function buildLeakReport(prospectId: string): Promise<LeakReport> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set.');
  const p = (await getProspects()).find((x) => x.id === prospectId);
  if (!p) throw new Error('Firm not found.');
  if (!p.website) throw new Error('This firm has no website to look at.');
  let scan = await getScan(prospectId);
  if (!scan || Date.now() - Date.parse(scan.fetchedAt) > 7 * 86_400_000) {
    const fresh = await scanSite(p.website);
    const ig = p.instagram ? await igProfile(p.instagram).catch(() => null) : null;
    scan = { ...fresh, ig: ig ?? scan?.ig };
    await putJSON(scanPath(prospectId), scan);
  }
  if (!scan.ok) throw new Error('Their website could not be loaded, so there is nothing to report on.');
  const ig = scan.ig;
  const r = p.drafts?.research;
  const user = [
    `FIRM: ${p.firm}${p.city ? `, ${p.city}` : ''}${p.state ? `, ${p.state}` : ''}. Owner: ${r?.owner ?? 'unknown'}. First name: ${p.drafts?.firstName ?? 'unknown'}.`,
    r?.gap ? `Gap noted in research: ${r.gap}` : '',
    `\nFACTS\n${scanFacts(scan)}`,
    ig ? `\nINSTAGRAM (https://instagram.com/${ig.username}): ${ig.followers ?? '?'} followers. Bio: ${ig.bio ?? ''}. Bio link: ${ig.link ?? 'none'}. Latest post: ${ig.latest[0]?.at?.slice(0, 10) ?? 'unknown'}.` : '',
    `\nTEXT\n${scanText(scan, 8000)}`,
  ].filter(Boolean).join('\n');
  const out = await aiJSON<Omit<LeakReport, 'token' | 'prospectId' | 'firm' | 'site' | 'createdAt' | 'updatedAt' | 'published'>>(SYSTEM, user, 'leak_report', SCHEMA);
  const urls = new Set([...scan.pages.map((x) => x.url), ...(ig ? [`https://instagram.com/${ig.username}`] : [])]);
  const findings = out.findings.filter((f) => f.layer >= 1 && f.layer <= 8 && f.seen.trim()).slice(0, 5).map((f) => ({ ...f, url: urls.has(f.url) ? f.url : scan!.site }));
  if (!findings.length) throw new Error('Nothing visible to report from outside. Ask the call questions instead.');

  const existing = p.reportToken ? await getReport(p.reportToken) : null;
  const now = new Date().toISOString();
  const report: LeakReport = {
    token: existing?.token ?? randomBytes(12).toString('hex'), prospectId, firm: p.firm, firstName: p.drafts?.firstName, site: scan.site,
    createdAt: existing?.createdAt ?? now, updatedAt: now, published: existing?.published ?? false, publishedAt: existing?.publishedAt,
    intro: out.intro, findings, quickWin: out.quickWin, askOnCall: out.askOnCall.slice(0, 4), loom: out.loom,
  };
  await putJSON(path(report.token), report);
  if (!p.reportToken) await updateProspect(prospectId, { reportToken: report.token });
  return report;
}
