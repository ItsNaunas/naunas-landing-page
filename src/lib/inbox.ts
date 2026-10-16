import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Read-only IMAP access to contact@ (same Zoho app password as SMTP; IMAP must be enabled in Zoho Mail →
// Settings → Mail Accounts → IMAP Access). Used for: the email thread in a lead's drawer, the outreach
// inbox, and stopping a cold sequence when someone replies. Never deletes, moves or marks anything.

export type Mail = {
  uid: number; folder: 'inbox' | 'sent'; messageId: string; inReplyTo?: string; references?: string[];
  date: string; from: string; fromName: string; to: string[]; subject: string; text: string;
};

const imapHost = () => process.env.ZOHO_IMAP_HOST || (process.env.ZOHO_SMTP_HOST ?? '').replace(/^smtp/, 'imap');
export const inboxReady = () => !!(process.env.ZOHO_SMTP_HOST && process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS);

async function withImap<T>(fn: (c: ImapFlow, folders: { inbox: string; sent: string }) => Promise<T>): Promise<T> {
  if (!inboxReady()) throw new Error('Zoho mail not configured');
  const client = new ImapFlow({
    host: imapHost(), port: 993, secure: true, logger: false,
    auth: { user: process.env.ZOHO_SMTP_USER!, pass: process.env.ZOHO_SMTP_PASS! },
    socketTimeout: 20_000,
  });
  await client.connect();
  try {
    const boxes = await client.list();
    const sent = boxes.find((b) => b.specialUse === '\\Sent')?.path ?? boxes.find((b) => /^sent/i.test(b.path))?.path ?? 'Sent';
    return await fn(client, { inbox: 'INBOX', sent });
  } finally {
    await client.logout().catch(() => {});
  }
}

const addr = (a?: { address?: string; name?: string }[]) => a?.[0]?.address?.toLowerCase() ?? '';

async function read(c: ImapFlow, folder: string, kind: Mail['folder'], query: Parameters<ImapFlow['search']>[0], max: number): Promise<Mail[]> {
  const lock = await c.getMailboxLock(folder);
  try {
    const uids = (await c.search(query, { uid: true })) || [];
    const pick = uids.slice(-max);
    if (!pick.length) return [];
    const msgs = await c.fetchAll(pick.join(','), { uid: true, envelope: true, source: true }, { uid: true });
    return Promise.all(msgs.map(async (m) => {
      const parsed = m.source ? await simpleParser(m.source) : null;
      const env = m.envelope;
      const refs = parsed?.references;
      return {
        uid: m.uid, folder: kind,
        messageId: env?.messageId ?? parsed?.messageId ?? '',
        inReplyTo: env?.inReplyTo ?? undefined,
        references: Array.isArray(refs) ? refs : refs ? [refs] : undefined,
        date: new Date(env?.date ?? parsed?.date ?? Date.now()).toISOString(),
        from: addr(env?.from), fromName: env?.from?.[0]?.name ?? '',
        to: (env?.to ?? []).map((t) => t.address?.toLowerCase() ?? '').filter(Boolean),
        subject: env?.subject ?? '(no subject)',
        text: stripQuoted(parsed?.text ?? ''),
      };
    }));
  } finally {
    lock.release();
  }
}

/** Drop the quoted history under a reply so threads show each message once. */
function stripQuoted(text: string) {
  const cut = text.search(/\n(On .{5,120} wrote:|-{2,} ?Original Message|From: .+\nSent: )/i);
  return (cut > 0 ? text.slice(0, cut) : text).replace(/\n{3,}/g, '\n\n').trim().slice(0, 6000);
}

/** Every email to or from this address (inbox + sent), oldest first. */
export async function threadWith(email: string, sinceDays = 180): Promise<Mail[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  return withImap(async (c, f) => {
    const [inbound, outbound] = await Promise.all([
      read(c, f.inbox, 'inbox', { from: email, since }, 30),
      read(c, f.sent, 'sent', { to: email, since }, 30),
    ]);
    return [...inbound, ...outbound].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  });
}

/** Inbound mail from these addresses since a date (used to stop sequences on reply). */
export async function repliesFrom(emails: string[], since: Date): Promise<Mail[]> {
  if (!emails.length) return [];
  return withImap((c, f) => read(c, f.inbox, 'inbox', emails.length === 1 ? { from: emails[0], since } : { or: emails.map((e) => ({ from: e })), since }, 200));
}

/** Recent inbound mail, newest first (the outreach inbox filters this to known people). */
export async function recentInbound(days = 14, max = 60): Promise<Mail[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  return withImap(async (c, f) => (await read(c, f.inbox, 'inbox', { since }, max)).reverse());
}

/** Health check: login + list folders. */
export async function checkInbox(): Promise<string> {
  return withImap(async (_c, f) => `IMAP ok (sent folder: ${f.sent})`);
}
