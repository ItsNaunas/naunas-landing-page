// Cold LinkedIn cadence + Instagram warm-up posts.
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
const r = (n) => ({ owner: `Owner ${n}`, ownerLinkedin: `https://www.linkedin.com/in/owner-${n}/` });
const dr = (n) => ({ subject: 's', steps: ['Hi,\n\nE1\n\nNaufal'], dm: 'Hi', research: r(n) });
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, domain: `${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(9 * D), status: 'scheduled', ...extra });
write('outreach/prospects.json', [
  base('eng', { instagram: 'eng.ig', warmedAt: iso(3 * D), dmSentAt: iso(2 * D), drafts: dr('eng') }),
  base('wait', { instagram: 'wait.ig', warmedAt: iso(1 * D), drafts: dr('wait') }), // opener not sent: no LinkedIn yet
  base('noig', { drafts: dr('noig') }), // no Instagram: LinkedIn straight away
  base('con', { instagram: 'con.ig', dmSentAt: iso(4 * D), liEngagedAt: iso(1.2 * D), drafts: dr('con') }),
  base('dm', { instagram: 'dm.ig', dmSentAt: iso(6 * D), liEngagedAt: iso(5 * D), liAt: iso(3 * D), drafts: dr('dm') }),
  base('fu', { instagram: 'fu.ig', dmSentAt: iso(12 * D), fu1At: iso(9 * D), fu2At: iso(5 * D), liEngagedAt: iso(11 * D), liAt: iso(10 * D), liDmAt: iso(6 * D), drafts: dr('fu') }),
  base('warm', { instagram: 'warm.ig', status: 'scheduled', channel: 'instagram', drafts: { subject: 's', steps: ['x'], dm: 'Hi' } }),
]);
write('outreach/igposts.json', { runs: [], posts: { 'warm.ig': { at: iso(0), items: [
  { url: 'https://www.instagram.com/p/AAA/', caption: 'Finished the limewash walls in our Tarrytown living room.', at: iso(2 * D), comment: 'That limewash gives the Tarrytown living room such a soft depth.' },
  { url: 'https://www.instagram.com/p/BBB/', caption: 'Custom walnut vanity for a primary bath.', at: iso(6 * D) },
] } } });
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(400); };
const P = (id) => read('outreach/prospects.json').find((p) => p.id === id);
const item = (id) => page.locator(`[data-item="${id}"]`);
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });

check('Engage shows the day after the IG opener', (await item('li-engage-eng').count()) === 1);
check('Engage links to their recent posts', (await item('li-engage-eng').getByRole('link', { name: /Open their posts/ }).getAttribute('href')) === 'https://www.linkedin.com/in/owner-eng/recent-activity/all/');
check('No LinkedIn before the IG opener', (await page.locator('[data-item^="li-"][data-item$="-wait"]').count()) === 0);
check('No-Instagram firm gets LinkedIn straight away', (await item('li-engage-noig').count()) === 1);
check('Connect shows the day after engaging, with note', (await item('li-connect-con').innerText()).includes('I’ve been admiring Firm con’s projects'));
check('DM shows 2 days after connect', (await item('li-dm-dm').innerText()).includes('Thanks for connecting, Owner'));
check('Follow-up shows 5 days after the DM', (await item('li-fu-fu').count()) === 1);

await act(item('li-engage-eng').getByRole('button', { name: 'Done' }));
check('Engage Done saves liEngagedAt', !!P('eng').liEngagedAt);
check('Connect not offered the same day', (await item('li-connect-eng').count()) === 0);
await act(item('li-connect-con').getByRole('button', { name: 'Request sent' }));
check('Request sent saves liAt', !!P('con').liAt);
await act(item('li-dm-dm').getByRole('button', { name: 'Not accepted yet' }));
check('Not accepted yet snoozes 2 days', !!P('dm').liSnoozeUntil && (await item('li-dm-dm').count()) === 0);
await act(item('li-fu-fu').getByRole('button', { name: 'Sent' }));
check('Follow-up Sent saves liFuAt', !!P('fu').liFuAt);
check('LinkedIn steps count as reps', Object.values(read('outreach/reps.json')).some((d) => d.linkedin === 3), JSON.stringify(read('outreach/reps.json')));

// Instagram warm-up with posts
const w = item('wu-warm');
const wt = await w.innerText();
check('Warm-up shows their real posts', wt.includes('Finished the limewash walls') && (await w.getByRole('link', { name: /Open post/ }).count()) === 2);
check('Warm-up shows a suggested comment', wt.includes('That limewash gives the Tarrytown living room'));
await w.getByRole('button', { name: 'Copy comment' }).click(); await page.waitForTimeout(300);
check('Copy comment works', (await page.evaluate(() => navigator.clipboard.readText())).startsWith('That limewash'));
check('Old warm leads are off the list', (await page.locator('text=Warm leads going cold').count()) === 0);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
check('No sideways scroll at 390px', sw <= 391, `${sw}px`);
await page.screenshot({ path: 'e2e4-m.png', fullPage: true });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
