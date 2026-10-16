'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DASH_COOKIE, DASH_MAX_AGE, passwordMatches, sessionToken, validSession } from '@/lib/dashAuth';
import { storeReady } from '@/lib/store';
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
