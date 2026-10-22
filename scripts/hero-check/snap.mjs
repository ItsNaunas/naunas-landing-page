// Hero render check (2026-10-22). Captures every element in #hero (computed styles + positions) at 9 screen sizes, normal and
// reduced-motion, so a CSS refactor can be proved identical: snapshot the live site and a local build, then diff.
//   NODE_PATH=<a node_modules with playwright-core> node scripts/hero-check/snap.mjs https://www.naunas.co.uk/ /tmp/base
//   NODE_PATH=... node scripts/hero-check/snap.mjs http://localhost:3000/ /tmp/new && node scripts/hero-check/diff.mjs /tmp/base /tmp/new
// Chrome path and the font gate (Clash Display / Satoshi) are hard-coded below.
// Snapshot every element in #hero: computed styles (+ ::before/::after), bounding rects, at many viewports,
// in normal and reduced-motion modes, plus hover states. Usage: node hero-snap.mjs <url> <outDir>
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [URL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const VIEWPORTS = [[390, 664], [360, 740], [430, 932], [768, 1024], [1024, 768], [1366, 640], [1440, 700], [1440, 900], [1920, 1080]];
const PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'row-gap', 'column-gap', 'grid-template-columns', 'grid-row-start', 'grid-column-start', 'order', 'align-items', 'align-self', 'justify-self', 'justify-content',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing', 'white-space', 'text-align', 'text-transform', 'color', 'background-color',
  'background-image', 'background-size', 'border-top-width', 'border-top-color', 'border-top-style', 'border-radius', 'box-shadow', 'opacity', 'z-index', 'overflow-x', 'overflow-y', 'mask-image', '-webkit-mask-image', 'aspect-ratio',
  'transition-property', 'transition-duration', 'animation-name', 'animation-duration', 'isolation', 'cursor', 'outline-style', 'filter', 'transform-origin', 'pointer-events', 'visibility', 'stroke', 'stroke-width', 'fill', 'stroke-linecap', 'box-sizing', 'vertical-align', 'place-items', 'inset'];
const PSEUDO = ['content', 'display', 'position', 'opacity', 'transform', 'background-color', 'background', 'border-top-width', 'border-top-color', 'border-radius', 'top', 'left', 'right', 'bottom', 'width', 'height', 'z-index', 'filter', 'transition-property'];
const ANIMATED = /dotPosition|personality|\.dot$|eyes|pulse|contactShadow/;

async function dump(page) {
  return page.evaluate(({ PROPS, PSEUDO }) => {
    const norm = (c) => c.replace(/^[A-Za-z]+_([A-Za-z0-9]+)__[A-Za-z0-9_-]+$/, '$1');
    const keyOf = (el) => {
      const parts = [];
      for (let e = el; e && e.id !== 'hero'; e = e.parentElement) {
        const cls = [...e.classList].map(norm).filter((c) => !/^(hidden|group)$/.test(c)).join('.');
        const idx = [...e.parentElement.children].filter((s) => s.tagName === e.tagName).indexOf(e);
        parts.unshift(`${e.tagName.toLowerCase()}${cls ? '.' + cls : ''}[${idx}]`);
      }
      return parts.join('>');
    };
    const out = {};
    for (const el of document.querySelectorAll('#hero, #hero *')) {
      const cs = getComputedStyle(el);
      const o = {};
      for (const p of PROPS) o[p] = cs.getPropertyValue(p);
      o.transform = cs.transform;
      const r = el.getBoundingClientRect();
      o.rect = [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 2) / 2);
      for (const ps of ['::before', '::after']) {
        const pc = getComputedStyle(el, ps);
        if (pc.content && pc.content !== 'none' && pc.content !== 'normal') { const q = {}; for (const p of PSEUDO) q[p] = pc.getPropertyValue(p) || pc[p]; o[ps] = q; }
      }
      out[el.id === 'hero' ? 'hero' : keyOf(el)] = o;
    }
    return out;
  }, { PROPS, PSEUDO });
}

const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const reduced of [false, true]) {
  for (const [w, h] of VIEWPORTS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: w < 768, isMobile: w < 768 });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    // The display webfont (fontshare) must be in before measuring, or the wider fallback poisons every width.
    await page.waitForFunction(() => document.fonts.check('600 20px "Clash Display"') && document.fonts.check('400 16px Satoshi'), null, { timeout: 30000 }).catch(() => console.log(' [fonts not loaded] '));
    await page.waitForTimeout(reduced ? 1500 : 6000);
    const base = await dump(page);
    const snaps = { base };
    if (!reduced && w >= 768) {
      // Hover states (mouse only): proof row, first journey card, the audit button, the secondary link.
      for (const [name, sel] of [['hoverProof', '#hero a[href="#testimonials"]'], ['hoverCard', '#hero [aria-label="Interactive client journey"] button[aria-pressed]'], ['hoverCta', '#hero [data-cta="audit"]'], ['hoverSecondary', '#hero a[href="#see-the-system"]']]) {
        await page.locator(sel).first().hover({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
        snaps[name] = await dump(page);
        await page.mouse.move(5, 5); await page.waitForTimeout(500);
      }
    }
    fs.writeFileSync(path.join(OUT, `${w}x${h}${reduced ? '-reduced' : ''}.json`), JSON.stringify(snaps));
    await ctx.close();
    process.stdout.write(`${w}x${h}${reduced ? 'r' : ''} `);
  }
}
console.log('\ndone');
await b.close();
