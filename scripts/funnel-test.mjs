#!/usr/bin/env node
// End-to-end funnel smoke test against a live (or preview) deploy. Signs up a throwaway address through
// the real forms, checks MailerLite and HubSpot received it, then deletes it from both.
//
//   MAILERLITE_API_TOKEN=… HUBSPOT_TOKEN=… [CRON_SECRET=…] node scripts/funnel-test.mjs [baseUrl] [inbox]
//
// baseUrl defaults to https://www.naunas.co.uk. inbox is a Gmail-style address that accepts +tags
// (default its.naunas@gmail.com); the test emails (Leak Map day 0, newsletter welcome) land there.
// Nothing is sent to anyone else. Exit code 1 if any step fails.

const BASE = (process.argv[2] || 'https://www.naunas.co.uk').replace(/\/$/, '');
const INBOX = process.argv[3] || 'its.naunas@gmail.com';
const { MAILERLITE_API_TOKEN: ML, HUBSPOT_TOKEN: HS, CRON_SECRET } = process.env;
if (!ML || !HS) {
  console.error('Set MAILERLITE_API_TOKEN and HUBSPOT_TOKEN (Bitwarden) in the environment first.');
  process.exit(2);
}

const [user, domain] = INBOX.split('@');
const email = `${user}+ftest${Date.now().toString(36)}@${domain}`;
const results = [];
const step = async (name, fn) => {
  try {
    const detail = await fn();
    results.push([true, name, detail]);
    console.log(`✓ ${name}${detail ? `  (${detail})` : ''}`);
  } catch (err) {
    results.push([false, name, err.message]);
    console.log(`✗ ${name}\n    ${err.message}`);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}
const ml = (path, init = {}) =>
  json(`https://connect.mailerlite.com/api${path}`, { ...init, headers: { Authorization: `Bearer ${ML}`, 'Content-Type': 'application/json', Accept: 'application/json' } });
const hs = (path, init = {}) =>
  json(`https://api.hubapi.com${path}`, { ...init, headers: { Authorization: `Bearer ${HS}`, 'Content-Type': 'application/json' } });
const post = (path, body) => json(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

console.log(`Funnel test → ${BASE}\nTest address: ${email}\n`);

if (CRON_SECRET) {
  await step('Health check all green', async () => {
    const r = await json(`${BASE}/api/health`, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
    return r.checks.map((c) => c.name).join(', ');
  });
}

await step('Subscribe without consent is refused', async () => {
  const res = await fetch(`${BASE}/api/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, consent: false }) });
  if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
});
await step('Leak Map sign-up accepted', () => post('/api/leak-map', { name: 'Funnel Test', email, clientValue: '$5k-25k', src: 'funnel-test' }).then(() => ''));
await step('Newsletter sign-up accepted', () => post('/api/subscribe', { email, consent: true, src: 'funnel-test' }).then(() => ''));

// HubSpot runs in after(); give it a moment.
await sleep(8000);

let mlId;
await step('MailerLite: in Leak Map + Newsletter groups', async () => {
  const { data } = await ml(`/subscribers/${encodeURIComponent(email)}`);
  mlId = data.id;
  const groups = data.groups.map((g) => g.name);
  for (const g of ['Leak Map', 'Naunas Newsletter']) if (!groups.includes(g)) throw new Error(`not in "${g}" (has: ${groups.join(', ') || 'none'})`);
  return groups.join(', ');
});

let hsId;
await step('HubSpot: contact created with lead source', async () => {
  const c = await hs(`/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=naunas_lead_source,client_value`);
  hsId = c.id;
  if (!c.properties.naunas_lead_source) throw new Error('no naunas_lead_source');
  return `${c.properties.naunas_lead_source}, ${c.properties.client_value ?? 'no client value'}`;
});

// Clean up whatever was created, even if checks failed.
await step('Clean up MailerLite', async () => {
  if (mlId) await ml(`/subscribers/${mlId}`, { method: 'DELETE' });
  return mlId ? 'deleted' : 'nothing to delete';
});
await step('Clean up HubSpot', async () => {
  if (hsId) await hs(`/crm/v3/objects/contacts/${hsId}`, { method: 'DELETE' });
  return hsId ? 'archived' : 'nothing to delete';
});

const failed = results.filter(([ok]) => !ok);
console.log(`\n${failed.length ? `${failed.length} failed` : 'All passed'}. Emails to ${email} (Leak Map, newsletter welcome) prove sending; check the inbox.`);
process.exit(failed.length ? 1 : 0);
