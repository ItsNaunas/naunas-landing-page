// OpenAI (env OPENAI_API_KEY, optional OPENAI_MODEL) for the content engine's writing help. Structured JSON
// output only, so the result always fits the composer. Plain fetch, no SDK. Drafts only: Naufal edits and
// publishes; nothing here posts or sends anything.

export const aiReady = () => !!process.env.OPENAI_API_KEY;
// gpt-4.1-mini: faithful to the source and needs no org verification (gpt-5 models do). Override with OPENAI_MODEL.
const MODEL = () => process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';

export async function aiJSON<T>(system: string, user: string, name: string, schema: Record<string, unknown>, model = MODEL()): Promise<T> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
    }),
  });
  const b = await res.json() as { choices?: { message?: { content?: string; refusal?: string } }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`OpenAI → ${res.status}: ${b.error?.message ?? ''}`.trim());
  const msg = b.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`OpenAI declined: ${msg.refusal}`);
  if (!msg?.content) throw new Error('OpenAI returned nothing');
  return JSON.parse(msg.content) as T;
}

/** One web-search question (OpenAI Responses API, web_search tool), answered as JSON. A few cents a call. */
export async function aiSearchJSON<T>(question: string, name: string, schema: Record<string, unknown>): Promise<T> {
  if (!aiReady()) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), tools: [{ type: 'web_search_preview' }], input: question, text: { format: { type: 'json_schema', name, strict: true, schema } } }),
  });
  const b = await res.json() as { output?: { type: string; content?: { type: string; text?: string }[] }[]; error?: { message?: string } };
  if (!res.ok) throw new Error(`OpenAI search → ${res.status}: ${b.error?.message ?? ''}`.trim());
  const text = b.output?.filter((o) => o.type === 'message').flatMap((o) => o.content ?? []).find((c) => c.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI search returned nothing');
  return JSON.parse(text) as T;
}
