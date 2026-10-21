// Prospect research in the dashboard (2026-10-21), replacing the routine's daily job 6 so an approved firm
// is ready to start in about a minute instead of at the next 13:00 run:
//   1. scan their website (lib/scan, fixed rules, free)
//   2. read their Instagram profile + 3 latest posts (Apify instagram-profile-scraper, about $0.003)
//   3. clear fails skip with the reason (no website, outside the US, no Instagram post in 30 days)
//   4. ONE AI call judges the profile and writes the research, 3 DM openers and E1-E4, from the facts above only
//   5. if the owner is named, one web search for their LinkedIn
// Writes nothing outside the dashboard and never contacts the firm. The same scan powers the leak report.

import { getJSON, putJSON, updateJSON } from '@/lib/store';
import { aiJSON, aiReady, aiSearchJSON } from '@/lib/ai';
import { scanSite, scanFacts, scanText, type Scan } from '@/lib/scan';
import { saveIgPosts } from '@/lib/igPosts';
import { qstashReady, scheduleAt } from '@/lib/qstash';
import type { Prospect, Drafts, Research } from '@/lib/outreach';

const P = 'outreach/prospects.json';
export const scanPath = (id: string) => `outreach/scans/${id}.json`;
export const getScan = (id: string) => getJSON<(Scan & { ig?: IgProfile }) | null>(scanPath(id), null);

export type IgProfile = {
  username: string; followers?: number; posts?: number; bio?: string; link?: string; private?: boolean; category?: string; fullName?: string;
  latest: { url: string; caption?: string; at?: string; image?: string }[];
};

/** Instagram profile + latest posts in one synchronous Apify run (capped at $0.05). */
export async function igProfile(handle: string): Promise<IgProfile | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return null;
  const res = await fetch('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?maxTotalChargeUsd=0.05&timeout=150', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ usernames: [handle] }), signal: AbortSignal.timeout(170_000),
  });
  if (!res.ok) throw new Error(`Apify Instagram profile → ${res.status}: ${(await res.text()).slice(0, 160)}`);
  type Item = { username?: string; fullName?: string; biography?: string; externalUrl?: string; followersCount?: number; postsCount?: number; private?: boolean; businessCategoryName?: string; latestPosts?: { url?: string; caption?: string; timestamp?: string; displayUrl?: string }[] };
  const it = ((await res.json()) as Item[]).find((x) => x.username?.toLowerCase() === handle.toLowerCase());
  if (!it) return null;
  const latest = (it.latestPosts ?? []).filter((p) => p.url).sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    .slice(0, 6).map((p) => ({ url: p.url!, caption: p.caption?.slice(0, 500), at: p.timestamp, image: p.displayUrl }));
  return { username: it.username!, fullName: it.fullName, followers: it.followersCount, posts: it.postsCount, bio: it.biography, link: it.externalUrl, private: it.private, category: it.businessCategoryName, latest };
}

const SYSTEM = `You research US interior design firms for Naufal, who runs Naunas (naunas.co.uk). Naunas installs "The Client System" for high-value project businesses: everything between an enquiry and a signed, onboarded client (fast replies, booking, follow-up, proposals, onboarding, referrals, knowing where clients come from).

You get FACTS (what a fixed scan saw on their website, each with the page it was seen on), the website TEXT, and their INSTAGRAM. Use only these. Never invent a fact, number, name, project, price or result. If something is not in the input, it is unknown.

THE PROFILE. pass=true only if ALL hold: based in the US; residential interior design (residential only, or residential plus commercial); full-service (design through procurement and installation, not decor or styling only, not e-design); a portfolio of whole-home, multi-room or renovation projects (not single-room refreshes); a team of roughly 3 to 20 people, owner-led (if team size can't be seen, team = "unknown"; that alone is NOT a skip); and ONE visible gap between enquiry and signed client (for example a form promising replies in several days, "DM to book" with no booking link, no reply promise at all, one form for every service, nothing telling them what happens after the form). SKIP (pass=false, with a short skipReason): stagers, decor-only, e-design, solo designers with no team, showrooms and retailers, trades (cabinets, flooring, wallpaper, kitchen and bath remodelers), commercial-only firms, firms outside the US, and firms that already show a strong enquiry system (instant booking plus a clear process).

RESEARCH (strings; "" when unknown): owner (full name, only if shown), firstName (owner's first name only if clearly shown), ownerEmail (only if published on their own site), team (e.g. "4: owner + 3 designers" or "unknown"), segment ("residential", "both" or "unknown"), fullService ("yes", "no" or "unknown"), portfolio (one line on the kind of projects), enquiryPath (how an enquiry reaches them today, from the facts), gap (the ONE visible gap, citing what was seen), minimum (exact wording only if published, else ""), detail (one specific real project, room, material or Instagram post the openers can reference), dossier (one line: who they are + the gap; mention ownerEmail if found).

WRITING, in Naufal's voice: warm, direct, specific, UK spelling, no hype, no exclamation marks, never salesy. NEVER square brackets, curly braces or placeholder text; if a fact is unknown, leave it out.
- subject: 3-7 lowercase words, specific to them (e.g. "the 5-day reply on your form"), never "quick question".
- steps: exactly 4 plain-text emails, each starting "Hi <firstName or there>," and signed "Naufal". E1 (day 0): one specific genuine observation about their work or business + one question about the gap; no pitch, no link; 50-90 words. E2 (day 3): a short new angle, a pattern from similar studios (no invented numbers); no link; 40-70 words. E3 (day 7): offer a 2-minute teardown video of their enquiry flow ("want me to send it?"); 30-50 words. E4 (day 14): close the loop politely, no guilt; mention the free Leak Map at naunas.co.uk; 30-50 words. No footer.
- dms: exactly 3 Instagram DM openers, each UNDER 25 words, no link, no pitch, no claim about other firms, ending in one easy question. Style A (detail): a specific compliment on the detail + a question about it. Style B (process): a light, genuine question about how new enquiries reach them today. Style C (peer): a short peer-level observation about their work or how they present it + a question.
For a skip, still return every field, with empty strings and empty arrays for the drafts.`;

const str = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['pass', 'skipReason', 'owner', 'firstName', 'ownerEmail', 'team', 'segment', 'fullService', 'portfolio', 'enquiryPath', 'gap', 'minimum', 'detail', 'dossier', 'subject', 'steps', 'dms'],
  properties: {
    pass: { type: 'boolean' }, skipReason: str, owner: str, firstName: str, ownerEmail: str, team: str,
    segment: { type: 'string', enum: ['residential', 'both', 'commercial', 'unknown'] }, fullService: { type: 'string', enum: ['yes', 'no', 'unknown'] },
    portfolio: str, enquiryPath: str, gap: str, minimum: str, detail: str, dossier: str, subject: str,
    steps: { type: 'array', items: str },
    dms: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['style', 'text'], properties: { style: { type: 'string', enum: ['A', 'B', 'C'] }, text: str } } },
  },
};
type Out = { pass: boolean; skipReason: string; owner: string; firstName: string; ownerEmail: string; team: string; segment: string; fullService: string; portfolio: string; enquiryPath: string; gap: string; minimum: string; detail: string; dossier: string; subject: string; steps: string[]; dms: { style: string; text: string }[] };

const daysAgo = (iso?: string) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : Infinity);
const igFacts = (ig: IgProfile | null, handle?: string) => !handle ? 'Instagram: none found.' : !ig ? `Instagram: @${handle} (profile could not be read).`
  : [`Instagram: @${ig.username}${ig.fullName ? ` (${ig.fullName})` : ''}, ${ig.followers ?? '?'} followers, ${ig.posts ?? '?'} posts${ig.private ? ', PRIVATE' : ''}${ig.category ? `, category ${ig.category}` : ''}`,
    `Bio: ${ig.bio ?? ''}`, `Bio link: ${ig.link ?? 'none'}`,
    ...ig.latest.slice(0, 4).map((p) => `Post ${p.at?.slice(0, 10) ?? ''} ${p.url}: ${(p.caption ?? '').replace(/\s+/g, ' ').slice(0, 300)}`)].join('\n');

async function findLinkedIn(owner: string, firm: string, city?: string): Promise<string | undefined> {
  const r = await aiSearchJSON<{ url: string }>(`Find the LinkedIn profile URL of ${owner}, owner of the interior design firm "${firm}"${city ? ` in ${city}` : ''}. Return only a linkedin.com/in/ URL whose name AND firm both match; otherwise return an empty string.`,
    'linkedin', { type: 'object', additionalProperties: false, required: ['url'], properties: { url: str } });
  return /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?$/.test(r.url.trim()) ? r.url.trim() : undefined;
}

async function patch(id: string, fn: (p: Prospect) => Prospect) {
  await updateJSON<Prospect[]>(P, [], (list) => list.map((p) => (p.id === id ? fn(p) : p)));
}
const skip = (id: string, reason: string) => patch(id, (p) => (p.status === 'approved'
  ? { ...p, status: 'rejected', researchAt: undefined, researchError: undefined, fitWhy: [`Skipped after research: ${reason.slice(0, 160)}`, ...p.fitWhy.filter((w) => !w.startsWith('Skipped after research'))] } : p));

/** Research one approved firm end to end. Returns what happened, for logs and the button. */
export async function researchProspect(id: string): Promise<'drafted' | 'skipped' | 'error' | 'not-approved'> {
  const p = (await getJSON<Prospect[]>(P, [])).find((x) => x.id === id);
  if (!p || p.status !== 'approved') return 'not-approved';
  try {
    if (!p.website) { await skip(id, 'no website'); return 'skipped'; }
    if (p.country && p.country.toUpperCase() !== 'US') { await skip(id, `outside the US (${p.country})`); return 'skipped'; }
    const scan = await scanSite(p.website);
    if (!scan.ok) { await skip(id, 'the website could not be loaded'); return 'skipped'; }
    const handle = (p.instagram || scan.instagram)?.replace(/^@/, '');
    const ig = handle ? await igProfile(handle).catch(() => null) : null;
    await putJSON(scanPath(id), { ...scan, ig: ig ?? undefined });
    const last = ig?.latest[0]?.at;
    if (ig && !ig.private && ig.latest.length && daysAgo(last) > 30) { await skip(id, `no Instagram post in ${daysAgo(last)} days`); return 'skipped'; }
    if (!aiReady()) throw new Error('OPENAI_API_KEY is not set, so drafts can’t be written here. Add it in Vercel to research from the dashboard.');

    const user = [`FIRM: ${p.firm}${p.city ? `, ${p.city}` : ''}${p.state ? `, ${p.state}` : ''}${p.rating ? ` · Google ${p.rating}★ (${p.reviews ?? 0} reviews)` : ''}${p.category ? ` · ${p.category}` : ''}`,
      `\nFACTS\n${scanFacts(scan)}`, `\n${igFacts(ig, handle)}`, `\nTEXT\n${scanText(scan)}`].join('\n');
    const out = await aiJSON<Out>(SYSTEM, user, 'prospect_research', SCHEMA, process.env.OPENAI_RESEARCH_MODEL ?? undefined);
    if (!out.pass) { await skip(id, out.skipReason || 'does not match the profile'); return 'skipped'; }

    const ownerLinkedin = scan.linkedin.find((u) => /\/in\//.test(u)) ?? (out.owner ? await findLinkedIn(out.owner, p.firm, p.city).catch(() => undefined) : undefined);
    const research: Research = {
      owner: out.owner || undefined, ownerLinkedin, companyLinkedin: scan.linkedin.find((u) => /\/company\//.test(u)),
      ownerEmail: out.ownerEmail && scan.emails.includes(out.ownerEmail.toLowerCase()) ? out.ownerEmail : undefined,
      igLastPost: last?.slice(0, 10), igFollowers: ig?.followers, team: out.team || 'unknown',
      segment: out.segment === 'unknown' ? undefined : (out.segment as Research['segment']), fullService: out.fullService === 'unknown' ? undefined : out.fullService === 'yes',
      portfolio: out.portfolio || undefined, enquiryPath: out.enquiryPath || undefined, gap: out.gap || undefined,
      minimum: out.minimum && scan.minimum ? out.minimum : undefined, detail: out.detail || undefined,
    };
    const dms = out.dms.filter((d) => d.text.trim()).slice(0, 3);
    const drafts: Drafts = { dossier: out.dossier, firstName: out.firstName || undefined, subject: out.subject, steps: out.steps.slice(0, 4), dm: dms[0]?.text, dms, research };
    if (!drafts.subject || drafts.steps.length < 4) throw new Error('The AI returned incomplete drafts. Try again.');
    await patch(id, (x) => (x.status === 'approved' ? {
      ...x, status: 'drafted', drafts, researchAt: undefined, researchError: undefined, researchedBy: 'dashboard',
      instagram: x.instagram || handle, email: x.email || scan.emails[0],
    } : x));
    if (handle && ig?.latest.length) await saveIgPosts(handle, ig.latest).catch(() => undefined);
    return 'drafted';
  } catch (err) {
    await patch(id, (x) => ({ ...x, researchAt: undefined, researchError: String((err as Error).message ?? err).slice(0, 200) }));
    return 'error';
  }
}

/**
 * Queue research for approved firms: one QStash job each, 20 seconds apart (each runs in its own function,
 * so 20 firms never time out). Without QStash, runs them one after another in the background of this request.
 */
export async function queueResearch(ids: string[], background: (fn: () => Promise<void>) => void): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date().toISOString();
  await updateJSON<Prospect[]>(P, [], (list) => list.map((p) => (ids.includes(p.id) && p.status === 'approved' ? { ...p, researchAt: now, researchError: undefined } : p)));
  if (qstashReady()) {
    await Promise.all(ids.map((id, i) => scheduleAt(new Date(Date.now() + i * 20_000), { research: id })));
  } else {
    background(async () => { for (const id of ids) await researchProspect(id); });
  }
  return ids.length;
}
