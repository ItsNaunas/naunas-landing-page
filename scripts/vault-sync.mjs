// Vault → dashboard (2026-11-06). Reads the Obsidian vault on this laptop and sends a SUMMARY to
// /api/vault/sync so Ask Naunas knows where every client and project stands. Only the hub notes are read
// (01-Clients/*/_*.md, 08-Projects/*.md, 02-Partners/*.md), and only these bits leave the laptop: status,
// value, last contact, the state line, next steps, blockers and open tasks. Never meeting notes, people,
// finance, daily notes or mentorship. Pasted keys are redacted here and again on the server.
//
//   node scripts/vault-sync.mjs            send it
//   node scripts/vault-sync.mjs --dry      print what would be sent
//
// Token: STUDIO_DROP_TOKEN from the environment, else naunas-studio/.env.local (same "laptop → site" token).
// Scheduled twice a day by Windows Task Scheduler ("Naunas vault sync", see docs/client-system/RUNBOOK.md).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const VAULT = process.env.VAULT_DIR || path.join(HOME, 'naunas-vault');
const URL = process.env.VAULT_SYNC_URL || 'https://www.naunas.co.uk/api/vault/sync';
const DRY = process.argv.includes('--dry');
// Never shown anywhere (standing rule), so it never leaves the laptop.
const EXCLUDE = new Set(['Big-Money-London']);

function token() {
  if (process.env.STUDIO_DROP_TOKEN) return process.env.STUDIO_DROP_TOKEN;
  const f = path.join(HOME, 'projects', 'personal', 'naunas-studio', '.env.local');
  const m = fs.existsSync(f) && /^STUDIO_DROP_TOKEN=(.+)$/m.exec(fs.readFileSync(f, 'utf8'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

const SECRET = /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}|\bre_[A-Za-z0-9_]{16,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bxox[abp]-[A-Za-z0-9-]{10,}|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}|\bsb_secret_[A-Za-z0-9_-]{10,}/g;

/** Obsidian markdown → plain words: [[a|b]] → b, [[a]] → a, no bold, no task tags or emoji markers. */
const plain = (s) => s
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__|`/g, '')
  .replace(/#task\b|#\w[\w/-]*/g, '').replace(/[⏫🔺🔼🔽⏬]|[📅⏳🛫✅➕]\s*\d{4}-\d{2}-\d{2}/gu, '')
  .replace(SECRET, '[redacted]').replace(/\s+/g, ' ').trim();

function frontmatter(md) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  const out = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-z_]+):\s*(.*)$/i.exec(line);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#\s.*$/, '').trim().replace(/^["']|["']$/g, '');
    out[kv[1].toLowerCase()] = v;
  }
  return out;
}

/** Sections by heading: [{ title, lines }]. */
function sections(md) {
  const out = [];
  let cur = { title: '', lines: [] };
  for (const line of md.replace(/^---[\s\S]*?\n---/, '').split(/\r?\n/)) {
    const h = /^#{2,4}\s+(.*)$/.exec(line);
    if (h) { out.push(cur); cur = { title: h[1], lines: [] }; } else cur.lines.push(line);
  }
  out.push(cur);
  return out;
}

const bullets = (lines) => lines.map((l) => /^\s*[-*]\s+(?!\[[x-]\])(?:\[ \]\s*)?(.+)$/i.exec(l)?.[1]).filter(Boolean).map(plain).filter((t) => t.length > 3);

function summarise(file, kind, name) {
  const md = fs.readFileSync(file, 'utf8');
  const fm = frontmatter(md);
  const secs = sections(md);
  const stateLine = /\*\*State:?\*\*:?\s*(.+)/.exec(md)?.[1]
    ?? secs.find((s) => /build progress|status|state/i.test(s.title))?.lines.find((l) => l.trim() && !/^\s*[*_>]/.test(l) && !/^\s*-/.test(l));
  const next = secs.filter((s) => /next steps?|open tasks|hot|overdue|to ?do|this week/i.test(s.title)).flatMap((s) => bullets(s.lines));
  const blocked = secs.filter((s) => /blocked|waiting on/i.test(s.title)).flatMap((s) => bullets(s.lines));
  const tasks = md.split(/\r?\n/).filter((l) => /^\s*- \[ \]/.test(l)).map((l) => ({
    text: plain(l.replace(/^\s*- \[ \]\s*/, '')),
    due: /📅\s*(\d{4}-\d{2}-\d{2})/u.exec(l)?.[1],
    high: /⏫|🔺/u.test(l) || undefined,
  })).filter((t) => t.text.length > 3)
    .sort((a, b) => (b.high ? 1 : 0) - (a.high ? 1 : 0) || (a.due ?? '9').localeCompare(b.due ?? '9'));
  const uniq = (xs) => [...new Set(xs)];
  return {
    name: fm.aliases?.replace(/^\[|\]$/g, '').split(',')[0]?.trim() || name.replace(/-/g, ' '),
    kind, status: fm.status, value: fm.value ? plain(fm.value) : undefined, lastContact: fm.last_contact?.slice(0, 10),
    state: stateLine ? plain(stateLine).slice(0, 700) : undefined,
    next: uniq(next.filter((n) => !tasks.some((t) => t.text === n))).slice(0, 8),
    blocked: uniq(blocked).slice(0, 6),
    tasks: tasks.slice(0, 12),
  };
}

const items = [];
const clients = path.join(VAULT, '01-Clients');
for (const dir of fs.existsSync(clients) ? fs.readdirSync(clients) : []) {
  if (EXCLUDE.has(dir) || dir.startsWith('_')) continue;
  const hub = path.join(clients, dir, `_${dir}.md`);
  if (fs.existsSync(hub)) items.push(summarise(hub, 'client', dir));
}
for (const [sub, kind] of [['08-Projects', 'project'], ['02-Partners', 'partner']]) {
  const d = path.join(VAULT, sub);
  for (const f of fs.existsSync(d) ? fs.readdirSync(d) : []) {
    if (!f.endsWith('.md') || /^\d{4}-\d{2}-\d{2}/.test(f) || EXCLUDE.has(f.replace(/\.md$/, ''))) continue;
    items.push(summarise(path.join(d, f), kind, f.replace(/\.md$/, '')));
  }
}

if (DRY) {
  console.log(JSON.stringify({ items }, null, 2));
  console.log(`\n${items.length} items, ${JSON.stringify({ items }).length} bytes (dry run, nothing sent)`);
  process.exit(0);
}
const t = token();
if (!t) { console.error('No STUDIO_DROP_TOKEN (env or naunas-studio/.env.local).'); process.exit(1); }
const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ items }) });
const out = await res.text();
console.log(`${new Date().toISOString()} vault sync → ${res.status} ${out.slice(0, 200)}`);
process.exit(res.ok ? 0 : 1);
