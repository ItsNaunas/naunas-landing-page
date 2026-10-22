// Small JSON store behind every dashboard-editable thing (prospects, owed items, content, reports, proposals,
// counters, events). Three backends, same three functions:
//   - Postgres (Neon, env DATABASE_URL): one table kv(path, data, version). updateJSON is safe under concurrent
//     writers (a cron, a webhook and a click at the same moment) because it re-reads and retries on a version clash.
//   - Vercel Blob (env BLOB_READ_WRITE_TOKEN): the original backend; read-modify-write with no lock.
//   - A folder on disk (env LOCAL_STORE_DIR): local testing only, never on Vercel.
// Never holds plaintext secrets (TikTok tokens are AES-GCM encrypted, see lib/tiktok) or lead data (HubSpot stays
// the source of truth for people). Reads never throw: callers get the fallback.

import { get, put, list, del } from '@vercel/blob';

const LOCAL = process.env.LOCAL_STORE_DIR;
const PG = () => process.env.DATABASE_URL;
const BLOB = () => process.env.BLOB_READ_WRITE_TOKEN;

export type StoreKind = 'local' | 'postgres' | 'blob' | 'none';
export const storeKind = (): StoreKind => (LOCAL ? 'local' : PG() ? 'postgres' : BLOB() ? 'blob' : 'none');
export const storeReady = () => storeKind() !== 'none';

// ---------------------------------------------------------------- Postgres

type Rows = Record<string, unknown>[];
let runSql: ((text: string, params?: unknown[]) => Promise<Rows>) | null = null;
async function pg(text: string, params: unknown[] = []): Promise<Rows> {
  if (!runSql) {
    const { neon } = await import('@neondatabase/serverless');
    const q = neon(PG()!);
    runSql = async (t, p) => (await q.query(t, p)) as Rows;
  }
  return runSql(text, params);
}
export const KV_DDL = 'create table if not exists kv (path text primary key, data jsonb not null, version integer not null default 1, updated_at timestamptz not null default now())';
let tableReady: Promise<void> | null = null;
const ensureTable = () => (tableReady ??= pg(KV_DDL).then(() => undefined));

async function pgGet<T>(path: string, fallback: T): Promise<{ data: T; version: number } | { data: T; version: 0 }> {
  await ensureTable();
  const rows = await pg('select data, version from kv where path = $1', [path]);
  return rows[0] ? { data: rows[0].data as T, version: Number(rows[0].version) } : { data: fallback, version: 0 };
}
async function pgPut(path: string, data: unknown): Promise<void> {
  await ensureTable();
  await pg('insert into kv (path, data) values ($1, $2::jsonb) on conflict (path) do update set data = excluded.data, version = kv.version + 1, updated_at = now()', [path, JSON.stringify(data)]);
}
/** Read, apply fn, write only if nobody else wrote in between; otherwise read again (up to 6 times). */
async function pgUpdate<T>(path: string, fallback: T, fn: (current: T) => T): Promise<T> {
  await ensureTable();
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await pgGet(path, fallback);
    const next = fn(cur.data);
    const rows = cur.version === 0
      ? await pg('insert into kv (path, data) values ($1, $2::jsonb) on conflict (path) do nothing returning path', [path, JSON.stringify(next)])
      : await pg('update kv set data = $2::jsonb, version = version + 1, updated_at = now() where path = $1 and version = $3 returning path', [path, JSON.stringify(next), cur.version]);
    if (rows.length) return next;
  }
  throw new Error(`store: ${path} kept changing under us`);
}
/** Health: the table answers. */
export async function checkStore(): Promise<string> {
  const kind = storeKind();
  if (kind === 'none') throw new Error('no store connected: set DATABASE_URL (Neon) or connect Vercel Blob');
  if (kind === 'postgres') { await ensureTable(); const r = await pg('select count(*)::int as n from kv'); return `Postgres, ${Number(r[0]?.n ?? 0)} records`; }
  return kind === 'blob' ? 'Vercel Blob' : 'local folder';
}

/** One-time move: every JSON file in Blob that Postgres doesn't have yet. Safe to run again (skips what exists). */
export async function copyBlobToPostgres(): Promise<{ copied: number; skipped: number; failed: string[] }> {
  if (!PG() || !BLOB()) throw new Error('needs both DATABASE_URL and BLOB_READ_WRITE_TOKEN set');
  await ensureTable();
  const out = { copied: 0, skipped: 0, failed: [] as string[] };
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    for (const b of page.blobs) {
      const path = b.pathname;
      if (!path.endsWith('.json')) continue;
      try {
        if ((await pg('select 1 from kv where path = $1', [path])).length) { out.skipped++; continue; }
        const res = await get(path, { access: 'private', useCache: false });
        if (!res) continue;
        const data = await new Response(res.stream).json();
        await pg('insert into kv (path, data) values ($1, $2::jsonb) on conflict (path) do nothing', [path, JSON.stringify(data)]);
        out.copied++;
      } catch (err) { out.failed.push(`${path}: ${err instanceof Error ? err.message.slice(0, 80) : err}`); }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

// ---------------------------------------------------------------- Local folder

async function localFile(path: string) {
  const { join, dirname } = await import('node:path');
  const file = join(LOCAL!, path);
  return { file, dir: dirname(file), fs: await import('node:fs/promises') };
}

// ---------------------------------------------------------------- The three functions

export async function getJSON<T>(path: string, fallback: T): Promise<T> {
  const kind = storeKind();
  if (kind === 'none') return fallback;
  if (kind === 'local') {
    const { file, fs } = await localFile(path);
    try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; }
  }
  try {
    if (kind === 'postgres') return (await pgGet(path, fallback)).data;
    const res = await get(path, { access: 'private', useCache: false });
    if (!res) return fallback;
    return (await new Response(res.stream).json()) as T;
  } catch (err) {
    console.warn('[store] read failed', path, err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function putJSON(path: string, data: unknown): Promise<void> {
  const kind = storeKind();
  if (kind === 'none') throw new Error('Store not connected (set DATABASE_URL, or connect Vercel Blob)');
  if (kind === 'local') {
    const { file, dir, fs } = await localFile(path);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
    return;
  }
  if (kind === 'postgres') return pgPut(path, data);
  await put(path, JSON.stringify(data), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
}

/** Read-modify-write. On Postgres it retries on a clash, so two writers never lose each other's change. */
export async function updateJSON<T>(path: string, fallback: T, fn: (current: T) => T): Promise<T> {
  if (storeKind() === 'postgres') return pgUpdate(path, fallback, fn);
  const next = fn(await getJSON(path, fallback));
  await putJSON(path, next);
  return next;
}

/** Nightly: every record in the Postgres store as one private Blob file, keeping the last 14. */
export async function backupStore(): Promise<string | null> {
  if (storeKind() !== 'postgres' || !BLOB()) return null;
  await ensureTable();
  const rows = await pg('select path, data, updated_at from kv order by path');
  const name = `backups/store-${new Date().toISOString().slice(0, 10)}.json`;
  await put(name, JSON.stringify({ at: new Date().toISOString(), rows }), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  const old = (await list({ prefix: 'backups/store-', limit: 1000 })).blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(14);
  if (old.length) await del(old.map((b) => b.url));
  return `${name} (${rows.length} records)`;
}
