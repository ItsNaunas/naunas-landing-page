// "What you're missing" flags on Home, Ask Naunas panel (tool loop via mock OpenAI, card answers, follow-ups,
// sources, page context, wider snapshot: health, activity, vault), Today's plan, the vault sync endpoint.
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
write('meta/health.json', { at: iso(3600_000), ok: false, checks: [{ name: 'TikTok', ok: false, detail: 'token expired' }, { name: 'HubSpot', ok: true }] });
write('events.json', [{ at: iso(3600_000), kind: 'alert', title: 'Problem: Daily job: weekly scoreboard' }]);

const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };

// Vault sync (laptop -> site): token required, items validated, pasted keys redacted.
const vpost = (auth, body) => fetch(`${BASE}/api/vault/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });
check('Vault sync refuses without the token', (await vpost('', { items: [] })).status === 401);
check('Vault sync refuses a bad body', (await vpost('studiotest', { nope: 1 })).status === 400);
const vr = await vpost('studiotest', { items: [{ name: 'SNAEB', kind: 'client', status: 'building', lastContact: '2026-11-05', next: ['Ship the offers page'], blocked: ['Marcus: UAE legal docs'], tasks: [{ text: 'Rotate sk_live_abcdefghijklmnop now', high: true }] }, { name: 'bad', kind: 'nonsense' }] });
check('Vault sync stores valid items only', vr.ok && (await vr.json()).saved === 1);
const vault = JSON.parse(fs.readFileSync(path.join(STORE, 'vault/summary.json'), 'utf8'));
check('Vault sync redacts a pasted key', JSON.stringify(vault).includes('[redacted]') && !JSON.stringify(vault).includes('sk_live_abc'));

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
const home = await page.locator('main').innerText();
check('Home shows the Needs-you list', home.includes('Needs you'));
// Promises and blocked email show once, in Today's contact list on the same page (not again as flags).
check('Overdue promise on Today', home.includes('Ann · Firm X') && home.includes('Loom teardown'));
check('Flag: reply with no next step', /Firm rp replied 3 days ago with no next step/.test(home));
check('Email blocked banner on Today', home.includes('waiting for their first email'));
check('Flag: health problem', home.includes('health check found a problem'));
check('Flag: research failed + list running dry are counted', /\d+ things need you/.test(home), home.match(/\d+ things need you/)?.[0]);
check('Flags link to the fix', (await page.locator('a', { hasText: 'Firm rp replied' }).getAttribute('href')) === '/dashboard/outreach/firm/rp');

// Today's plan (mock OpenAI) lives on Today, above the contact list (/dashboard/outreach redirects there)
await page.goto(`${BASE}/dashboard/outreach`, { waitUntil: 'networkidle' });
const nav = page.waitForEvent('framenavigated', { timeout: 20000 }).catch(() => null);
await Promise.all([page.waitForResponse((x) => x.request().method() === 'POST', { timeout: 60000 }), page.getByRole('button', { name: /Write today’s plan/ }).click()]);
await nav; await page.waitForLoadState('networkidle');
const plan = await page.locator('section', { hasText: 'Today’s plan' }).last().innerText();
check('Today’s plan written and shown as cards', plan.includes('Do this first') && plan.includes('Reply to Firm rp'), plan.slice(0, 160));
check('Plan steps are numbered and tick off', (await page.getByRole('button', { name: 'Mark step 1 done' }).count()) >= 1);
check('Unsafe action link dropped from the plan', (await page.locator('a[href^="https://evil"]').count()) === 0);

// Ask panel
await page.getByRole('button', { name: 'Ask Naunas' }).click();
check('Ask panel opens with starters', await page.getByRole('button', { name: 'What am I missing out on?' }).isVisible());
fs.writeFileSync(OAILOG, '[]');
await page.getByRole('button', { name: 'What am I missing out on?' }).click();
await page.locator('[role=dialog] a', { hasText: 'Firm rp' }).first().waitFor({ timeout: 30000 }).catch(() => {});
const dlg = await page.locator('[role=dialog]').innerText();
check('Answer rendered as cards with a headline and links', dlg.includes('Do this first: answer Firm rp.') && dlg.includes('Reply to Firm rp') && (await page.locator('[role=dialog] a[href="/dashboard/outreach/firm/rp"]').count()) >= 2);
check('Unsafe item link dropped', (await page.locator('[role=dialog] a[href^="https://evil"]').count()) === 0);
check('Sources footer shows real sources only', dlg.includes('From: Outreach · Dashboard flags') && !dlg.includes('Made up source'));
check('Follow-up chips shown', await page.getByRole('button', { name: 'Which deals are stale?' }).isVisible());
check('Copy and Retry on the answer', await page.locator('[role=dialog]').getByRole('button', { name: 'Copy' }).isVisible() && await page.locator('[role=dialog]').getByRole('button', { name: /Retry/ }).isVisible());
await page.locator('[role=dialog] summary').first().click();
check('How I checked lists the tool steps', (await page.locator('[role=dialog]').innerText()).includes('Looked up Firm rp'));
check('Action button shown, unsafe one dropped', (await page.locator('[role=dialog] a', { hasText: 'Open firm →' }).count()) === 1 && (await page.locator('[role=dialog] a', { hasText: 'Evil' }).count()) === 0);
const log = JSON.parse(fs.readFileSync(OAILOG, 'utf8'));
check('Tool loop: find_firm called, then answered', log.length === 2 && log[1].messages.some((m) => m.role === 'tool' && m.content.includes('"firm":"Firm rp"')));
check('Context sent includes flags + snapshot', log[0].messages.some((m) => m.role === 'system' && m.content.includes('FLAGS (') && m.content.includes('PROSPECTS by step')));
const ctx = log[0].messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
check('Snapshot carries failed health checks', ctx.includes('TikTok (token expired)'));
check('Snapshot carries the activity log', ctx.includes('Problem: Daily job: weekly scoreboard'));
check('Snapshot carries the vault', ctx.includes('SNAEB [client, building, last contact 2026-11-05]'));
check('Snapshot carries build progress', ctx.includes('BUILD (this dashboard'));
check('Page context sent', ctx.includes('Naufal is asking from the page /dashboard'));
check('Tools include vault + activity + health', ['vault', 'activity_log', 'health_checks', 'clients_and_money', 'build_progress'].every((n) => log[0].tools.some((t) => t.function.name === n)));
await page.getByRole('button', { name: 'Which deals are stale?' }).click();
await page.waitForTimeout(3000);
const log2 = JSON.parse(fs.readFileSync(OAILOG, 'utf8'));
check('Follow-up chip carries the conversation', log2.length >= 3 && log2[2].messages.filter((m) => m.role === 'user').length === 2 && log2[2].messages.some((m) => m.role === 'assistant' && m.content.includes('1. Reply to Firm rp')));
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
