// Pre-send checks for outreach copy (Instagram DM playbook, 2026-10-20). Placeholders like
// "[coaches / agencies / consultants]" once shipped in real DMs, so they BLOCK; the rest are warnings.

// Brackets/braces anywhere, ALL-CAPS merge tags (FIRST_NAME), or <name>-style tags. Case-sensitive on purpose:
// ordinary words like "project" or "company" in a real sentence must pass.
export const hasPlaceholder = (s: string) => /[[\]{}]|\b(?:FIRST_?NAME|LAST_?NAME|COMPANY(?:_NAME)?|FIRM(?:_NAME)?|PROJECT(?:_NAME)?)\b|<(?:first ?name|name|company|firm|project|city)>/.test(s);

export function lintMessage(text: string, opts: { dm?: boolean } = {}) {
  const block: string[] = [];
  const warn: string[] = [];
  if (hasPlaceholder(text)) block.push('has placeholder text');
  if (opts.dm) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words > 25) warn.push(`${words} words (aim for under 25)`);
    if (text.length > 300) warn.push('over 300 characters');
    if (/https?:\/\/|www\.|\.(?:com|co\.uk|io)\b/i.test(text)) warn.push('has a link (keep the first DM link-free)');
  }
  return { block, warn, ok: !block.length };
}
