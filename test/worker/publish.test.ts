import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Manifest, RecentIndex } from '../../src/model';
import { browser, call, publishPage, service, setupAccess } from './helpers';
// @ts-expect-error: a plain .mjs fixture, shared with the CLI tests
import { expected, page } from '../fixtures/filing.mjs';

const R2 = (env as any).REPORTS as R2Bucket;
let svc = '';

const sha = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

async function api(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  const res = await call(path, { jwt: svc, method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
  return { status: res.status, body: (await res.json()) as any, etag: res.headers.get('etag') };
}

async function addProjects(...ids: string[]) {
  const cur = await api('/api/registry');
  const known = new Set(cur.body.projects.map((p: any) => p.id));
  const projects = [...cur.body.projects, ...ids.filter((i) => !known.has(i)).map((id) => ({ id, title: id.toUpperCase(), description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' }))];
  const r = await api('/api/registry', 'PUT', { projects }, { 'if-match': cur.etag! });
  expect(r.status).toBe(200);
}

/** A report-builder page with `content` in its body, published and committed. */
const publish = (project: string, id: string, content: string, body: Record<string, unknown> = {}, o: Parameters<typeof publishPage>[3] = {}) =>
  publishPage(svc, project, id, { content, body, ...o });

const manifest = async (p: string) => (await (await R2.get(`p/${p}/manifest.json`))!.json()) as Manifest;
const index = async () => (await (await R2.get('index/recent.json'))!.json()) as RecentIndex;

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  await addProjects('alpha', 'beta');
});

describe('publish', () => {
  it('publishes v1, then v2; both serve and v1 keeps its bytes', async () => {
    const one = await publish('alpha', '2026-10-29-first', 'one');
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ version: 1, state: 'live', url: '/p/alpha/r/2026-10-29-first/', index_stale: false });
    const two = await publish('alpha', '2026-10-29-first', 'two', { change_note: 'second' });
    expect(two.body.version).toBe(2);
    const jwt = await browser();
    expect(await (await call('/p/alpha/r/2026-10-29-first/', { jwt })).text()).toContain('two');
    expect(await (await call('/p/alpha/r/2026-10-29-first/v1/', { jwt })).text()).toContain('one');
    const rj = await (await R2.get('p/alpha/r/2026-10-29-first/v2/report.json'))!.json<any>();
    expect(rj).toMatchObject({ id: '2026-10-29-first', version: 2, project: 'alpha', change_note: 'second' });
    expect((await index()).reports.find((r) => r.id === '2026-10-29-first')).toMatchObject({ version: 2, versions: 2 });
  });

  it('concurrent publishes to one project all land with distinct versions', async () => {
    const same = Array.from({ length: 4 }, (_, i) => publish('beta', '2026-10-29-race', `race ${i}`));
    const other = Array.from({ length: 3 }, (_, i) => publish('beta', `2026-10-29-other-${i}`, `o ${i}`));
    const results = await Promise.all([...same, ...other]);
    for (const r of results) expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(results.slice(0, 4).map((r) => r.body.version).sort()).toEqual([1, 2, 3, 4]);
    const m = await manifest('beta');
    const race = m.reports.find((r) => r.id === '2026-10-29-race')!;
    expect(race.versions.map((v) => [v.n, v.state])).toEqual([[1, 'live'], [2, 'live'], [3, 'live'], [4, 'live']]);
    expect(race.latest).toBe(4);
    expect(m.reports).toHaveLength(4);
    const idx = await index();
    expect(idx.reports.filter((r) => r.project === 'beta')).toHaveLength(4);
    expect(idx.projects.find((p) => p.id === 'beta')!.reports).toBe(4);
  });

  it('quarantines unattended publishes with findings and does not serve them', async () => {
    const findings = [{ file: 'index.html', line: 3, kind: 'aws-access-key', masked: '••••MPLE' }];
    const r = await publish('alpha', '2026-10-29-leak', 'AKIA…', { unattended: true, findings });
    expect(r.body).toMatchObject({ state: 'quarantined', triage: true });
    expect((await call('/p/alpha/r/2026-10-29-leak/v1/', { jwt: await browser() })).status).toBe(404);
    const t = (await index()).triage.find((x) => x.id === '2026-10-29-leak')!;
    expect(t).toMatchObject({ quarantined: true, findings });
    expect((await index()).reports.some((x) => x.id === '2026-10-29-leak')).toBe(false);
  });

  it('refuses attended findings without allow_secrets, unknown kinds and streams, bad paths', async () => {
    const f = [{ path: 'index.html', size: 1, sha256: await sha('x') }];
    const base = { project: 'alpha', id: '2026-10-29-x', title: 't', files: f };
    expect((await api('/api/publish', 'POST', { ...base, kind: 'audit', findings: [{ file: 'a', line: 1, kind: 'k', masked: 'm' }] })).body.error.code).toBe('secrets_unacknowledged');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'gossip' })).body.error.code).toBe('unknown_kind');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'research' })).body.error.code).toBe('unknown_kind'); // one of the old 13
    expect((await api('/api/publish', 'POST', { ...base, kind: 'audit', stream: 'nope' })).body.error.code).toBe('unknown_stream');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'audit', files: [{ ...f[0], path: '../x' }] })).body.error.code).toBe('bad_path');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'audit', project: 'ghost' })).status).toBe(404);
  });

  it('rejects a file whose bytes do not match the declared sha256, and commit with missing files', async () => {
    const abc = page({ project: 'alpha', title: 't' });
    const b = await api('/api/publish', 'POST', { project: 'alpha', id: '2026-10-29-sha', kind: 'investigation', title: 't', files: [{ path: 'index.html', size: abc.length, sha256: await sha(abc) }] });
    expect((await call(`${b.body.put_base}index.html`, { jwt: svc, method: 'PUT', body: abc.replace('Token', 'Tokem') })).status).toBe(422);
    expect((await api(`${b.body.put_base}commit`, 'POST', {})).body.error.code).toBe('missing_files');
    expect((await call(`${b.body.put_base}index.html`, { jwt: svc, method: 'PUT', body: abc })).status).toBe(200);
    expect((await api(`${b.body.put_base}commit`, 'POST', {})).body.state).toBe('live');
    expect((await api(`${b.body.put_base}commit`, 'POST', {})).body.state).toBe('live'); // idempotent
    expect((await call(`${b.body.put_base}index.html`, { jwt: svc, method: 'PUT', body: abc })).status).toBe(409);
  });

  it('new streams: created when attended, only proposed when unattended', async () => {
    const a = await publish('alpha', '2026-10-29-s1', 's', { new_stream: { id: 'auth', title: 'Auth', description: 'auth work' } });
    expect(a.status).toBe(200);
    expect((await manifest('alpha')).reports.find((r) => r.id === '2026-10-29-s1')!.stream).toBe('auth');
    const u = await publish('alpha', '2026-10-29-s2', 's', { unattended: true, new_stream: { id: 'billing', title: 'Billing' } });
    const e = (await manifest('alpha')).reports.find((r) => r.id === '2026-10-29-s2')!;
    expect(u.body.triage).toBe(true);
    expect(e.stream).toBeNull();
    expect(e.classification.proposed_stream).toEqual({ id: 'billing', title: 'Billing' });
    expect((await manifest('alpha')).streams.map((s) => s.id)).toEqual(['auth']);
    expect((await index()).streams.map((s) => s.id)).toContain('auth');
  });

  it('takes the filing from the page: title, claim and lead from it, format recorded; nothing else is accepted', async () => {
    const ok = await publish('alpha', '2026-11-17-filed', '', { title: 'Token expiry', summary: 'what the CLI said' });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    const e = (await manifest('alpha')).reports.find((r) => r.id === '2026-11-17-filed')!;
    expect(e).toMatchObject({ kind: 'investigation', title: expected.title, summary: expected.lead, claim: expected.claim, palette: 'nord', date: '2026-11-17' });
    expect(e.versions[0].format).toBe('report-builder');
    const legacy = await publish('alpha', '2026-11-17-legacy', '', {}, { html: '<html><head><title>Old</title></head><body>lynx</body></html>' });
    expect(legacy.body.error).toMatchObject({ code: 'bad_filing', message: expect.stringContaining('no report:kind') });
    const wrongKind = await publish('alpha', '2026-11-17-mis', '', { kind: 'audit' }, { page: { kind: 'benchmark' } });
    expect(wrongKind.body.error).toMatchObject({ code: 'filing_mismatch', message: expect.stringContaining('kind "benchmark"') });
    const wrongProject = await publish('alpha', '2026-11-17-mis2', '', {}, { page: { project: 'beta' } });
    expect(wrongProject.body.error.code).toBe('filing_mismatch');
    const oldKind = await publish('alpha', '2026-11-17-old', '', {}, { page: { kind: 'research' } });
    expect(oldKind.body.error).toMatchObject({ code: 'bad_filing', message: expect.stringContaining('report:kind is "research"') });
    // nothing failed lands: the version stays pending and is never served
    expect((await manifest('alpha')).reports.find((r) => r.id === '2026-11-17-mis')!.versions[0].state).toBe('pending');
  });

  it('refile moves a report to one of the eight kinds, and only those', async () => {
    await R2.put('p/alpha/manifest.json', JSON.stringify({ ...(await manifest('alpha')), reports: [...(await manifest('alpha')).reports, { ...(await manifest('alpha')).reports[0], id: '2026-10-01-old', kind: 'explainer' }] }));
    expect((await api('/api/refile/alpha/2026-10-01-old', 'POST', { kind: 'research' })).body.error.code).toBe('unknown_kind');
    expect((await api('/api/refile/alpha/2026-10-01-old', 'POST', { kind: 'architecture' })).body).toEqual({ id: '2026-10-01-old', kind: 'architecture' });
    expect((await manifest('alpha')).reports.find((r) => r.id === '2026-10-01-old')!.kind).toBe('architecture');
    expect((await api('/api/refile/alpha/2026-10-01-ghost', 'POST', { kind: 'audit' })).status).toBe(404);
    expect((await call('/api/refile/alpha/2026-10-01-old', { jwt: await browser(), method: 'POST', body: '{"kind":"audit"}' })).status).toBe(403);
  });

  it('browser identity cannot publish', async () => {
    const r = await call('/api/publish', { jwt: await browser(), method: 'POST', body: '{}' });
    expect(r.status).toBe(403);
  });
});

describe('registry and streams', () => {
  it('needs If-Match and never removes a project', async () => {
    const cur = await api('/api/registry');
    expect((await api('/api/registry', 'PUT', cur.body, { 'if-match': '"stale"' })).status).toBe(409);
    expect((await api('/api/registry', 'PUT', cur.body, { 'if-match': 'W/"stale"' })).status).toBe(409);
    expect((await api('/api/registry', 'PUT', { projects: [] }, { 'if-match': cur.etag! })).body.error.code).toBe('no_delete');
    // the edge weakens the GET's etag when it compresses it; the PUT must still accept it
    expect((await api('/api/registry', 'PUT', cur.body, { 'if-match': `W/${cur.etag}` })).status).toBe(200);
  });

  it('rename keeps the old id as an alias; merge moves reports', async () => {
    await api('/api/stream/beta/one', 'POST', { op: 'create', title: 'One' });
    await api('/api/stream/beta/two', 'POST', { op: 'create', title: 'Two' });
    await publish('beta', '2026-10-29-in-one', '1', { stream: 'one' });
    expect((await api('/api/stream/beta/one', 'POST', { op: 'rename', to: 'uno' })).body.aliases).toEqual(['one']);
    const viaAlias = await publish('beta', '2026-10-29-alias', 'a', { stream: 'one' });
    expect(viaAlias.status).toBe(200);
    expect((await manifest('beta')).reports.find((r) => r.id === '2026-10-29-alias')!.stream).toBe('uno');
    const merged = await api('/api/stream/beta/uno', 'POST', { op: 'merge', to: 'two' });
    expect(merged.body.aliases.sort()).toEqual(['one', 'uno']);
    const m = await manifest('beta');
    expect(m.reports.filter((r) => r.stream === 'two').map((r) => r.id).sort()).toEqual(['2026-10-29-alias', '2026-10-29-in-one']);
  });
});

describe('export and design system', () => {
  it('raw serves any version without chrome', async () => {
    const r = await call('/api/raw/alpha/2026-10-29-leak/v1/index.html', { jwt: svc });
    expect(await r.text()).toContain('AKIA');
  });
  it('ds files are create-if-absent and immutable', async () => {
    const put = (s: string) => call('/api/ds/lynx-reports/v1/x/test.css', { jwt: svc, method: 'PUT', body: s, headers: { 'content-type': 'text/css' } });
    expect((await put('a{}')).status).toBe(201);
    expect((await put('a{}')).status).toBe(200);
    expect((await put('b{}')).status).toBe(409);
  });
  it('reindex rebuilds the index from manifests', async () => {
    await R2.put('index/recent.json', JSON.stringify({ updated: '', reports: [], triage: [], projects: [], streams: [] }));
    const r = await api('/api/reindex', 'POST');
    expect(r.body.reports).toBeGreaterThan(5);
    expect((await index()).triage.some((t) => t.id === '2026-10-29-leak')).toBe(true);
  });
});
