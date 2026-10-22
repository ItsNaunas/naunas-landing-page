// Proposal chase flag + follow-up draft, leak report opens (counted, flagged, shown), auto top-up cities saved.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8')); } catch { return null; } };
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const until = async (fn, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const ago = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

const PT = 'aaaaaaaaaaaaaaaaaaaaaaaa', RT = 'bbbbbbbbbbbbbbbbbbbbbbbb';
write(`proposals/${PT}.json`, { token: PT, createdAt: ago(5), updatedAt: ago(3), client: 'Chase Studio', firstName: 'Ana', title: 'The Client System for Chase Studio', intro: 'x', blocks: [{ title: 'a', text: 'b' }], timeline: '', nextSteps: 'n', price: '£4,500', deposit: '£1,500', published: true, publishedAt: ago(4), opens: 2, openedAt: ago(3), lastOpenAt: ago(3) });
write('proposals/index.json', [{ token: PT, client: 'Chase Studio', status: 'opened', title: 'The Client System for Chase Studio', updatedAt: ago(3) }]);
const list = (read('outreach/prospects.json') ?? []).filter((p) => p.id !== 'repfirm');
write('outreach/prospects.json', [...list, { id: 'repfirm', firm: 'Report Firm', website: 'https://rep.example', tz: 'America/Chicago', fit: 6, fitWhy: ['Design practice'], searchId: 's', createdAt: ago(9), status: 'active', channel: 'instagram', reportToken: RT, warmedAt: ago(8), dmSentAt: ago(7) }]);
write(`reports/${RT}.json`, { token: RT, prospectId: 'repfirm', firm: 'Report Firm', site: 'https://rep.example', createdAt: ago(2), updatedAt: ago(2), published: true, publishedAt: ago(2), intro: 'Hi', findings: [{ layer: 2, title: 'Slow reply', seen: 'Form says 5 days', url: 'https://rep.example/contact', why: 'w', fix: 'f' }], quickWin: 'q', askOnCall: [], loom: 'l' });
fs.rmSync(path.join(STORE, 'reports/opens.json'), { force: true });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const settle = async () => { await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(300); };

// Leak report open (public)
const pub = await (await b.newContext()).newPage();
const r = await pub.goto(`${BASE}/r/${RT}`, { waitUntil: 'load' });
check('Public leak report renders', r.status() === 200);
check('Report open counted', await until(() => read(`reports/${RT}.json`)?.opens === 1 && read('reports/opens.json')?.[0]?.token === RT, 15000), JSON.stringify(read(`reports/${RT}.json`)?.opens));

await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' }); await settle();
const home = await page.locator('main').innerText();
check('Overview: proposal opened, not accepted', home.includes('Chase Studio opened the proposal 3 days ago'), home.slice(0, 120));
check('Overview: leak report opened', home.includes('Report Firm opened your leak report'));
await page.goto(`${BASE}/dashboard/pipeline/proposal/${PT}`, { waitUntil: 'load' }); await settle();
check('Proposal page has a drafted follow-up', (await page.locator('main').innerText()).includes('Opened, not accepted: follow up'));
await page.goto(`${BASE}/dashboard/outreach/firm/repfirm`, { waitUntil: 'load' }); await settle();
check('Firm page shows report opens', (await page.locator('main').innerText()).includes('opened 1 time'));

// Cities for the auto top-up
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'load' }); await settle();
await page.locator('summary', { hasText: 'Settings' }).first().click();
await page.fill('textarea[name=cities]', 'Austin, TX\nDenver, CO');
await page.getByRole('button', { name: 'Save targets' }).click();
check('Cities saved', await until(() => (read('outreach/settings.json')?.cities ?? []).join('|') === 'Austin, TX|Denver, CO', 15000), JSON.stringify(read('outreach/settings.json')?.cities));

console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
