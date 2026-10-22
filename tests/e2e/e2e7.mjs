// Prospects pipeline, Start all, firm page, Settings menu.
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
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, domain: `${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: ['Design practice'], searchId: 's', createdAt: iso(2 * D), ...extra });
const drafts = (extra = {}) => ({ subject: 'the reply on your form', steps: ['Hi,\n\nE1\n\nNaufal', 'E2', 'E3', 'E4'], dm: 'Love the oak stair. Your call?', dms: [{ style: 'A', text: 'Love the oak stair. Your call?' }], research: { owner: 'Ann Lee', ownerLinkedin: 'https://www.linkedin.com/in/ann/', team: '4', gap: 'Form says replies in 5 days', detail: 'Oak stair' }, ...extra });
write('outreach/settings.json', { sending: false, dailyNew: 6, dailyTotal: 25, monthlyCapUsd: 10, igNew: 7, liNew: 7 });
write('outreach/prospects.json', [
  base('r1', { status: 'new' }), base('r2', { status: 'new' }),
  base('a1', { status: 'approved', researchAt: new Date().toISOString() }) /* started, so the page doesn't queue it again */,
  base('d1', { status: 'drafted', instagram: 'd1.ig', email: 'hi@d1.example', drafts: drafts() }),
  base('d2', { status: 'drafted', instagram: 'd2.ig', email: 'hi@d2.example', drafts: drafts() }),
  base('d3', { status: 'drafted', email: 'hi@d3.example', drafts: drafts({ steps: ['Hi [name],\n\nE1'] }) }), // placeholder: Start all must skip it
  base('x1', { status: 'rejected', fitWhy: ['Skipped after research: solo designer'] }),
  base('rp', { status: 'replied', channel: 'instagram', igRepliedAt: iso(D) }),
]);
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(400); };
const P = (id) => read('outreach/prospects.json').find((p) => p.id === id);

await page.goto(`${BASE}/dashboard/outreach/prospects`, { waitUntil: 'networkidle' });
const stepText = (await page.locator('nav[aria-label="Prospect steps"]').innerText()).replace(/\s+/g, ' ');
check('Step counts: review 2, researching 1, ready 3, outreach 0, replied 1, skipped 1', /Review 2 .*Researching 1 .*Ready to start 3 .*In outreach 0 .*Replied 1 .*Skipped 1/.test(stepText), stepText);
check('Opens on Ready to start when drafts are waiting', (await page.locator('[aria-current=page]', { hasText: 'Ready to start' }).count()) === 1);
await act(page.getByRole('button', { name: 'Start all 3' }));
check('Start all starts the clean drafts on a channel', P('d1').status === 'scheduled' && !!P('d1').channel && P('d2').status === 'scheduled' && !!P('d2').channel, `${P('d1').channel} ${P('d2').channel}`);
check('Start all skips the placeholder draft', P('d3').status === 'drafted');
check('Start all spreads firms across channels', P('d1').channel !== P('d2').channel || P('d1').channel === undefined, `${P('d1').channel} ${P('d2').channel}`);

await page.goto(`${BASE}/dashboard/outreach/prospects?step=skipped`, { waitUntil: 'networkidle' });
check('Skipped shows the reason', (await page.locator('main').innerText()).includes('Skipped after research: solo designer'));
await act(page.locator('li', { hasText: 'Firm x1' }).getByRole('button', { name: /Undo/ }));
check('Undo sends it back to Review', P('x1').status === 'new');

await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`, { waitUntil: 'networkidle' });
await page.getByRole('link', { name: 'Firm r1' }).click(); await page.waitForURL('**/outreach/firm/r1');
check('Firm name opens the firm page', page.url().endsWith('/dashboard/outreach/firm/r1'));
await page.goto(`${BASE}/dashboard/outreach/firm/d1`, { waitUntil: 'networkidle' });
const fp = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
check('Firm page shows research', fp.includes('Ann Lee') && fp.includes('Form says replies in 5 days'), fp.slice(0, 160));
check('Firm page shows progress + channel', fp.includes('only') && fp.includes('In outreach'));
await act(page.getByRole('button', { name: 'Stop all outreach' }));
check('Stop from firm page', P('d1').status === 'stopped');
await page.goto(`${BASE}/dashboard/outreach/firm/d3`, { waitUntil: 'networkidle' });
check('Ready firm page has the channel picker', (await page.locator('input[type=radio][name=channel]').count()) === 3);
const missing = await page.goto(`${BASE}/dashboard/outreach/firm/nope`, { waitUntil: 'networkidle' });
check('Unknown firm shows not found', missing.status() === 404 || /not found|404|doesn.t exist|can.t find/i.test(await page.locator('body').innerText()));

// Settings menu
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
check('Settings menu is closed by default', !(await page.getByRole('button', { name: 'Turn sending on' }).isVisible()));
await page.locator('summary', { hasText: 'Settings' }).click();
check('Settings menu shows targets 7/7/6', (await page.locator('input[name=igNew]').inputValue()) === '7' && (await page.locator('input[name=dailyNew]').inputValue()) === '6');
await act(page.getByRole('button', { name: 'Turn sending on' }));
check('Sending switch works from the menu', read('outreach/settings.json').sending === true);

await page.setViewportSize({ width: 390, height: 844 });
for (const p of ['/dashboard/outreach', '/dashboard/outreach/prospects', '/dashboard/outreach/firm/d2', '/dashboard/outreach/results']) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`No sideways scroll at 390px: ${p}`, sw <= 391, `${sw}px`);
}
await page.goto(`${BASE}/dashboard/outreach/prospects`, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'e2e7-m-prospects.png' });
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/dashboard/outreach/firm/d2`, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'e2e7-d-firm.png' });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
