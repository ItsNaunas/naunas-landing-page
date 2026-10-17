// @ts-nocheck: run with tsx, outside the app build.
// One-off smoke test for the Adapt prompt: `npx tsx --env-file=<file with OPENAI_API_KEY> scripts/adapt-smoke.mts`
import { adapt, strayNumbers } from '../src/lib/adapt.ts';

const idea = `Most interior design studios don't lose clients on price. They lose them between the first call and the deposit.
Three places it leaks: the enquiry that waits until Monday, the proposal nobody follows up, and the deposit link that's buried in a PDF.
Fix: reply the same day, chase the proposal on day 2 and day 5, and put the deposit button in the email.`;

const t0 = Date.now();
const out = await adapt({ idea, keyword: 'LEAK', offer: 'Leak Map' });
console.log(`took ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(JSON.stringify(out, null, 2));
for (const [k, v] of [['linkedin', out.linkedin.text], ['instagram', out.instagram.caption], ['tiktok', out.tiktok.caption]] as const) {
  console.log(k, 'chars', v.length, 'stray numbers', strayNumbers(v, idea));
}
