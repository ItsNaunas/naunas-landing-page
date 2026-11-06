// Vault → dashboard (2026-11-06). Reads the Obsidian vault on this laptop and sends a SUMMARY to
// /api/vault/sync so Ask Naunas knows where every client and project stands.
//
// One home per fact:
//   - build state (what works, next steps in the code) = the repo's own PROGRESS.md, read here straight from the
//     repo's main branch (not the vault's old mirrored copy, which drifted);
//   - relationship, money, client tasks, blockers = the vault hub note;
//   - live numbers = HubSpot / Stripe / the activity log (the dashboard reads those itself).
// Drift is reported, not hidden: a missing repo folder, a PROGRESS.md with no date, or one that is several commits
// behind its repo becomes an issue on the item (dashboard: System → Notes and build logs, plus a flag).
//
// Only hub notes are read (01-Clients/*/_*.md, 08-Projects/*.md, 02-Partners/*.md), and only these bits leave the
// laptop: status, value, last contact, the note's edit date, next steps, blockers, open tasks, and the repo's
// State + open next steps. Never meeting notes, people, finance, daily notes or mentorship. Keys are redacted here
// and again on the server.
//
//   node scripts/vault-sync.mjs            send it
//   node scripts/vault-sync.mjs --dry      print what would be sent
//
// Token: STUDIO_DROP_TOKEN from the environment, else naunas-studio/.env.local (same "laptop → site" token).
// Scheduled twice a day by scripts/install-vault-sync.ps1 (see docs/client-system/RUNBOOK.md).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOME = os.homedir();
const VAULT = process.env.VAULT_DIR || path.join(HOME, 'naunas-vault');
const SYNC_URL = process.env.VAULT_SYNC_URL || 'https://www.naunas.co.uk/api/vault/sync';
const DRY = process.argv.includes('--dry');
// Never shown anywhere (standing rule), so it never leaves the laptop.
const EXCLUDE = new Set(['Big-Money-London']);
// This dashboard's own repo: the site reads its PROGRESS.md directly, so the vault note is skipped.
const SELF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// PROGRESS.md this many commits behind its repo counts as out of date.
const BEHIND = 3;

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
    out[kv[1].toLowerCase()] = kv[2].replace(/\s+#\s.*$/, '').trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Sections by heading: [{ title, level, lines }], with the parent ## title carried down to ###/#### sections. */
function sections(md) {
  const out = [];
  let parent = '';
  let cur = { title: '', parent: '', lines: [] };
  for (const line of md.replace(/^---[\s\S]*?\n---/, '').split(/\r?\n/)) {
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      out.push(cur);
      if (h[1].length === 2) parent = h[2];
      cur = { title: h[2], parent: h[1].length === 2 ? '' : parent, lines: [] };
    } else cur.lines.push(line);
  }
  out.push(cur);
  return out;
}

const bullets = (lines) => lines.map((l) => /^\s*[-*]\s+(?!\[[x-]\])(?:\[ \]\s*)?(.+)$/i.exec(l)?.[1]).filter(Boolean).map(plain).filter((t) => t.length > 3);
const uniq = (xs) => [...new Set(xs)];

// ---------------------------------------------------------------- Repos

/** A repo: pointer from frontmatter → an absolute folder ("~/x", "C:\\x", quoted, doubled slashes all work). */
function repoDir(raw) {
  if (!raw) return '';
  let p = raw.replace(/^["']|["']$/g, '').trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  if (p.startsWith('~')) p = path.join(HOME, p.slice(1));
  return path.resolve(p);
}

const git = (dir, ...args) => { try { return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

/** The repo's main branch (origin/HEAD), so a checked-out feature branch doesn't hide the real state. */
function mainRef(dir) {
  const remote = git(dir, 'symbolic-ref', '-q', '--short', 'refs/remotes/origin/HEAD'); // "origin/main"
  const local = remote.replace(/^origin\//, '');
  for (const r of [local, remote, 'main', 'master']) if (r && git(dir, 'rev-parse', '--verify', '-q', r)) return r;
  return '';
}

/** "Last updated" / "Updated" date, else the newest date in a heading (older PROGRESS files date their sections). */
function progressDate(md) {
  const explicit = /(?:last\s+updated|updated)[^\n]{0,12}?(20\d\d-\d\d-\d\d)/i.exec(md)?.[1];
  if (explicit) return { date: explicit, dated: true };
  const head = md.split(/\r?\n/).filter((l) => /^#{1,4}\s/.test(l)).join(' ').match(/20\d\d-\d\d-\d\d/g) ?? [];
  return { date: head.sort().pop(), dated: false };
}

function readRepo(raw) {
  const dir = repoDir(raw);
  const short = dir.replace(HOME, '~').replace(/\\/g, '/');
  if (!dir || !fs.existsSync(dir)) return { issues: [`Repo folder missing on the laptop (${raw})`] };
  const isGit = fs.existsSync(path.join(dir, '.git'));
  const ref = isGit ? mainRef(dir) : '';
  const md = (ref && git(dir, 'show', `${ref}:PROGRESS.md`)) || (fs.existsSync(path.join(dir, 'PROGRESS.md')) ? fs.readFileSync(path.join(dir, 'PROGRESS.md'), 'utf8') : '');
  const issues = [];
  const lastCommit = ref ? git(dir, 'log', '-1', '--format=%cs', ref) : undefined;
  if (!md) return { path: short, lastCommit, issues: ['No PROGRESS.md in the repo'] };
  const { date, dated } = progressDate(md);
  if (!dated) issues.push('PROGRESS.md has no "Last updated" date');
  let behind;
  if (ref && date) {
    const next = new Date(Date.parse(date) + 86_400_000).toISOString().slice(0, 10);
    behind = Number(git(dir, 'rev-list', '--count', `--since=${next}`, ref)) || 0;
    if (behind >= BEHIND) issues.push(`PROGRESS.md is ${behind} commits behind (updated ${date}, last commit ${lastCommit})`);
  }
  const secs = sections(md);
  const stateLine = /^\*\*(?:State|Current state|Current assessment)[^*]*\*\*:?\s*(.+)$/im.exec(md)?.[1]
    ?? /^\*\*State:\s*(.+?)\*\*/m.exec(md)?.[1]
    ?? secs.find((s) => /state|status/i.test(s.title))?.lines.find((l) => l.trim() && !/^\s*[*_>|]/.test(l));
  const next = secs.filter((s) => /next steps?/i.test(s.title)).flatMap((s) => s.lines)
    .filter((l) => /^\s*- \[ \]/.test(l)).map((l) => plain(l.replace(/^\s*- \[ \]\s*/, '')).slice(0, 300));
  return {
    path: short, branch: ref || undefined, updated: date, lastCommit, behind,
    state: stateLine ? plain(stateLine).slice(0, 700) : undefined,
    next: next.slice(0, 6), issues,
  };
}

// ---------------------------------------------------------------- Notes

function summarise(file, kind, name) {
  const md = fs.readFileSync(file, 'utf8');
  const fm = frontmatter(md);
  const repo = fm.repo ? readRepo(fm.repo) : undefined;
  // The note's own "## Build progress" is the old mirrored copy of PROGRESS.md: ignored when the repo is readable.
  const secs = sections(md).filter((s) => !(repo?.updated && /build progress/i.test(`${s.title} ${s.parent}`)));
  const ownState = secs.find((s) => /^(status|state)$/i.test(s.title))?.lines.find((l) => l.trim() && !/^\s*[*_>]/.test(l));
  const next = secs.filter((s) => /next steps?|open tasks|hot|overdue|to ?do|this week/i.test(s.title)).flatMap((s) => bullets(s.lines));
  const blocked = secs.filter((s) => /blocked|waiting on/i.test(s.title)).flatMap((s) => bullets(s.lines));
  const tasks = md.split(/\r?\n/).filter((l) => /^\s*- \[ \]/.test(l)).map((l) => ({
    text: plain(l.replace(/^\s*- \[ \]\s*/, '')),
    due: /📅\s*(\d{4}-\d{2}-\d{2})/u.exec(l)?.[1],
    high: /⏫|🔺/u.test(l) || undefined,
  })).filter((t) => t.text.length > 3)
    .filter((t) => !(repo?.next ?? []).includes(t.text))
    .sort((a, b) => (b.high ? 1 : 0) - (a.high ? 1 : 0) || (a.due ?? '9').localeCompare(b.due ?? '9'));
  const { issues = [], ...build } = repo ?? {};
  return {
    name: fm.aliases?.replace(/^\[|\]$/g, '').split(',')[0]?.trim() || name.replace(/-/g, ' '),
    kind, status: fm.status, value: fm.value ? plain(fm.value) : undefined, lastContact: fm.last_contact?.slice(0, 10),
    noteEdited: new Date(fs.statSync(file).mtimeMs).toISOString().slice(0, 10),
    state: ownState ? plain(ownState).slice(0, 700) : undefined,
    next: uniq(next.filter((n) => !tasks.some((t) => t.text === n))).slice(0, 8),
    blocked: uniq(blocked).slice(0, 6),
    tasks: tasks.slice(0, 12),
    repo: repo ? build : undefined,
    issues,
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
    const file = path.join(d, f);
    const r = frontmatter(fs.readFileSync(file, 'utf8')).repo;
    if (r && repoDir(r).toLowerCase() === SELF.toLowerCase()) continue;
    items.push(summarise(file, kind, f.replace(/\.md$/, '')));
  }
}

if (DRY) {
  console.log(JSON.stringify({ items }, null, 2));
  const issues = items.flatMap((i) => i.issues.map((x) => `${i.name}: ${x}`));
  console.log(`\n${items.length} items, ${JSON.stringify({ items }).length} bytes, ${issues.length} issues (dry run, nothing sent)\n${issues.join('\n')}`);
  process.exit(0);
}
const t = token();
if (!t) { console.error('No STUDIO_DROP_TOKEN (env or naunas-studio/.env.local).'); process.exit(1); }
const res = await fetch(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ items }) });
const out = await res.text();
console.log(`${new Date().toISOString()} vault sync → ${res.status} ${out.slice(0, 200)}`);
process.exit(res.ok ? 0 : 1);
