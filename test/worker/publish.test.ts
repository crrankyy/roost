import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Manifest, RecentIndex } from '../../src/model';
import { browser, call, service, setupAccess } from './helpers';

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

/** Full begin → put → commit, the way the CLI does it. */
async function publish(project: string, id: string, html: string, extra: Record<string, unknown> = {}, files: Record<string, string> = {}) {
  const all = { 'index.html': html, ...files };
  const decl = await Promise.all(Object.entries(all).map(async ([path, s]) => ({ path, size: new TextEncoder().encode(s).length, sha256: await sha(s) })));
  const b = await api('/api/publish', 'POST', { project, id, kind: 'research', title: `T ${id}`, summary: 's', files: decl, classification: { why: 'test', confirmed: true }, ...extra });
  if (b.status !== 201) return b;
  for (const [path, s] of Object.entries(all)) {
    const r = await call(`${b.body.put_base}${path}`, { jwt: svc, method: 'PUT', body: s, headers: { 'content-type': path.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain' } });
    expect(r.status, await r.clone().text()).toBe(200);
  }
  return api(`${b.body.put_base}commit`, 'POST', {});
}

const manifest = async (p: string) => (await (await R2.get(`p/${p}/manifest.json`))!.json()) as Manifest;
const index = async () => (await (await R2.get('index/recent.json'))!.json()) as RecentIndex;

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  await addProjects('alpha', 'beta');
});

describe('publish', () => {
  it('publishes v1, then v2; both serve and v1 keeps its bytes', async () => {
    const one = await publish('alpha', '2026-10-29-first', '<html><body>one</body></html>');
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ version: 1, state: 'live', url: '/p/alpha/r/2026-10-29-first/', index_stale: false });
    const two = await publish('alpha', '2026-10-29-first', '<html><body>two</body></html>', { change_note: 'second' });
    expect(two.body.version).toBe(2);
    const jwt = await browser();
    expect(await (await call('/p/alpha/r/2026-10-29-first/', { jwt })).text()).toContain('two');
    expect(await (await call('/p/alpha/r/2026-10-29-first/v1/', { jwt })).text()).toContain('one');
    const rj = await (await R2.get('p/alpha/r/2026-10-29-first/v2/report.json'))!.json<any>();
    expect(rj).toMatchObject({ id: '2026-10-29-first', version: 2, project: 'alpha', change_note: 'second' });
    expect((await index()).reports.find((r) => r.id === '2026-10-29-first')).toMatchObject({ version: 2, versions: 2 });
  });

  it('concurrent publishes to one project all land with distinct versions', async () => {
    const same = Array.from({ length: 4 }, (_, i) => publish('beta', '2026-10-29-race', `<html>race ${i}</html>`));
    const other = Array.from({ length: 3 }, (_, i) => publish('beta', `2026-10-29-other-${i}`, `<html>o ${i}</html>`));
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
    const r = await publish('alpha', '2026-10-29-leak', '<html>AKIA…</html>', { unattended: true, findings });
    expect(r.body).toMatchObject({ state: 'quarantined', triage: true });
    expect((await call('/p/alpha/r/2026-10-29-leak/v1/', { jwt: await browser() })).status).toBe(404);
    const t = (await index()).triage.find((x) => x.id === '2026-10-29-leak')!;
    expect(t).toMatchObject({ quarantined: true, findings });
    expect((await index()).reports.some((x) => x.id === '2026-10-29-leak')).toBe(false);
  });

  it('refuses attended findings without allow_secrets, unknown kinds and streams, bad paths', async () => {
    const f = [{ path: 'index.html', size: 1, sha256: await sha('x') }];
    const base = { project: 'alpha', id: '2026-10-29-x', title: 't', files: f };
    expect((await api('/api/publish', 'POST', { ...base, kind: 'research', findings: [{ file: 'a', line: 1, kind: 'k', masked: 'm' }] })).body.error.code).toBe('secrets_unacknowledged');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'gossip' })).body.error.code).toBe('unknown_kind');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'research', stream: 'nope' })).body.error.code).toBe('unknown_stream');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'research', files: [{ ...f[0], path: '../x' }] })).body.error.code).toBe('bad_path');
    expect((await api('/api/publish', 'POST', { ...base, kind: 'research', project: 'ghost' })).status).toBe(404);
  });

  it('rejects a file whose bytes do not match the declared sha256, and commit with missing files', async () => {
    const b = await api('/api/publish', 'POST', { project: 'alpha', id: '2026-10-29-sha', kind: 'research', title: 't', files: [{ path: 'index.html', size: 3, sha256: await sha('abc') }] });
    expect((await call(`${b.body.put_base}index.html`, { jwt: svc, method: 'PUT', body: 'xyz' })).status).toBe(422);
    expect((await api(`${b.body.put_base}commit`, 'POST', {})).body.error.code).toBe('missing_files');
    expect((await call(`${b.body.put_base}index.html`, { jwt: svc, method: 'PUT', body: 'abc' })).status).toBe(200);
    expect((await api(`${b.body.put_base}commit`, 'POST', {})).body.state).toBe('live');
    expect((await api(`${b.body.put_base}commit`, 'POST', {})).body.state).toBe('live'); // idempotent
    expect((await call(`${b.body.put_base}index.html`, { jwt: svc, method: 'PUT', body: 'abc' })).status).toBe(409);
  });

  it('new streams: created when attended, only proposed when unattended', async () => {
    const a = await publish('alpha', '2026-10-29-s1', '<html>s</html>', { new_stream: { id: 'auth', title: 'Auth', description: 'auth work' } });
    expect(a.status).toBe(200);
    expect((await manifest('alpha')).reports.find((r) => r.id === '2026-10-29-s1')!.stream).toBe('auth');
    const u = await publish('alpha', '2026-10-29-s2', '<html>s</html>', { unattended: true, new_stream: { id: 'billing', title: 'Billing' } });
    const e = (await manifest('alpha')).reports.find((r) => r.id === '2026-10-29-s2')!;
    expect(u.body.triage).toBe(true);
    expect(e.stream).toBeNull();
    expect(e.classification.proposed_stream).toEqual({ id: 'billing', title: 'Billing' });
    expect((await manifest('alpha')).streams.map((s) => s.id)).toEqual(['auth']);
    expect((await index()).streams.map((s) => s.id)).toContain('auth');
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
    await publish('beta', '2026-10-29-in-one', '<html>1</html>', { stream: 'one' });
    expect((await api('/api/stream/beta/one', 'POST', { op: 'rename', to: 'uno' })).body.aliases).toEqual(['one']);
    const viaAlias = await publish('beta', '2026-10-29-alias', '<html>a</html>', { stream: 'one' });
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
