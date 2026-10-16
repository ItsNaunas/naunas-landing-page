// Small JSON store on Vercel Blob (private store; env BLOB_READ_WRITE_TOKEN, added when the store is
// connected to the project). Holds dashboard-editable config and counters, never plaintext secrets (the
// TikTok tokens are stored AES-GCM encrypted, see lib/tiktok.ts) or lead data
// (HubSpot stays the source of truth for people). Reads never throw: callers get the fallback.

import { get, put } from '@vercel/blob';

export const storeReady = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function getJSON<T>(path: string, fallback: T): Promise<T> {
  if (!storeReady()) return fallback;
  try {
    const res = await get(path, { access: 'private', useCache: false });
    if (!res) return fallback;
    return (await new Response(res.stream).json()) as T;
  } catch (err) {
    console.warn('[store] read failed', path, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function putJSON(path: string, data: unknown): Promise<void> {
  if (!storeReady()) throw new Error('Blob store not connected (BLOB_READ_WRITE_TOKEN missing)');
  await put(path, JSON.stringify(data), {
    access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true,
  });
}

/** Read-modify-write. Fine at our volume; a lost update under a burst only costs a counter tick. */
export async function updateJSON<T>(path: string, fallback: T, fn: (current: T) => T): Promise<T> {
  const next = fn(await getJSON(path, fallback));
  await putJSON(path, next);
  return next;
}
