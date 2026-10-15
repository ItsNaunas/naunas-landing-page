// /dashboard login (env DASHBOARD_PASSWORD). The cookie holds an HMAC derived from the password, not the
// password, so changing DASHBOARD_PASSWORD signs everyone out. Web Crypto only, so it runs in the proxy too.

export const DASH_COOKIE = 'naunas_dash';
export const DASH_MAX_AGE = 30 * 24 * 3600;

async function hmac(key: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The cookie value for the current password, or null when the dashboard isn't configured. */
export async function sessionToken(): Promise<string | null> {
  const pw = process.env.DASHBOARD_PASSWORD;
  return pw ? hmac(pw, 'naunas-dashboard-v1') : null;
}

function sameLength(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function validSession(cookie?: string): Promise<boolean> {
  const token = await sessionToken();
  return !!token && !!cookie && sameLength(cookie, token);
}

export async function passwordMatches(input: string): Promise<boolean> {
  const pw = process.env.DASHBOARD_PASSWORD;
  return !!pw && sameLength(await hmac(pw, input), await hmac(pw, pw));
}
