// Research in the dashboard, leak report page + editor, review/referral asks on Today.
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
const base = (id, extra) => ({ id, firm: `Firm ${id}`, tz: 'America/Chicago', fit: 6, fitWhy: ['Design practice'], searchId: 's', createdAt: iso(2 * D), ...extra });
const TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6';
write('outreach/settings.json', { sending: false, dailyNew: 6, dailyTotal: 25, monthlyCapUsd: 10, igNew: 7, liNew: 7 });
write('outreach/prospects.json', [
  base('nosite', { status: 'new' }),
  base('uk', { status: 'new', website: 'https://example.co.uk', country: 'GB' }),
  base('real', { status: 'new', website: 'https://livingoak.com/' }),
  base('rep', { status: 'replied', website: 'https://livingoak.com/', channel: 'instagram', igRepliedAt: iso(D), reportToken: TOKEN, drafts: { subject: 's', steps: ['a', 'b', 'c', 'd'] } }),
]);
write(`reports/${TOKEN}.json`, {
  token: TOKEN, prospectId: 'rep', firm: 'Firm rep', site: 'https://livingoak.com/', createdAt: iso(1000), updatedAt: iso(1000), published: false,
  intro: 'I looked at your site and Instagram.', quickWin: 'Add a line under the form saying when you reply.', askOnCall: ['Where does every enquiry live?', 'What happens after a proposal?'], loom: 'Hi, quick walk-through.',
  findings: [
    { layer: 2, title: 'No reply promise on the form', seen: 'The contact form has 10 fields and nothing says when you reply.', url: 'https://livingoak.com/contact', why: 'People wait without knowing.', fix: 'Say when you reply.' },
    { layer: 1, title: 'Portfolio has no next step', seen: 'Project pages end without a link.', url: 'https://livingoak.com/projects', why: 'Interest fades.', fix: 'Add a call to action.' },
  ],
});
write('ops/asks.json', [{ id: 'd1-review', dealId: 'd1', kind: 'review', who: 'Jane Client', email: 'jane@x.com', draft: 'Hi Jane,\n\nHow is it going?\n\nNaufal', dealUrl: 'https://app.hubspot.com/x', createdAt: iso(1000) }]);

const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));

// Public report: draft is hidden from the public
const anon = await (await b.newContext()).newPage();
check('Draft report 404s for the public', (await anon.goto(`${BASE}/r/${TOKEN}`)).status() === 404);
check('Unknown token 404s', (await anon.goto(`${BASE}/r/ffffffffffffffffffffffff`)).status() === 404);

await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 90000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(500); };
const P = (id) => read('outreach/prospects.json').find((p) => p.id === id);
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 1000)); } return false; };

check('Signed-in preview of a draft report', (await page.goto(`${BASE}/dashboard/outreach/report/${TOKEN}`, { waitUntil: 'networkidle' })).status() === 200 && (await page.locator('body').innerText()).includes('Draft preview'));

// Approve → research starts straight away (no QStash locally: runs in the background)
await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`, { waitUntil: 'networkidle' });
for (const id of ['nosite', 'uk', 'real']) await act(page.locator(`[data-item="rv-${id}"]`).getByRole('button', { name: 'Approve' }));
check('No website → skipped with reason', await until(() => P('nosite').status === 'rejected' && P('nosite').fitWhy[0].includes('no website')), P('nosite').fitWhy[0]);
check('Outside the US → skipped with reason', await until(() => P('uk').status === 'rejected' && P('uk').fitWhy[0].includes('outside the US')), P('uk').fitWhy[0]);
check('Real firm: site scanned and saved', await until(() => fs.existsSync(path.join(STORE, 'outreach/scans/real.json')), 90000));
const scan = fs.existsSync(path.join(STORE, 'outreach/scans/real.json')) ? read('outreach/scans/real.json') : {};
check('Scan found the contact form', (scan.forms ?? []).some((f) => f.url.includes('/contact')), JSON.stringify(scan.forms ?? []).slice(0, 120));
check('No OpenAI key → research error kept, firm stays approved', await until(() => !!P('real').researchError) && P('real').status === 'approved', P('real').researchError);
await page.goto(`${BASE}/dashboard/outreach/prospects?step=researching`, { waitUntil: 'networkidle' });
const rs = await page.locator('main').innerText();
check('Researching shows the error and Try again', rs.includes('Research failed') && (await page.getByRole('button', { name: 'Try again' }).count()) === 1);
await act(page.getByRole('button', { name: 'Try again' }));
check('Try again re-queues it', await until(() => !!P('real').researchError, 90000));

// Firm page: report editor
await page.goto(`${BASE}/dashboard/outreach/firm/rep`, { waitUntil: 'networkidle' });
const fp = await page.locator('main').innerText();
check('Firm page shows the leak report draft', /leak report/i.test(fp) && fp.includes('Draft, only you can see it'));
await page.locator('input[name=f0_title]').fill('No reply time on your form');
await page.locator('input[name=f1_drop]').check();
await act(page.getByRole('button', { name: 'Save and publish link' }));
const rep = read(`reports/${TOKEN}.json`);
check('Edits saved, one finding removed, published', rep.published && rep.findings.length === 1 && rep.findings[0].title === 'No reply time on your form', `${rep.published} ${rep.findings.length}`);
check('Copy link appears once published', await page.getByRole('button', { name: 'Copy link' }).waitFor({ timeout: 15000 }).then(() => true, () => false));
const pub = await anon.goto(`${BASE}/r/${TOKEN}`);
const pt = await anon.locator('body').innerText();
check('Published report is public', pub.status() === 200 && pt.includes('No reply time on your form') && !pt.includes('Portfolio has no next step') && !pt.includes('Draft preview'));
check('Report is noindex', (await anon.locator('meta[name=robots]').getAttribute('content'))?.includes('noindex'));
check('Loom script is not on the public page', !pt.includes('quick walk-through'));
await anon.setViewportSize({ width: 390, height: 844 });
check('Report: no sideways scroll at 390px', (await anon.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await anon.screenshot({ path: 'e2e8-m-report.png', fullPage: true });
await page.goto(`${BASE}/dashboard/outreach/firm/real`, { waitUntil: 'networkidle' });
check('Approved firm page has Research now / Try again', (await page.getByRole('button', { name: /Research now|Try again/ }).count()) === 1);

// Asks on Today
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
check('Today shows the review ask', (await page.locator('main').innerText()).includes('Jane Client'));
await act(page.locator('[data-item="d1-review"]').getByRole('button', { name: 'Sent' }));
check('Ask marked sent', read('ops/asks.json')[0].outcome === 'sent');
await page.locator('summary', { hasText: 'Settings' }).click();
check('Settings links to Run the routine', (await page.getByRole('link', { name: /Run the routine now/ }).count()) === 1);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard/outreach/firm/rep`, { waitUntil: 'networkidle' });
check('Firm page with report: no sideways scroll at 390px', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await page.setViewportSize({ width: 1440, height: 900 });
await page.screenshot({ path: 'e2e8-d-firm.png', fullPage: true });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
