// Proposal + deposit link (create, publish, public page, accept, status), firm page "They booked" + reply panel.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8')); } catch { return null; } };
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const until = async (fn, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
fs.rmSync(path.join(STORE, 'proposals'), { recursive: true, force: true });
// firmd must be a replied firm with no booking for the firm-page checks, whatever the last suite left behind.
{ const f = path.join(STORE, 'outreach/prospects.json'); let list = []; try { list = JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  const now = new Date().toISOString();
  const firmd = { id: 'firmd', firm: 'Firm D FU2', website: 'https://firmd.example', email: 'hi@firmd.example', instagram: 'firmd.ig', city: 'Austin', state: 'TX', tz: 'America/Chicago', fit: 6, fitWhy: ['Design practice'], searchId: 's', createdAt: now, status: 'replied', channel: 'instagram', warmedAt: now, dmSentAt: now, dmStyle: 'B', repliedAt: now, igRepliedAt: now, drafts: { subject: 's', steps: ['a', 'b', 'c', 'd'], dms: [{ style: 'A', text: 'Love the oak kitchen.' }, { style: 'B', text: 'How do enquiries reach you?' }] } };
  const rest = list.filter((p) => p.id !== 'firmd');
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify([...rest, firmd], null, 2)); }

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const settle = async () => { await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(400); };
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);

// 1. New proposal from Pipeline
await page.goto(`${BASE}/dashboard/pipeline`, { waitUntil: 'load' }); await settle();
check('Pipeline shows the Proposals card', (await page.locator('main').innerText()).includes('No proposals yet'));
await page.fill('input[name=client]', 'Oakline Interiors'); await page.fill('input[name=email]', 'mia@oakline.example');
await Promise.all([page.waitForURL('**/dashboard/pipeline/proposal/*', { timeout: 60000 }), page.getByRole('button', { name: 'New proposal' }).click()]);
const token = page.url().split('/proposal/')[1].split('?')[0];
check('New proposal opens the editor', /^[a-f0-9]{24}$/.test(token), token);
await settle();
check('Editor shows Draft + AI needs key', (await page.locator('main').innerText()).includes('Draft') && (await page.getByRole('button', { name: /Needs OPENAI_API_KEY/ }).count()) === 1);

// 2. Publish needs intro, block and price
await page.getByRole('button', { name: 'Save and publish link' }).click();
check('Publish refused without intro/block/price', await page.getByText('Add an intro, at least one block and the price').waitFor({ timeout: 15000 }).then(() => true, () => false));
await page.fill('textarea[name=intro]', 'Hi Mia, you said enquiries wait days for a reply. This installs the reply and booking step first.');
await page.fill('input[name=b0_title]', 'Enquiry and booking'); await page.fill('textarea[name=b0_text]', 'A short qualifying form, an instant reply with your booking link, and an alert to your phone.');
await page.fill('input[name=price]', '£4,500 fixed'); await page.fill('input[name=deposit]', '£1,500');
await page.fill('input[name=paymentLink]', 'https://buy.stripe.com/test_abc123');
await page.getByRole('button', { name: 'Save and publish link' }).click();
await page.waitForTimeout(2500); await page.waitForLoadState('load'); await settle();
const ed = await page.locator('main').innerText();
check('Published: status Sent and live link shown', ed.includes('Sent') && ed.includes(`/p/${token}`), ed.slice(0, 80));
check('Proposal file published', read(`proposals/${token}.json`)?.published === true);
check('Index row has status sent', read('proposals/index.json')?.[0]?.status === 'sent');

// 3. Public page, 404s, preview
const pub = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const r404 = await pub.goto(`${BASE}/p/000000000000000000000000`, { waitUntil: 'load' });
check('Unknown proposal is 404', r404.status() === 404);
const r = await pub.goto(`${BASE}/p/${token}`, { waitUntil: 'load' });
const txt = await pub.locator('main').innerText();
check('Public proposal renders', r.status() === 200 && txt.includes('Oakline Interiors') && txt.includes('£4,500 fixed') && txt.includes('Accept and continue'));
check('Phone: no sideways scroll', (await pub.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await pub.screenshot({ path: 'e2e13-proposal-m.png', fullPage: true });
check('Open counted (first visit)', await until(() => (read(`proposals/${token}.json`)?.opens ?? 0) === 1, 15000), JSON.stringify(read(`proposals/${token}.json`)?.opens));
check('Open event logged', await until(() => (read('events.json') ?? []).some((e) => e.kind === 'proposal' && /opened/.test(e.title)), 10000));
await page.goto(`${BASE}/dashboard/pipeline/proposal/${token}?preview=1`, { waitUntil: 'load' }); await settle();
check('Dashboard preview renders with banner', (await page.locator('body').innerText()).includes('Preview. This is what the client sees'));

// 4. Accept
await pub.fill('input[name=name]', 'Mia Turner'); await pub.check('input[name=agree]');
await pub.getByRole('button', { name: /Accept and continue/ }).click();
check('Accepted: deposit button with their email prefilled', await pub.locator('a', { hasText: 'Pay the deposit' }).waitFor({ timeout: 15000 }).then(async () => (await pub.locator('a', { hasText: 'Pay the deposit' }).getAttribute('href')).includes('prefilled_email=mia%40oakline.example'), () => false));
await pub.reload({ waitUntil: 'load' });
check('Reload shows accepted state', (await pub.locator('main').innerText()).includes('Accepted by Mia Turner'));
check('Accept event logged', (read('events.json') ?? []).some((e) => e.kind === 'proposal' && /accepted/.test(e.title)));
await page.goto(`${BASE}/dashboard/pipeline/proposal/${token}`, { waitUntil: 'load' }); await settle();
const ed2 = await page.locator('main').innerText();
check('Editor shows Accepted + signed name + locked scope', ed2.includes('Accepted') && ed2.includes('Mia Turner') && (await page.locator('input[name=title]').isDisabled()));
await page.goto(`${BASE}/dashboard/pipeline`, { waitUntil: 'load' }); await settle();
check('Pipeline lists the proposal as Accepted', (await page.locator('main').innerText()).includes('Accepted'));
await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' }); await settle();
check('Home activity shows proposal events', /Proposal (sent|opened|accepted)/.test(await page.locator('main').innerText()));

// 5. Firm page: reply panel + They booked
console.log('firmd before:', JSON.stringify((read('outreach/prospects.json') ?? []).find((p) => p.id === 'firmd') ?? null)?.slice(0, 200));
await page.goto(`${BASE}/dashboard/outreach/firm/firmd`, { waitUntil: 'load' }); await settle();
const firm = await page.locator('main').innerText();
check('Replied firm shows the reply panel', /reply to them/i.test(firm) && (await page.getByRole('button', { name: /Needs OPENAI_API_KEY/ }).count()) === 1, firm.replace(/\s+/g, ' ').slice(0, 260));
await page.locator('summary', { hasText: 'They booked the audit' }).click();
await page.fill('input[name=deal]', 'https://app.hubspot.com/contacts/149523755/record/0-3/528211158212');
await page.getByRole('button', { name: 'They booked', exact: true }).click();
await page.waitForTimeout(2500); await page.waitForLoadState('load'); await settle();
const after = read('outreach/prospects.json')?.find((p) => p.id === 'firmd');
check('They booked: bookedAt + dealId saved, link form gone', !!after?.bookedAt && after?.dealId === '528211158212' && !(await page.locator('main').innerText()).includes('Link it by hand'), JSON.stringify({ b: after?.bookedAt, d: after?.dealId }));
check('Firm shows Booked', (await page.locator('main').innerText()).includes('Booked'));
await page.goto(`${BASE}/dashboard/outreach/prospects?step=booked`, { waitUntil: 'load' }); await settle();
check('Prospects → Booked lists it', (await page.locator('main').innerText()).includes('Firm D'));

console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
