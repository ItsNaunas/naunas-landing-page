// The shape of an Ask Naunas answer (lib/assistant), shared with the panel and the home-page plan.
// No imports: the client components use it too.

export type Urgency = 'high' | 'medium' | 'low';
export type AnswerItem = { text: string; detail: string; href: string; urgency: Urgency };
export type AnswerSection = { title: string; kind: 'plan' | 'list'; items: AnswerItem[] };
export type Answer = {
  headline: string; sections: AnswerSection[]; notes: string; followups: string[];
  actions: { label: string; href: string }[]; sources: string[];
  /** What it looked at to answer (from the tool calls), shown under the answer. */
  steps?: string[];
  /** Older answers and briefings (before 2026-11-06) were one markdown string. */
  answer?: string;
};

/** An answer as plain text: for Copy, and for the conversation history sent back to the model. */
export function answerText(a: Answer): string {
  if (a.answer && !a.sections?.length) return a.answer;
  const L = [a.headline];
  for (const s of a.sections ?? []) {
    L.push('', s.title);
    s.items.forEach((i, n) => L.push(`${s.kind === 'plan' ? `${n + 1}.` : '-'} ${i.text}${i.detail ? ` (${i.detail})` : ''}`));
  }
  if (a.notes) L.push('', a.notes);
  return L.join('\n');
}
