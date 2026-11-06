// Fake OpenAI chat completions: if no tool result yet, call find_firm("Firm rp"); then answer from the tool result
// in the structured card shape (headline, sections, followups, sources), with one unsafe link to be dropped.
import http from 'node:http';
import fs from 'node:fs';
const LOG = process.argv[2];
fs.writeFileSync(LOG, '[]');
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const b = JSON.parse(body || '{}');
    const log = JSON.parse(fs.readFileSync(LOG, 'utf8')); log.push(b); fs.writeFileSync(LOG, JSON.stringify(log));
    const tool = b.messages.find((m) => m.role === 'tool');
    const send = (message) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message }] })); };
    if (!tool) return send({ role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'find_firm', arguments: JSON.stringify({ query: 'Firm rp' }) } }] });
    const firm = JSON.parse(tool.content);
    const sys = b.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const flagLine = sys.split('\n').find((l) => l.startsWith('- [high]')) ?? '';
    send({ role: 'assistant', content: JSON.stringify({
      headline: `Do this first: answer ${firm.firm}.`,
      sections: [
        { title: 'Today’s plan', kind: 'plan', items: [
          { text: `Reply to ${firm.firm}`, detail: `replied, step ${firm.step}`, href: firm.href, urgency: 'high' },
          { text: 'Check the top flag', detail: flagLine.slice(2, 80), href: 'https://evil.example/x', urgency: 'medium' },
        ] },
        { title: 'Worth knowing', kind: 'list', items: [{ text: 'Nothing else is on fire', detail: '', href: '', urgency: 'low' }] },
      ],
      notes: '',
      followups: ['What did they say?', 'Which deals are stale?'],
      actions: [{ label: 'Open firm', href: firm.href }, { label: 'Evil', href: 'https://evil.example/x' }],
      sources: ['Outreach', 'Dashboard flags', 'Made up source'],
    }) });
  });
}).listen(4011, () => console.log('mock openai on 4011'));
