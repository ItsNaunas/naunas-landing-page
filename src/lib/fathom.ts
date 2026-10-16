import crypto from 'node:crypto';

// Fathom (env FATHOM_API_KEY, read-only use): call recordings, summaries and action items for the dashboard,
// plus verification for the "new meeting content ready" webhook (env FATHOM_WEBHOOK_SECRET, whsec_…).
// API: https://api.fathom.ai/external/v1, header X-Api-Key.

const API = 'https://api.fathom.ai/external/v1';

export type FathomMeeting = {
  title: string; meeting_title?: string | null; url: string; share_url?: string; created_at: string;
  scheduled_start_time?: string; recording_start_time?: string; recording_end_time?: string; recording_id: number;
  calendar_invitees?: { name?: string; email?: string; email_domain?: string; is_external?: boolean }[];
  default_summary?: { markdown_formatted?: string } | null;
  action_items?: { description: string; completed?: boolean; assignee?: { name?: string } }[] | null;
};

export const fathomReady = () => !!process.env.FATHOM_API_KEY;

async function fathom<T>(path: string): Promise<T> {
  const key = process.env.FATHOM_API_KEY;
  if (!key) throw new Error('Missing FATHOM_API_KEY');
  const res = await fetch(`${API}${path}`, { headers: { 'X-Api-Key': key }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Fathom ${path.split('?')[0]} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

/** Recent meetings with summary + action items (up to `pages` × the API page size). */
export async function fathomMeetings(opts: { sinceDays?: number; domain?: string; pages?: number } = {}): Promise<FathomMeeting[]> {
  const q = new URLSearchParams({ include_summary: 'true', include_action_items: 'true' });
  if (opts.sinceDays) q.set('created_after', new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString());
  if (opts.domain) q.append('calendar_invitees_domains[]', opts.domain);
  const out: FathomMeeting[] = [];
  let cursor = '';
  for (let i = 0; i < (opts.pages ?? 2); i++) {
    const r = await fathom<{ items: FathomMeeting[]; next_cursor: string | null }>(`/meetings?${q}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    out.push(...r.items);
    if (!r.next_cursor) break;
    cursor = r.next_cursor;
  }
  return out;
}

const FREE_MAIL = /@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|aol|proton|protonmail)\./i;

/** Meetings that had this person as an invitee (domain filter for business email, else last 120 days). */
export async function meetingsWith(email: string): Promise<FathomMeeting[]> {
  const e = email.toLowerCase();
  const domain = FREE_MAIL.test(e) ? undefined : e.split('@')[1];
  const list = await fathomMeetings({ domain, sinceDays: domain ? undefined : 120, pages: domain ? 1 : 3 });
  return list.filter((m) => m.calendar_invitees?.some((i) => i.email?.toLowerCase() === e));
}

export async function checkFathom(): Promise<string> {
  const r = await fathom<{ items: unknown[] }>('/meetings?limit=1');
  return `API ok (${r.items.length ? 'recordings found' : 'no recordings yet'})`;
}

/** Standard-webhooks signature check: HMAC-SHA256(base64-decoded secret, `${id}.${ts}.${body}`), base64, "v1,<sig>" list. */
export function verifyFathomWebhook(raw: string, headers: Headers, secret: string): boolean {
  const id = headers.get('webhook-id');
  const ts = headers.get('webhook-timestamp');
  const sigs = headers.get('webhook-signature');
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64');
  return sigs.split(' ').some((s) => {
    const v = s.split(',')[1] ?? '';
    return v.length === expected.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected));
  });
}
