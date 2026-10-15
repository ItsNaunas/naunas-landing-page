// Telegram alerts (env TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID). Two uses: something in the funnel broke,
// or a high-value lead just arrived. Never throws and never blocks the request that called it: a missing
// bot or a Telegram outage must not cost us a lead. Without the env vars it only logs.

type Level = 'error' | 'lead' | 'info';
const ICON: Record<Level, string> = { error: '🔴', lead: '⭐', info: '✅' };

export async function alert(text: string, level: Level = 'error'): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const message = `${ICON[level]} ${text}`.slice(0, 4000);
  if (!token || !chatId) {
    console.log('[Alert] (Telegram not configured)', message);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('[Alert] Telegram failed:', res.status, await res.text());
  } catch (err) {
    console.error('[Alert] Telegram failed:', err);
  }
}

/** For catch blocks: log as before and alert, with the route name so the message says where it broke. */
export async function alertError(where: string, err: unknown): Promise<void> {
  console.error(`[${where}]`, err);
  const detail = err instanceof Error ? err.message : String(err);
  await alert(`${where}\n${detail.slice(0, 600)}`, 'error');
}
