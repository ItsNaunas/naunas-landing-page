'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { DASH_COOKIE, DASH_MAX_AGE, passwordMatches, sessionToken, validSession } from '@/lib/dashAuth';
import { storeReady } from '@/lib/store';
import { startSearch, syncSearches, ingestDrafts, getProspects, saveProspects, getSettings, saveSettings, type ProspectStatus, type Prospect } from '@/lib/outreach';
import { setDealStage, addNote, updateContact } from '@/lib/hubspot';
import { addToGroup, removeFromGroup } from '@/lib/mailerlite';
import { sendEmail } from '@/lib/send';
import { logEvent } from '@/lib/events';
import { getCampaigns, saveCampaigns, slugify, DEFAULT_CAMPAIGN, type Campaign, type Channel } from '@/lib/campaigns';
import type { ContentPost, ChannelKey, Issue } from '@/lib/content';

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

/** Remember what a one-click action is about to change, for the Undo bar (lib/undo). Never blocks the action. */
const undoable = (label: string, opts: { prospects?: string[]; files?: string[]; external?: boolean }) =>
  import('@/lib/undo').then((m) => m.snapshot(label, opts)).catch(() => undefined);

/** The Undo bar: put back what the last one-click action changed (within 60 seconds). */
export async function undoLastAction() {
  await requireSession();
  const { undoLast } = await import('@/lib/undo');
  await undoLast();
  changed();
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
  revalidatePath('/dashboard/(app)', 'layout');
  return { savedAt: Date.now() };
}

export async function toggleCampaign(form: FormData) {
  await requireSession();
  const id = String(form.get('id'));
  const all = await getCampaigns();
  await saveCampaigns(all.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  changed();
}

export async function deleteCampaign(form: FormData) {
  await requireSession();
  const id = String(form.get('id'));
  if (id === DEFAULT_CAMPAIGN.id) return; // the default can be edited or paused, not removed
  await saveCampaigns((await getCampaigns()).filter((c) => c.id !== id));
  changed();
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
  revalidatePath('/dashboard/(app)', 'layout');
}
/** After a dashboard button changes something: fresh data on every page, and the open page re-renders now. */
function changed() {
  revalidatePath('/dashboard/(app)', 'layout');
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
  await undoable(`${ids.length > 1 ? `${ids.length} firms` : 'Firm'} marked ${status}`, { prospects: ids });
  const list = await getProspects();
  await saveProspects(list.map((p) => (ids.includes(p.id) ? { ...p, status, ...(status === 'approved' ? {} : { researchAt: undefined }) } : p)));
  // Approving starts research straight away (lib/research), instead of waiting for the 13:00 routine.
  if (status === 'approved') await startResearch(ids);
  await done();
}

async function startResearch(ids: string[]) {
  const { queueResearch } = await import('@/lib/research');
  const { after } = await import('next/server');
  await queueResearch(ids, (fn) => after(fn)).catch(async (err) => {
    const { alertError } = await import('@/lib/alert');
    await alertError('Research: queue', err, 'Approved, but research did not start. Press Research now on Prospects.');
  });
}

/** Research now: one firm (id) or every approved firm that isn't already being researched. */
export async function researchNow(form: FormData) {
  await requireSession();
  const one = str(form, 'id');
  const stale = (p: Prospect) => !p.researchAt || Date.now() - Date.parse(p.researchAt) > 10 * 60_000;
  const ids = (await getProspects()).filter((p) => p.status === 'approved' && (one ? p.id === one : stale(p))).map((p) => p.id);
  if (ids.length) await startResearch(ids);
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
  const { hasPlaceholder } = await import('@/lib/dmLint');
  if (schedule && hasPlaceholder([subject, ...steps].join(' '))) return { error: 'An email still has placeholder text ([like this]). Fix it before scheduling.' };
  const list = await getProspects();
  const { channelsFor } = await import('@/lib/outreach');
  const current = list.find((p) => p.id === id);
  const channel = str(form, 'channel') as 'instagram' | 'linkedin' | 'email' | '';
  if (schedule && current) {
    const options = channelsFor({ ...current, email: email || current.email });
    if (!channel || !options.includes(channel)) return { error: options.length ? 'Pick the channel to work this firm on.' : 'No Instagram, LinkedIn or email found for this firm, so there is no way to reach it.' };
    if (channel === 'email' && !(email || current.email)) return { error: 'Add their email address first.' };
  }
  await saveProspects(list.map((p) => p.id !== id ? p : {
    ...p, email: email || p.email, ...(schedule && channel ? { channel } : {}),
    drafts: { ...(p.drafts ?? {}), subject, steps, dm: str(form, 'dm') || undefined, firstName: str(form, 'firstName') || p.drafts?.firstName, dossier: p.drafts?.dossier },
    status: schedule ? 'scheduled' : p.status === 'approved' ? 'drafted' : p.status,
    ...(schedule ? { scheduledAt: new Date().toISOString() } : {}),
  }));
  await done();
  return { savedAt: Date.now() };
}

export async function markDmSent(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  await undoable('DM marked sent', { prospects: [id] });
  const list = await getProspects();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  const style = str(form, 'style') || undefined;
  await saveProspects(list.map((x) => (x.id === id ? { ...x, dmSentAt: new Date().toISOString(), dmStyle: style ?? x.dmStyle } : x)));
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

// ---------------------------------------------------------------- TikTok
// Publishing only ever happens here, on Naufal's click. The video was uploaded by the browser straight to
// the private Blob store (tiktok/uploads/…); we read it, send it to TikTok, then delete our copy.

export type PublishState = { error?: string; publishId?: string; at?: number } | null;

export async function publishTikTok(_prev: PublishState, form: FormData): Promise<PublishState> {
  await requireSession();
  const { publishVideo, getPosts, savePosts } = await import('@/lib/tiktok');
  const { get, del } = await import('@vercel/blob');
  const path = String(form.get('video') ?? '');
  const caption = String(form.get('caption') ?? '').trim();
  const privacy = String(form.get('privacy') ?? '');
  const brandedContent = form.get('brandedContent') === 'on';
  if (!path.startsWith('tiktok/uploads/')) return { error: 'Upload a video first.' };
  if (!privacy) return { error: 'Choose who can see this post.' };
  if (brandedContent && privacy === 'SELF_ONLY') return { error: 'Branded content can’t be private. Choose another privacy setting.' };
  try {
    const blob = await get(path, { access: 'private', useCache: false });
    if (!blob) return { error: 'The uploaded video has gone. Upload it again.' };
    const video = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const publishId = await publishVideo(video, {
      caption, privacy,
      allowComment: form.get('allowComment') === 'on', allowDuet: form.get('allowDuet') === 'on', allowStitch: form.get('allowStitch') === 'on',
      yourBrand: form.get('yourBrand') === 'on', brandedContent,
    });
    await del(path).catch(() => {});
    await savePosts([{ publishId, caption, privacy, at: new Date().toISOString(), status: 'PROCESSING_UPLOAD' }, ...(await getPosts())]);
    await logEvent('tiktok', `Posted to TikTok: ${caption.slice(0, 60) || 'video'}`, '/dashboard/tiktok');
    revalidatePath('/dashboard/tiktok');
    return { publishId, at: Date.now() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Publishing failed' };
  }
}

/** Re-check TikTok's processing status for posts still in progress. */
export async function refreshTikTokPosts() {
  await requireSession();
  const { publishStatus, getPosts, savePosts } = await import('@/lib/tiktok');
  const posts = await getPosts();
  const next = await Promise.all(posts.map(async (p) => {
    if (p.status === 'PUBLISH_COMPLETE' || p.status === 'FAILED') return p;
    try {
      const s = await publishStatus(p.publishId);
      return { ...p, status: s.status, failReason: s.fail_reason };
    } catch { return p; }
  }));
  await savePosts(next);
  revalidatePath('/dashboard/tiktok');
}

export async function disconnectTikTok() {
  await requireSession();
  const { disconnect } = await import('@/lib/tiktok');
  await disconnect();
  revalidatePath('/dashboard/tiktok');
}

// ---------------------------------------------------------------- LinkedIn
// Posts to Naufal's own profile only on his click. Media (optional) was uploaded by the browser to the
// private Blob store (linkedin/uploads/…); we read it, send it to LinkedIn, then delete our copy.

export async function publishLinkedIn(_prev: PublishState, form: FormData): Promise<PublishState> {
  await requireSession();
  const { publishPost, getPosts, savePosts } = await import('@/lib/linkedin');
  const { get, del } = await import('@vercel/blob');
  const text = String(form.get('text') ?? '').trim();
  const visibility = form.get('visibility') === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';
  const path = String(form.get('media') ?? '');
  const kind = form.get('mediaKind') === 'video' ? 'video' : 'image';
  if (!text) return { error: 'Write the post first.' };
  if (text.length > 3000) return { error: 'LinkedIn posts are limited to 3,000 characters.' };
  if (path && !path.startsWith('linkedin/uploads/')) return { error: 'Upload the media again.' };
  try {
    let media: { kind: 'image' | 'video'; data: Buffer; title?: string } | undefined;
    if (path) {
      const blob = await get(path, { access: 'private', useCache: false });
      if (!blob) return { error: 'The uploaded file has gone. Upload it again.' };
      media = { kind, data: Buffer.from(await new Response(blob.stream).arrayBuffer()), title: text.split('\n')[0].slice(0, 100) };
    }
    const urn = await publishPost(text, visibility, media);
    if (path) await del(path).catch(() => {});
    await savePosts([{ urn, text: text.slice(0, 300), visibility, ...(media ? { media: media.kind } : {}), at: new Date().toISOString() }, ...(await getPosts())]);
    await logEvent('linkedin', `Posted to LinkedIn: ${text.slice(0, 60)}`, '/dashboard/linkedin');
    revalidatePath('/dashboard/linkedin');
    return { publishId: urn, at: Date.now() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Publishing failed' };
  }
}

export async function disconnectLinkedIn() {
  await requireSession();
  const { disconnect } = await import('@/lib/linkedin');
  await disconnect();
  revalidatePath('/dashboard/linkedin');
}

// ---------------------------------------------------------------- Content engine ("Post everywhere")
// Object-argument actions called from the composer. Nothing publishes except publishContentNow (Naufal's
// click) and scheduleContent (his chosen time, fired by QStash). Each channel runs independently.

export type ContentResult = { error?: string; issues?: Issue[]; post?: ContentPost };

const editable = (p: ContentPost) => p.status === 'draft' || p.status === 'scheduled' || p.status === 'partial';

export async function createContentPost(idea = ''): Promise<ContentResult> {
  await requireSession();
  const { newPost, savePost } = await import('@/lib/content');
  const p = newPost(idea);
  await savePost(p);
  return { post: p };
}

/** Save the composer's fields (text, options, media, ticks); statuses and results are never taken from the client. */
export async function saveContentPost(input: Pick<ContentPost, 'id' | 'master' | 'channels' | 'flags'> & { newsletterBlurb?: string }): Promise<ContentResult> {
  await requireSession();
  const { getPost, savePost, CHANNELS } = await import('@/lib/content');
  const p = await getPost(input.id);
  if (!p) return { error: 'Post not found' };
  if (!editable(p)) return { error: 'This post is publishing right now.' };
  const m = input.master.media;
  if (m && !m.path.startsWith('content/media/')) return { error: 'Upload the media again.' };
  p.master = { idea: String(input.master.idea ?? '').slice(0, 5000), media: m, transcript: input.master.transcript?.slice(0, 50_000) };
  for (const c of CHANNELS) {
    const cur = p.channels[c];
    const keep = { status: cur.status, url: cur.url, error: cur.error, attempts: cur.attempts, postedAt: cur.postedAt };
    if (cur.status === 'posted' || cur.status === 'publishing') continue;
    const next = { ...cur, ...input.channels[c], ...keep } as typeof cur;
    if (next.enabled && (keep.status === 'off' || !keep.status)) next.status = 'ready';
    if (!next.enabled) next.status = 'off';
    (p.channels as Record<string, unknown>)[c] = next;
  }
  p.flags = (input.flags ?? []).slice(0, 50);
  if (input.newsletterBlurb !== undefined) p.newsletterBlurb = String(input.newsletterBlurb).slice(0, 1500);
  await savePost(p);
  return { post: p };
}

async function readyToPublish(id: string): Promise<ContentResult & { p?: ContentPost }> {
  const { getPost } = await import('@/lib/content');
  const { checkPost } = await import('@/lib/publish');
  const p = await getPost(id);
  if (!p) return { error: 'Post not found' };
  const issues = await checkPost(p);
  if (issues.some((i) => i.level === 'block')) return { issues, error: 'Fix the red items first.' };
  if (issues.some((i) => i.level === 'warn' && !p.flags.includes(i.text))) return { issues, error: 'Tick the warnings you are happy to go ahead with.' };
  return { p, issues };
}

export async function publishContentNow(id: string): Promise<ContentResult> {
  await requireSession();
  const r = await readyToPublish(id);
  if (!r.p) return r;
  const { cancelScheduled } = await import('@/lib/qstash');
  if (r.p.qstashMessageId) await cancelScheduled(r.p.qstashMessageId).catch(() => {});
  const { runPost } = await import('@/lib/publish');
  const out = await runPost(id);
  revalidatePath('/dashboard/content');
  return { post: out.post };
}

export async function scheduleContent(id: string, atIso: string): Promise<ContentResult> {
  await requireSession();
  const { qstashReady, scheduleAt, cancelScheduled } = await import('@/lib/qstash');
  if (!qstashReady()) return { error: 'Scheduling is not set up yet (QStash keys missing). Use Publish now, or add the keys.' };
  const at = new Date(atIso);
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) return { error: 'Pick a time at least a minute from now.' };
  if (at.getTime() > Date.now() + 60 * 86_400_000) return { error: 'Schedule within the next 60 days.' };
  const r = await readyToPublish(id);
  if (!r.p) return r;
  const p = r.p;
  if (p.qstashMessageId) await cancelScheduled(p.qstashMessageId).catch(() => {});
  p.qstashMessageId = await scheduleAt(at, { postId: p.id });
  p.scheduledFor = at.toISOString();
  const { CHANNELS, savePost } = await import('@/lib/content');
  for (const c of CHANNELS) if (p.channels[c].enabled && p.channels[c].status !== 'posted') p.channels[c].status = 'scheduled';
  p.status = 'scheduled';
  await savePost(p);
  revalidatePath('/dashboard/content');
  return { post: p };
}

export async function cancelContentSchedule(id: string): Promise<ContentResult> {
  await requireSession();
  const { getPost, savePost, rollUp, CHANNELS } = await import('@/lib/content');
  const { cancelScheduled } = await import('@/lib/qstash');
  const p = await getPost(id);
  if (!p) return { error: 'Post not found' };
  if (p.qstashMessageId) await cancelScheduled(p.qstashMessageId).catch(() => {});
  p.qstashMessageId = undefined;
  p.scheduledFor = undefined;
  for (const c of CHANNELS) if (p.channels[c].status === 'scheduled') p.channels[c].status = 'ready';
  p.status = rollUp(p);
  await savePost(p);
  revalidatePath('/dashboard/content');
  return { post: p };
}

export async function retryContentChannel(id: string, ch: ChannelKey): Promise<ContentResult> {
  await requireSession();
  const { runPost } = await import('@/lib/publish');
  const out = await runPost(id, { only: [ch] });
  revalidatePath('/dashboard/content');
  return { post: out.post };
}

/** Sends TikTok for every held post, oldest first, within one request's time. Stops at the first refusal:
 *  TikTok still treats the app as unaudited, so the rest would be refused too. */
export async function sendHeldTikTok(): Promise<{ error?: string; sent: number; left: number }> {
  await requireSession();
  const { runPost } = await import('@/lib/publish');
  const { getIndex } = await import('@/lib/content');
  const held = (await getIndex()).filter((r) => r.channels.tiktok === 'held').reverse();
  const until = Date.now() + 200_000;
  let sent = 0;
  for (const row of held) {
    if (Date.now() > until) break;
    const out = await runPost(row.id, { only: ['tiktok'], retryHeld: true });
    if (out.post.channels.tiktok.status === 'held') { revalidatePath('/dashboard/content'); return { error: 'TikTok still only allows private posts for this app. Check the Direct Post audit in the TikTok developer portal.', sent, left: held.length - sent }; }
    if (out.post.channels.tiktok.status === 'posted') sent++;
  }
  revalidatePath('/dashboard/content');
  return { sent, left: held.length - sent };
}

export async function discardHeldTikTok(id: string): Promise<ContentResult> {
  await requireSession();
  const { getPost, savePost, rollUp, CHANNELS } = await import('@/lib/content');
  const p = await getPost(id);
  if (!p) return { error: 'Post not found' };
  p.channels.tiktok = { ...p.channels.tiktok, enabled: false, status: 'off', error: undefined };
  p.status = rollUp(p);
  await savePost(p);
  const pending = CHANNELS.some((c) => p.channels[c].enabled && ['failed', 'held', 'ready', 'scheduled'].includes(p.channels[c].status));
  if (!pending && p.master.media) { const { del } = await import('@vercel/blob'); await del(p.master.media.path).catch(() => {}); }
  revalidatePath('/dashboard/content');
  return { post: p };
}

export async function deleteContentDraft(id: string): Promise<ContentResult> {
  await requireSession();
  const { getPost, deletePost, CHANNELS } = await import('@/lib/content');
  const p = await getPost(id);
  if (!p) return {};
  if (CHANNELS.some((c) => ['posted', 'publishing'].includes(p.channels[c].status))) return { error: 'Published posts are kept as a record.' };
  if (p.qstashMessageId) { const { cancelScheduled } = await import('@/lib/qstash'); await cancelScheduled(p.qstashMessageId).catch(() => {}); }
  if (p.master.media) { const { del } = await import('@vercel/blob'); await del(p.master.media.path).catch(() => {}); }
  await deletePost(id);
  revalidatePath('/dashboard/content');
  return {};
}

/** "New post" button: create a draft and open it in the editor. */
export async function newContentPost() {
  await requireSession();
  const { newPost, savePost } = await import('@/lib/content');
  const p = newPost();
  await savePost(p);
  redirect(`/dashboard/content/${p.id}`);
}

/** Live pre-flight for the editor (after each autosave). */
export async function checkContentPost(id: string): Promise<{ issues: Issue[] }> {
  await requireSession();
  const { getPost } = await import('@/lib/content');
  const { checkPost } = await import('@/lib/publish');
  const p = await getPost(id);
  return { issues: p ? await checkPost(p) : [] };
}

/** AI drafts for every channel from the saved idea + transcript. Returned to the editor; nothing is saved or posted. */
export async function adaptContent(id: string): Promise<{ error?: string; result?: import('@/lib/adapt').Adapted }> {
  await requireSession();
  const { aiReady } = await import('@/lib/ai');
  if (!aiReady()) return { error: 'OPENAI_API_KEY is not set in Vercel.' };
  const { getPost } = await import('@/lib/content');
  const p = await getPost(id);
  if (!p) return { error: 'Post not found' };
  if (p.master.idea.trim().length < 20 && !p.master.transcript?.trim()) return { error: 'Write a bit more in the idea (or add a transcript) first.' };
  const camp = (await getCampaigns()).find((c) => c.id === p.channels.instagram.campaignId) ?? DEFAULT_CAMPAIGN;
  try {
    const { adapt } = await import('@/lib/adapt');
    return { result: await adapt({ idea: p.master.idea, transcript: p.master.transcript, keyword: camp.keywords[0] ?? 'LEAK', offer: camp.name }) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Adapt failed' };
  }
}

/** Repurpose: a new draft with the same LinkedIn text and no media (a text-only post for another day). */
export async function copyAsTextPost(id: string): Promise<{ error?: string; id?: string }> {
  await requireSession();
  const { getPost, newPost, savePost } = await import('@/lib/content');
  const p = await getPost(id);
  if (!p) return { error: 'Post not found' };
  const n = newPost(p.master.idea);
  n.master.transcript = p.master.transcript;
  n.channels.linkedin = { ...n.channels.linkedin, enabled: true, status: 'ready', text: p.channels.linkedin.text, firstComment: p.channels.linkedin.firstComment, visibility: p.channels.linkedin.visibility };
  await savePost(n);
  return { id: n.id };
}

/** "Test scheduling": books a QStash call 1 minute ahead that only records a ping (nothing is posted). */
export async function testScheduling(): Promise<{ error?: string; at?: string }> {
  await requireSession();
  const { qstashReady, scheduleAt } = await import('@/lib/qstash');
  if (!qstashReady()) return { error: 'QStash keys are missing.' };
  const { putJSON } = await import('@/lib/store');
  const ping = `t${Date.now()}`;
  const at = new Date(Date.now() + 60_000);
  try {
    await scheduleAt(at, { ping });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'QStash refused the schedule' };
  }
  await putJSON('meta/qstash-ping.json', { ping, scheduledFor: at.toISOString(), firedAt: null });
  revalidatePath('/dashboard/content');
  return { at: at.toISOString() };
}

// ---------------------------------------------------------------- Daily reps (Outreach → Today)

export async function bumpRepCount(form: FormData) {
  await requireSession();
  const { bumpRep, MANUAL_REPS } = await import('@/lib/reps');
  const key = str(form, 'key');
  const rep = MANUAL_REPS.find((r) => r.key === key);
  if (!rep) return;
  await bumpRep(rep.key, form.get('delta') === '-1' ? -1 : 1);
  changed();
}

/** Day 0 of the Instagram sequence done for one firm (followed + commented): counts as a warm-up rep. */
export async function markWarmed(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  await undoable('Warm-up done', { prospects: [id], files: ['outreach/reps.json'] });
  const list = await getProspects();
  if (!list.some((x) => x.id === id)) return;
  await saveProspects(list.map((x) => (x.id === id ? { ...x, warmedAt: new Date().toISOString() } : x)));
  const { bumpRep } = await import('@/lib/reps');
  await bumpRep('warmups', 1);
  changed();
}

// ---------------------------------------------------------------- Newsletter + performance (Content)

/** Build (or rebuild) this week's MailerLite draft now. Never sends. */
export async function buildNewsletterDraft(): Promise<{ error?: string; ok?: string }> {
  await requireSession();
  const { buildWeeklyDraft } = await import('@/lib/newsletter');
  try {
    const r = await buildWeeklyDraft({ force: true });
    revalidatePath('/dashboard/content');
    if ('empty' in r) return { error: 'No posts went out in the last 7 days, so there is nothing to put in it.' };
    const d = 'exists' in r ? r.exists : r;
    if (!d.campaignId) return { error: d.error ?? 'MailerLite refused the draft.' };
    return { ok: d.contentIncluded ? 'Draft ready in MailerLite.' : 'Draft made. Paste the email body from here into MailerLite.' };
  } catch (err) {
    return { error: err instanceof Error ? err.message.slice(0, 200) : 'Failed' };
  }
}

/** Pull Instagram insights for recent posts now (the daily cron does this too). */
export async function refreshPostStats() {
  await requireSession();
  const { refreshInsights } = await import('@/lib/performance');
  await refreshInsights().catch(() => 0);
  revalidatePath('/dashboard/content');
}

/** Re-post an old winner: a new draft with the same idea and copy (add the media again, try a new hook). */
export async function duplicateContentPost(form: FormData) {
  await requireSession();
  const { getPost, newPost, savePost } = await import('@/lib/content');
  const old = await getPost(str(form, 'id'));
  if (!old) return;
  const p = newPost(old.master.idea);
  p.master.transcript = old.master.transcript;
  p.newsletterBlurb = old.newsletterBlurb;
  p.channels.linkedin = { ...p.channels.linkedin, text: old.channels.linkedin.text, firstComment: old.channels.linkedin.firstComment, visibility: old.channels.linkedin.visibility };
  p.channels.instagram = { ...p.channels.instagram, caption: old.channels.instagram.caption, campaignId: old.channels.instagram.campaignId };
  p.channels.tiktok = { ...p.channels.tiktok, caption: old.channels.tiktok.caption };
  p.flags = [`Re-post of ${old.id}`];
  await savePost(p);
  redirect(`/dashboard/content/${p.id}`);
}

// ---------------------------------------------------------------- Asset owed (Outreach → Today)

export async function addOwedAsset(form: FormData) {
  await requireSession();
  const who = str(form, 'who');
  const what = str(form, 'what') || 'Loom';
  if (!who) return;
  const { addOwed, DUE_H } = await import('@/lib/owed');
  const firmId = str(form, 'firmId') || undefined;
  const o = await addOwed({ who: who.slice(0, 120), what: what.slice(0, 80), channel: str(form, 'channel') || 'LinkedIn', link: str(form, 'link').slice(0, 400) || undefined, firmId });
  // Said yes: note + status interested on the deal, and a HubSpot task due in 24 hours (shows in the phone app).
  if (firmId) await crmAfter(firmId, async (m) => {
    await m.prospectNote(firmId, `<p>Said yes to a ${what.replace(/</g, '&lt;')} (${str(form, 'channel') || 'DM'}). Promised within 24 hours.</p>`, 'interested');
    const ids = await m.syncProspect(firmId);
    if (!ids) return;
    const taskId = await m.createTask(ids.contactId, ids.dealId, `Send ${who} the ${what}`, new Date(Date.parse(o.owedAt) + DUE_H * 3_600_000));
    const { patchOwed } = await import('@/lib/owed');
    await patchOwed(o.id, { taskId });
  }, 'Said yes');
  changed();
}

export async function markOwedSent(form: FormData) {
  await requireSession();
  await undoable('Promise marked sent', { files: ['outreach/owed.json'], external: true });
  const { patchOwed, NUDGE_D } = await import('@/lib/owed');
  const o = await patchOwed(str(form, 'id'), { sentAt: new Date().toISOString() });
  if (o?.taskId) await crmAfter(o.firmId ?? o.id, (m) => m.completeTask(o.taskId!), 'Complete task');
  changed();
}

export async function closeOwed(form: FormData) {
  await requireSession();
  const outcome = str(form, 'outcome');
  if (!['replied', 'nudged', 'dropped'].includes(outcome)) return;
  await undoable(`Promise closed (${outcome})`, { files: ['outreach/owed.json'], external: true });
  const { patchOwed } = await import('@/lib/owed');
  const o = await patchOwed(str(form, 'id'), { closedAt: new Date().toISOString(), outcome: outcome as 'replied' | 'nudged' | 'dropped' });
  if (o?.taskId && !o.sentAt) await crmAfter(o.firmId ?? o.id, (m) => m.completeTask(o.taskId!), 'Close task');
  changed();
}

// ---------------------------------------------------------------- Instagram sequence (Outreach → Today)

/** Follow-up 1 (day 5) or 2 (day 9) sent by hand. Counts as an IG follow-up rep. */
export async function markIgFollowup(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const n = str(form, 'n') === '2' ? 'fu2At' : 'fu1At';
  await undoable('Follow-up marked sent', { prospects: [id], files: ['outreach/reps.json'] });
  const list = await getProspects();
  if (!list.some((x) => x.id === id)) return;
  await saveProspects(list.map((x) => (x.id === id ? { ...x, [n]: new Date().toISOString() } : x)));
  const { bumpRep } = await import('@/lib/reps');
  await bumpRep('followups', 1);
  changed();
}

/** They replied (Instagram, LinkedIn or from the firm page): stop every sequence and put them in HubSpot. */
export async function markIgReplied(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  await undoable('Marked as replied', { prospects: [id], external: true });
  const list = await getProspects();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  const now = new Date().toISOString();
  const stop = ['drafted', 'scheduled', 'active'].includes(p.status);
  await saveProspects(list.map((x) => (x.id === id ? { ...x, igRepliedAt: now, ...(stop ? { status: 'replied' as const, repliedAt: now } : {}) } : x)));
  // Into HubSpot now that they've engaged: contact, company, deal at Contacted, research note (lib/crmSync).
  await crmAfter(p.id, (m) => m.syncProspect(p.id, { status: 'replied' }), 'They replied');
  await logEvent('lead', `Reply · ${p.firm}`, p.instagram ? `https://instagram.com/${p.instagram}` : undefined);
  changed();
}

// ---------------------------------------------------------------- Old warm leads (Outreach → Today's list)

/** Write (or rewrite) a check-in message from the lead's HubSpot notes. Returned to the list; nothing is sent. */
export async function writeCheckin(lead: { id: string; name: string; company?: string; channel: 'Instagram' | 'LinkedIn' }): Promise<{ text?: string; error?: string }> {
  await requireSession();
  if (!/^\d+$/.test(lead.id)) return { error: 'Bad contact id' };
  const { draftCheckin } = await import('@/lib/checkins');
  try {
    return { text: await draftCheckin(lead) };
  } catch (err) {
    return { error: err instanceof Error ? err.message.slice(0, 160) : 'Could not write it' };
  }
}

export async function markCheckin(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const outcome = str(form, 'outcome');
  if (!/^\d+$/.test(id) || !['sent', 'snoozed', 'dropped'].includes(outcome)) return;
  await undoable(`Check-in ${outcome}`, { files: ['outreach/touches.json'] });
  const { recordCheckin } = await import('@/lib/checkins');
  await recordCheckin({ id, channel: str(form, 'channel') || 'Instagram' }, outcome as 'sent' | 'snoozed' | 'dropped');
  changed();
}

// ---------------------------------------------------------------- Prospects: wave-1 import + LinkedIn step

export async function importWave1() {
  await requireSession();
  const [{ importSeeds }, { WAVE1 }] = await Promise.all([import('@/lib/outreach'), import('@/config/wave1')]);
  const n = await importSeeds(WAVE1, 'w1');
  await logEvent('lead', `Imported ${n} wave-1 firms from the vault list`, '/dashboard/outreach/prospects');
  // Good fits were approved at import; research them now (QStash, else in the background of this request).
  const { queueResearch } = await import('@/lib/research');
  const { after } = await import('next/server');
  const pending = (await getProspects()).filter((p) => p.status === 'approved' && !p.researchAt && !p.researchError).map((p) => p.id);
  if (pending.length) await queueResearch(pending, (fn) => after(fn));
  changed();
}

/** Day-10 LinkedIn connect (with a note) sent by hand. Counts as a LinkedIn rep. */
export async function markLiConnected(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const list = await getProspects();
  if (!list.some((x) => x.id === id)) return;
  await saveProspects(list.map((x) => (x.id === id ? { ...x, liAt: new Date().toISOString() } : x)));
  const { bumpRep } = await import('@/lib/reps');
  await bumpRep('linkedin', 1);
  changed();
}

/** LinkedIn cold sequence steps, ticked by hand: engaged → connected → dm (after they accept) → fu. "notyet" asks again in 2 days. */
export async function markLiStep(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const step = str(form, 'step');
  const field = { engaged: 'liEngagedAt', connected: 'liAt', dm: 'liDmAt', fu: 'liFuAt' }[step];
  await undoable('LinkedIn step done', { prospects: [id], files: ['outreach/reps.json'] });
  const list = await getProspects();
  if (!list.some((x) => x.id === id) || (!field && step !== 'notyet')) return;
  const now = new Date();
  const patch = step === 'notyet' ? { liSnoozeUntil: new Date(now.getTime() + 2 * 86_400_000).toISOString() } : { [field!]: now.toISOString() };
  await saveProspects(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  if (step !== 'notyet') { const { bumpRep } = await import('@/lib/reps'); await bumpRep('linkedin', 1); }
  changed();
}

/** Daily new-firm targets per channel (Outreach → Today). Email = dailyNew, which the 14:00 UTC send also uses as its cap. */
export async function setChannelTargets(form: FormData) {
  await requireSession();
  const s = await getSettings();
  const n = (k: string, fallback: number, max: number) => Math.min(max, Math.max(0, Math.round(Number(form.get(k))))) || (form.get(k) === '0' ? 0 : fallback);
  const cities = form.has('cities') ? String(form.get('cities') ?? '').split('\n').map((c) => c.trim()).filter(Boolean).slice(0, 30) : s.cities;
  await saveSettings({ ...s, igNew: n('igNew', s.igNew, 40), liNew: n('liNew', s.liNew, 20), dailyNew: n('dailyNew', s.dailyNew, 30), cities });
  changed();
}

/** Start every ready firm (drafted) on its suggested channel. Skips drafts with placeholder text or no reachable channel. */
export async function startAllReady() {
  await requireSession();
  const { channelsFor, suggestChannel, getSettings: settingsOf } = await import('@/lib/outreach');
  const { hasPlaceholder } = await import('@/lib/dmLint');
  const s = await settingsOf();
  const targets = { instagram: s.igNew, linkedin: s.liNew, email: s.dailyNew };
  const list = await getProspects();
  const now = new Date().toISOString();
  let started = 0;
  for (const p of list) {
    if (p.status !== 'drafted' || !p.drafts) continue;
    if (hasPlaceholder([p.drafts.subject, ...p.drafts.steps, p.drafts.dm ?? '', ...(p.drafts.dms ?? []).map((d) => d.text)].join(' '))) continue;
    if (!channelsFor(p).length) continue;
    const channel = suggestChannel(p, list, targets);
    if (!channel) continue;
    Object.assign(p, { status: 'scheduled', channel, scheduledAt: now });
    started++;
  }
  await saveProspects(list);
  await logEvent('lead', `Started outreach on ${started} firms`, '/dashboard/outreach/sequences');
  changed();
}

// ---------------------------------------------------------------- Leak report (lib/leakReport)

export type ReportState = { error?: string; savedAt?: number };

export async function buildReport(_prev: ReportState, form: FormData): Promise<ReportState> {
  await requireSession();
  const { buildLeakReport } = await import('@/lib/leakReport');
  try { await buildLeakReport(str(form, 'id')); } catch (err) { return { error: String((err as Error).message ?? err) }; }
  await done();
  return { savedAt: Date.now() };
}

export async function saveReportEdits(_prev: ReportState, form: FormData): Promise<ReportState> {
  await requireSession();
  const { getReport, saveReport } = await import('@/lib/leakReport');
  const r = await getReport(str(form, 'token'));
  if (!r) return { error: 'Report not found.' };
  const findings = r.findings.map((f, i) => ({ ...f, title: str(form, `f${i}_title`) || f.title, seen: str(form, `f${i}_seen`) || f.seen, why: str(form, `f${i}_why`) || f.why, fix: str(form, `f${i}_fix`) || f.fix }))
    .filter((_, i) => form.get(`f${i}_drop`) !== 'on');
  const publish = form.get('intent') === 'publish' ? true : form.get('intent') === 'unpublish' ? false : r.published;
  if (publish && !r.published) {
    const url = `${(await import('@/config/funnel')).FUNNEL.site}/r/${r.token}`;
    await crmAfter(r.prospectId, (m) => m.prospectNote(r.prospectId, `<p>Leak report published: <a href="${url}">${url}</a></p>`), 'Leak report');
  }
  await saveReport({
    ...r, findings, intro: str(form, 'intro') || r.intro, quickWin: str(form, 'quickWin'), loom: str(form, 'loom') || r.loom,
    askOnCall: str(form, 'askOnCall').split('\n').map((x) => x.trim()).filter(Boolean),
    published: publish, publishedAt: publish && !r.published ? new Date().toISOString() : r.publishedAt,
  });
  await done();
  return { savedAt: Date.now() };
}

/** Review/referral ask (lib/asks): sent or skipped. */
export async function markAskDone(form: FormData) {
  await requireSession();
  await undoable('Ask marked done', { files: ['ops/asks.json'], external: true });
  const { markAsk } = await import('@/lib/asks');
  const outcome = str(form, 'outcome') === 'skipped' ? 'skipped' : 'sent';
  const a = await markAsk(str(form, 'id'), outcome);
  if (a?.contactId && outcome === 'sent') {
    const { after } = await import('next/server');
    after(async () => {
      const { addNote } = await import('@/lib/hubspot');
      await addNote(a.contactId!, `<p>${a.kind === 'review' ? 'Review / testimonial' : 'Referral'} asked ${new Date().toISOString().slice(0, 10)} (from the dashboard).</p>`, a.dealId).catch(() => {});
    });
  }
  await done();
}

/** Run a HubSpot sync after the response (so the button stays instant); failures go to Telegram. */
async function crmAfter(id: string, fn: (m: typeof import('@/lib/crmSync')) => Promise<unknown>, what: string) {
  const { after } = await import('next/server');
  after(async () => {
    const m = await import('@/lib/crmSync');
    await fn(m).catch(async (err) => {
      const { alertError } = await import('@/lib/alert');
      await alertError(`HubSpot sync: ${what}`, err, `Recorded in the dashboard, but not in HubSpot (firm ${id}).`);
    });
  });
}

// ---------------------------------------------------------------- Ask Naunas (lib/assistant)

export async function askNaunas(history: { role: 'user' | 'assistant'; content: string }[]): Promise<{ answer?: string; actions?: { label: string; href: string }[]; error?: string }> {
  await requireSession();
  const clean = history.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()).slice(-12);
  if (!clean.length || clean[clean.length - 1].role !== 'user') return { error: 'Ask something first.' };
  const { ask } = await import('@/lib/assistant');
  try { return await ask(clean); } catch (err) { return { error: String((err as Error).message ?? err).slice(0, 200) }; }
}

/** Rewrite today's start-of-day briefing on the home page. */
export async function refreshBriefing() {
  await requireSession();
  const { writeBriefing } = await import('@/lib/assistant');
  await writeBriefing().catch(async (err) => {
    const { alertError } = await import('@/lib/alert');
    await alertError('Briefing', err, 'The home page briefing could not be written.');
  });
  changed();
}

// ---------------------------------------------------------------- Proposals (lib/proposal)

/** From a lead page or Pipeline: a blank proposal for this person, then straight to the editor. */
export async function newProposal(form: FormData) {
  await requireSession();
  const { createProposal } = await import('@/lib/proposal');
  const client = str(form, 'client') || str(form, 'name');
  if (!client) return;
  const p = await createProposal({
    client, contactId: str(form, 'contactId') || undefined, dealId: str(form, 'dealId') || undefined,
    firstName: str(form, 'firstName') || client.split(/\s+/)[0], business: str(form, 'business') || undefined, email: str(form, 'email') || undefined,
  });
  await done();
  redirect(`/dashboard/pipeline/proposal/${p.token}`);
}

export async function saveProposalEdits(_prev: ReportState, form: FormData): Promise<ReportState> {
  await requireSession();
  const { getProposal, saveProposal, setPublished } = await import('@/lib/proposal');
  const p = await getProposal(str(form, 'token'));
  if (!p) return { error: 'Proposal not found.' };
  const link = str(form, 'paymentLink');
  if (link && !/^https:\/\/(buy\.stripe\.com|checkout\.stripe\.com)\//.test(link)) return { error: 'The deposit link must be a Stripe Payment Link (https://buy.stripe.com/…).' };
  const locked = !!p.acceptedAt;
  const blocks = locked ? p.blocks : Array.from({ length: 12 }, (_, i) => ({ title: str(form, `b${i}_title`), text: str(form, `b${i}_text`) })).filter((b) => b.title || b.text);
  await saveProposal({
    ...p, paymentLink: link || undefined,
    ...(locked ? {} : {
      title: str(form, 'title') || p.title, intro: str(form, 'intro'), blocks, timeline: str(form, 'timeline'), price: str(form, 'price'), deposit: str(form, 'deposit'),
      nextSteps: str(form, 'nextSteps') || p.nextSteps, validUntil: str(form, 'validUntil') || undefined,
    }),
  });
  const intent = form.get('intent');
  if (intent === 'publish' && !p.published) {
    const fresh = await getProposal(p.token);
    if (!fresh?.intro || !fresh.blocks.length || !fresh.price) return { error: 'Add an intro, at least one block and the price before publishing.' };
    // No deposit link pasted: make one in Stripe from the deposit amount (needs STRIPE_LINKS_KEY).
    const { stripeLinksReady, createDepositLink } = await import('@/lib/stripeLink');
    if (!fresh.paymentLink && fresh.deposit && stripeLinksReady()) {
      const { proposalUrl } = await import('@/lib/proposal');
      try { await saveProposal({ ...fresh, paymentLink: await createDepositLink({ deposit: fresh.deposit, client: fresh.client, proposalUrl: proposalUrl(fresh.token), dealId: fresh.dealId }) }); }
      catch (err) { return { error: `Saved, not published: the Stripe deposit link failed (${(err as Error).message}). Paste a link by hand or fix the deposit amount.` }; }
    }
    await setPublished(p.token, true);
  }
  if (intent === 'unpublish' && p.published && !locked) await setPublished(p.token, false);
  await done();
  return { savedAt: Date.now() };
}

/** AI writes the scope from the lead's brief, booking answers and call notes. Never the price. */
export async function draftProposalAI(_prev: ReportState, form: FormData): Promise<ReportState> {
  await requireSession();
  const { getProposal, draftProposal } = await import('@/lib/proposal');
  const p = await getProposal(str(form, 'token'));
  if (!p) return { error: 'Proposal not found.' };
  try {
    let ctx: Parameters<typeof draftProposal>[1] = { business: p.business };
    if (p.contactId && process.env.HUBSPOT_TOKEN) {
      const { leadProfile } = await import('@/lib/ops/more');
      const { profile } = await leadProfile(p.contactId);
      if (profile) ctx = { business: profile.business || p.business, clientValue: profile.clientValue, notWorking: profile.notWorking, brief: profile.brief, answers: profile.answers, callSummary: profile.meetings[0]?.summary, actions: profile.meetings[0]?.actions };
    }
    await draftProposal(p.token, ctx);
  } catch (err) { return { error: String((err as Error).message ?? err) }; }
  await done();
  return { savedAt: Date.now() };
}

// ---------------------------------------------------------------- Replies and bookings by hand (lib/replyDraft, lib/crmSync)

export type DraftState = { reply?: string; theirMessage?: string; error?: string } | null;

/** Firm page: paste what a cold prospect said, get a reply in Naufal's voice. Nothing is sent. */
export async function draftFirmReply(_prev: DraftState, form: FormData): Promise<DraftState> {
  await requireSession();
  const id = str(form, 'id');
  const theirMessage = str(form, 'theirMessage');
  const p = (await getProspects()).find((x) => x.id === id);
  if (!p) return { error: 'Firm not found.', theirMessage };
  try {
    const { draftReply } = await import('@/lib/replyDraft');
    const { FUNNEL } = await import('@/config/funnel');
    const r = p.drafts?.research;
    const sentDm = p.dmStyle && p.drafts?.dms?.find((d) => d.style === p.dmStyle)?.text;
    const reply = await draftReply({
      channel: p.channel ?? (p.instagram ? 'instagram' : 'email'), who: r?.owner ?? p.firm, firm: p.firm, firstName: p.drafts?.firstName,
      gap: r?.gap, research: [r?.portfolio, r?.enquiryPath, r?.detail].filter(Boolean).join(' · ') || undefined,
      reportUrl: p.reportToken ? `${FUNNEL.site}/r/${p.reportToken}` : undefined,
      previous: [sentDm ? `Naufal (opener): ${sentDm}` : '', p.liDmAt && p.channel === 'linkedin' ? 'Naufal sent the LinkedIn DM asking how enquiries reach them.' : ''].filter(Boolean),
      theirMessage,
    });
    return { reply, theirMessage };
  } catch (err) { return { error: String((err as Error).message ?? err), theirMessage }; }
}

/** Lead page: a reply to the last inbound email, from the thread, the brief and the deal stage. */
export async function draftEmailReply(contactId: string): Promise<{ text?: string; error?: string }> {
  await requireSession();
  try {
    const { leadProfile } = await import('@/lib/ops/more');
    const { draftReply } = await import('@/lib/replyDraft');
    const { profile } = await leadProfile(contactId);
    if (!profile) return { error: 'Lead not found.' };
    const inbound = profile.thread.filter((m) => m.folder === 'inbox');
    const last = inbound.at(-1);
    if (!last?.text) return { error: 'No email from them to reply to yet.' };
    const text = await draftReply({
      channel: 'email', who: profile.name, firm: profile.business || undefined, firstName: profile.name.replace(/^@/, '').split(' ')[0],
      research: [profile.brief?.slice(0, 1500), profile.notWorking ? `In their words: ${profile.notWorking}` : '', `Deal stage: ${profile.stageLabel}.`].filter(Boolean).join('\n'),
      previous: profile.thread.slice(-6, -1).map((m) => `${m.folder === 'sent' ? 'Naufal' : profile.name}: ${(m.text ?? '').replace(/\s+/g, ' ').slice(0, 400)}`),
      theirMessage: last.text.slice(0, 3000),
    });
    return { text };
  } catch (err) { return { error: String((err as Error).message ?? err) }; }
}

/** Firm page: they booked the audit but the booking didn't match (personal email). Links the firm by hand. */
export async function markBooked(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const p = (await getProspects()).find((x) => x.id === id);
  if (!p) return;
  const dealId = str(form, 'deal').match(/record\/0-3\/(\d+)/)?.[1] ?? (/^\d{6,}$/.test(str(form, 'deal')) ? str(form, 'deal') : undefined);
  const m = await import('@/lib/crmSync');
  // Into HubSpot first (contact + deal at Contacted) if the firm isn't there yet, so the booking has a deal to sit on.
  let ids: { contactId?: string; dealId?: string } = { contactId: p.contactId, dealId: dealId ?? p.dealId };
  if (!ids.contactId && process.env.HUBSPOT_TOKEN) {
    const synced = await m.syncProspect(id, { status: 'replied' }).catch(() => null);
    if (synced) ids = { contactId: synced.contactId, dealId: dealId ?? synced.dealId };
  }
  await m.onColdBooking(p, ids).catch((err) => console.error('[markBooked]', err));
  if (ids.dealId && process.env.HUBSPOT_TOKEN) await setDealStage(ids.dealId, (await import('@/lib/hubspot')).STAGE.auditBooked).catch(() => {});
  await logEvent('booking', `Audit booked (linked by hand) · ${p.firm}`, `/dashboard/outreach/firm/${encodeURIComponent(p.id)}`);
  changed();
}

/** System → Health: one-time copy of every JSON file from Vercel Blob into the Postgres store (lib/store). */
export async function migrateStore() {
  await requireSession();
  const { copyBlobToPostgres, putJSON } = await import('@/lib/store');
  let r: { copied: number; skipped: number; failed: string[] };
  try { r = await copyBlobToPostgres(); } catch (err) { r = { copied: 0, skipped: 0, failed: [String((err as Error).message ?? err)] }; }
  await putJSON('meta/store-migration.json', { at: new Date().toISOString(), ...r }).catch(() => {});
  // Only a failed copy is something to fix; a clean one is recorded in meta/store-migration.json.
  if (r.failed.length) await logEvent('alert', `Store copy: ${r.copied} copied, ${r.skipped} skipped, ${r.failed.length} failed`, '/dashboard/system');
  await done();
}

/** Outreach → Today: a triaged reply has been answered (or needs nothing). */
export async function markReplyHandled(form: FormData) {
  await requireSession();
  await undoable('Reply marked answered', { files: ['inbox/triage.json'] });
  const { markTriaged } = await import('@/lib/triage');
  await markTriaged(str(form, 'id'));
  changed();
}

/** Today → Needs you: Done (hide 7 days), Snooze (hide until tomorrow), or bring a hidden row back. */
export async function dismissNeed(form: FormData) {
  await requireSession();
  const { dismiss, restore } = await import('@/lib/dismiss');
  const key = str(form, 'key');
  if (!key) return;
  const how = str(form, 'how');
  if (how === 'restore') await restore(key);
  else await dismiss(key, str(form, 'title'), how === 'snoozed' ? 'snoozed' : 'done');
  changed();
}

/** Clients: tick (or untick) an onboarding step. */
export async function toggleClientStep(form: FormData) {
  await requireSession();
  const { toggleStep, STEPS } = await import('@/lib/clients');
  const key = str(form, 'key');
  if (!STEPS.some((s) => s.key === key)) return;
  await toggleStep(str(form, 'dealId'), key as (typeof STEPS)[number]['key']);
  changed();
}

/** Clients: save notes, retainer and renewal date for one client. */
export async function saveClientNote(form: FormData) {
  await requireSession();
  const { saveDetails } = await import('@/lib/clients');
  await saveDetails(str(form, 'dealId'), { note: str(form, 'note'), name: str(form, 'name'), retainer: Number(str(form, 'retainer')) || undefined, renewsOn: str(form, 'renewsOn') || undefined });
  changed();
}

/** Money: stop chasing an invoice (dashboard only, Stripe untouched), or undo that. */
export async function writeOffInvoice(form: FormData) {
  await requireSession();
  const { setWrittenOff } = await import('@/lib/invoices');
  const undo = str(form, 'undo') === '1';
  await setWrittenOff(str(form, 'id'), undo ? null : { number: str(form, 'number'), who: str(form, 'who'), amount: Number(str(form, 'amount')) || 0, currency: str(form, 'currency') || 'gbp' });
  await logEvent('payment_issue', `${undo ? 'Chasing again' : 'Written off'} · invoice ${str(form, 'number')} · ${str(form, 'who')}`, '/dashboard/money');
  changed();
}

/** Money: Stripe re-sends the invoice email. */
export async function sendInvoiceReminder(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireSession();
  const { sendReminder } = await import('@/lib/invoices');
  try { await sendReminder(str(form, 'id')); } catch (err) { return { error: String((err as Error).message ?? err) }; }
  await logEvent('payment_issue', `Invoice reminder sent · ${str(form, 'who')}`, '/dashboard/money');
  await done();
  return { savedAt: Date.now() };
}
