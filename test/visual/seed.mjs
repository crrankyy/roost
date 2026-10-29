#!/usr/bin/env node
// Seeds a local `wrangler dev` (DEV_IDENTITY=1 in .dev.vars) with the artboards' sample data, backdated so
// "2h ago", "Yesterday" and friends match the screens. Usage: node test/visual/seed.mjs [http://localhost:8787]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:8787';
const H = { 'x-dev-identity': 'service' };
const sample = readFileSync('test/fixtures/sample-report.html', 'utf8');
const sha = (b) => createHash('sha256').update(b).digest('hex');

async function api(path, method = 'GET', body, headers = {}) {
  const res = await fetch(BASE + path, { method, body: body === undefined ? undefined : typeof body === 'string' || body instanceof Buffer ? body : JSON.stringify(body), headers: { ...H, 'content-type': 'application/json', ...headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text}`);
  return { data: text ? JSON.parse(text) : {}, etag: res.headers.get('etag') };
}

// Design-system files, so pages render locally.
const DS = 'docs/design-system';
const walk = (d) => readdirSync(d).flatMap((n) => (n.startsWith('.') ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const types = { css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', html: 'text/html; charset=utf-8', json: 'application/json' };
await Promise.all(walk(DS).filter((f) => /\.(css|js|json)$/.test(f)).map((f) =>
  fetch(`${BASE}/api/ds/lynx-reports/v1/${relative(DS, f).split(sep).join('/')}`, { method: 'PUT', body: readFileSync(f), headers: { ...H, 'content-type': types[f.split('.').pop()] } })));

const projects = [
  ['payments-api', 'Payments API', ['auth-migration', 'refunds-v2', 'settlement-recon'], ['card-vault', 'pci-scope']],
  ['report-hub', 'Report Hub', ['worker', 'design-system'], []],
  ['lynx', 'Lynx', ['voice', 'memory'], ['onboarding']],
];
const reg = await api('/api/registry');
const known = new Set(reg.data.projects.map((p) => p.id));
const add = projects.filter(([id]) => !known.has(id)).map(([id, title]) => ({ id, title, description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' }));
if (add.length) await api('/api/registry', 'PUT', { projects: [...reg.data.projects, ...add] }, { 'if-match': reg.etag });
for (const [id, , streams, done] of projects) {
  for (const s of [...streams, ...done]) await api(`/api/stream/${id}/${s}`, 'POST', { op: 'create', title: s }).catch(() => {});
  for (const s of done) await api(`/api/stream/${id}/${s}`, 'POST', { op: 'done' });
}

const H_ = 3600_000, D = 24 * H_;
// [title, project, stream, kind, age ms, summary]
const recent = [
  ['Why refresh tokens expire early', 'payments-api', 'auth-migration', 'investigation', 2 * H_, 'They inherit the access token’s 15-minute TTL after the Redis key rename; the fix is one line in token-store.ts.'],
  ['Review: ETag retries for manifest writes', 'report-hub', 'worker', 'review', 5 * H_, 'Approve with two changes: cap retries at three and re-read the manifest before each retry.'],
  ['Voice turn latency, p95 by device', 'lynx', 'voice', 'benchmark', 8 * H_, 'p95 is 1.42 s on iPhone and 2.10 s on Pixel 7; the whole gap is voice-activity detection.'],
  ['How Lynx should remember', 'lynx', 'memory', 'research', 30 * H_, 'Don’t adopt a memory framework: keep every message, compact older turns, keep a table of facts.'],
  ['Refunds v2 rollout plan', 'payments-api', 'refunds-v2', 'plan', 2 * D, 'Ship behind a per-merchant flag in three waves; wave one is 20 low-volume merchants on 4 Nov.'],
  ['Weekly summary, 20–26 Oct', 'lynx', null, 'summary', 3 * D, 'Memory design settled, voice latency down 18%, two incidents closed.'],
  ['Settlement recon architecture', 'payments-api', 'settlement-recon', 'architecture', 4 * D, 'Match on acquirer reference, amount and date ±1 day in a nightly job; leftovers go to a review queue.'],
  ['Compaction loses planted facts', 'lynx', 'memory', 'experiment', 5 * D, 'Three rounds of summarising lost 11 of 20 planted facts; the facts table lost none.'],
  ['How report tokens fit together', 'report-hub', 'design-system', 'explainer', 6 * D, 'tokens.css, reports.css and the palettes, and what a single report may override.'],
  ['Rotating the Access service token', 'report-hub', 'worker', 'runbook', 7 * D, 'Six steps, about 10 minutes; the publish CLI keeps working on the old token for 24 hours.'],
  ['Refund webhook retries', 'payments-api', 'refunds-v2', 'analysis', 9 * D, '4.2% of refund webhooks were retried last month; 81% of retries were one merchant’s 502s.'],
  ['Auth migration cutover plan', 'payments-api', 'auth-migration', 'plan', 10 * D, 'Dual-write sessions for a week, then flip reads per region, starting with ap-south.'],
  ['Publish 403s on 14 Oct', 'report-hub', 'worker', 'incident', 13 * D, 'An Access policy change blocked the publish token for 47 minutes; six queued reports went out after the fix.'],
  ['Wake word options', 'lynx', 'voice', 'research', 13.5 * D, 'openWakeWord on device is free and good enough; Porcupine only if false triggers stay above 1 an hour.'],
  ['Payments API audit, Q3', 'payments-api', null, 'audit', 21 * D, 'Two high findings, both in webhook signature checks; nine dependencies a major version behind.'],
  ['Card vault tokenisation', 'payments-api', 'card-vault', 'architecture', 40 * D, 'Tokenise at the edge; the vault never returns a PAN to an app server.'],
  ['PCI scope reduction', 'payments-api', 'pci-scope', 'plan', 45 * D, 'Three services leave PCI scope once the vault ships.'],
  ['Onboarding flow walkthrough', 'lynx', 'onboarding', 'explainer', 50 * D, 'How a new user goes from install to first agent in four screens.'],
];
const triage = [
  ['Settlement mismatch, Oct batch', 'payments-api', 'settlement-recon', 'analysis', 40 * 60_000, {}],
  ['Nightly eval: memory recall', 'lynx', 'memory', 'benchmark', 3 * H_, {}],
  ['Dependency audit', 'report-hub', null, 'audit', 4 * H_, { findings: [{ file: 'index.html', line: 41, kind: 'aws-access-key', masked: '••••MPLE' }, { file: 'assets/env.txt', line: 3, kind: 'dotenv-secret', masked: '••••9f2c' }] }],
];

const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '');
const iso = (age) => new Date(Date.now() - age).toISOString();
const ages = new Map();

async function publish([title, project, stream, kind, age, summary], extra = {}) {
  const id = `${iso(age).slice(0, 10)}-${slug(title)}`;
  const html = sample.replace('<title>How Lynx should remember</title>', `<title>${title}</title>`);
  const files = [{ path: 'index.html', size: Buffer.byteLength(html), sha256: sha(html) }];
  const b = await api('/api/publish', 'POST', { project, id, kind, title, summary: typeof summary === 'string' ? summary : '', stream, files, classification: { why: 'git remote matched', confirmed: !extra.unattended }, ...extra });
  await fetch(`${BASE}${b.data.put_base}index.html`, { method: 'PUT', body: html, headers: { ...H, 'content-type': 'text/html; charset=utf-8' } });
  await api(`${b.data.put_base}commit`, 'POST', {});
  ages.set(`${project}/${id}`, age);
  return `${project}/${id}`;
}

for (const r of recent) await publish(r);
await publish(['How Lynx should remember', 'lynx', 'memory', 'research', 30 * H_, 'Don’t adopt a memory framework.'], { change_note: 'Added the build order and cost estimates.' });
for (const t of triage) await publish([t[0], t[1], t[2], t[3], t[4], 'Published by a scheduled run.'], { unattended: true, ...t[5] });

// Backdate: rewrite published/created/last_report through the local R2 state, then rebuild the index.
const dir = mkdtempSync(join(tmpdir(), 'roost-seed-'));
for (const [id] of projects) {
  const m = (await api(`/api/manifest/${id}`)).data;
  for (const e of m.reports) {
    const age = ages.get(`${id}/${e.id}`) ?? 0;
    e.created = iso(age + 3 * D);
    e.versions.forEach((v, i) => { v.published = iso(age + (e.versions.length - 1 - i) * D); });
  }
  for (const s of m.streams) {
    const latest = m.reports.filter((e) => e.stream === s.id).map((e) => e.versions.at(-1).published).sort().at(-1);
    s.last_report = latest ?? null;
    s.started = iso(60 * D);
  }
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(m));
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `roost/p/${id}/manifest.json`, '--file', join(dir, `${id}.json`), '--content-type', 'application/json', '--local'], { stdio: 'ignore' });
}
await api('/api/reindex', 'POST');
const pins = JSON.stringify([...ages.keys()].filter((k) => /how-lynx-should-remember|rotating-the-access/.test(k)).slice(0, 2));
execFileSync('npx', ['wrangler', 'kv', 'key', 'put', 'pins', pins, '--binding', 'STATE', '--local'], { stdio: 'ignore' });
const lastVisit = JSON.stringify({ last_visit: iso(10 * H_), opened: [] });
execFileSync('npx', ['wrangler', 'kv', 'key', 'put', 'seen', lastVisit, '--binding', 'STATE', '--local'], { stdio: 'ignore' });
const archived = [...ages.keys()].find((k) => k.endsWith('onboarding-flow-walkthrough'));
await fetch(`${BASE}/api/archive`, { method: 'POST', body: JSON.stringify({ ref: archived }), headers: { 'content-type': 'application/json', origin: BASE } });
console.log(`seeded ${ages.size} reports into ${BASE}`);
