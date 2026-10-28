// Studio drop: token auth, a finished video becomes a draft with channels on and a suggested free day.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const STORE = process.env.STORE;
const BASE = process.env.BASE || 'http://localhost:3000';
const read = (p) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, p), 'utf8')); } catch { return null; } };
const write = (p, v) => { fs.mkdirSync(path.dirname(path.join(STORE, p)), { recursive: true }); fs.writeFileSync(path.join(STORE, p), JSON.stringify(v, null, 2)); };
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? `  (${d})` : ''}`); };
const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);

// Something already scheduled on each of the next two days: the suggestion must skip both.
const busy = [1, 2].map((i) => new Date(Date.now() + i * 86_400_000));
const idx = (read('content/index.json') ?? []).filter((r) => !r.id.startsWith('busy'));
write('content/index.json', [...busy.map((d, i) => ({ id: `busy${i}`, createdAt: d.toISOString(), when: d.toISOString(), status: 'scheduled', idea: 'x', channels: { linkedin: 'scheduled' } })), ...idx]);

const media = { path: 'content/media/test-talk.mp4', kind: 'video', sizeBytes: 1234567, name: 'test-talk.mp4', durationSec: 18.2, width: 1080, height: 1920 };
const post = (auth, body = { media, idea: 'Why slow replies lose interior design clients' }) => fetch(`${BASE}/api/content/drop`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body) });

check('No token → 401', (await post(null)).status === 401);
check('Wrong token → 401', (await post('nope')).status === 401);
check('Upload token route refuses without the token', (await fetch(`${BASE}/api/content/drop/upload`, { method: 'POST', body: '{}' })).status === 401);
check('Bad media path → 400', (await post('studiotest', { media: { ...media, path: 'secrets/x.mp4' } })).status === 400);
const r = await post('studiotest');
const out = await r.json();
check('Drop accepted', r.ok && !!out.id, JSON.stringify(out));
const p = read(`content/posts/${out.id}.json`);
check('Draft saved with the video', p?.status === 'draft' && p.master.media.path === media.path && p.source === 'studio');
check('LinkedIn on (TikTok/Instagram follow their keys)', p?.channels.linkedin.enabled && p.channels.linkedin.status === 'ready');
const s = new Date(p?.suggestedFor);
check('Suggested time skips the busy days', !busy.some((d) => day(d) === day(s)) && s > new Date(), `${p?.suggestedFor}`);
check('Suggested at 09:00 US East', new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(s) === '09:00');
check('Nothing scheduled by the drop', !p?.scheduledFor && !p?.qstashMessageId);
check('Listed on Content', (read('content/index.json') ?? []).some((x) => x.id === out.id));

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/dashboard/login`); await page.fill('input[name=password]', 'localtest'); await page.click('button'); await page.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await page.goto(`${BASE}/dashboard/content/${out.id}`, { waitUntil: 'networkidle' });
check('Post page opens with the video', (await page.locator('main').innerText()).includes('Video · 18.2s'));
check('No page errors', !errors.length, errors.join(' | '));

// Clean up the fixtures so later suites see the content list as before.
write('content/index.json', (read('content/index.json') ?? []).filter((x) => !x.id.startsWith('busy')));
await b.close();

// ---- LinkedIn analytics export → impressions on the leaderboard
function xlsx(files) { // minimal zip (deflate), the shape Excel writes; CRCs aren't checked by our reader
  const locals = []; const central = []; let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text); const data = zlib.deflateRawSync(raw); const nm = Buffer.from(name);
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(8, 8); l.writeUInt32LE(data.length, 18); l.writeUInt32LE(raw.length, 22); l.writeUInt16LE(nm.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    locals.push(l, nm, data); central.push(c, nm); off += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(central); const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(central.length / 2, 8); e.writeUInt16LE(central.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, e]);
}
const day2 = new Date(Date.now() - 3 * 86_400_000); const us = `${day2.getUTCMonth() + 1}/${day2.getUTCDate()}/${day2.getUTCFullYear()}`;
const liA = 'https://www.linkedin.com/feed/update/urn:li:activity:7390000000000000001/';
const ix = (read('content/index.json') ?? []).filter((r) => !r.id.startsWith('lipost'));
write('content/index.json', [
  { id: 'lipostA', createdAt: day2.toISOString(), when: new Date(Date.now() - 6 * 86_400_000).toISOString(), status: 'done', idea: 'Post matched by URL', channels: { linkedin: 'posted' }, urls: { linkedin: liA } },
  { id: 'lipostB', createdAt: day2.toISOString(), when: new Date(day2.getTime() + 12 * 3_600_000 - (day2.getTime() % 86_400_000)).toISOString(), status: 'done', idea: 'Post matched by date', channels: { linkedin: 'posted' }, urls: { linkedin: 'https://www.linkedin.com/feed/update/urn:li:share:123/' } },
  ...ix,
]);
const strings = ['Post URL', 'Post publish date', 'Engagements', 'Impressions', liA, 'https://www.linkedin.com/feed/update/urn:li:activity:7390000000000000777/', 'https://www.linkedin.com/feed/update/urn:li:activity:7111111111111111111/'];
const si = (i) => `<c r="REF" t="s"><v>${i}</v></c>`;
const cell = (ref, v) => (typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`);
const ss = (ref, i) => si(i).replace('REF', ref);
const sheet = `<worksheet><sheetData>
<row r="1">${cell('A1', 'Maximum 50 posts')}</row>
<row r="3">${ss('A3', 0)}${ss('B3', 1)}${ss('C3', 2)}${ss('E3', 0)}${ss('F3', 1)}${ss('G3', 3)}</row>
<row r="4">${ss('A4', 4)}${cell('B4', '10/01/2026')}${cell('C4', 41)}${ss('E4', 5)}${cell('F4', us)}${cell('G4', 2150)}</row>
<row r="5">${ss('A5', 5)}${cell('B5', us)}${cell('C5', 77)}${ss('E5', 4)}${cell('F5', '10/01/2026')}${cell('G5', 1234)}</row>
<row r="6">${ss('A6', 6)}${cell('B6', '1/2/2025')}${cell('C6', 5)}</row>
</sheetData></worksheet>`;
const file = xlsx({
  '[Content_Types].xml': '<Types/>',
  'xl/workbook.xml': '<workbook xmlns:r="r"><sheets><sheet name="DISCOVERY" sheetId="1" r:id="rId1"/><sheet name="TOP POSTS" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml': `<worksheet><sheetData><row r="1">${cell('A1', 'Overall Performance')}</row></sheetData></worksheet>`,
  'xl/worksheets/sheet2.xml': sheet,
  'xl/sharedStrings.xml': `<sst>${strings.map((t) => `<si><t>${t}</t></si>`).join('')}</sst>`,
});
const xf = path.join(path.dirname(STORE), 'li-export.xlsx'); fs.writeFileSync(xf, file);

const b2 = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const pg = await (await b2.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
await pg.goto(`${BASE}/dashboard/login`); await pg.fill('input[name=password]', 'localtest'); await pg.click('button'); await pg.waitForURL(/\/dashboard(?!\/login)(\/|\?|$)/);
await pg.goto(`${BASE}/dashboard/content/performance`, { waitUntil: 'networkidle' });
await pg.setInputFiles('input[name=file]', xf);
await Promise.all([pg.waitForURL(/[?&](li|err)=/, { timeout: 60000 }), pg.getByRole('button', { name: 'Import' }).click()]);
await pg.waitForLoadState('networkidle').catch(() => {});
const li = read('stats/content-linkedin.json') ?? {};
check('Export: post matched by URL gets impressions + engagements', li.lipostA?.impressions === 1234 && li.lipostA?.engagements === 41, JSON.stringify(li.lipostA));
check('Export: post matched by its day', li.lipostB?.impressions === 2150 && li.lipostB?.engagements === 77, JSON.stringify(li.lipostB));
check('Export: older posts skipped, and said so', new URL(pg.url()).searchParams.get('li') === '2' && new URL(pg.url()).searchParams.get('miss') === '1', pg.url());
const lb = await pg.locator('main').innerText();
check('Leaderboard shows LinkedIn impressions', lb.includes('1,234') && lb.includes('2,150'));
await b2.close();
write('content/index.json', (read('content/index.json') ?? []).filter((x) => !x.id.startsWith('lipost')));
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
