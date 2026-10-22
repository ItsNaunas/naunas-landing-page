// One channel per firm: Start outreach assigns a channel; the firm then only appears in that channel's steps.
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
const all3 = (id) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, domain: `${id}.example`, email: `hi@${id}.example`, instagram: `${id}.ig`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(2 * D), status: 'drafted',
  drafts: { subject: 'the reply on your form', steps: ['Hi,\n\nE1\n\nNaufal', 'E2', 'E3', 'E4'], dm: 'Love the oak stair. Your call?', dms: [{ style: 'A', text: 'Love the oak stair. Your call?' }], research: { owner: `Owner ${id}`, ownerLinkedin: `https://www.linkedin.com/in/o-${id}/` } } });
write('outreach/settings.json', { sending: false, dailyNew: 10, dailyTotal: 25, monthlyCapUsd: 10, igNew: 10, liNew: 10 });
write('outreach/prospects.json', [all3('one'), all3('two'), all3('three'), { ...all3('igonly'), email: undefined, drafts: { ...all3('igonly').drafts, research: {} } }]);
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
const P = (id) => read('outreach/prospects.json').find((p) => p.id === id);

await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
check('Nothing on Today’s list before Start outreach', (await page.locator('[data-item]').count()) === 0);

const start = async (id, channel) => {
  await page.goto(`${BASE}/dashboard/outreach/prospects`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: new RegExp(`Firm ${id} `) }).click();
  const radio = page.locator(`input[name=channel][value=${channel}]`).last();
  const suggested = await page.locator('input[name=channel]:checked').last().getAttribute('value').catch(() => null);
  if (channel) await radio.check();
  await page.getByRole('button', { name: 'Start outreach' }).last().click();
  await page.waitForTimeout(1500);
  return suggested;
};
const s1 = await start('one', 'linkedin');
check('First suggestion is LinkedIn (scarcest, ties)', s1 === 'linkedin', s1);
await start('two', 'instagram');
await start('three', 'email');
check('Channels saved', P('one').channel === 'linkedin' && P('two').channel === 'instagram' && P('three').channel === 'email', `${P('one').channel} ${P('two').channel} ${P('three').channel}`);

await page.goto(`${BASE}/dashboard/outreach/prospects`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Firm igonly / }).click();
check('Unavailable channels are disabled', await page.locator('input[name=channel][value=linkedin]').last().isDisabled() && await page.locator('input[name=channel][value=email]').last().isDisabled());
check('Only possible channel is suggested', (await page.locator('input[name=channel]:checked').last().getAttribute('value')) === 'instagram');

await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const ids = await page.locator('[data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-item')));
check('LinkedIn firm: LinkedIn engage only', ids.includes('li-engage-one') && !ids.some((x) => x.endsWith('-one') && !x.startsWith('li-')), ids.join(','));
check('Instagram firm: warm-up only, no LinkedIn', ids.includes('wu-two') && !ids.some((x) => x.startsWith('li-') && x.endsWith('-two')));
check('Email firm: nothing on the list (emails send themselves)', !ids.some((x) => x.endsWith('-three')));

await page.goto(`${BASE}/dashboard/outreach/sequences`, { waitUntil: 'networkidle' });
const row = async (f) => (await page.locator('tr', { hasText: f }).innerText()).replace(/\s+/g, ' ');
check('Sequences: LinkedIn firm says LinkedIn only', (await row('Firm one')).includes('LinkedIn only'), await row('Firm one'));
check('Sequences: Instagram firm says Instagram only', (await row('Firm two')).includes('Instagram only'));
check('Sequences: email firm sends E1 next, no IG/LI steps', (await row('Firm three')).includes('E1 in the next daily send') && (await row('Firm three')).includes('Email only'), await row('Firm three'));
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
