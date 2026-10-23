// Round 2: Done/Snooze on Needs you (+ Bring back), Undo after a one-click action, bulk Approve on Review,
// the Weekly review page and the Leads "Needs a reply" view.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8')); } catch { return null; } };
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const now = new Date().toISOString();
const firm = (id, name, fit) => ({ id, firm: name, website: `https://${id}.example`, tz: 'America/Chicago', fit, fitWhy: ['Design practice'], searchId: 's', createdAt: now, status: 'new' });

const list = (read('outreach/prospects.json') ?? []).filter((p) => !['undo1', 'bulk1', 'bulk2'].includes(p.id));
write('outreach/prospects.json', [...list, firm('undo1', 'Undo Firm', 3), firm('bulk1', 'Bulk One', 3), firm('bulk2', 'Bulk Two', 3)]);
write('ops/dismissed.json', {});

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const settle = async () => { await page.waitForLoadState('load'); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(400); };
const act = async (loc) => { await Promise.all([page.waitForResponse((r) => r.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await page.waitForTimeout(2500); await settle(); };
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await settle();

// Done / Bring back on the first Needs-you row
const card = page.locator('section', { hasText: 'Needs you' }).first();
const firstRow = card.locator('ul').first().locator('li').first();
const title = ((await firstRow.innerText().catch(() => '')).split('\n').find((l) => l.length > 12) ?? '').trim();
check('Needs you has a row with Done and Snooze', !!title && (await firstRow.getByRole('button', { name: /Done/ }).count()) === 1 && (await firstRow.getByRole('button', { name: 'Snooze' }).count()) === 1, title);
if (title) {
  await act(firstRow.getByRole('button', { name: /Done/ }));
  const stillTop = await card.locator('ul').first().innerText().catch(() => '');
  check('Done hides the row', !stillTop.includes(title) && Object.keys(read('ops/dismissed.json') ?? {}).length === 1);
  await card.locator('summary', { hasText: 'hidden' }).click();
  await act(card.getByRole('button', { name: 'Bring back' }).first());
  check('Bring back restores it', Object.keys(read('ops/dismissed.json') ?? {}).length === 0 && (await card.innerText()).includes(title));
}

// Undo after Skip on Review
await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`); await settle();
await act(page.locator('li', { hasText: 'Undo Firm' }).getByRole('button', { name: 'Skip' }));
check('Skip takes effect', (read('outreach/prospects.json') ?? []).find((p) => p.id === 'undo1')?.status === 'rejected');
const undo = page.getByRole('button', { name: /^Undo/ });
check('Undo bar appears', await undo.isVisible().catch(() => false));
await act(undo);
check('Undo puts the firm back', (read('outreach/prospects.json') ?? []).find((p) => p.id === 'undo1')?.status === 'new');

// Bulk approve two firms
await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`); await settle();
await page.getByRole('checkbox', { name: 'Select Bulk One' }).check();
await page.getByRole('checkbox', { name: 'Select Bulk Two' }).check();
const bulk = page.getByRole('button', { name: 'Approve 2' });
check('Bulk bar counts the selection', await bulk.isVisible().catch(() => false));
await act(bulk);
// Approving starts research at once; locally the fake sites can't load, so research then skips them. Either
// outcome proves both were approved (a plain Skip never adds "Skipped after research").
const fp = (id) => (read('outreach/prospects.json') ?? []).find((p) => p.id === id) ?? {};
const approved = (id) => fp(id).status === 'approved' || fp(id).status === 'drafted' || (fp(id).status === 'rejected' && /Skipped after research/.test(fp(id).fitWhy?.[0] ?? ''));
check('Bulk approve approves both', approved('bulk1') && approved('bulk2'), `${fp('bulk1').status} ${fp('bulk2').status}`);

// Weekly review + Needs a reply view
await page.goto(`${BASE}/dashboard/review`); await settle();
const rv = await page.locator('main').innerText();
check('Weekly review shows this week vs last', rv.includes('Weekly review') && rv.includes('This week') && rv.includes('Firms started'));
await page.goto(`${BASE}/dashboard/leads?view=reply`); await settle();
check('Leads has a Needs a reply view', (await page.locator('main').innerText()).includes('Nobody is waiting on a reply') || (await page.locator('a[aria-current=true]', { hasText: 'Needs a reply' }).count()) === 1);

check('No page errors', !errors.length, errors.join(' | '));
await b.close();
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
