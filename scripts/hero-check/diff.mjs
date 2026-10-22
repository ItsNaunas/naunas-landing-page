// Compare two hero snapshot folders. Usage: node scripts/hero-check/diff.mjs <dirA> <dirB> [--all]
// Dynamic state (Dot's position, which bead is lit, the magnetic button offset, hover timing) is ignored.
import fs from 'node:fs';
import path from 'node:path';
const [A, B, flag] = process.argv.slice(2);
const ANIMATED = /dotPosition|personality|\.dot\b|eyes|pulse|contactShadow|headlineUnderline|svg\.track|actions\[0\]>div\[0\]$/;
const DYN = /^(rect|transform|left|top|right|bottom|inset|filter|opacity|height|width|margin-top|margin-left|transform-origin|::before|::after|animation-name|animation-duration|border-top-width|border-top-style|border-top-color|background-color|box-shadow|overflow-x|overflow-y|border-radius|transition-property|transition-duration|stroke|fill|stroke-width)$/;
const norm = (o) => Object.fromEntries(Object.entries(o).map(([snap, els]) => [snap, Object.fromEntries(Object.entries(els).map(([k, v]) => [
  k.replace(/[A-Za-z]+-module__[A-Za-z0-9_-]+?__([A-Za-z0-9]+)(?=[.\[>]|$)/g, '$1').replace(/\.lit(?=\[)/g, ''), v]))]));
let total = 0;
const perSnap = {};
const seen = new Set();
for (const file of fs.readdirSync(A).filter((f) => f.endsWith('.json')).sort()) {
  const a = norm(JSON.parse(fs.readFileSync(path.join(A, file), 'utf8')));
  const bPath = path.join(B, file);
  if (!fs.existsSync(bPath)) { console.log(`MISSING ${file} in B`); total++; continue; }
  const b = norm(JSON.parse(fs.readFileSync(bPath, 'utf8')));
  for (const snap of Object.keys(a)) {
    if (flag !== '--all' && snap !== 'base') continue; // hover captures are timing-dependent; static captures must match exactly
    const sa = a[snap], sb = b[snap] ?? {};
    for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
      if (!sa[k] || !sb[k]) { console.log(`${file} ${snap}: element only in ${sa[k] ? 'A' : 'B'}: ${k}`); total++; perSnap[snap] = (perSnap[snap] ?? 0) + 1; continue; }
      const animated = ANIMATED.test(k);
      for (const p of new Set([...Object.keys(sa[k]), ...Object.keys(sb[k])])) {
        if (animated && DYN.test(p)) continue;
        const va = JSON.stringify(sa[k][p]), vb = JSON.stringify(sb[k][p]);
        if (va === vb) continue;
        if (p === 'rect') { const ra = sa[k][p], rb = sb[k][p]; if (ra.every((v, i) => Math.abs(v - rb[i]) <= 1)) continue; }
        total++; perSnap[snap] = (perSnap[snap] ?? 0) + 1;
        const sig = `${k}|${p}|${va}|${vb}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        console.log(`${file} ${snap}\n  ${k}\n  ${p}: ${va} -> ${vb}`);
      }
    }
  }
}
console.log(JSON.stringify(perSnap));
console.log(`\n${total} difference${total === 1 ? '' : 's'}`);
