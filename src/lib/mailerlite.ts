// MailerLite helpers (env MAILERLITE_API_TOKEN). The "Leak Map" group and the custom
// fields are found or created at runtime, so no IDs need hard-coding.

const API = 'https://connect.mailerlite.com/api';
export const LEAK_MAP_GROUP = 'Leak Map';
// Qualified questionnaire leads who haven't booked yet: starts the 2-email booking nudge. Booking removes them.
export const ENQUIRED_GROUP = 'Audit enquiry: not booked';
// Booked the free audit: starts the "before we talk" email. Cancelling removes them.
export const BOOKED_GROUP = 'Audit booked';

function headers() {
  const token = process.env.MAILERLITE_API_TOKEN;
  if (!token) throw new Error('Missing MAILERLITE_API_TOKEN');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function ml<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`MailerLite ${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const groupCache = new Map<string, string>();

export async function getOrCreateGroup(name: string): Promise<string> {
  const cached = groupCache.get(name);
  if (cached) return cached;
  const found = await ml<{ data: { id: string; name: string }[] }>(`/groups?filter[name]=${encodeURIComponent(name)}&limit=50`);
  let id = found.data.find((g) => g.name === name)?.id;
  if (!id) id = (await ml<{ data: { id: string } }>('/groups', { method: 'POST', body: JSON.stringify({ name }) })).data.id;
  groupCache.set(name, id);
  return id;
}

let fieldsReady = false;
async function ensureFields() {
  if (fieldsReady) return;
  const existing = await ml<{ data: { key: string }[] }>('/fields?limit=100');
  const keys = new Set(existing.data.map((f) => f.key));
  for (const name of ['client_value', 'signup_source', 'business_type', 'whats_not_working', 'call_time']) {
    if (keys.has(name)) continue;
    try {
      await ml('/fields', { method: 'POST', body: JSON.stringify({ name, type: 'text' }) });
    } catch (err) {
      console.error('[MailerLite] could not create field', name, err); // never block a sign-up on this
    }
  }
  fieldsReady = true;
}

export async function addToGroup(opts: { email: string; name?: string; clientValue?: string; source?: string; group: string; fields?: Record<string, string | undefined> }) {
  await ensureFields();
  const groupId = await getOrCreateGroup(opts.group);
  const fields: Record<string, string> = {};
  if (opts.name) fields.name = opts.name;
  if (opts.clientValue) fields.client_value = opts.clientValue;
  if (opts.source) fields.signup_source = opts.source;
  for (const [key, value] of Object.entries(opts.fields ?? {})) if (value) fields[key] = value.slice(0, 500);
  // Upsert: 201 new, 200 existing. Adding to the group starts the course automation.
  await ml('/subscribers', { method: 'POST', body: JSON.stringify({ email: opts.email, fields, groups: [groupId] }) });
}

export async function removeFromGroup(email: string, group: string): Promise<boolean> {
  const groupId = await getOrCreateGroup(group);
  let subscriberId: string;
  try {
    subscriberId = (await ml<{ data: { id: string } }>(`/subscribers/${encodeURIComponent(email)}`)).data.id;
  } catch {
    return false; // not a subscriber, nothing to stop
  }
  try {
    await ml(`/subscribers/${subscriberId}/groups/${groupId}`, { method: 'DELETE' });
    return true;
  } catch {
    return false; // wasn't in the group
  }
}
