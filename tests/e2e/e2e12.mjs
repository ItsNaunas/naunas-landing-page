// Scorecard page, end-of-video pop-up, video-aware timed pop-up, watch counters, Performance card.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const read = (p) => JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8'));
fs.rmSync(path.join(STORE, 'content/video-watch.json'), { force: true });
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const until = async (fn, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const counts = () => { try { const d = read('content/video-watch.json').days; return Object.values(d)[0] ?? {}; } catch { return {}; } };

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));

// 1. /scorecard page
const r = await page.goto(`${BASE}/scorecard`, { waitUntil: 'load' });
const sc = await page.locator('main').innerText();
check('/scorecard renders', r.status() === 200 && sc.includes('Find your weakest step') && sc.includes('page 19'));
check('/scorecard lists the 8 steps', ['Attention', 'Capture', 'Pipeline', 'Follow-up', 'Conversion', 'Fulfilment', 'Retention', 'Attribution'].every((s) => sc.includes(s)));
check('/scorecard has the form with scorecard button', (await page.getByRole('button', { name: 'Send me the scorecard →' }).count()) === 1);
await page.waitForTimeout(11000);
check('No timed pop-up on /scorecard', (await page.locator('[role=dialog]').count()) === 0);

// 2. Home: the timed pop-up waits while the video plays
await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.locator('#see-the-system').scrollIntoViewIfNeeded();
await page.locator('#see-the-system button[aria-label^="Play"]').click();
await page.waitForTimeout(11500);
check('Timed pop-up does not interrupt the playing video', (await page.locator('[role=dialog]').count()) === 0);
check('Play counted', await until(() => (counts().play ?? 0) >= 1), JSON.stringify(counts()));
// Jump near the end so it finishes
await page.evaluate(() => { const v = document.querySelector('#see-the-system video'); v.currentTime = v.duration - 1.5; });
check('End-of-video pop-up opens with scorecard copy', await page.locator('[role=dialog]', { hasText: 'Find your weakest step' }).waitFor({ timeout: 15000 }).then(() => true, () => false));
check('End + quarter marks + popup counted', await until(() => (counts().end ?? 0) >= 1 && (counts().q75 ?? 0) >= 1 && (counts().popup ?? 0) >= 1), JSON.stringify(counts()));
const dlg = page.locator('[role=dialog]');
check('Scorecard variant button text', (await dlg.getByRole('button', { name: 'Send me the scorecard →' }).count()) === 1);
// Dismiss, then the timed pop-up may now appear (video over, not seen before on this visit? it was marked seen by the video open). Replay end: must not open again this visit.
await dlg.getByRole('button', { name: 'No thanks' }).click();
await page.evaluate(() => { const v = document.querySelector('#see-the-system video'); v.currentTime = 0; v.play(); v.currentTime = v.duration - 1; });
await page.waitForTimeout(3500);
check('Only once per visit', (await page.locator('[role=dialog]').count()) === 0);

// 3. Sign-up from the pop-up carries video_end and counts a signup (API will fail without MailerLite/HubSpot keys but returns success? check response path)
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await ctx2.newPage();
await m.route('**/api/leak-map', (route) => { const body = JSON.parse(route.request().postData() || '{}'); m.__src = body.src; route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, pdf: '/leak-map.pdf' }) }); });
await m.goto(`${BASE}/`, { waitUntil: 'load' });
await m.evaluate(() => window.dispatchEvent(new CustomEvent('open-leak-map', { detail: { src: 'video_end', variant: 'scorecard' } })));
await m.locator('[role=dialog] input[placeholder="First name"]').fill('Test');
await m.locator('[role=dialog] input[type=email]').fill('test@example.com');
await m.locator('[role=dialog] button[type=submit]').click();
check('Sign-up posts src=video_end', await until(() => (m.__src ?? '').startsWith('video_end')), m.__src);
check('Sign-up shows the scorecard download line', await m.locator('[role=dialog]', { hasText: 'The scorecard is page 19' }).waitFor({ timeout: 8000 }).then(() => true, () => false));
check('Sign-up after the video counted', await until(() => (counts().signup ?? 0) >= 1), JSON.stringify(counts()));
check('Pop-up fits the phone', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await m.screenshot({ path: 'e2e12-m-popup.png' });
await ctx2.close();

// 4. Performance tab shows the numbers
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await page.goto(`${BASE}/dashboard/content/performance`, { waitUntil: 'load' });
await page.getByText('Pressed play').waitFor({ timeout: 20000 }).catch(() => {});
const pt = await page.locator('main').innerText();
check('Performance shows the landing video card', /LANDING VIDEO/i.test(pt) && pt.includes('Pressed play') && pt.includes('Watched to the end'));
await page.goto(`${BASE}/scorecard`, { waitUntil: 'load' });
await page.setViewportSize({ width: 390, height: 844 });
check('/scorecard: no sideways scroll at 390px', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 391);
await page.screenshot({ path: 'e2e12-m-scorecard.png', fullPage: true });
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
await b.close();
