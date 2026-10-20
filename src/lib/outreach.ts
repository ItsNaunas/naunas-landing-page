import { getJSON, putJSON, updateJSON } from '@/lib/store';
import { startMapsSearch, getRun, datasetItems, type Place } from '@/lib/apify';
import { crmSearch, upsertContact, linkCompany, updateContact, opsNotes, hubspotUrl, domainOf } from '@/lib/hubspot';
import { sendEmail } from '@/lib/send';
import { repliesFrom, inboxReady } from '@/lib/inbox';
import { logEvent } from '@/lib/events';
import { notify, line } from '@/lib/alert';
import { FUNNEL } from '@/config/funnel';
import { hasPlaceholder } from '@/lib/dmLint';

// Cold outreach, run from /dashboard/outreach. Replaces the vault email engine for NEW prospects.
//   find (Apify Google Maps) → you approve → the Claude routine drafts (research line, E1–E4, IG DM) →
//   you review/edit → scheduled → the daily cron sends E1–E4 (days 0/3/7/14, threaded, capped) and stops
//   the moment they reply. Prospects live in Blob until E1 goes out; only then do they enter HubSpot
//   (the engine's rule: never write a firm to the CRM before it has actually been emailed).
// Nothing sends unless settings.sending is on (switched from the dashboard).

export type ProspectStatus = 'new' | 'rejected' | 'approved' | 'drafted' | 'scheduled' | 'active' | 'replied' | 'finished' | 'stopped' | 'bounced';
/** dms: up to 3 opener styles from the routine (A/B/C test); dm stays the single/edited opener. */
export type Drafts = { dossier?: string; firstName?: string; subject: string; steps: string[]; dm?: string; dms?: { style: string; text: string }[] };
export type Prospect = {
  id: string; firm: string; website?: string; domain?: string; email?: string; instagram?: string; phone?: string;
  city?: string; state?: string; country?: string; tz: string; rating?: number; reviews?: number; category?: string; mapsUrl?: string;
  fit: number; fitWhy: string[]; searchId: string; createdAt: string; status: ProspectStatus;
  drafts?: Drafts;
  sent?: { step: number; at: string; messageId: string }[];
  startedAt?: string; repliedAt?: string; dmSentAt?: string; warmedAt?: string; contactId?: string;
  /** Instagram sequence: opener style used, the two follow-ups, and a reply on Instagram (stops everything). */
  dmStyle?: string; fu1At?: string; fu2At?: string; igRepliedAt?: string;
};
export type Search = { id: string; term: string; location: string; max: number; runId: string; datasetId: string; status: string; createdAt: string; found?: number; added?: number; costUsd?: number };
export type OutreachSettings = { sending: boolean; dailyNew: number; dailyTotal: number; monthlyCapUsd: number };

const P = 'outreach/prospects.json';
const S = 'outreach/searches.json';
const SET = 'outreach/settings.json';
export const STEP_DAYS = [0, 3, 7, 14];
export const STEP_LABEL = ['E1 · first email', 'E2 · new angle', 'E3 · offer the teardown', 'E4 · close the loop'];
const DEFAULT_SETTINGS: OutreachSettings = { sending: false, dailyNew: 15, dailyTotal: 25, monthlyCapUsd: 10 };
const FOOTER = '\n\nNaunas · naunas.co.uk\n\nNot relevant? Reply "no" and I won\'t follow up.';

export const getProspects = () => getJSON<Prospect[]>(P, []);
export const saveProspects = (list: Prospect[]) => putJSON(P, list);
export const getSearches = () => getJSON<Search[]>(S, []);
export const getSettings = async () => ({ ...DEFAULT_SETTINGS, ...(await getJSON<Partial<OutreachSettings>>(SET, {})) });
export const saveSettings = (s: OutreachSettings) => putJSON(SET, s);
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

export async function updateProspect(id: string, patch: Partial<Prospect>) {
  await updateJSON<Prospect[]>(P, [], (list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

// ---------------------------------------------------------------- Find

const US_TZ: Record<string, string> = {
  CT: 'America/New_York', DE: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/New_York', NH: 'America/New_York', NJ: 'America/New_York', NY: 'America/New_York', NC: 'America/New_York',
  OH: 'America/New_York', PA: 'America/New_York', RI: 'America/New_York', SC: 'America/New_York', VT: 'America/New_York', VA: 'America/New_York',
  WV: 'America/New_York', DC: 'America/New_York', IN: 'America/New_York', KY: 'America/New_York',
  AL: 'America/Chicago', AR: 'America/Chicago', IL: 'America/Chicago', IA: 'America/Chicago', KS: 'America/Chicago', LA: 'America/Chicago',
  MN: 'America/Chicago', MS: 'America/Chicago', MO: 'America/Chicago', NE: 'America/Chicago', ND: 'America/Chicago', OK: 'America/Chicago',
  SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago', WI: 'America/Chicago',
  AZ: 'America/Phoenix', CO: 'America/Denver', ID: 'America/Denver', MT: 'America/Denver', NM: 'America/Denver', UT: 'America/Denver', WY: 'America/Denver',
  CA: 'America/Los_Angeles', NV: 'America/Los_Angeles', OR: 'America/Los_Angeles', WA: 'America/Los_Angeles', AK: 'America/Anchorage', HI: 'Pacific/Honolulu',
};
const STATE_ABBR: Record<string, string> = {
  texas: 'TX', tennessee: 'TN', arizona: 'AZ', california: 'CA', florida: 'FL', georgia: 'GA', 'new york': 'NY', illinois: 'IL', colorado: 'CO',
  washington: 'WA', oregon: 'OR', massachusetts: 'MA', 'north carolina': 'NC', 'south carolina': 'SC', virginia: 'VA', utah: 'UT', nevada: 'NV',
  ohio: 'OH', michigan: 'MI', pennsylvania: 'PA', 'new jersey': 'NJ', minnesota: 'MN', missouri: 'MO', louisiana: 'LA', alabama: 'AL', kentucky: 'KY',
};
function tzFor(p: Place) {
  if (p.countryCode && p.countryCode.toUpperCase() === 'GB') return 'Europe/London';
  const st = (p.state ?? '').trim();
  const abbr = st.length === 2 ? st.toUpperCase() : STATE_ABBR[st.toLowerCase()];
  return (abbr && US_TZ[abbr]) || 'America/Chicago';
}

const NOT_A_PRACTICE = /stag(er|ing)|furniture|flooring|floor covering|cabinet|wallpaper|college|school|universit|supply|showroom|blind|curtain|drape|rug|carpet|store|shop|outlet|franchise|paint|countertop|tile|lighting store/i;

/** 0-7: email (2) + Instagram (2) + 10+ reviews (1) + 4.5+ rating (1) + real design practice (1). */
export function scorePlace(p: Place) {
  const why: string[] = [];
  let fit = 0;
  const cat = `${p.categoryName ?? ''} ${(p.categories ?? []).join(' ')} ${p.title}`;
  if (NOT_A_PRACTICE.test(cat)) return { fit: 0, why: ['Not a design practice (store, stager or trade)'] };
  fit += 1; why.push('Design practice');
  if (p.emails?.length) { fit += 2; why.push('Direct email'); } else why.push('No email found');
  if (p.instagrams?.length) { fit += 2; why.push('On Instagram'); } else why.push('No Instagram found');
  if ((p.reviewsCount ?? 0) >= 10) { fit += 1; why.push(`${p.reviewsCount} reviews`); }
  if ((p.totalScore ?? 0) >= 4.5) { fit += 1; why.push(`${p.totalScore}★`); }
  return { fit, why };
}

const igHandle = (url?: string) => url?.match(/instagram\.com\/([A-Za-z0-9._]+)/)?.[1];

export async function startSearch(term: string, location: string, max: number) {
  const settings = await getSettings();
  const searches = await getSearches();
  const month = new Date().toISOString().slice(0, 7);
  const spent = searches.filter((s) => s.createdAt.startsWith(month)).reduce((t, s) => t + (s.costUsd ?? (s.max * 0.007)), 0);
  const perRun = Math.round(max * 0.009 * 100) / 100 + 0.05;
  if (spent + perRun > settings.monthlyCapUsd) throw new Error(`This would pass your $${settings.monthlyCapUsd} monthly Apify cap ($${spent.toFixed(2)} used).`);
  const run = await startMapsSearch({ term, location, max, maxChargeUsd: perRun });
  const s: Search = { id: run.id, term, location, max, runId: run.id, datasetId: run.defaultDatasetId, status: run.status, createdAt: new Date().toISOString() };
  await putJSON(S, [s, ...searches].slice(0, 50));
  return s;
}

/** Check running searches; import finished ones into the queue (deduped against the queue and HubSpot). */
export async function syncSearches(): Promise<Search[]> {
  const searches = await getSearches();
  const pending = searches.filter((s) => s.status === 'READY' || s.status === 'RUNNING');
  if (!pending.length) return searches;
  for (const s of pending) {
    const run = await getRun(s.runId).catch(() => null);
    if (!run) continue;
    s.status = run.status;
    s.costUsd = run.usageTotalUsd;
    if (run.status !== 'SUCCEEDED') continue;
    const places = await datasetItems(s.datasetId);
    const existing = await getProspects();
    const known = new Set(existing.flatMap((p) => [p.domain, p.email].filter(Boolean) as string[]));
    const fresh: Prospect[] = [];
    for (const pl of places) {
      if (pl.permanentlyClosed) continue;
      const domain = domainOf(pl.website) ?? pl.domain;
      const email = pl.emails?.find((e) => !/example|wixpress|sentry|godaddy/i.test(e))?.toLowerCase();
      if ((domain && known.has(domain)) || (email && known.has(email))) continue;
      // Already in HubSpot (a lead, client or someone who said no) → never cold-pitch.
      if (email) {
        const inCrm = await crmSearch('contacts', [{ propertyName: 'email', operator: 'EQ', value: email }]).catch(() => null);
        if (inCrm?.total) continue;
      }
      const { fit, why } = scorePlace(pl);
      fresh.push({
        id: pl.placeId ?? `${slug(pl.title)}-${domain ?? Math.random().toString(36).slice(2, 8)}`,
        firm: pl.title, website: pl.website, domain, email, instagram: igHandle(pl.instagrams?.[0]), phone: pl.phone,
        city: pl.city ?? undefined, state: pl.state ?? undefined, country: pl.countryCode ?? undefined, tz: tzFor(pl),
        rating: pl.totalScore ?? undefined, reviews: pl.reviewsCount ?? undefined, category: pl.categoryName ?? undefined, mapsUrl: pl.url,
        fit, fitWhy: why, searchId: s.id, createdAt: new Date().toISOString(), status: fit === 0 ? 'rejected' : 'new',
      });
      if (domain) known.add(domain);
      if (email) known.add(email);
    }
    s.found = places.length;
    s.added = fresh.filter((p) => p.status === 'new').length;
    await updateJSON<Prospect[]>(P, [], (list) => [...list, ...fresh]);
    await logEvent('lead', `Prospect search done · ${s.term} in ${s.location}: ${s.added} to review`, '/dashboard/outreach');
  }
  await putJSON(S, searches);
  return searches;
}

// ---------------------------------------------------------------- Drafts (written by the Claude routine)

type DraftNote = { runAt: string; drafts: (Drafts & { id: string })[] };

/** Pull new drafts the routine logged (NAUNAS_OUTREACH_DRAFTS notes) onto approved prospects. */
export async function ingestDrafts(): Promise<number> {
  const notes = await opsNotes<DraftNote>(FUNNEL.routine.logEmail, 'NAUNAS_OUTREACH_DRAFTS', 10).catch(() => [] as DraftNote[]);
  const byId = new Map(notes.flatMap((n) => n.drafts ?? []).map((d) => [d.id, d]));
  if (!byId.size) return 0;
  let n = 0;
  await updateJSON<Prospect[]>(P, [], (list) => list.map((p) => {
    const d = byId.get(p.id);
    if (p.status !== 'approved' || !d || !d.subject || !d.steps?.length) return p;
    n++;
    return { ...p, status: 'drafted', drafts: { dossier: d.dossier, firstName: d.firstName, subject: d.subject, steps: d.steps.slice(0, 4), dm: d.dm ?? d.dms?.[0]?.text, dms: d.dms?.slice(0, 3) } };
  }));
  return n;
}

// ---------------------------------------------------------------- Send (daily cron)

const localHour = (tz: string) => Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: tz }));
const day = (iso: string) => iso.slice(0, 10);

export type RunResult = { sent: number; newFirms: number; replies: number; skipped: string[]; errors: string[] };

export async function runOutreach(opts: { dryRun?: boolean } = {}): Promise<RunResult> {
  const result: RunResult = { sent: 0, newFirms: 0, replies: 0, skipped: [], errors: [] };
  const settings = await getSettings();
  await ingestDrafts().catch((e) => result.errors.push(`drafts: ${e instanceof Error ? e.message : e}`));
  let list = await getProspects();

  // 1. Replies stop the sequence (and ping Telegram); the funnel routine drafts the answer.
  const live = list.filter((p) => p.status === 'active' && p.email && p.startedAt);
  if (live.length && inboxReady()) {
    try {
      const earliest = new Date(Math.min(...live.map((p) => Date.parse(p.startedAt!))));
      const replies = await repliesFrom(live.map((p) => p.email!), earliest);
      for (const p of live) {
        const r = replies.find((m) => m.from === p.email && Date.parse(m.date) > Date.parse(p.startedAt!));
        if (!r) continue;
        result.replies++;
        p.status = /mailer-daemon|postmaster/i.test(r.from) ? 'bounced' : 'replied';
        p.repliedAt = r.date;
        if (opts.dryRun) continue;
        if (p.contactId) await updateContact(p.contactId, { naunas_outreach_status: p.status === 'bounced' ? 'bounced' : 'replied' }).catch(() => {});
        await logEvent('outreach_reply', `Outreach reply · ${p.firm}`, p.contactId ? `/dashboard/leads/${p.contactId}` : '/dashboard/outreach');
        await notify({
          level: 'lead', title: `Outreach reply: ${p.firm}`,
          lines: [line('✉️', 'Subject', r.subject)], quote: r.text.slice(0, 600),
          next: 'Sequence stopped. Your reply draft is in tomorrow’s digest, or answer now from the dashboard.',
          buttons: [{ text: 'Open lead', url: `${FUNNEL.site}/dashboard/leads/${p.contactId ?? ''}` }],
        });
      }
    } catch (e) {
      result.errors.push(`reply check: ${e instanceof Error ? e.message : e}`);
    }
  } else if (live.length) result.errors.push('reply check: inbox not configured, so no sends today (safety)');

  if (!settings.sending) { result.skipped.push('Sending is switched off'); if (!opts.dryRun) await saveProspects(list); return result; }
  if (live.length && !inboxReady()) { await saveProspects(list); return result; }

  // 2. Due steps, oldest sequences first, within today's caps; one email per firm per day.
  const today = day(new Date().toISOString());
  const sentToday = list.flatMap((p) => p.sent ?? []).filter((s) => day(s.at) === today);
  let total = sentToday.length;
  let fresh = sentToday.filter((s) => s.step === 0).length;
  const queue = list
    .filter((p) => (p.status === 'scheduled' || p.status === 'active') && p.email && p.drafts)
    .sort((a, b) => (Date.parse(a.startedAt ?? a.createdAt) - Date.parse(b.startedAt ?? b.createdAt)));
  for (const p of queue) {
    if (total >= settings.dailyTotal) { result.skipped.push('Daily total cap reached'); break; }
    const step = p.sent?.length ?? 0;
    if (step >= 4 || step >= p.drafts!.steps.length) continue;
    if (step === 0 && fresh >= settings.dailyNew) continue;
    if (step > 0 && Date.now() < Date.parse(p.startedAt!) + STEP_DAYS[step] * 86_400_000) continue;
    if (hasPlaceholder(`${p.drafts!.subject} ${p.drafts!.steps[step]}`)) { result.skipped.push(`${p.firm}: E${step + 1} has placeholder text, fix the draft`); continue; }
    if (p.sent?.some((s) => day(s.at) === today)) continue;
    const h = localHour(p.tz);
    if (h < 7 || h >= 20) { result.skipped.push(`${p.firm}: outside 7am–8pm their time`); continue; }
    if (opts.dryRun) { result.sent++; continue; }
    try {
      if (step === 0) {
        p.contactId = await upsertContact({
          email: p.email!, firstname: p.drafts!.firstName, website: p.website, leadSource: 'cold_email',
          attribution: { first_touch_source: 'email', first_touch_medium: 'cold-email', first_touch_campaign: slug(p.firm) },
        });
        await linkCompany({ website: p.website, name: p.firm, contactId: p.contactId }).catch(() => {});
      }
      const first = p.sent?.[0];
      const { messageId } = await sendEmail({
        to: p.email!, subject: step === 0 ? p.drafts!.subject : `Re: ${p.drafts!.subject}`,
        text: p.drafts!.steps[step].trim() + FOOTER,
        inReplyTo: first?.messageId, references: (p.sent ?? []).map((s) => s.messageId),
        contactId: p.contactId,
      });
      p.sent = [...(p.sent ?? []), { step, at: new Date().toISOString(), messageId }];
      if (step === 0) { p.startedAt = new Date().toISOString(); p.status = 'active'; fresh++; result.newFirms++; }
      if (step === 3) p.status = 'finished';
      if (p.contactId) await updateContact(p.contactId, { naunas_outreach_status: step === 0 ? 'emailed' : step === 3 ? 'finished' : 'followed_up' }).catch(() => {});
      await logEvent('outreach_email', `${STEP_LABEL[step].split(' · ')[0]} sent · ${p.firm}`, p.contactId ? hubspotUrl.contact(p.contactId) : undefined);
      total++;
      result.sent++;
    } catch (e) {
      result.errors.push(`${p.firm}: ${e instanceof Error ? e.message : e}`);
    }
  }
  await saveProspects(list);

  return result;
}
