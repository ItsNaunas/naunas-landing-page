// Command palette (Ctrl+K): opens, finds a firm from the outreach list, Enter opens it; g + letter jumps; ? lists shortcuts.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8')); } catch { return null; } };
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };

const list = (read('outreach/prospects.json') ?? []).filter((p) => p.id !== 'palettefirm');
write('outreach/prospects.json', [...list, { id: 'palettefirm', firm: 'Zebrawood Interiors', website: 'https://zebra.example', tz: 'America/Chicago', fit: 6, fitWhy: ['Design practice'], searchId: 's', createdAt: new Date().toISOString(), status: 'new' }]);

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await page.waitForLoadState('networkidle').catch(() => {});

await page.keyboard.press('Control+k');
const dialog = page.getByRole('dialog', { name: 'Command palette' });
check('Ctrl+K opens the palette', await dialog.isVisible().catch(() => false));
check('The search field has focus', await dialog.locator('input').evaluate((el) => el === document.activeElement).catch(() => false));
await dialog.locator('input').fill('zebrawood');
const hit = dialog.getByRole('option', { name: /Zebrawood Interiors/ });
await hit.waitFor({ timeout: 30000 }).catch(() => {});
check('Finds a firm by name', await hit.isVisible().catch(() => false));
await hit.click();
await page.waitForURL('**/outreach/firm/palettefirm', { timeout: 60000 }).catch(() => {});
check('Picking it opens the firm page', page.url().endsWith('/outreach/firm/palettefirm'));

await page.waitForLoadState('networkidle').catch(() => {});
await page.keyboard.press('g'); await page.keyboard.press('l');
await page.waitForURL('**/dashboard/leads', { timeout: 60000 }).catch(() => {});
check('g then l jumps to Leads', page.url().endsWith('/dashboard/leads'));

await page.keyboard.press('Shift+?');
check('? lists the shortcuts', await page.getByRole('dialog', { name: 'Command palette' }).getByText('Open this palette').isVisible().catch(() => false));
await page.keyboard.press('Escape');
check('Esc closes it', !(await page.getByRole('dialog', { name: 'Command palette' }).isVisible().catch(() => false)));

const res = await page.request.get(`${BASE}/dashboard/search?q=zebrawood`);
check('Search route answers for a signed-in session', res.ok() && (await res.json()).hits.some((h) => h.kind === 'Firm'));
const anon = await (await b.newContext()).request.get(`${BASE}/dashboard/search?q=zebrawood`, { maxRedirects: 0 });
check('Search route refuses without a session', anon.status() !== 200 || !(await anon.text()).includes('Zebrawood'));

check('No page errors', !errors.length, errors.join(' | '));
await b.close();
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
