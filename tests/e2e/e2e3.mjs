// Start outreach + email hold, focus mode, open & copy, timeline.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const D = 86_400_000;
const iso = (ms) => new Date(Date.now() - ms).toISOString();
const read = (p) => JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8'));
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
fs.rmSync(STORE, { recursive: true, force: true });
const drafts = (dm) => ({ subject: 'the reply on your form', steps: ['Hi there,\n\nE1\n\nNaufal', 'E2', 'E3', 'E4'], dm, dms: [{ style: 'A', text: dm }] });
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, domain: `${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(5 * D), ...extra });
write('outreach/prospects.json', [
  base('ig', { instagram: 'ig.firm', email: 'hi@ig.example', status: 'drafted', drafts: drafts('Love the oak stair in your Austin project. Your call or the client’s?') }),
  base('noig', { email: 'hi@noig.example', status: 'drafted', drafts: drafts('n/a') }),
  base('noemail', { instagram: 'noemail.firm', status: 'drafted', drafts: drafts('Lovely tile work in the Hyde Park bath. Was that zellige?') }),
  base('fu', { instagram: 'fu.firm', email: 'hi@fu.example', status: 'scheduled', scheduledAt: iso(3 * D), warmedAt: iso(5 * D), dmSentAt: iso(4 * D), drafts: drafts('x'), drafts2: 1 }),
  base('w1', { instagram: 'w1.firm', status: 'scheduled', channel: 'instagram', drafts: drafts('Hi one') }),
  base('w2', { instagram: 'w2.firm', status: 'scheduled', channel: 'instagram', drafts: drafts('Hi two') }),
]);
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const prospect = (id) => read('outreach/prospects.json').find((p) => p.id === id);

// Start outreach (DraftEditor uses its own form, no reload)
await page.goto(`${BASE}/dashboard/outreach/prospects`, { waitUntil: 'networkidle' });
for (const id of ['ig', 'noig', 'noemail']) {
  await page.getByRole('button', { name: new RegExp(`Firm ${id} `) }).click();
  await page.getByRole('button', { name: 'Start outreach' }).last().click();
  await page.waitForTimeout(1500);
  check(`Start outreach: Firm ${id} → scheduled + scheduledAt`, prospect(id).status === 'scheduled' && !!prospect(id).scheduledAt, prospect(id).status);
  await page.goto(`${BASE}/dashboard/outreach/prospects`, { waitUntil: 'networkidle' });
}
check('Start outreach explains the order', true);

// Sequences: hold reasons + timeline
await page.goto(`${BASE}/dashboard/outreach/sequences`, { waitUntil: 'networkidle' });
const rowText = async (f) => (await page.locator('tr', { hasText: f }).innerText()).replace(/\s+/g, ' ');
// Start outreach puts a firm in ONE channel's cadence (2026-10-22), so a firm on Instagram gets no E1 at all.
check('IG firm: Instagram cadence only, no E1', prospect('ig').channel === 'instagram' && (await rowText('Firm ig ')).includes('Instagram only'), await rowText('Firm ig '));
check('No-Instagram firm: E1 goes in the next send', (await rowText('Firm noig')).includes('E1 in the next daily send'), await rowText('Firm noig'));
check('No-email firm: never on email', prospect('noemail').channel !== 'email' && (await rowText('Firm noemail')).includes(' only'), await rowText('Firm noemail'));
check('Opener sent 4 days ago: E1 released', (await rowText('Firm fu')).includes('E1 in the next daily send'), await rowText('Firm fu'));
check('Timeline shows done + due steps', (await rowText('Firm fu')).includes('Opener ✓') && (await rowText('Firm fu')).includes('Day 5'), await rowText('Firm fu'));

// Focus mode on Today
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const visibleItems = () => page.locator('[data-item]:visible').count();
const before = await visibleItems();
await page.getByRole('button', { name: /Focus mode/ }).click(); await page.waitForTimeout(300);
check('Focus mode shows exactly one item', (await visibleItems()) === 1, `${before} → ${await visibleItems()}`);
const first = await page.locator('[data-item]:visible').getAttribute('data-item');
await page.getByRole('button', { name: /Skip for now/ }).click(); await page.waitForTimeout(300);
const second = await page.locator('[data-item]:visible').getAttribute('data-item');
check('Skip moves to the next item', (await visibleItems()) === 1 && first !== second, `${first} → ${second}`);
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(300);
check('Focus mode is remembered after reload', (await visibleItems()) === 1);
await page.getByRole('button', { name: /Focus mode on/ }).click(); await page.waitForTimeout(300);
check('Focus mode off shows everything again', (await visibleItems()) === before, `${await visibleItems()}`);

// Open & copy on the day-5 follow-up
const fuRow = page.locator('[data-item="fu-fu"]');
const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null), fuRow.getByRole('link', { name: /Open chat & copy/ }).click()]);
await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
check('Open & copy puts the follow-up on the clipboard', clip.startsWith('Recorded a quick 60-second walkthrough'), clip.slice(0, 40));
check('Open & copy opens the Instagram chat', !!popup && /ig\.me\/m\/fu\.firm|instagram\.com.*fu\.firm/.test(decodeURIComponent(popup.url())), popup?.url());
await popup?.close();

// Phone width
await page.setViewportSize({ width: 390, height: 844 });
for (const p of ['/dashboard/outreach', '/dashboard/outreach/sequences', '/dashboard/outreach/prospects']) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`No sideways scroll at 390px: ${p}`, sw <= 391, `${sw}px`);
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
