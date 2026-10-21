// Small JSON store on Vercel Blob (private store; env BLOB_READ_WRITE_TOKEN, added when the store is
// connected to the project). Holds dashboard-editable config and counters, never plaintext secrets (the
// TikTok tokens are stored AES-GCM encrypted, see lib/tiktok.ts) or lead data
// (HubSpot stays the source of truth for people). Reads never throw: callers get the fallback.

import { get, put } from '@vercel/blob';

// Local testing only: LOCAL_STORE_DIR=<folder> keeps the JSON on disk instead of Blob, so dashboard buttons
// can be clicked end to end on a laptop without touching production data. Never set on Vercel.
const LOCAL = process.env.LOCAL_STORE_DIR;
async function localFile(path: string) {
  const { join, dirname } = await import('node:path');
  const file = join(LOCAL!, path);
  return { file, dir: dirname(file), fs: await import('node:fs/promises') };
}

export const storeReady = () => !!process.env.BLOB_READ_WRITE_TOKEN || !!LOCAL;

export async function getJSON<T>(path: string, fallback: T): Promise<T> {
  if (!storeReady()) return fallback;
  if (LOCAL) {
    const { file, fs } = await localFile(path);
    try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; }
  }
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
  if (LOCAL) {
    const { file, dir, fs } = await localFile(path);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
    return;
  }
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
