import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getIndustryContext } from '@/lib/industryData';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { name, answers } = await req.json();

  const industry: string = answers?.industry ?? 'Other';
  const industryContext = getIndustryContext(industry);

  const systemPrompt = `You are a senior systems consultant for Naunas Systems, a UK agency that installs client lifecycle infrastructure for service businesses. You deliver sharp, specific, high-value audits. Always use £ for currency. Be direct and specific — no filler, no generic advice. Every insight must feel like it was written specifically for this person.

${industryContext ? `INDUSTRY DATA FOR ${industry.toUpperCase()} (use these facts — do not invent benchmarks):\n${industryContext}` : `Use your knowledge of service businesses to provide relevant, specific benchmarks for their industry.`}`;

  const userPrompt = `Generate a comprehensive lifecycle audit for ${name || 'this business owner'}.

Their details:
- Industry: ${industry}
- Monthly leads: ${answers?.leads ?? 'Unknown'}
- Close rate: ${answers?.closeRate ?? 'Unknown'}
- Average deal value: ${answers?.dealValue ?? 'Unknown'}
- Biggest pain: ${answers?.biggestPain ?? 'Unknown'}
- Current tools: ${answers?.tools ?? 'Not specified'}

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

{
  "score": <number 0-100 based on their answers>,
  "scoreLabel": <"Critical" | "Needs Work" | "Getting There" | "Strong">,
  "monthlyLeakLow": <conservative monthly revenue leak estimate in £, as integer>,
  "monthlyLeakHigh": <optimistic monthly revenue leak estimate in £, as integer>,
  "phases": [
    { "name": "Lead Capture", "status": <"red" | "amber" | "green">, "note": <one short sentence> },
    { "name": "Follow-up", "status": <"red" | "amber" | "green">, "note": <one short sentence> },
    { "name": "Onboarding", "status": <"red" | "amber" | "green">, "note": <one short sentence> },
    { "name": "Delivery", "status": <"red" | "amber" | "green">, "note": <one short sentence> },
    { "name": "Retention", "status": <"red" | "amber" | "green">, "note": <one short sentence> }
  ],
  "findings": [
    {
      "title": <short finding title>,
      "body": <2-3 sentences — specific to their industry and answers, include a relevant benchmark or stat>,
      "fix": <one specific, actionable recommendation>,
      "impact": <"high" | "medium">
    },
    { ... },
    { ... }
  ],
  "stackAssessment": <2-3 sentences assessing their current tools, what is missing and why it matters>,
  "priorityActions": [
    <string — most impactful action first>,
    <string>,
    <string>
  ]
}

Score guide: 0-25 Critical, 26-50 Needs Work, 51-75 Getting There, 76-100 Strong.
Base the revenue leak on their leads, close rate, and deal value — be realistic but impactful.
All findings must reference their specific industry context and answers. Do not be generic.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to generate audit' }, { status: 500 });
  }
}
