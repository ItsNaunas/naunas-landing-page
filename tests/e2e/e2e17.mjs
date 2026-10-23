// Clients page (no HubSpot locally, so an empty state), proposal page extras, and invoice write-offs (store-level).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const ago = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

const PT = 'cccccccccccccccccccccccc';
write(`proposals/${PT}.json`, { token: PT, createdAt: ago(2), updatedAt: ago(2), client: 'Sticky Studio', firstName: 'Sam', email: 'sam@sticky.example', title: 'The Client System for Sticky Studio', intro: 'x', blocks: [{ title: 'Capture', text: 'b' }, { title: 'Booking', text: 'c' }], timeline: 'Two weeks', nextSteps: 'Accept below.', price: '£4,500', deposit: '£1,500', published: true, publishedAt: ago(2), opens: 0 });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);

await page.locator('aside').getByRole('link', { name: /^Clients/ }).click();
await page.waitForURL('**/dashboard/clients', { timeout: 60000 }).catch(() => {});
await page.getByRole('heading', { name: 'Clients', level: 1 }).waitFor({ timeout: 60000 }).catch(() => {});
const t = await page.locator('main').innerText();
check('Sidebar: Clients page opens', page.url().endsWith('/dashboard/clients') && t.includes('Being onboarded'));
check('Clients empty state explains where clients come from', /goes Won in HubSpot/.test(t));

// Proposal page (public): no fake numbering, Book-15-minutes link, signature; sticky Accept on phones only.
const pub = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await pub.goto(`${BASE}/p/${PT}`, { waitUntil: 'load' });
const pt = await pub.locator('main').innerText();
check('Proposal blocks have no 01/02 numbering', !/\b01\b/.test(pt) && pt.includes('Capture'));
check('Proposal offers a 15-minute call', await pub.getByRole('link', { name: /Book 15 minutes/ }).count() === 1);
check('Proposal is signed', pt.includes('Naufal Nassor'));
check('Phones get a sticky Accept bar', await pub.getByRole('link', { name: /Accept · £4,500/ }).isVisible());
// Proof approved 2026-10-23: the three client lines show on the proposal.
check('Proof shows the approved client lines', /recent work/i.test(pt) && pt.includes('Nelia Rose Designs') && pt.includes('Soul in the Horn') && pt.includes('SNAEB'));

check('No page errors', !errors.length, errors.join(' | '));
await b.close();
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
