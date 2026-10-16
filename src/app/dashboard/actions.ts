'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { DASH_COOKIE, DASH_MAX_AGE, passwordMatches, sessionToken, validSession } from '@/lib/dashAuth';
import { storeReady } from '@/lib/store';
import { startSearch, syncSearches, ingestDrafts, getProspects, saveProspects, getSettings, saveSettings, type ProspectStatus } from '@/lib/outreach';
import { setDealStage, addNote, updateContact } from '@/lib/hubspot';
import { addToGroup, removeFromGroup } from '@/lib/mailerlite';
import { sendEmail } from '@/lib/send';
import { logEvent } from '@/lib/events';
import { getCampaigns, saveCampaigns, slugify, DEFAULT_CAMPAIGN, type Campaign, type Channel } from '@/lib/campaigns';

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const pw = String(form.get('password') ?? '');
  if (!process.env.DASHBOARD_PASSWORD) return 'The dashboard isn’t set up yet (DASHBOARD_PASSWORD missing).';
  if (!(await passwordMatches(pw))) return 'Wrong password.';
  (await cookies()).set(DASH_COOKIE, (await sessionToken())!, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/dashboard', maxAge: DASH_MAX_AGE,
  });
  redirect('/dashboard');
}

export async function logout() {
  (await cookies()).delete({ name: DASH_COOKIE, path: '/dashboard' });
  redirect('/dashboard/login');
}

async function requireSession() {
  if (!(await validSession((await cookies()).get(DASH_COOKIE)?.value))) redirect('/dashboard/login');
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? '').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

export type SaveState = { error?: string; savedAt?: number } | null;

/** Create or update a keyword campaign from the dashboard form. */
export async function saveCampaign(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  if (!storeReady()) return { error: 'Storage isn’t connected, so campaigns can’t be saved yet.' };
  const name = String(form.get('name') ?? '').trim();
  const id = String(form.get('id') ?? '') || slugify(name);
  const keywords = list(form.get('keywords')).map((k) => k.toUpperCase());
  const message = String(form.get('message') ?? '').trim();
  const url = String(form.get('url') ?? '').trim();
  const channel = (String(form.get('channel') ?? 'comment') as Channel);
  const endsAt = String(form.get('endsAt') ?? '').trim();
  if (!name || !id) return { error: 'Give it a name.' };
  if (!keywords.length) return { error: 'Add at least one keyword.' };
  if (!message.includes('{link}')) return { error: 'The message needs {link} where the link goes.' };
  try {
    new URL(url);
  } catch {
    return { error: 'The link must be a full URL (https://…).' };
  }
  const all = await getCampaigns();
  const clash = all.find((c) => c.id !== id && c.active && c.keywords.some((k) => keywords.includes(k)) &&
    c.postIds.join() === list(form.get('postIds')).join());
  if (clash) return { error: `“${clash.name}” already uses one of these keywords on the same posts.` };
  const campaign: Campaign = {
    id, name, keywords, message, url, channel,
    postIds: list(form.get('postIds')),
    active: form.get('active') === 'on',
    ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
  };
  await saveCampaigns(all.some((c) => c.id === id) ? all.map((c) => (c.id === id ? campaign : c)) : [...all, campaign]);
  revalidatePath('/dashboard', 'layout');
  return { savedAt: Date.now() };
}

export async function toggleCampaign(form: FormData) {
  await requireSession();
  const id = String(form.get('id'));
  const all = await getCampaigns();
  await saveCampaigns(all.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  revalidatePath('/dashboard', 'layout');
}

export async function deleteCampaign(form: FormData) {
  await requireSession();
  const id = String(form.get('id'));
  if (id === DEFAULT_CAMPAIGN.id) return; // the default can be edited or paused, not removed
  await saveCampaigns((await getCampaigns()).filter((c) => c.id !== id));
  revalidatePath('/dashboard', 'layout');
}

/** Dashboard Refresh button: drop the cached API data so the next render fetches fresh. */
export async function refreshOps() {
  await requireSession();
  updateTag('ops');
}

// ---------------------------------------------------------------- Outreach + lead actions
// Every action re-checks the session, then refreshes the dashboard cache.

async function done() {
  updateTag('ops');
  revalidatePath('/dashboard', 'layout');
}
const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

export async function startProspectSearch(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  const term = str(form, 'term');
  const location = str(form, 'location');
  const max = Math.min(100, Math.max(5, Number(form.get('max')) || 30));
  if (!term || !location) return { error: 'Add what to search for and where.' };
  try {
    await startSearch(term, location, max);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Search failed to start.' };
  }
  await done();
  return { savedAt: Date.now() };
}

export async function refreshProspectSearches() {
  await requireSession();
  await syncSearches();
  await ingestDrafts();
  await done();
}

export async function setProspect(form: FormData) {
  await requireSession();
  const status = str(form, 'status') as ProspectStatus;
  const ids = str(form, 'ids').split(',').filter(Boolean);
  if (!ids.length || !['approved', 'rejected', 'stopped', 'new'].includes(status)) return;
  const list = await getProspects();
  await saveProspects(list.map((p) => (ids.includes(p.id) ? { ...p, status } : p)));
  await done();
}

/** Save edited drafts; "schedule" also queues it for sending (E1 goes out in the next daily run). */
export async function saveProspectDrafts(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  const id = str(form, 'id');
  const email = str(form, 'email').toLowerCase();
  const steps = [0, 1, 2, 3].map((i) => str(form, `step${i}`)).filter(Boolean);
  const subject = str(form, 'subject');
  if (!subject || !steps.length) return { error: 'Needs a subject and at least the first email.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email address doesn’t look right.' };
  const schedule = form.get('intent') === 'schedule';
  if (schedule && !email) return { error: 'Add their email address before scheduling.' };
  const list = await getProspects();
  await saveProspects(list.map((p) => p.id !== id ? p : {
    ...p, email: email || p.email,
    drafts: { ...(p.drafts ?? {}), subject, steps, dm: str(form, 'dm') || undefined, firstName: str(form, 'firstName') || p.drafts?.firstName, dossier: p.drafts?.dossier },
    status: schedule ? 'scheduled' : p.status === 'approved' ? 'drafted' : p.status,
  }));
  await done();
  return { savedAt: Date.now() };
}

export async function markDmSent(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const list = await getProspects();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  await saveProspects(list.map((x) => (x.id === id ? { ...x, dmSentAt: new Date().toISOString() } : x)));
  await logEvent('outreach_dm', `Instagram DM sent · ${p.firm}`, p.instagram ? `https://instagram.com/${p.instagram}` : undefined);
  await done();
}

export async function setOutreachSending(form: FormData) {
  await requireSession();
  const s = await getSettings();
  const on = form.get('on') === '1';
  const dailyNew = Math.min(30, Math.max(1, Number(form.get('dailyNew')) || s.dailyNew));
  const monthlyCapUsd = Math.min(50, Math.max(1, Number(form.get('monthlyCapUsd')) || s.monthlyCapUsd));
  await saveSettings({ ...s, sending: form.has('on') ? on : s.sending, dailyNew, monthlyCapUsd });
  await done();
}

// ---- Lead actions

export async function moveDealStage(form: FormData) {
  await requireSession();
  const dealId = str(form, 'dealId');
  const stage = str(form, 'stage');
  if (!dealId || !stage) return;
  await setDealStage(dealId, stage, str(form, 'lostReason') || undefined);
  await done();
}

export async function addLeadNote(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  const text = str(form, 'text');
  if (!text) return { error: 'Write something first.' };
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
  await addNote(str(form, 'contactId'), `<p>${esc}</p>`, str(form, 'dealId') || undefined);
  await done();
  return { savedAt: Date.now() };
}

export async function setLeadOutreachStatus(form: FormData) {
  await requireSession();
  await updateContact(str(form, 'contactId'), { naunas_outreach_status: str(form, 'status') });
  await done();
}

export async function leadSequence(form: FormData) {
  await requireSession();
  const email = str(form, 'email');
  const group = str(form, 'group');
  if (form.get('op') === 'add') await addToGroup({ email, name: str(form, 'name') || undefined, source: 'dashboard', group });
  else await removeFromGroup(email, group);
  await done();
}

/** Send an email from contact@ — only ever on Naufal's click. Threads when replying; logs to HubSpot. */
export async function sendLeadEmail(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  const to = str(form, 'to');
  const subject = str(form, 'subject');
  const text = str(form, 'text');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: 'No valid email address for this person.' };
  if (!subject || !text) return { error: 'Add a subject and a message.' };
  try {
    await sendEmail({
      to, subject, text,
      inReplyTo: str(form, 'inReplyTo') || undefined,
      references: str(form, 'references').split(' ').filter(Boolean),
      contactId: str(form, 'contactId') || undefined, dealId: str(form, 'dealId') || undefined,
      event: `Email sent · ${str(form, 'name') || to}`,
    });
  } catch (err) {
    return { error: `Not sent: ${err instanceof Error ? err.message : 'unknown error'}` };
  }
  await done();
  return { savedAt: Date.now() };
}
