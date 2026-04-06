'use client';

const TOOLS = [
  'Airtable',
  'n8n',
  'OpenAI',
  'Stripe',
  'Slack',
  'Calendly',
  'Make',
  'Supabase',
  'Zapier',
  'Notion',
];

export function TrustBar() {
  return (
    <div
      className="py-5 border-y"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0C0C0C' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3 justify-between">
          <p className="text-[11px] font-medium uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Built on the tools you already use
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {TOOLS.map((tool) => (
              <span
                key={tool}
                className="text-sm font-medium tracking-tight"
                style={{ color: 'rgba(255,255,255,0.22)' }}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
