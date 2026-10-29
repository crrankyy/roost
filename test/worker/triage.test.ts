import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { browser, call, service, setupAccess } from './helpers';

let svc = '', web = '';
const R2 = (env as any).REPORTS as R2Bucket;
const origin = { origin: 'https://roost.test' };
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const j = (jwt: string, path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) =>
  call(path, { jwt, method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
const act = (ref: string, body: unknown) => j(web, `/api/triage/${ref}`, 'POST', body, origin);
const manifest = async (p: string) => (await (await R2.get(`p/${p}/manifest.json`))!.json()) as any;
const index = async () => (await (await R2.get('index/recent.json'))!.json()) as any;

async function publish(project: string, id: string, extra: Record<string, unknown> = {}) {
  const html = `<html><head><title>${id}</title></head><body>${id} AKIAIOSFODNN7EXAMPLE</body></html>`;
  const b = await (await j(svc, '/api/publish', 'POST', { project, id, kind: 'analysis', title: id, summary: 's', files: [{ path: 'index.html', size: html.length, sha256: await sha(html) }], ...extra })).json<any>();
  await call(`${b.put_base}index.html`, { jwt: svc, method: 'PUT', body: html });
  return (await j(svc, `${b.put_base}commit`, 'POST', {})).json<any>();
}

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  web = await browser();
  const cur = await j(svc, '/api/registry');
  const p = (id: string) => ({ id, title: id.toUpperCase(), description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' });
  await j(svc, '/api/registry', 'PUT', { projects: [p('tri'), p('dest')] }, { 'if-match': cur.headers.get('etag')! });
  await j(svc, '/api/stream/dest/landing', 'POST', { op: 'create' });
});

describe('triage', () => {
  it('confirm clears the item; undo brings it back', async () => {
    expect((await publish('tri', '2026-10-29-guess', { unattended: true })).triage).toBe(true);
    expect((await index()).triage.map((t: any) => t.id)).toContain('2026-10-29-guess');
    expect((await act('tri/2026-10-29-guess', { action: 'confirm' })).status).toBe(200);
    expect((await index()).triage.map((t: any) => t.id)).not.toContain('2026-10-29-guess');
    await act('tri/2026-10-29-guess', { action: 'undo' });
    expect((await index()).triage.map((t: any) => t.id)).toContain('2026-10-29-guess');
  });

  it('quarantine: confirm is refused; preview is sandboxed; publish anyway serves it', async () => {
    const findings = [{ file: 'index.html', line: 1, kind: 'aws-access-key', masked: '••••MPLE' }];
    await publish('tri', '2026-10-29-leak', { unattended: true, findings });
    expect((await act('tri/2026-10-29-leak', { action: 'confirm' })).status).toBe(422);
    const page = await (await call('/triage?r=tri%2F2026-10-29-leak', { jwt: web })).text();
    expect(page).toContain('••••MPLE');
    expect(page).not.toContain('AKIAIOSFODNN7EXAMPLE');
    const prev = await call('/triage/preview/tri/2026-10-29-leak/v1/', { jwt: web });
    expect(prev.headers.get('content-security-policy')).toBe('sandbox');
    expect((await call('/p/tri/r/2026-10-29-leak/v1/', { jwt: web })).status).toBe(404);
    await act('tri/2026-10-29-leak', { action: 'publish' });
    expect((await call('/p/tri/r/2026-10-29-leak/', { jwt: web })).status).toBe(200);
  });

  it('reject keeps the bytes, archives the report and never serves it', async () => {
    await publish('tri', '2026-10-29-bad', { unattended: true, findings: [{ file: 'index.html', line: 1, kind: 'k', masked: '••••abcd' }] });
    await act('tri/2026-10-29-bad', { action: 'reject' });
    const e = (await manifest('tri')).reports.find((r: any) => r.id === '2026-10-29-bad');
    expect(e.versions[0].state).toBe('rejected');
    expect(e.archived).toBeTruthy();
    expect(await R2.head('p/tri/r/2026-10-29-bad/v1/index.html')).not.toBeNull();
    expect((await call('/p/tri/r/2026-10-29-bad/v1/', { jwt: web })).status).toBe(404);
    expect((await index()).triage.map((t: any) => t.id)).not.toContain('2026-10-29-bad');
  });

  it('reclassify in place, with a new stream', async () => {
    await publish('tri', '2026-10-29-re', { unattended: true, new_stream: { id: 'proposed', title: 'Proposed' } });
    expect((await manifest('tri')).streams.map((s: any) => s.id)).not.toContain('proposed');
    const r = await (await act('tri/2026-10-29-re', { action: 'reclassify', kind: 'incident', new_stream: { id: 'proposed' } })).json<any>();
    expect(r.entry).toMatchObject({ kind: 'incident', stream: 'proposed', classification: { triage: false, confirmed: true, by: 'user' } });
    expect((await manifest('tri')).streams.map((s: any) => s.id)).toContain('proposed');
  });

  it('reclassify to another project: files stay, old URL redirects, new URL serves', async () => {
    await publish('tri', '2026-10-29-mover', { unattended: true });
    const r = await act('tri/2026-10-29-mover', { action: 'reclassify', project: 'dest', stream: 'landing' });
    expect(r.status).toBe(200);
    expect((await call('/p/tri/r/2026-10-29-mover/', { jwt: web })).headers.get('location')).toMatch(/\/p\/dest\/r\/2026-10-29-mover\/$/);
    expect(await (await call('/p/dest/r/2026-10-29-mover/', { jwt: web })).text()).toContain('2026-10-29-mover');
    expect((await manifest('dest')).reports[0]).toMatchObject({ home: 'tri', stream: 'landing' });
    const again = await publish('dest', '2026-10-29-mover', {});
    expect(again.version).toBe(2);
    expect(await R2.head('p/tri/r/2026-10-29-mover/v2/index.html')).not.toBeNull();
    expect((await j(svc, '/api/raw/dest/2026-10-29-mover/v1/index.html')).status).toBe(200);
  });
});
