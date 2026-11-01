// How Naunas posts sound. Fed to the AI when it adapts a post for each channel. Replace the examples with
// ~10 real posts Naufal likes (paste them in EXAMPLES) for a closer match.

export const VOICE = `
Who: Naufal, founder of Naunas. Builds "client systems" for service businesses: enquiry capture, fast follow-up,
booking, proposals, onboarding, so more enquiries turn into signed projects with less chasing.
Audience: owners of service businesses in the US and UK (the same market as Agentryx): design studios, property,
construction and trades, agencies and B2B services, education and academies, professional services. They all lose
clients in the same places (the 8 Leak Map layers), so posts lead with the problem and use one industry as the frame.

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
