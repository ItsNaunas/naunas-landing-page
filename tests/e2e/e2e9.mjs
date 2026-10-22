// HubSpot sync for cold-outreach moments: They replied (IG + LinkedIn-only), said yes, leak report published, ask sent.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const CALLS = process.env.CALLS;
const BASE = process.env.BASE || 'http://localhost:3000';
const D = 86_400_000;
const iso = (ms) => new Date(Date.now() - ms).toISOString();
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const read = (p) => JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8'));
fs.rmSync(STORE, { recursive: true, force: true });
const research = { owner: 'Ann Lee', team: '4', gap: 'Form says replies in 5 days', detail: 'Oak stair', ownerLinkedin: 'https://www.linkedin.com/in/ann/' };
const drafts = { subject: 's', steps: ['a', 'b', 'c', 'd'], dossier: 'Austin studio, slow form', research };
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(5 * D), drafts, scheduledAt: iso(4 * D), ...extra });
const TOKEN = 'b1b2c3d4e5f6a1b2c3d4e5f6';
write('outreach/settings.json', { sending: false, dailyNew: 6, dailyTotal: 25, monthlyCapUsd: 10, igNew: 7, liNew: 7 });
write('outreach/prospects.json', [
  base('ig1', { status: 'scheduled', channel: 'instagram', instagram: 'ig1.studio', warmedAt: iso(3 * D), dmSentAt: iso(2 * D) }),
  base('li1', { status: 'scheduled', channel: 'linkedin', liEngagedAt: iso(3 * D), liAt: iso(2 * D), reportToken: TOKEN }),
]);
write(`reports/${TOKEN}.json`, { token: TOKEN, prospectId: 'li1', firm: 'Firm li1', site: 'https://li1.example', createdAt: iso(1000), updatedAt: iso(1000), published: false, intro: 'Hi', quickWin: '', askOnCall: [], loom: 'x', findings: [{ layer: 2, title: 'T', seen: 'S', url: 'https://li1.example', why: 'W', fix: 'F' }] });
write('ops/asks.json', [{ id: 'd9-review', dealId: 'd9', contactId: 'c9', kind: 'review', who: 'Jane', draft: 'Hi Jane', dealUrl: 'https://x', createdAt: iso(1000) }]);

const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const calls = () => JSON.parse(fs.readFileSync(CALLS, 'utf8'));
const until = async (fn, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
const reset = () => fs.writeFileSync(CALLS, '[]');

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(500); };
const P = (id) => read('outreach/prospects.json').find((p) => p.id === id);

// 1. Instagram firm replies (firm page)
reset();
await page.goto(`${BASE}/dashboard/outreach/firm/ig1`, { waitUntil: 'networkidle' });
await act(page.getByRole('button', { name: 'They replied' }));
check('IG reply: deal created', await until(() => calls().some((c) => c.method === 'POST' && c.url.endsWith('/objects/deals'))));
const c1 = calls();
const deal = c1.find((c) => c.method === 'POST' && c.url.endsWith('/objects/deals'))?.body?.properties ?? {};
check('IG reply: contact keyed by Instagram handle, lead source instagram_dm', c1.some((c) => c.url.endsWith('/objects/contacts') && c.body?.properties?.instagram_handle === 'ig1.studio' && c.body.properties.naunas_lead_source === 'instagram_dm'));
check('IG reply: deal at Contacted, named + sourced', deal.dealstage === '6213348568' && deal.dealname === 'Firm ig1 · cold Instagram' && deal.deal_lead_source === 'instagram_dm', JSON.stringify(deal));
check('IG reply: company linked by domain', c1.some((c) => c.url.endsWith('/objects/companies') && c.body?.properties?.domain === 'ig1.example'));
check('IG reply: research note on the deal', await until(() => calls().some((c) => c.url.endsWith('/objects/notes') && c.body.properties.hs_note_body.includes('Form says replies in 5 days') && c.body.associations.length === 2)));
check('IG reply: status replied', calls().some((c) => c.method === 'PATCH' && c.body?.properties?.naunas_outreach_status === 'replied'));
check('IG reply: ids saved on the firm', await until(() => !!P('ig1').contactId && !!P('ig1').dealId), `${P('ig1').contactId} ${P('ig1').dealId}`);

// 2. Said yes on the same firm → note + interested, no second deal
reset();
await page.goto(`${BASE}/dashboard/outreach/firm/ig1`, { waitUntil: 'networkidle' });
await act(page.getByRole('button', { name: /They said yes/ }));
check('Said yes: note added', await until(() => calls().some((c) => c.url.endsWith('/objects/notes') && c.body.properties.hs_note_body.includes('Said yes to a Loom teardown'))));
check('Said yes: status interested', calls().some((c) => c.method === 'PATCH' && c.body?.properties?.naunas_outreach_status === 'interested'));
check('Said yes: no new deal (reuses the open one)', !calls().some((c) => c.method === 'POST' && c.url.endsWith('/objects/deals')));

// 3. LinkedIn-only firm replies from Today
reset();
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const liRow = page.locator('[data-item^="li-"][data-item$="-li1"]');
check('Today: LinkedIn row has They replied', (await liRow.getByRole('button', { name: 'They replied' }).count()) === 1);
await act(liRow.getByRole('button', { name: 'They replied' }));
check('LI reply: contact by owner name, lead source linkedin', await until(() => calls().some((c) => c.url.endsWith('/objects/contacts') && c.body?.properties?.firstname === 'Ann' && c.body.properties.naunas_lead_source === 'linkedin')));
check('LI reply: deal at Contacted sourced linkedin', calls().some((c) => c.url.endsWith('/objects/deals') && c.body.properties.deal_lead_source === 'linkedin' && c.body.properties.dealname === 'Firm li1 · cold LinkedIn'));
check('LI reply: firm stopped as replied', P('li1').status === 'replied');

// 4. Publish the leak report → note with the link
reset();
await page.goto(`${BASE}/dashboard/outreach/firm/li1`, { waitUntil: 'networkidle' });
await act(page.getByRole('button', { name: 'Save and publish link' }));
check('Report published: note with the /r/ link', await until(() => calls().some((c) => c.url.endsWith('/objects/notes') && c.body.properties.hs_note_body.includes(`/r/${TOKEN}`))));

// 5. Ask sent → note on contact + deal
reset();
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
await act(page.locator('[data-item="d9-review"]').getByRole('button', { name: 'Sent' }));
check('Ask sent: note on the Won deal', await until(() => calls().some((c) => c.url.endsWith('/objects/notes') && c.body.properties.hs_note_body.includes('Review / testimonial asked') && c.body.associations.some((a) => a.to.id === 'd9'))));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
