// Fake HubSpot for local tests: records every call to calls.json and answers like a small portal.
//   contact search for known@known.example → contact ck, whose deal 77 is Won
//   deals batch read: ids containing "won" → Won, "lost" → Lost (reason Budget), else Contacted
import http from 'node:http';
import fs from 'node:fs';
const LOG = process.argv[2];
fs.writeFileSync(LOG, '[]');
let n = 0;
const WON = '6213348572', LOST = '6213348573';
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const b = body ? JSON.parse(body) : null;
    const calls = JSON.parse(fs.readFileSync(LOG, 'utf8'));
    calls.push({ method: req.method, url: req.url, body: b });
    fs.writeFileSync(LOG, JSON.stringify(calls, null, 1));
    const u = req.url;
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
    if (req.method === 'GET' && /\/contacts\/[^/?]+\?idProperty=email/.test(u)) return send(404, { message: 'not found' });
    if (u.endsWith('/contacts/search') && JSON.stringify(b).includes('known@known.example')) return send(200, { total: 1, results: [{ id: 'ck', properties: {} }] });
    if (/\/search$/.test(u)) return send(200, { total: 0, results: [] });
    if (/\/contacts\/ck\/associations\/deals/.test(u)) return send(200, { results: [{ toObjectId: 77 }] });
    if (/associations\/(deals|contacts)/.test(u)) return send(200, { results: [] });
    if (u.endsWith('/deals/batch/read')) {
      return send(200, { results: b.inputs.map(({ id }) => ({ id, properties: { dealstage: String(id) === '77' || /won/.test(id) ? WON : /lost/.test(id) ? LOST : '6213348568', naunas_lost_reason: /lost/.test(id) ? 'Budget' : null, closedate: '2026-10-01T00:00:00Z' } })) });
    }
    if (req.method === 'POST' && /\/objects\/(contacts|deals|companies|notes|tasks)$/.test(u)) return send(201, { id: `${u.split('/').pop()}-${++n}` });
    if (req.method === 'PUT') return send(204);
    return send(200, {});
  });
}).listen(4010, () => console.log('mock hubspot on 4010'));
