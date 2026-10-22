// New pieces: wave-1 import, research on draft cards, LinkedIn day-10 step, routine skips.
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
const research = { owner: 'Jane Doe', ownerLinkedin: 'https://www.linkedin.com/in/janedoe', igLastPost: '2026-10-15', team: '5: owner + 4 designers', segment: 'residential', fullService: true, gap: 'Form promises a reply in 3 to 5 business days', detail: 'The walnut kitchen in the Tarrytown project' };
const drafts = { subject: 'the 5-day reply', steps: ['Hi Jane,\n\nE1\n\nNaufal', 'E2', 'E3', 'E4'], dm: 'Love the walnut kitchen in Tarrytown. Was the wood your pick?', dms: [{ style: 'A', text: 'Love the walnut kitchen in Tarrytown. Was the wood your pick?' }], research };
write('outreach/prospects.json', [
  { id: 'li1', firm: 'Doe Interiors', website: 'https://doe.example', domain: 'doe.example', instagram: 'doe.ig', tz: 'America/Chicago', fit: 7, fitWhy: [], searchId: 's', createdAt: iso(12 * D), status: 'active', startedAt: iso(10 * D), warmedAt: iso(11 * D), dmSentAt: iso(10 * D), fu1At: iso(7 * D), drafts, sent: [{ step: 0, at: iso(10 * D), messageId: 'm' }] },
  { id: 'dr1', firm: 'Draft Studio', website: 'https://draft.example', domain: 'draft.example', instagram: 'draft.ig', tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(2 * D), status: 'drafted', drafts },
]);
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((r) => r.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(400); };

// LinkedIn cold sequence on Today (day after the IG opener: engage)
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const liRow = page.locator('[data-item="li-engage-li1"]');
check('LinkedIn engage step shows with owner name', (await liRow.innerText()).includes('Jane Doe · Doe Interiors'));
check('Engage link opens their recent posts', (await liRow.getByRole('link', { name: /Open their posts/ }).getAttribute('href')) === 'https://www.linkedin.com/in/janedoe/recent-activity/all/');
await act(liRow.getByRole('button', { name: 'Done' }));
check('Engage saves liEngagedAt', !!read('outreach/prospects.json').find((p) => p.id === 'li1').liEngagedAt);
check('Engage counts a LinkedIn rep', Object.values(read('outreach/reps.json')).some((d) => d.linkedin === 1));
check('Engage leaves the list', (await page.locator('[data-item="li-engage-li1"]').count()) === 0);

// Prospects: import + research on the card
await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`, { waitUntil: 'networkidle' });
check('Import card shows 18 wave-1 firms', (await page.getByRole('button', { name: 'Import 18 firms' }).count()) === 1);
await act(page.getByRole('button', { name: 'Import 18 firms' }));
const imported = read('outreach/prospects.json').filter((p) => p.id.startsWith('w1-'));
check('Import adds 18 prospects as To review', imported.length === 18 && imported.every((p) => p.status === 'new'), `${imported.length}`);
check('Imported firms keep Instagram + email + timezone', imported.find((p) => p.firm === 'Vicki Bergelt Interior Design')?.tz === 'America/Phoenix' && imported.some((p) => p.email === 'maya@mayasdesignstudio.com'));
check('Import card disappears once done', (await page.getByRole('button', { name: /Import \d+ firms/ }).count()) === 0);
await act(page.getByRole('button', { name: 'Import 18 firms' }).or(page.locator('text=never-there')).first()).catch(() => {});
check('Re-import adds no duplicates', read('outreach/prospects.json').filter((p) => p.id.startsWith('w1-')).length === 18);
check('Imported firms appear in To review', (await page.locator('li', { hasText: 'Living with Lolo' }).count()) === 1);
await page.goto(`${BASE}/dashboard/outreach/prospects?step=ready`, { waitUntil: 'networkidle' });
const card = page.getByRole('button', { name: /Draft Studio/ });
const cardText = await card.innerText();
check('Draft card shows research', cardText.includes('Owner: Jane Doe') && cardText.includes('Team: 5') && cardText.includes('IG last post: 2026-10-15') && cardText.includes('Gap: Form promises'), cardText.replace(/\s+/g, ' ').slice(0, 120));

// Profile line
check('Prospects tab states the profile', (await page.locator('text=US residential, full-service interior design firms').count()) > 0);

// Phone width
await page.setViewportSize({ width: 390, height: 844 });
for (const p of ['/dashboard/outreach', '/dashboard/outreach/prospects']) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`No sideways scroll at 390px: ${p}`, sw <= 391, `${sw}px`);
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
