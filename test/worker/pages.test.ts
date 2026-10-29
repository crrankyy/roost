import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { browser, call, service, setupAccess } from './helpers';

let svc = '', web = '';
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const j = (jwt: string, path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) =>
  call(path, { jwt, method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });

async function publish(project: string, id: string, title: string, extra: Record<string, unknown> = {}) {
  const html = `<html><head><title>${title}</title></head><body>${title}</body></html>`;
  const b = await (await j(svc, '/api/publish', 'POST', { project, id, kind: 'plan', title, summary: 'sum', files: [{ path: 'index.html', size: html.length, sha256: await sha(html) }], ...extra })).json<any>();
  await call(`${b.put_base}index.html`, { jwt: svc, method: 'PUT', body: html });
  return (await j(svc, `${b.put_base}commit`, 'POST', {})).json<any>();
}

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  web = await browser();
  const cur = await j(svc, '/api/registry');
  await j(svc, '/api/registry', 'PUT', { projects: [{ id: 'pg', title: 'Pages Project', description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' }] }, { 'if-match': cur.headers.get('etag')! });
  await publish('pg', '2026-10-29-visible', 'Visible report');
  await publish('pg', '2026-10-29-hidden', 'Hidden report');
});

describe('hub pages', () => {
  it('home lists reports, escapes content and loads islands', async () => {
    await publish('pg', '2026-10-29-xss', '<script>alert(1)</script>');
    const html = await (await call('/', { jwt: web })).text();
    expect(html).toContain('Visible report');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toMatch(/\/_roost\/islands\.js\?v=/);
    expect(html).toContain('data-palette="catppuccin"');
  });
  it('archive hides a report everywhere; the URL still works; unarchive restores it', async () => {
    const origin = { origin: 'https://roost.test' };
    expect((await j(web, '/api/archive', 'POST', { ref: 'pg/2026-10-29-hidden' })).status).toBe(403); // no Origin
    expect((await j(web, '/api/archive', 'POST', { ref: 'pg/2026-10-29-hidden' }, origin)).status).toBe(200);
    for (const p of ['/', '/p/pg/', '/kind/plan/', '/p/pg/kind/plan/']) expect(await (await call(p, { jwt: web })).text(), p).not.toContain('Hidden report');
    expect(await (await call('/?archived=1', { jwt: web })).text()).toContain('Hidden report');
    expect((await call('/p/pg/r/2026-10-29-hidden/', { jwt: web })).status).toBe(200);
    expect((await j(svc, '/api/archive', 'POST', { ref: 'pg/2026-10-29-hidden' }, origin)).status).toBe(403); // browser only
    await j(web, '/api/archive', 'POST', { ref: 'pg/2026-10-29-hidden', archived: false }, origin);
    expect(await (await call('/', { jwt: web })).text()).toContain('Hidden report');
    expect(await (await (env as any).REPORTS.get('p/pg/r/2026-10-29-hidden/v1/index.html'))?.text()).toContain('Hidden report');
  });
  it('filters by kind and project via the query string', async () => {
    expect(await (await call('/?kind=research', { jwt: web })).text()).not.toContain('Visible report');
    expect(await (await call('/?kind=plan&project=pg', { jwt: web })).text()).toContain('Visible report');
  });
  it('unknown projects, kinds and streams are 404; stream aliases redirect', async () => {
    expect((await call('/p/nope/', { jwt: web })).status).toBe(404);
    expect((await call('/kind/gossip/', { jwt: web })).status).toBe(404);
    expect((await call('/p/pg/stream/none/', { jwt: web })).status).toBe(404);
    await j(svc, '/api/stream/pg/old', 'POST', { op: 'create' });
    await j(svc, '/api/stream/pg/old', 'POST', { op: 'rename', to: 'new' });
    expect((await call('/p/pg/stream/old/', { jwt: web })).headers.get('location')).toMatch(/\/p\/pg\/stream\/new\/$/);
  });
  it('prefs validate palettes and land on <html>', async () => {
    const origin = { origin: 'https://roost.test' };
    expect((await j(web, '/api/prefs', 'POST', { palette: 'neon' }, origin)).status).toBe(422);
    expect((await j(web, '/api/prefs', 'POST', { palette: 'nord', theme: 'dark' }, origin)).status).toBe(200);
    const html = await (await call('/', { jwt: web })).text();
    expect(html).toContain('data-palette="nord"');
    expect(html).toMatch(/data-theme="dark"/);
  });
});
