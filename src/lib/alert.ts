// Telegram alerts (env TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID), read on a phone at odd hours, so every
// message has the same shape: icon + bold title, short labelled lines, the lead's own words as a quote,
// and one-tap buttons. Never throws and never blocks the request that called it: a missing bot or a
// Telegram outage must not cost us a lead. Without the env vars it only logs.

type Level = 'error' | 'lead' | 'money' | 'ok';
const ICON: Record<Level, string> = { error: '🔴', lead: '⭐', money: '💰', ok: '✅' };

export type Button = { text: string; url: string };
export type AlertMessage = {
  level: Level;
  title: string;
  /** Pre-built lines; use line() so values are escaped. Empty strings are dropped. */
  lines?: string[];
  /** Their own words (shown as a quote block). */
  quote?: string;
  /** One short "what to do now" line at the bottom. */
  next?: string;
  buttons?: Button[];
};

import { FUNNEL } from '@/config/funnel';

const LOGS_URL = FUNNEL.logsUrl;

/** Escape for Telegram HTML mode. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** "💰 <b>Client value</b>  $25k-100k": an icon, a bold label and an escaped value. Empty values → ''. */
export function line(icon: string, label: string, value?: string | null): string {
  return value ? `${icon} <b>${esc(label)}</b>  ${esc(value)}` : '';
}

function render(m: AlertMessage): string {
  const parts = [`${ICON[m.level]} <b>${esc(m.title)}</b>`];
  const lines = (m.lines ?? []).filter(Boolean);
  if (lines.length) parts.push(lines.join('\n'));
  if (m.quote) parts.push(`<blockquote>${esc(m.quote.slice(0, 500))}</blockquote>`);
  if (m.next) parts.push(`👉 ${esc(m.next)}`);
  return parts.join('\n\n').slice(0, 4000);
}

export async function notify(m: AlertMessage): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const text = render(m);
  if (!token || !chatId) {
    console.log('[Alert] (Telegram not configured)', text);
    return;
  }
  const buttons = (m.buttons ?? []).filter((b) => /^https:\/\//.test(b.url));
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(buttons.length ? { reply_markup: { inline_keyboard: buttons.map((b) => [b]) } } : {}),
      }),
    });
    if (!res.ok) console.error('[Alert] Telegram failed:', res.status, await res.text());
  } catch (err) {
    console.error('[Alert] Telegram failed:', err);
  }
}

/**
 * For catch blocks: logs as before, then sends "where / what / what it means" with a logs button.
 * `impact` defaults to the common case: the visitor's request still succeeded, only this step didn't.
 */
export async function alertError(where: string, err: unknown, impact = 'The visitor’s request still went through. Only this step failed.'): Promise<void> {
  console.error(`[${where}]`, err);
  await import('@/lib/events').then((m) => m.logEvent('alert', `Problem: ${where}`)).catch(() => {});
  const detail = (err instanceof Error ? err.message : String(err)).slice(0, 400);
  const [area, step] = where.split(/:\s*/, 2);
  await notify({
    level: 'error',
    title: `Funnel problem: ${step ?? area}`,
    lines: [line('📍', 'Where', area), `⚠️ <b>Error</b>\n<code>${esc(detail)}</code>`, line('🧭', 'Impact', impact)],
    buttons: [{ text: 'Open logs', url: LOGS_URL }],
  });
}
