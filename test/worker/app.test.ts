import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { browser, call, publishPage, service, setupAccess } from './helpers';

let svc = '', web = '';
const origin = { origin: 'https://roost.test' };
const j = (jwt: string, path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) =>
  call(path, { jwt, method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  web = await browser();
  const cur = await j(svc, '/api/registry');
  await j(svc, '/api/registry', 'PUT', { projects: [{ id: 'pg', title: 'Pages Project', description: 'd', match: { remotes: ['github.com/me/pg'], paths: [], keywords: [] }, status: 'active' }] }, { 'if-match': cur.headers.get('etag')! });
  await j(svc, '/api/stream/pg/perf', 'POST', { op: 'create', title: 'Perf', description: 'Budgets' });
  await publishPage(svc, 'pg', '2026-10-29-visible', { body: { kind: 'decision', title: 'Visible report', stream: 'perf' } });
  await publishPage(svc, 'pg', '2026-10-29-hidden', { body: { kind: 'decision', title: 'Hidden report' } });
});

describe('the hub app', () => {
  it('every hub URL, old and new, serves the app page', async () => {
    for (const p of ['/', '/reports', '/pinned', '/archive', '/triage', '/triage/pg%2F2026-10-29-visible', '/p/pg/', '/p/pg/stream/perf/', '/p/pg/kind/decision/', '/kind/decision/']) {
      const r = await call(p, { jwt: web });
      expect(r.status, p).toBe(200);
      expect(r.headers.get('content-type'), p).toContain('text/html');
      expect(await r.text(), p).toContain('<div id="root"></div>');
    }
    expect((await call('/', { jwt: await service() })).status).toBe(403);
    expect((await call('/')).status).toBe(403);
  });
  it('old kind URLs move to the nearest of the eight; unknown kinds are 404', async () => {
    const loc = async (p: string) => { const r = await call(p, { jwt: web }); return [r.status, r.headers.get('location')]; };
    expect(await loc('/kind/explainer/')).toEqual([301, 'https://roost.test/kind/architecture/']);
    expect(await loc('/kind/incident/')).toEqual([301, 'https://roost.test/kind/postmortem/']);
    expect(await loc('/p/pg/kind/summary/')).toEqual([301, 'https://roost.test/p/pg/kind/status/']);
    expect(await loc('/kind/gossip/')).toEqual([404, null]);
    expect(await loc('/p/pg')).toEqual([301, 'https://roost.test/p/pg/']);
  });
  it('serves the app\'s own files and the report bar', async () => {
    const bar = await call('/_app/report-bar.js', { jwt: web });
    expect(bar.status).toBe(200);
    expect(bar.headers.get('content-type')).toContain('javascript');
    expect((await call('/_app/report-bar.css', { jwt: web })).status).toBe(200);
  });
  it('hub data: projects with streams, reports with their filing, archive and prefs', async () => {
    await j(web, '/api/archive', 'POST', { ref: 'pg/2026-10-29-hidden' }, origin);
    const hub = await (await call('/api/hub', { jwt: web })).json<any>();
    expect(hub.projects.find((p: any) => p.id === 'pg')).toMatchObject({ name: 'Pages Project', remote: 'github.com/me/pg', streams: [{ id: 'perf', about: 'Budgets' }] });
    const v = hub.reports.find((r: any) => r.id === 'pg/2026-10-29-visible');
    expect(v).toMatchObject({ slug: '2026-10-29-visible', kind: 'decision', project: 'pg', stream: 'perf', state: 'published', palette: 'nord', archived: false, versions: [{ n: 1, file: '/p/pg/r/2026-10-29-visible/' }] });
    expect(hub.reports.find((r: any) => r.id === 'pg/2026-10-29-hidden').archived).toBe(true);
    expect((await call('/p/pg/r/2026-10-29-hidden/', { jwt: web })).status).toBe(200);
    expect((await call('/api/hub', { jwt: await service() })).status).toBe(403);
  });
  it('prefs take the six palettes; one from the lynx era reads as catppuccin', async () => {
    expect((await j(web, '/api/prefs', 'POST', { palette: 'tokyo-night' }, origin)).status).toBe(422);
    expect((await j(web, '/api/prefs', 'POST', { palette: 'everforest', theme: 'light' }, origin)).status).toBe(200);
    expect((await (await call('/api/hub', { jwt: web })).json<any>()).prefs).toEqual({ theme: 'light', palette: 'everforest' });
    await (env as any).STATE.put('prefs', JSON.stringify({ theme: 'dark', palette: 'graphite' }));
    expect((await (await call('/api/hub', { jwt: web })).json<any>()).prefs).toEqual({ theme: 'dark', palette: 'catppuccin' });
  });
});

describe('fonts', () => {
  it('uploads are create-if-absent and immutable; served immutably behind Access', async () => {
    const put = (s: string) => call('/api/fonts/v1/report-type.css', { jwt: svc, method: 'PUT', body: s, headers: { 'content-type': 'text/css; charset=utf-8' } });
    expect((await put('@font-face{}')).status).toBe(201);
    expect((await put('@font-face{}')).status).toBe(200);
    expect((await put('changed')).status).toBe(409);
    const r = await call('/_fonts/v1/report-type.css', { jwt: web });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('text/css; charset=utf-8');
    expect(r.headers.get('cache-control')).toBe('private, max-age=31536000, immutable');
    expect((await call('/_fonts/v1/report-type.css')).status).toBe(403);
    expect((await call('/_fonts/v1/nope.woff2', { jwt: web })).status).toBe(404);
    expect((await call('/api/fonts/v1/x.woff2', { jwt: web, method: 'PUT', body: 'x' })).status).toBe(403);
  });
});
