// Per-channel daily targets and counts.
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
const r = (n) => ({ owner: `Owner ${n}`, ownerLinkedin: `https://www.linkedin.com/in/o-${n}/` });
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, domain: `${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(9 * D), status: 'drafted', drafts: { subject: 's', steps: ['x'], dm: 'Hi', research: r(id) }, ...extra });
write('outreach/settings.json', { sending: false, dailyNew: 10, dailyTotal: 25, monthlyCapUsd: 10, igNew: 2, liNew: 1 });
write('outreach/prospects.json', [
  ...['a', 'b', 'c', 'd'].map((x) => base(x, { instagram: `${x}.ig`, status: 'scheduled', channel: 'instagram' })),
  ...['n1', 'n2', 'n3'].map((x) => base(x, { status: 'scheduled', channel: 'linkedin' })), // no Instagram: LinkedIn engage straight away
  base('done1', { instagram: 'done1.ig', warmedAt: iso(0.01 * D) }), // warmed today: counts as 1 new on Instagram
  base('em', { instagram: 'em.ig', status: 'active', email: 'x@em.example', warmedAt: iso(3 * D), dmSentAt: iso(2.5 * D), sent: [{ step: 0, at: iso(0.01 * D), messageId: 'm' }] }),
]);
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(400); };
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const card = (label) => page.locator('main div[title]', { has: page.locator('p', { hasText: new RegExp(`^${label}( ✓)?$`) }) }).first();
const txt = async (label) => (await card(label).innerText()).replace(/\s+/g, ' ');
check('Instagram card: 1/2 new today', (await txt('Instagram')).includes('1/2 new'), await txt('Instagram'));
check('LinkedIn card: 0/1 new today', (await txt('LinkedIn')).includes('0/1 new'), await txt('LinkedIn'));
check('Email card: 1/10 new today', (await txt('Email')).includes('1/10 new'), await txt('Email'));
const warmCount = await page.locator('[data-item^="wu-"]').count();
check('Instagram warm-ups capped at what is left today (2 - 1 = 1)', warmCount === 1, `${warmCount}`);
const engageCount = await page.locator('[data-item^="li-engage-"]').count();
check('LinkedIn engages capped at 1', engageCount === 1, `${engageCount}`);
await act(page.locator('[data-item^="wu-"]').first().getByRole('button', { name: 'Done' }));
check('After hitting the Instagram target, no more warm-ups today', (await page.locator('[data-item^="wu-"]').count()) === 0);
check('Instagram card shows target hit', (await txt('Instagram')).includes('2/2') && (await txt('Instagram')).includes('✓'));
// Raise targets
await page.locator('summary', { hasText: 'Settings' }).click();
await page.fill('input[name=igNew]', '4'); await page.fill('input[name=liNew]', '3');
await act(page.getByRole('button', { name: 'Save targets' }));
const st = read('outreach/settings.json');
check('Targets saved', st.igNew === 4 && st.liNew === 3 && st.dailyNew === 10, JSON.stringify(st));
check('Raised target offers more warm-ups (4 - 2 = 2)', (await page.locator('[data-item^="wu-"]').count()) === 2);
check('Raised target offers more LinkedIn engages (3)', (await page.locator('[data-item^="li-engage-"]').count()) === 3);
check('Reps moved off Today', (await page.locator('li', { hasText: 'Zanzibar action' }).count()) === 0);
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
check('No sideways scroll at 390px', sw <= 391, `${sw}px`);
await page.screenshot({ path: 'e2e5-m.png' });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
