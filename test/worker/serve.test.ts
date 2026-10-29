import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Manifest, ReportEntry } from '../../src/model';
import { browser, call, service, setupAccess, token } from './helpers';

const R2 = (env as any).REPORTS as R2Bucket;

function entry(over: Partial<ReportEntry> = {}): ReportEntry {
  return {
    id: '2026-10-29-demo', title: 'Demo', summary: '', kind: 'research', stream: null, tags: [], status: 'final', typed: {},
    archived: null, supersedes: null, superseded_by: null, created: '2026-10-29T00:00:00Z', latest: 2,
    classification: { by: 'claude', confirmed: true, triage: false, why: 'test' },
    versions: [1, 2, 3].map((n) => ({
      n, state: n === 3 ? 'quarantined' : 'live', upload: `u${n}`, files: [], published: '2026-10-29T00:00:00Z',
      change_note: '', findings: [], allow_secrets: false, source: { unattended: false },
    })),
    ...over,
  } as ReportEntry;
}

beforeAll(async () => {
  await setupAccess();
  const m: Manifest = { project: 'demo', updated: '', streams: [], reports: [entry()] };
  await R2.put('p/demo/manifest.json', JSON.stringify(m));
  for (const n of [1, 2, 3]) {
    await R2.put(`p/demo/r/2026-10-29-demo/v${n}/index.html`, `<html><body>version ${n}</body></html>`, { httpMetadata: { contentType: 'text/html; charset=utf-8' } });
  }
  await R2.put('p/demo/r/2026-10-29-demo/v1/assets/a.png', 'png');
  await R2.put('ds/lynx-reports/v1/tokens.css', ':root{}', { httpMetadata: { contentType: 'text/css; charset=utf-8' } });
});

describe('Access', () => {
  const paths = ['/', '/_ds/lynx-reports/v1/tokens.css', '/api/whoami', '/api/publish', '/p/demo/r/2026-10-29-demo/'];
  it.each(paths)('403 without a token: %s', async (p) => {
    expect((await call(p)).status).toBe(403);
  });
  it('403 on a bad signature, wrong aud, wrong issuer, expired, unknown kid', async () => {
    const good = await browser();
    const bad = [
      good.slice(0, -4) + 'AAAA',
      await token({ email: 'a@b.c', aud: ['other'] }),
      await token({ email: 'a@b.c', iss: 'https://evil.cloudflareaccess.com' }),
      await token({ email: 'a@b.c', exp: Math.floor(Date.now() / 1000) - 3600 }),
      await token({ email: 'a@b.c' }, 'nope'),
      'not.a.jwt',
    ];
    for (const jwt of bad) expect((await call('/api/whoami', { jwt })).status).toBe(403);
  });
  it('identifies browser and service tokens', async () => {
    expect(await (await call('/api/whoami', { jwt: await browser() })).json()).toEqual({ identity: 'browser', email: 'owner@example.com' });
    expect(await (await call('/api/whoami', { jwt: await service() })).json()).toEqual({ identity: 'service', common_name: 'svc.access' });
  });
  it('a service token without a matching common_name is refused', async () => {
    expect((await call('/api/whoami', { jwt: await token({ common_name: 'someone-else' }) })).status).toBe(403);
  });
  it('DEV_IDENTITY works only on localhost', async () => {
    const { default: worker } = await import('../../src/index');
    const { testEnv } = await import('./helpers');
    const e = { ...testEnv(), DEV_IDENTITY: '1' };
    const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
    expect((await worker.fetch(new Request('https://roost.crrankyy.workers.dev/api/whoami'), e, ctx)).status).toBe(403);
    expect((await worker.fetch(new Request('http://localhost:8787/api/whoami'), e, ctx)).status).toBe(200);
  });
  it('the service identity cannot open viewer pages', async () => {
    expect((await call('/p/demo/r/2026-10-29-demo/', { jwt: await service() })).status).toBe(403);
  });
});

describe('serving', () => {
  it('serves the latest live version, a specific version and assets', async () => {
    const jwt = await browser();
    expect(await (await call('/p/demo/r/2026-10-29-demo/', { jwt })).text()).toContain('version 2');
    const v1 = await call('/p/demo/r/2026-10-29-demo/v1/', { jwt });
    expect(await v1.text()).toContain('version 1');
    expect(v1.headers.get('cache-control')).toBe('private, no-store');
    const asset = await call('/p/demo/r/2026-10-29-demo/v1/assets/a.png', { jwt });
    expect(asset.headers.get('content-type')).toBe('image/png');
    expect(asset.headers.get('cache-control')).toContain('immutable');
  });
  it('redirects to the trailing slash', async () => {
    const jwt = await browser();
    expect((await call('/p/demo/r/2026-10-29-demo', { jwt })).headers.get('location')).toMatch(/\/2026-10-29-demo\/$/);
    expect((await call('/p/demo/r/2026-10-29-demo/v1', { jwt })).headers.get('location')).toMatch(/\/v1\/$/);
  });
  it('refuses quarantined versions, missing ones and traversal', async () => {
    const jwt = await browser();
    const q = await call('/p/demo/r/2026-10-29-demo/v3/', { jwt });
    expect(q.status).toBe(404);
    expect(await q.text()).toContain('Not available');
    expect((await call('/p/demo/r/2026-10-29-demo/v9/', { jwt })).status).toBe(404);
    expect((await call('/p/demo/r/2026-10-29-demo/v1/%2e%2e/v3/index.html', { jwt })).status).toBe(404);
  });
  it('serves design-system files immutably', async () => {
    const res = await call('/_ds/lynx-reports/v1/tokens.css', { jwt: await browser() });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, max-age=31536000, immutable');
  });
});
