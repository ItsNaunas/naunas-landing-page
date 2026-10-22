// Fake OpenAI chat completions: if no tool result yet, call find_firm("Firm rp"); then answer from the tool result.
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
      answer: `**Do this first:**\n- Answer [${firm.firm}](${firm.href}): replied, step ${firm.step}\n- Top flag: ${flagLine.slice(2, 80)}\n\nThat's it.`,
      actions: [{ label: 'Open firm', href: firm.href }, { label: 'Evil', href: 'https://evil.example/x' }],
    }) });
  });
}).listen(4011, () => console.log('mock openai on 4011'));
