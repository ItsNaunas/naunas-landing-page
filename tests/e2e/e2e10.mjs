// HubSpot round 2: deal fields, cold booking match, Won/Lost synced back, HubSpot check before research,
// owed task created + completed, firm/lead links, Results by channel.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const STORE = process.env.STORE;
const CALLS = process.env.CALLS;
const BASE = process.env.BASE || 'http://localhost:3000';
const D = 86_400_000;
const iso = (ms) => new Date(Date.now() - ms).toISOString();
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const read = (p) => JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8'));
fs.rmSync(STORE, { recursive: true, force: true });
const research = { owner: 'Ann Lee', gap: 'Form says replies in 5 days', detail: 'Oak stair' };
const drafts = { subject: 's', steps: ['a', 'b', 'c', 'd'], research };
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(9 * D), drafts, ...extra });
write('outreach/settings.json', { sending: false, dailyNew: 6, dailyTotal: 25, monthlyCapUsd: 10, igNew: 7, liNew: 7 });
write('outreach/prospects.json', [
  base('ig1', { status: 'scheduled', channel: 'instagram', instagram: 'ig1.studio', warmedAt: iso(6 * D), dmSentAt: iso(5 * D), dmStyle: 'B', scheduledAt: iso(7 * D) }),
  base('bk', { status: 'scheduled', channel: 'email', email: 'owner@bk.example', scheduledAt: iso(4 * D), sent: [{ step: 0, at: iso(3 * D), messageId: 'm' }] }),
  base('w1', { status: 'replied', channel: 'linkedin', dealId: 'deal-won', contactId: 'c-w1', scheduledAt: iso(20 * D), repliedAt: iso(10 * D) }),
  base('l1', { status: 'replied', channel: 'instagram', dealId: 'deal-lost', contactId: 'c-l1', scheduledAt: iso(20 * D), igRepliedAt: iso(10 * D) }),
  base('known', { status: 'new', website: 'https://livingoak.com/', email: 'known@known.example', drafts: undefined }),
]);

const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const calls = () => JSON.parse(fs.readFileSync(CALLS, 'utf8'));
const until = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const reset = () => fs.writeFileSync(CALLS, '[]');
const P = (id) => read('outreach/prospects.json').find((p) => p.id === id);

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 90000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(500); };

// 1. Won/Lost synced back when Prospects opens
await page.goto(`${BASE}/dashboard/outreach/prospects?step=replied`, { waitUntil: 'networkidle' });
check('Won in HubSpot → firm finished, wonAt set', P('w1').status === 'finished' && !!P('w1').wonAt);
check('Lost in HubSpot → firm stopped with reason', P('l1').status === 'stopped' && P('l1').lostReason === 'Budget');

// 2. Deal fields on a new deal (IG reply)
reset();
await page.goto(`${BASE}/dashboard/outreach/firm/ig1`, { waitUntil: 'networkidle' });
await act(page.getByRole('button', { name: 'They replied' }));
check('Deal fields set: channel, opener, days, gap', await until(() => calls().some((c) => c.method === 'PATCH' && /\/deals\//.test(c.url) && c.body.properties.naunas_cold_channel === 'instagram' && c.body.properties.naunas_opener_style === 'B' && c.body.properties.naunas_days_to_reply === '6' && c.body.properties.naunas_gap)), JSON.stringify(calls().filter((c) => c.method === 'PATCH' && /\/deals\//.test(c.url)).map((c) => c.body.properties)));

// 3. Said yes → task; Sent it → task completed
reset();
await page.goto(`${BASE}/dashboard/outreach/firm/ig1`, { waitUntil: 'networkidle' });
await act(page.getByRole('button', { name: /They said yes/ }));
check('Said yes → HubSpot task due in 24h', await until(() => calls().some((c) => c.url.endsWith('/objects/tasks') && c.body.properties.hs_task_subject.includes('Loom teardown') && c.body.associations.length === 2)));
check('Task id saved on the owed item', await until(() => !!read('outreach/owed.json')[0]?.taskId));
reset();
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
await act(page.locator(`[data-item="${read('outreach/owed.json')[0].id}"]`).getByRole('button', { name: 'Sent it' }));
check('Sent it → task completed', await until(() => calls().some((c) => c.method === 'PATCH' && /\/tasks\//.test(c.url) && c.body.properties.hs_task_status === 'COMPLETED')));

// 4. Firm page links
await page.goto(`${BASE}/dashboard/outreach/firm/ig1`, { waitUntil: 'networkidle' });
check('Firm page: Deal in HubSpot + Lead page links', (await page.getByRole('link', { name: /Deal in HubSpot/ }).count()) === 1 && (await page.getByRole('link', { name: 'Lead page', exact: true }).count()) === 1);

// 5. Cold booking: a booking from owner@bk.example matches firm bk
reset();
const payload = JSON.stringify({ triggerEvent: 'BOOKING_CREATED', payload: { startTime: new Date(Date.now() + 2 * D).toISOString(), attendees: [{ email: 'owner@bk.example', name: 'Bea Kay', timeZone: 'America/Chicago' }], responses: {} } });
const sig = crypto.createHmac('sha256', 'testsecret').update(payload).digest('hex');
const r = await fetch(`${BASE}/api/cal-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cal-signature-256': sig }, body: payload });
check('Booking webhook accepted', r.ok, String(r.status));
check('Cold booking → firm marked booked, sequences stopped', await until(() => !!P('bk').bookedAt && P('bk').status === 'replied'));
check('Cold booking → note with research on the deal', await until(() => calls().some((c) => c.url.endsWith('/objects/notes') && c.body.properties.hs_note_body.includes('Booked from cold outreach') && c.body.properties.hs_note_body.includes('Form says replies in 5 days'))));
check('Cold booking → status audit_booked + deal fields', calls().some((c) => c.body?.properties?.naunas_outreach_status === 'audit_booked') && calls().some((c) => c.body?.properties?.naunas_cold_channel === 'email'));
await page.goto(`${BASE}/dashboard/outreach/prospects?step=booked`, { waitUntil: 'networkidle' });
check('Prospects → Booked step lists it', (await page.locator('main').innerText()).includes('Firm bk'));

// 6. HubSpot check before research: known contact with a Won deal is skipped
await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`, { waitUntil: 'networkidle' });
await act(page.locator('[data-item="rv-known"]').getByRole('button', { name: 'Approve' }));
check('Known client in HubSpot → skipped before research', await until(() => P('known').status === 'rejected', 90000) && P('known').fitWhy[0].includes('already a client in HubSpot'), P('known').fitWhy[0]);

// 7. Results by channel
await page.goto(`${BASE}/dashboard/outreach/results`, { waitUntil: 'networkidle' });
const rt = await page.locator('main').innerText();
check('Results: by-channel table + lost reasons', /started → replied → booked → won/i.test(rt) && rt.includes('Budget (1)'));
await page.setViewportSize({ width: 390, height: 844 });
for (const u of ['/dashboard/outreach/results', '/dashboard/outreach/prospects?step=booked', '/dashboard/outreach/firm/ig1']) {
  await page.goto(BASE + u, { waitUntil: 'networkidle' });
  check(`No sideways scroll at 390px: ${u}`, (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391);
}
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
