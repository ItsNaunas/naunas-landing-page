// What "Ask Naunas" knows beyond the dashboard's own numbers (2026-11-06): this repo's PROGRESS.md (where
// the build stands, open next steps), the activity log, the last health check, clients + overdue invoices,
// what content has learned, the market feed, and the vault summary the laptop pushes twice a day
// (scripts/vault-sync.mjs → /api/vault/sync). All read-only.

import fs from 'node:fs/promises';
import path from 'node:path';
import { getJSON, putJSON } from '@/lib/store';
import { listEvents } from '@/lib/events';
import type { Check } from '@/lib/health';

// ---------------------------------------------------------------- PROGRESS.md (bundled, see next.config)

export type Progress = { updated: string; state: string; open: string[]; recent: { title: string; text: string }[] };

let progressCache: Progress | null = null;
export async function progressDigest(): Promise<Progress | null> {
  if (progressCache) return progressCache;
  const md = await fs.readFile(path.join(process.cwd(), 'PROGRESS.md'), 'utf8').catch(() => '');
  if (!md) return null;
  const field = (name: string) => new RegExp(`^\\*\\*${name}\\*\\*:?\\s*(.+)$`, 'm').exec(md)?.[1]?.trim() ?? '';
  const section = (h: string) => md.split(new RegExp(`^## ${h}\\s*$`, 'm'))[1]?.split(/^## /m)[0] ?? '';
  const open = section('Next steps').split('\n').filter((l) => /^\s*- \[ \]/.test(l)).map((l) => l.replace(/^\s*- \[ \]\s*/, '').slice(0, 400));
  const recent = section('Recent sessions').split(/^### /m).slice(1, 6).map((s) => {
    const [title, ...rest] = s.split('\n');
    return { title: title.trim(), text: rest.join(' ').replace(/\s+/g, ' ').trim().slice(0, 900) };
  });
  progressCache = { updated: field('Last updated'), state: field('State').slice(0, 900), open, recent };
  return progressCache;
}

// ---------------------------------------------------------------- Health (written by /api/health)

export type HealthRun = { at: string; ok: boolean; checks?: Check[] };
export const lastHealth = () => getJSON<HealthRun | null>('meta/health.json', null);

// ---------------------------------------------------------------- Activity log

export async function recentActivity(days = 7, limit = 40) {
  const since = Date.now() - days * 86_400_000;
  return (await listEvents(200)).filter((e) => Date.parse(e.at) >= since).slice(0, limit);
}

// ---------------------------------------------------------------- Vault summary (pushed from the laptop)

export type VaultItem = {
  name: string; kind: 'client' | 'project' | 'partner' | 'outbound'; status?: string; value?: string; lastContact?: string;
  state?: string; next: string[]; blocked: string[]; tasks: { text: string; due?: string; high?: boolean }[];
};
export type VaultSummary = { at: string; items: VaultItem[] };
const VAULT = 'vault/summary.json';
export const getVault = () => getJSON<VaultSummary | null>(VAULT, null);

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined);
const list = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, n).map((x) => x.slice(0, len)) : []);
// Belt and braces: the vault holds pointers, never values, but a pasted key must never reach the store.
const SECRET = /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}|\bre_[A-Za-z0-9_]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bxox[abp]-[A-Za-z0-9-]{10,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|\bsb_secret_[A-Za-z0-9_-]{10,}/g;
const scrub = <T,>(v: T): T => JSON.parse(JSON.stringify(v).replace(SECRET, '[redacted]'));

/** Validates and stores what scripts/vault-sync.mjs sends. */
export async function saveVault(body: unknown): Promise<number> {
  const raw = (body as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(raw)) throw new Error('items[] is required');
  const kinds = ['client', 'project', 'partner', 'outbound'];
  const items: VaultItem[] = raw.slice(0, 120).flatMap((x) => {
    const r = x as Record<string, unknown>;
    if (typeof r?.name !== 'string' || !kinds.includes(r.kind as string)) return [];
    const tasks = Array.isArray(r.tasks) ? r.tasks.slice(0, 12).flatMap((t) => {
      const tt = t as Record<string, unknown>;
      return typeof tt?.text === 'string' ? [{ text: tt.text.slice(0, 300), due: clip(tt.due, 10), high: tt.high === true || undefined }] : [];
    }) : [];
    return [{
      name: r.name.slice(0, 80), kind: r.kind as VaultItem['kind'], status: clip(r.status, 40), value: clip(r.value, 300), lastContact: clip(r.lastContact, 10),
      state: clip(r.state, 700), next: list(r.next, 8, 300), blocked: list(r.blocked, 6, 300), tasks,
    }];
  });
  await putJSON(VAULT, scrub({ at: new Date().toISOString(), items }));
  return items.length;
}
