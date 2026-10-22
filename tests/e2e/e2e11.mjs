// "What you're missing" flags on Home, Ask Naunas panel (tool loop via mock OpenAI), Today's plan.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const OAILOG = process.env.OAILOG;
const BASE = process.env.BASE || 'http://localhost:3000';
const D = 86_400_000;
const iso = (ms) => new Date(Date.now() - ms).toISOString();
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
fs.rmSync(STORE, { recursive: true, force: true });
const base = (id, extra) => ({ id, firm: `Firm ${id}`, website: `https://${id}.example`, tz: 'America/Chicago', fit: 6, fitWhy: [], searchId: 's', createdAt: iso(9 * D), drafts: { subject: 's', steps: ['a', 'b', 'c', 'd'], research: { gap: 'slow form' } }, ...extra });
write('outreach/settings.json', { sending: false, dailyNew: 6, dailyTotal: 25, monthlyCapUsd: 10, igNew: 7, liNew: 7 });
write('outreach/prospects.json', [
  base('rp', { status: 'replied', channel: 'instagram', igRepliedAt: iso(3 * D), scheduledAt: iso(8 * D) }),
  base('em', { status: 'scheduled', channel: 'email', email: 'a@em.example', scheduledAt: iso(1 * D) }),
  base('rf', { status: 'approved', researchError: 'OpenAI timed out' }),
]);
write('outreach/owed.json', [{ id: 'o1', who: 'Ann · Firm X', what: 'Loom teardown', channel: 'Instagram', owedAt: iso(2 * D) }]);
write('meta/health.json', { at: iso(3600_000), ok: false });

const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
const home = await page.locator('main').innerText();
check('Home shows the Needs-you list', home.includes('Needs you'));
check('Flag: overdue promise', home.includes('You promised Ann · Firm X a Loom teardown'));
check('Flag: reply with no next step', /Firm rp replied 3 days ago with no next step/.test(home));
check('Flag: email blocked', home.includes('waiting for a first email that can'));
check('Flag: health problem', home.includes('health check found a problem'));
check('Flag: research failed + list running dry are counted', /\d+ things need you/.test(home), home.match(/\d+ things need you/)?.[0]);
check('Flags link to the fix', (await page.locator('a', { hasText: 'Firm rp replied' }).getAttribute('href')) === '/dashboard/outreach/firm/rp');

// Today's plan (mock OpenAI) now lives on Outreach → Today
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const nav = page.waitForEvent('framenavigated', { timeout: 20000 }).catch(() => null);
await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 60000 }), page.getByRole('button', { name: /Write today’s plan/ }).click()]);
await nav; await page.waitForLoadState('networkidle');
const plan = await page.locator('section', { hasText: 'Today’s plan' }).innerText();
check('Today’s plan written and shown', plan.includes('Do this first') && plan.includes('Firm rp'), plan.slice(0, 120));
check('Unsafe action link dropped from the plan', (await page.locator('a[href^="https://evil"]').count()) === 0);

// Ask panel
await page.getByRole('button', { name: 'Ask Naunas' }).click();
check('Ask panel opens with starters', await page.getByRole('button', { name: 'What am I missing out on?' }).isVisible());
fs.writeFileSync(OAILOG, '[]');
await page.getByRole('button', { name: 'What am I missing out on?' }).click();
await page.locator('[role=dialog] a', { hasText: 'Firm rp' }).first().waitFor({ timeout: 30000 }).catch(() => {});
const dlg = await page.locator('[role=dialog]').innerText();
check('Answer rendered with bold + bullets + link', dlg.includes('Do this first') && (await page.locator('[role=dialog] a[href="/dashboard/outreach/firm/rp"]').count()) >= 1);
check('Action button shown, unsafe one dropped', (await page.locator('[role=dialog] a', { hasText: 'Open firm →' }).count()) === 1 && (await page.locator('[role=dialog] a', { hasText: 'Evil' }).count()) === 0);
const log = JSON.parse(fs.readFileSync(OAILOG, 'utf8'));
check('Tool loop: find_firm called, then answered', log.length === 2 && log[1].messages.some((m) => m.role === 'tool' && m.content.includes('"firm":"Firm rp"')));
check('Context sent includes flags + snapshot', log[0].messages.some((m) => m.role === 'system' && m.content.includes('FLAGS (') && m.content.includes('PROSPECTS by step')));
await page.locator('[role=dialog] input').fill('And after that?');
await page.locator('[role=dialog] form button').click();
await page.waitForTimeout(3000);
const log2 = JSON.parse(fs.readFileSync(OAILOG, 'utf8'));
check('Follow-up question carries the conversation', log2.length >= 3 && log2[2].messages.filter((m) => m.role === 'user').length === 2);
await page.keyboard.press('Escape');
check('Escape closes the panel', !(await page.locator('[role=dialog]').isVisible()));

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
check('Home: no sideways scroll at 390px', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await page.getByRole('button', { name: 'Ask Naunas' }).click();
check('Ask panel fits the phone', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await page.screenshot({ path: 'e2e11-m-ask.png' });
await page.keyboard.press('Escape');
await page.screenshot({ path: 'e2e11-m-home.png', fullPage: true });
await page.setViewportSize({ width: 1440, height: 900 });
await page.screenshot({ path: 'e2e11-d-home.png' });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
