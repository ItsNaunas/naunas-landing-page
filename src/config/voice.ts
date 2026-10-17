// How Naunas posts sound. Fed to the AI when it adapts a post for each channel. Replace the examples with
// ~10 real posts Naufal likes (paste them in EXAMPLES) for a closer match.

export const VOICE = `
Who: Naufal, founder of Naunas. Builds "client systems" for service businesses: enquiry capture, fast follow-up,
booking, proposals, onboarding, so more enquiries turn into signed projects with less chasing.
Audience (ICP): owners of US high-ticket project businesses. Interior design studios first, then architects,
design-build, custom home builders, landscape design, kitchen/bath remodelers.

Voice:
- Direct, plain words, short sentences. Talks like a builder who has seen the inside of these businesses.
- Specific over clever: name the moment the client is lost, using the details given in the source.
- No hype, no "game-changer", no "unlock", no "in today's fast-paced world". No emoji walls (one at most).
- Never invent numbers, results, client names or case studies. Only use figures that are in the source.
- One idea per post. End with one clear call to action.
`.trim();

// Style only: the model is told these show tone and rhythm, and never to reuse their facts or numbers.
export const EXAMPLES = [
  'I cancelled HubSpot, Airtable AND Zoho last month. On purpose.',
  'Your follow-up is you remembering.',
  'There’s revenue sitting in your CRM you forgot about.',
  'Your enquiry form is a black hole.',
];
