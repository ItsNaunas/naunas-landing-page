// Clients (2026-10-23): won deals after the deposit. Each gets an onboarding checklist and a notes field, kept in
// the store (clients/state.json). The review and referral steps tick themselves when that ask was sent from Today.
// HubSpot stays the source of truth for who the client is; this file only holds the checklist ticks and notes.

import { getJSON, updateJSON } from '@/lib/store';
import { STAGE, hubspotUrl } from '@/lib/hubspot';
import { getAsks, type Ask } from '@/lib/asks';
import { src } from '@/lib/ops/cache';
import { collector, num, ts, DAY } from '@/lib/ops/common';
import { demoOn } from '@/lib/ops/demo';

export const STEPS = [
  { key: 'kickoff', label: 'Kickoff call held' },
  { key: 'access', label: 'Accounts and access shared' },
  { key: 'build', label: 'Build delivered' },
  { key: 'handover', label: 'Handover and docs sent' },
  { key: 'review', label: 'Review asked (day 21)', auto: 'review' as const },
  { key: 'referral', label: 'Referral asked (day 60)', auto: 'referral' as const },
] as const;
export type StepKey = (typeof STEPS)[number]['key'];

type State = Record<string, { done?: Partial<Record<StepKey, string>>; note?: string; name?: string; retainer?: number; renewsOn?: string }>;
const PATH = 'clients/state.json';
export const getClientState = () => getJSON<State>(PATH, {});

export async function toggleStep(dealId: string, key: StepKey): Promise<void> {
  await updateJSON<State>(PATH, {}, (all) => {
    const c = all[dealId] ?? {};
    const done = { ...(c.done ?? {}) };
    if (done[key]) delete done[key]; else done[key] = new Date().toISOString();
    return { ...all, [dealId]: { ...c, done } };
  });
}

export async function saveDetails(dealId: string, d: { note: string; name: string; retainer?: number; renewsOn?: string }): Promise<void> {
  await updateJSON<State>(PATH, {}, (all) => ({ ...all, [dealId]: { ...(all[dealId] ?? {}), note: d.note.slice(0, 4000), name: d.name.slice(0, 120), retainer: d.retainer || undefined, renewsOn: d.renewsOn || undefined } }));
}

/** Retainers renewing in the next `days` days (for Today), from the store only. */
export async function renewalsDue(days = 7): Promise<{ dealId: string; name: string; retainer?: number; renewsOn: string }[]> {
  const all = await getClientState();
  const now = Date.now();
  return Object.entries(all).filter(([, c]) => c.renewsOn && Date.parse(c.renewsOn) - now < days * DAY && Date.parse(c.renewsOn) > now - DAY)
    .map(([dealId, c]) => ({ dealId, name: c.name ?? 'A client', retainer: c.retainer, renewsOn: c.renewsOn! }));
}

export type Client = {
  dealId: string; name: string; amount: number; wonAt: string; days: number; hubspot: string;
  done: Partial<Record<StepKey, string>>; note: string; progress: number; nextStep?: string; retainer?: number; renewsOn?: string;
};

const DEMO = [
  { id: 'd-p7', name: 'Daniel Reyes · Design-build', amount: 5000, wonAt: new Date(Date.now() - 6 * DAY).toISOString() },
  { id: 'd-old', name: 'Grace Lin · Bloom Florals', amount: 1500, wonAt: new Date(Date.now() - 64 * DAY).toISOString() },
];

export async function clientsData() {
  const { errors, safe } = collector();
  const [won, state, asks] = demoOn()
    ? [{ results: DEMO.map((d) => ({ id: d.id, properties: { dealname: d.name, amount: String(d.amount), closedate: d.wonAt } as Record<string, string | null> })) }, {} as State, [] as Ask[]]
    : await Promise.all([
      safe('HubSpot', src.searchDeals([STAGE.won]), { total: 0, results: [] as { id: string; properties: Record<string, string | null> }[] }),
      getClientState().catch(() => ({} as State)),
      getAsks().catch(() => [] as Ask[]),
    ]);
  const now = Date.now();
  const clients: Client[] = won.results.map((d) => {
    const p = d.properties;
    const wonAt = p.closedate ?? p.createdate ?? '';
    const saved = (state as State)[d.id] ?? {};
    const done: Partial<Record<StepKey, string>> = { ...(saved.done ?? {}) };
    for (const a of (asks as Ask[]).filter((x) => x.dealId === d.id && x.outcome === 'sent')) done[a.kind] ??= a.doneAt ?? a.createdAt;
    const next = STEPS.find((s) => !done[s.key]);
    return {
      dealId: d.id, name: p.dealname ?? 'Untitled', amount: num(p.amount), wonAt, days: Math.max(0, Math.floor((now - ts(wonAt)) / DAY)),
      hubspot: hubspotUrl.deal(d.id), done, note: saved.note ?? '', retainer: saved.retainer, renewsOn: saved.renewsOn,
      progress: STEPS.filter((s) => done[s.key]).length, nextStep: next?.label,
    };
  }).sort((a, b) => ts(b.wonAt) - ts(a.wonAt));
  return { errors, clients, active: clients.filter((c) => c.progress < STEPS.length), finished: clients.filter((c) => c.progress === STEPS.length) };
}
