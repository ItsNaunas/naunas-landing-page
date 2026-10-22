// Runs every end-to-end suite against a local dev server: `npm run test:e2e` (or `npm run test:e2e -- e2e13 e2e14`).
// Each group gets a fresh store folder (LOCAL_STORE_DIR) and its own server with every real key blanked, so
// nothing touches HubSpot, MailerLite, Stripe, OpenAI, Telegram or production data. Two groups use local mocks:
// HubSpot (mocks/mockhs.mjs on :4010) and OpenAI (mocks/mockoai.mjs on :4011).
// Needs Chrome (CHROME_PATH, default the Windows install path). Screenshots and logs go to tests/e2e/.out/.

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '.out');
const PORT = Number(process.env.PORT || 3000);
const BASE = `http://localhost:${PORT}`;
fs.mkdirSync(OUT, { recursive: true });

// Order matters inside a group: later suites build on the store the earlier ones leave.
const GROUPS = [
  { name: 'dashboard', suites: ['e2e', 'e2e2', 'e2e3', 'e2e4', 'e2e5', 'e2e6', 'e2e7', 'e2e8', 'e2e12', 'e2e13', 'e2e14', 'e2e15', 'e2e16'], env: {} },
  { name: 'hubspot (mock)', suites: ['e2e9', 'e2e10'], env: { HUBSPOT_TOKEN: 'mock', HUBSPOT_API_BASE: 'http://localhost:4010', CAL_WEBHOOK_SECRET: 'testsecret' }, mock: ['mockhs.mjs', 'CALLS'] },
  { name: 'openai (mock)', suites: ['e2e11'], env: { OPENAI_API_KEY: 'mock', OPENAI_API_BASE: 'http://localhost:4011' }, mock: ['mockoai.mjs', 'OAILOG'] },
];
const only = process.argv.slice(2);

// Every key the app reads, blanked, so a test can never reach a real service.
const BLANK = Object.fromEntries(['HUBSPOT_TOKEN', 'MAILERLITE_API_TOKEN', 'OPENAI_API_KEY', 'APIFY_TOKEN', 'QSTASH_TOKEN', 'QSTASH_CURRENT_SIGNING_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
  'IG_ACCESS_TOKEN', 'ZOHO_SMTP_HOST', 'ZOHO_SMTP_USER', 'ZOHO_SMTP_PASS', 'CAL_API_KEY', 'STRIPE_READ_KEY', 'STRIPE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_LINKS_KEY',
  'BLOB_READ_WRITE_TOKEN', 'DATABASE_URL', 'FATHOM_API_KEY', 'FATHOM_WEBHOOK_SECRET', 'CAL_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_SECRET', 'TIKTOK_CLIENT_KEY', 'LINKEDIN_CLIENT_ID', 'CRON_SECRET'].map((k) => [k, '']));

const freePort = (p) => { try { execSync(process.platform === 'win32' ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${p} ^| findstr LISTENING') do taskkill /F /T /PID %a` : `lsof -ti:${p} | xargs -r kill -9`, { stdio: 'ignore', shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh' }); } catch { /* nothing listening */ } };
const kill = (child) => { if (!child?.pid) return; try { process.platform === 'win32' ? execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' }) : process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUp() {
  for (let i = 0; i < 240; i++) { try { const r = await fetch(`${BASE}/dashboard/login`); if (r.status < 500) return; } catch { /* starting */ } await sleep(1000); }
  throw new Error('dev server never came up');
}
const run = (cmd, args, env, log) => new Promise((resolve) => {
  const c = spawn(cmd, args, { cwd: OUT, env });
  let text = '';
  c.stdout.on('data', (d) => { text += d; }); c.stderr.on('data', (d) => { text += d; });
  c.on('close', (code) => { fs.writeFileSync(log, text); resolve({ code, text }); });
});

const totals = [];
for (const g of GROUPS) {
  const suites = only.length ? g.suites.filter((s) => only.includes(s)) : g.suites;
  if (!suites.length) continue;
  const store = path.join(OUT, `store-${g.name.split(' ')[0]}`);
  fs.rmSync(store, { recursive: true, force: true }); fs.mkdirSync(store, { recursive: true });
  const env = { ...process.env, ...BLANK, DASHBOARD_PASSWORD: 'localtest', LOCAL_STORE_DIR: store, ...g.env };
  let mock;
  const extra = {};
  if (g.mock) {
    const log = path.join(OUT, `${g.mock[0]}.json`);
    mock = spawn(process.execPath, [path.join(HERE, 'mocks', g.mock[0]), log], { stdio: 'ignore' });
    extra[g.mock[1]] = log;
  }
  freePort(PORT);
  console.log(`\n### ${g.name}: starting the dev server`);
  const server = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: ROOT, env, shell: process.platform === 'win32', stdio: ['ignore', ...Array(2).fill(fs.openSync(path.join(OUT, `server-${g.name.split(' ')[0]}.log`), 'w'))], detached: process.platform !== 'win32' });
  try {
    await waitUp();
    await fetch(`${BASE}/dashboard/outreach`).catch(() => null); // warm the compiler before the first suite
    for (const s of suites) {
      const r = await run(process.execPath, [path.join(HERE, `${s}.mjs`)], { ...process.env, STORE: store, BASE, ...extra }, path.join(OUT, `${s}.log`));
      const passed = r.text.match(/(\d+)\/(\d+) passed/);
      const fails = r.text.split('\n').filter((l) => l.startsWith('FAIL'));
      const ok = r.code === 0 && passed && passed[1] === passed[2];
      totals.push({ s, ok, passed: passed ? `${passed[1]}/${passed[2]}` : 'crashed' });
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.padEnd(6)} ${passed ? `${passed[1]}/${passed[2]}` : 'crashed (see .out/' + s + '.log)'}`);
      for (const f of fails) console.log(`        ${f}`);
    }
  } finally {
    kill(server); kill(mock); freePort(PORT);
  }
}
const bad = totals.filter((t) => !t.ok);
console.log(`\n${totals.length - bad.length}/${totals.length} suites passed${bad.length ? `: failing ${bad.map((b) => b.s).join(', ')}` : ''}`);
process.exit(bad.length ? 1 : 0);
