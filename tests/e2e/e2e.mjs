// Click-through test of the dashboard buttons against a local JSON store (no production data).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const H = 3_600_000, D = 24 * H;
const iso = (ms) => new Date(Date.now() - ms).toISOString();
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8')); } catch { return null; } };
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };

// ---- seed
fs.rmSync(STORE, { recursive: true, force: true });
const base = (id, firm, extra) => ({ id, firm, website: `https://${id}.example`, domain: `${id}.example`, email: `hi@${id}.example`, instagram: `${id}.ig`, city: 'Austin', state: 'TX', tz: 'America/Chicago', fit: 6, fitWhy: ['Design practice'], searchId: 's1', createdAt: iso(10 * D), ...extra });
const drafts = (dms) => ({ subject: 'the reply on your form', steps: ['Hi there,\n\nE1 body.\n\nNaufal', 'E2', 'E3', 'E4'], dm: dms[0].text, dms });
const okDms = [{ style: 'A', text: 'Love the oak kitchen in your Austin project. Was the finish your call or the client’s?' }, { style: 'B', text: 'How do most of your new enquiries reach you, the form or Instagram?' }];
write('outreach/prospects.json', [
  base('firma', 'Firm A Warm', { status: 'scheduled', channel: 'instagram', scheduledAt: iso(1 * H), drafts: drafts(okDms) }),
  base('firmb', 'Firm B Opener', { status: 'scheduled', channel: 'instagram', warmedAt: iso(30 * H), drafts: drafts([...okDms, { style: 'C', text: 'Hi [name], love your work. Quick question?' }]) }),
  base('firmc', 'Firm C FU1', { status: 'active', startedAt: iso(4 * D), warmedAt: iso(5 * D), dmSentAt: iso(4 * D), dmStyle: 'A', drafts: drafts(okDms), sent: [{ step: 0, at: iso(4 * D), messageId: 'm1' }] }),
  base('firmd', 'Firm D FU2', { status: 'active', startedAt: iso(8 * D), warmedAt: iso(9 * D), dmSentAt: iso(8 * D), fu1At: iso(3 * D), dmStyle: 'B', drafts: drafts(okDms), sent: [{ step: 0, at: iso(8 * D), messageId: 'm2' }] }),
  base('firme', 'Firm E Review', { status: 'new', fit: 6 }),
  base('firmf', 'Firm F Placeholder', { status: 'drafted', instagram: undefined, drafts: { subject: 'hello [firm]', steps: ['Hi [name],\n\nBody\n\nNaufal'] } }),
]);
write('outreach/owed.json', [
  { id: 'o1', who: 'Owed Person', what: 'Loom teardown', channel: 'LinkedIn', link: 'https://www.linkedin.com/in/test', owedAt: iso(18 * H) },
  { id: 'o2', who: 'Nudge Person', what: 'PDF', channel: 'Instagram', owedAt: iso(8 * D), sentAt: iso(6 * D) },
]);

// ---- run
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (let i = 0; i < 90; i++) { try { if ((await fetch(`${BASE}/dashboard/login`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 2000)); }
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror ${page.url()}: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });
await page.goto(`${BASE}/dashboard/login`);
await page.fill('input[name=password]', 'localtest');
await page.click('button');
await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/, { timeout: 120000 });

const go = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 120000 }); };
const settle = async () => { await page.waitForLoadState('networkidle'); await page.waitForTimeout(800); };
const act = async (loc) => { const nav = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null); await Promise.all([page.waitForResponse((r) => r.request().method() === 'POST', { timeout: 60000 }), loc.click()]); await nav; await page.waitForLoadState('networkidle'); await page.waitForTimeout(400); };
const row = (text) => page.locator('li', { hasText: text }).last();
const prospect = (id) => read('outreach/prospects.json').find((p) => p.id === id);

await go('/dashboard/outreach');
const listText = await page.locator('main').innerText();
check('List shows promised item', listText.includes('Owed Person'));
check('List shows nudge item', listText.includes('Nudge Person'));
check('List shows FU1 (day 5)', listText.includes('@firmc.ig'));
check('List shows FU2 (day 9)', listText.includes('@firmd.ig'));
check('List shows opener', listText.includes('@firmb.ig'));
check('List shows warm-up', listText.includes('@firma.ig'));
check('Placeholder opener is blocked', (await row('@firmb.ig').innerText()).includes('has placeholder text'));
check('Placeholder opener has no Sent button', (await row('@firmb.ig').getByRole('button', { name: 'Sent this one' }).count()) === 2, 'only styles A and B can be sent');

// Copy
await row('@firmb.ig').getByRole('button', { name: 'Copy' }).first().click();
await page.waitForTimeout(300);
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
check('Copy puts the opener on the clipboard', clip.startsWith('Love the oak kitchen'), clip.slice(0, 40));

// Warm-up Done
await act(row('@firma.ig').getByRole('button', { name: 'Done' }));
check('Warm-up Done saves warmedAt', !!prospect('firma').warmedAt);
check('Warm-up Done counts a rep', Object.values(read('outreach/reps.json') ?? {}).some((d) => d.warmups === 1));
await page.reload({ waitUntil: 'networkidle' });
check('Warm-up leaves the list', !(await page.locator('main li', { hasText: '@firma.ig' }).count()));

// Opener Sent (style B)
await act(row('@firmb.ig').getByRole('button', { name: 'Sent this one' }).nth(1));
check('Opener Sent saves dmSentAt + style B', !!prospect('firmb').dmSentAt && prospect('firmb').dmStyle === 'B', prospect('firmb').dmStyle);

// FU1 Sent
await act(row('@firmc.ig').getByRole('button', { name: 'Sent', exact: true }));
check('Day 5 Sent saves fu1At', !!prospect('firmc').fu1At);
check('Day 5 counts a follow-up rep', Object.values(read('outreach/reps.json') ?? {}).some((d) => d.followups === 1));

// FU2 They replied
await act(row('@firmd.ig').getByRole('button', { name: 'They replied' }));
check('They replied stops IG + email', !!prospect('firmd').igRepliedAt && prospect('firmd').status === 'replied', prospect('firmd').status);

// Owed Sent it / Nudged
await act(row('Owed Person').getByRole('button', { name: 'Sent it' }));
check('Promised: Sent it saves sentAt', !!read('outreach/owed.json').find((o) => o.id === 'o1').sentAt);
await act(row('Nudge Person').getByRole('button', { name: 'Nudged' }));
check('Nudge: Nudged closes it', read('outreach/owed.json').find((o) => o.id === 'o2').outcome === 'nudged');

// Add a promise
await page.locator('summary', { hasText: 'Someone said yes' }).click();
await page.fill('input[name=who]', 'New Yes · Studio');
await act(page.getByRole('button', { name: 'Add' }));
check('Add promise saves it', read('outreach/owed.json').some((o) => o.who === 'New Yes · Studio'));
check('New promise appears at the top of the list', (await page.locator('li', { hasText: 'New Yes · Studio' }).count()) > 0);

// Progress counter
const prog = await page.locator('text=/\\d+ done · \\d+ to go/').first().innerText().catch(() => '');
check('Progress counter updates', /^[6-9] done · 1 to go/.test(prog), prog);

// Reps + / -
await page.goto(`${BASE}/dashboard/outreach/results`, { waitUntil: 'networkidle' });
const repRow = page.locator('li', { hasText: 'Zanzibar action' }).first();
await act(repRow.getByRole('button', { name: /One more/ }));
const li1 = Object.values(read('outreach/reps.json')).some((d) => d.zanzibar === 1);
await act(page.locator('li', { hasText: 'Zanzibar action' }).first().getByRole('button', { name: /One less/ }));
const li0 = Object.values(read('outreach/reps.json')).some((d) => d.zanzibar === 0);
check('Rep + and − work', li1 && li0);

// Sending toggle (layout)
await page.locator('summary', { hasText: 'Settings' }).click();
await act(page.getByRole('button', { name: 'Turn sending on' }));
check('Sending toggle turns ON', read('outreach/settings.json')?.sending === true);
await page.locator('summary', { hasText: 'Settings' }).click();
await act(page.getByRole('button', { name: 'Turn sending off' }));
check('Sending toggle turns OFF', read('outreach/settings.json')?.sending === false);

// Prospects tab
await page.getByRole('link', { name: 'Prospects' }).click(); await page.waitForURL('**/outreach/prospects'); await settle();
check('Prospects tab link works', page.url().endsWith('/outreach/prospects'));
await page.goto(`${BASE}/dashboard/outreach/prospects?step=review`, { waitUntil: 'networkidle' });
await act(page.locator('[data-item="rv-firme"]').getByRole('button', { name: 'Approve' }));
await page.goto(`${BASE}/dashboard/outreach/prospects?step=ready`, { waitUntil: 'networkidle' });
check('Approve starts research (approved, or skipped once the fake site fails to load)', ['approved', 'rejected'].includes(prospect('firme').status), prospect('firme').status);
await page.getByRole('button', { name: /Firm F Placeholder/ }).click();
await act(page.getByRole('button', { name: 'Start outreach' }).last());
check('Schedule is blocked for a placeholder draft', prospect('firmf').status === 'drafted' && (await page.locator('text=placeholder text').count()) > 0);

// Sequences: Stop
// (Sequences lives in Prospects → In outreach since 2026-10-23.)
await page.getByRole('link', { name: /In outreach/ }).click(); await page.waitForURL('**/prospects?step=outreach'); await settle();
await act(page.locator('tr', { hasText: 'Firm C FU1' }).getByRole('button', { name: 'Stop' }));
check('Stop ends a sequence', prospect('firmc').status === 'stopped', prospect('firmc').status);

// Results: opener test table
await page.goto(`${BASE}/dashboard/outreach/results`, { waitUntil: 'networkidle' }); await settle();
const res = await page.locator('table', { hasText: 'Opener style' }).innerText().catch(() => '');
check('Results shows reply rate per style', res.includes('B') && res.includes('A'), res.replace(/\s+/g, ' ').slice(0, 80));

// Content: New post + newsletter button + tabs
await go('/dashboard/content');
await page.getByRole('button', { name: '+ New post' }).click();
await page.waitForURL(/\/dashboard\/content\/p\d{8}-/, { timeout: 60000 }).catch(() => {});
check('+ New post opens the editor', /\/dashboard\/content\/p\d{8}-/.test(page.url()), page.url());
for (const [label, url] of [['Performance', '/content/performance'], ['Email', '/content/newsletter'], ['Keyword DMs', '/content/keywords'], ['Plan', '/content']]) {
  await go('/dashboard/content/performance');
  await page.getByRole('link', { name: label, exact: true }).first().click();
  await page.waitForURL(`**/dashboard${url}`, { timeout: 60000 }).catch(() => {});
  const current = await page.locator('[aria-current=page]').allInnerTexts();
  check(`Content tab: ${label}`, page.url().endsWith(url) && current.some((t) => t.startsWith(label)));
}
await go('/dashboard/content/newsletter');
await page.getByRole('button', { name: /Build draft now|Rebuild/ }).click();
await page.waitForTimeout(4000);
const nlMsg = await page.locator('.text-rose-300, .text-emerald-300').allInnerTexts();
check('Newsletter button responds (no MailerLite key locally, so an error message is expected)', nlMsg.length > 0, nlMsg.join(' | ').slice(0, 90));
await go('/dashboard/content/performance');
await act(page.getByRole('button', { name: /Refresh Instagram stats/ }));
check('Refresh Instagram stats returns', page.url().endsWith('/content/performance'));

// Pipeline + System tabs, sidebar
// Calls is always a tab (2026-10-23); without CAL_API_KEY it says how to connect Cal.com.
await go('/dashboard/pipeline');
check('Pipeline tabs: Deals, Proposals, Calls', (await page.getByRole('link', { name: 'Proposals', exact: true }).count()) === 1 && (await page.getByRole('link', { name: 'Calls', exact: true }).count()) === 1);
await go('/dashboard/pipeline/calls');
check('Calls tab explains how to connect', (await page.locator('main').innerText()).includes('Connect Cal.com'));
// System = Health & connections (one page since 2026-10-23) + Activity.
await go('/dashboard/system');
await page.getByRole('link', { name: 'Activity', exact: true }).first().click();
await page.waitForURL('**/dashboard/system/automations', { timeout: 60000 }).catch(() => {});
check('Tab: Activity', page.url().endsWith('/system/automations'));
await go('/dashboard/system/connections');
check('Old Connections URL lands on System', new URL(page.url()).pathname === '/dashboard/system' && /all tools/i.test(await page.locator('main').innerText()));
await page.getByRole('link', { name: /LinkedIn/ }).first().click(); await page.waitForURL('**/dashboard/linkedin', { timeout: 60000 }).catch(() => {});
check('Connections → LinkedIn page', page.url().endsWith('/dashboard/linkedin'));
await page.getByRole('link', { name: '← System' }).click(); await page.waitForURL('**/dashboard/system', { timeout: 60000 }).catch(() => {});
check('LinkedIn page ← back link', new URL(page.url()).pathname === '/dashboard/system');
await go('/dashboard');
check('Money hidden from the sidebar without STRIPE_READ_KEY', (await page.locator('aside').getByRole('link', { name: /^Money/ }).count()) === 0);
for (const label of ['Today', 'Leads', 'Outreach', 'Pipeline', 'Content', 'System']) {
  const target = { Today: '/dashboard', Leads: '/dashboard/leads', Outreach: '/dashboard/outreach/prospects', Pipeline: '/dashboard/pipeline', Content: '/dashboard/content', Money: '/dashboard/money', System: '/dashboard/system' }[label];
  await page.locator('aside').getByRole('link', { name: new RegExp(`^${label}`) }).click();
  await page.waitForURL((u) => u.pathname === target, { timeout: 60000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  check(`Sidebar: ${label}`, (await page.locator('aside [aria-current=page]').innerText()).startsWith(label));
}

// ---- responsive: every page at 390 / 768 / 1440, no sideways scroll; mobile bottom bar + More sheet
const pages = ['', '/leads', '/clients', '/pipeline/proposals', '/outreach', '/outreach/prospects', '/outreach/sequences', '/outreach/results', '/pipeline', '/pipeline/calls', '/content', '/content/performance', '/content/newsletter', '/content/keywords', '/money', '/system', '/system/connections', '/system/automations', '/tiktok', '/linkedin'];
for (const w of [390, 768, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  const wide = [];
  for (const p of pages) {
    await go('/dashboard' + p);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w + 1) wide.push(`${p || '/'} (${sw}px)`);
  }
  check(`No sideways scroll at ${w}px (${pages.length} pages)`, !wide.length, wide.join(', '));
}
await page.setViewportSize({ width: 390, height: 844 });
await go('/dashboard/outreach');
await page.screenshot({ path: 'e2e-m-outreach.png', fullPage: true });
const bottom = page.locator('nav[aria-label=Dashboard]').last();
await bottom.getByRole('link', { name: /Content/ }).click(); await page.waitForURL('**/dashboard/content', { timeout: 60000 }).catch(() => {});
check('Mobile bottom bar: Content', page.url().endsWith('/dashboard/content'));
await bottom.getByRole('button', { name: /More/ }).click();
const sheet = page.getByRole('dialog', { name: 'More pages' });
check('Mobile More sheet opens', await sheet.isVisible());
await sheet.getByRole('link', { name: /System/ }).click(); await page.waitForURL('**/dashboard/system', { timeout: 60000 }).catch(() => {});
check('More sheet link works', page.url().endsWith('/dashboard/system'));
const tabsScroll = await page.evaluate(() => { const n = document.querySelector('nav[aria-label="System sections"]'); return n ? n.scrollWidth <= n.clientWidth + 1 || getComputedStyle(n).overflowX === 'auto' : false; });
check('Mobile tabs fit or scroll sideways inside their bar', tabsScroll);
const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 24; }).map((e) => (e.textContent || '').trim().slice(0, 30)).slice(0, 12));
console.log('Tap targets under 24px tall on mobile System page:', small);

console.log('\nServer/page errors:', errors.length ? errors.join('\n') : 'none');
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
