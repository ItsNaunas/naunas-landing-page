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

/** Sends TikTok for every held post (after the app is approved), oldest first, within one request's time. */
export async function sendHeldTikTok(): Promise<{ error?: string; sent: number; left: number }> {
  await requireSession();
  const { tiktokApproved, runPost } = await import('@/lib/publish');
  if (!tiktokApproved()) return { error: 'TikTok has not approved the app yet (set TIKTOK_APPROVED=1 once it has).', sent: 0, left: 0 };
  const { getIndex } = await import('@/lib/content');
  const held = (await getIndex()).filter((r) => r.channels.tiktok === 'held').reverse();
  const until = Date.now() + 200_000;
  let sent = 0;
  for (const row of held) {
    if (Date.now() > until) break;
    const out = await runPost(row.id, { only: ['tiktok'] });
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
  revalidatePath('/dashboard/outreach');
}

/** Day 0 of the Instagram sequence done for one firm (followed + commented): counts as a warm-up rep. */
export async function markWarmed(form: FormData) {
  await requireSession();
  const id = str(form, 'id');
  const list = await getProspects();
  if (!list.some((x) => x.id === id)) return;
  await saveProspects(list.map((x) => (x.id === id ? { ...x, warmedAt: new Date().toISOString() } : x)));
  const { bumpRep } = await import('@/lib/reps');
  await bumpRep('warmups', 1);
  revalidatePath('/dashboard/outreach');
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
  const o = await addOwed({ who: who.slice(0, 120), what: what.slice(0, 80), channel: str(form, 'channel') || 'LinkedIn', link: str(form, 'link').slice(0, 400) || undefined });
  const { qstashReady, scheduleAt } = await import('@/lib/qstash');
  if (qstashReady()) await scheduleAt(new Date(Date.now() + (DUE_H - 4) * 3_600_000), { owed: o.id }).catch(() => {});
  revalidatePath('/dashboard', 'layout');
}

export async function markOwedSent(form: FormData) {
  await requireSession();
  const { patchOwed, NUDGE_D } = await import('@/lib/owed');
  const o = await patchOwed(str(form, 'id'), { sentAt: new Date().toISOString() });
  const { qstashReady, scheduleAt } = await import('@/lib/qstash');
  if (o && qstashReady()) await scheduleAt(new Date(Date.now() + NUDGE_D * 86_400_000), { nudge: o.id }).catch(() => {});
  revalidatePath('/dashboard', 'layout');
}

export async function closeOwed(form: FormData) {
  await requireSession();
  const outcome = str(form, 'outcome');
  if (!['replied', 'nudged', 'dropped'].includes(outcome)) return;
  const { patchOwed } = await import('@/lib/owed');
  await patchOwed(str(form, 'id'), { closedAt: new Date().toISOString(), outcome: outcome as 'replied' | 'nudged' | 'dropped' });
  revalidatePath('/dashboard', 'layout');
}
