import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import { browser, call, service, setupAccess } from './helpers';

let svc = '', web = '';
const origin = { origin: 'https://roost.test' };
const sha = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const j = (jwt: string, path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) =>
  call(path, { jwt, method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
const page = (n: number) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chrome test</title><link rel="stylesheet" href="/_ds/lynx-reports/v1/tokens.css"></head><body class="lr-report"><main id="content">body v${n}</main></body></html>`;

async function publish(n: number, change_note: string) {
  const html = page(n);
  const b = await (await j(svc, '/api/publish', 'POST', { project: 'ch', id: '2026-10-29-chrome', kind: 'research', title: 'Chrome test', change_note, files: [{ path: 'index.html', size: html.length, sha256: await sha(html) }] })).json<any>();
  await call(`${b.put_base}index.html`, { jwt: svc, method: 'PUT', body: html });
  await j(svc, `${b.put_base}commit`, 'POST', {});
}

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  web = await browser();
  const cur = await j(svc, '/api/registry');
  await j(svc, '/api/registry', 'PUT', { projects: [{ id: 'ch', title: 'Chrome Project', description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' }] }, { 'if-match': cur.headers.get('etag')! });
  await publish(1, 'First draft.');
  await publish(2, 'Added the cost estimates.');
});

describe('report chrome', () => {
  it('latest: pill with versions, no banner, theme on <html>, DS styles in head', async () => {
    await j(web, '/api/prefs', 'POST', { theme: 'dark', palette: 'nord' }, origin);
    const html = await (await call('/p/ch/r/2026-10-29-chrome/', { jwt: web })).text();
    expect(html).toContain('body v2');
    expect(html).toMatch(/<html lang="en" data-theme="dark" data-palette="nord" data-hub-theme="dark" class="dark">/);
    expect(html).toMatch(/<head>.*palettes\.css.*bundle\.css.*tokens\.css.*hub\.css.*chrome\.css.*<\/head>/s);
    expect(html).toContain('class="lr-report rh-report"');
    expect(html).toContain('<span>v2</span><span class="rh-v">of 2</span>');
    expect(html).toContain('Added the cost estimates.');
    expect(html).not.toContain('rh-banner');
    expect(html).toContain('Back to Chrome Project');
  });
  it('an older version shows the older-version banner', async () => {
    const html = await (await call('/p/ch/r/2026-10-29-chrome/v1/', { jwt: web })).text();
    expect(html).toContain('body v1');
    expect(html).toContain('Viewing v1 of 2');
    expect(html).toContain('Open latest version');
  });
  it('archived wins over older-version; one banner only', async () => {
    await j(web, '/api/archive', 'POST', { ref: 'ch/2026-10-29-chrome' }, origin);
    const html = await (await call('/p/ch/r/2026-10-29-chrome/v1/', { jwt: web })).text();
    expect(html).toMatch(/Archived on \d+ \w{3}/);
    expect(html).not.toContain('Viewing v1');
    expect(html.match(/class="rh-banner"/g)).toHaveLength(1);
    await j(web, '/api/archive', 'POST', { ref: 'ch/2026-10-29-chrome', archived: false }, origin);
  });
  it('opening a report clears its new dot on home', async () => {
    await (env as any).STATE.put('seen', JSON.stringify({ last_visit: '2000-01-01T00:00:00Z', opened: [] }));
    const before = await (await call('/', { jwt: web })).text();
    expect(before).toMatch(/data-on="true"[^>]*><\/span><span class="hub-row-title">Chrome test/);
    await (env as any).STATE.put('seen', JSON.stringify({ last_visit: '2000-01-01T00:00:00Z', opened: [] }));
    await call('/p/ch/r/2026-10-29-chrome/', { jwt: web });
    const after = await (await call('/', { jwt: web })).text();
    expect(after).toMatch(/data-on="false"><\/span><span class="hub-row-title">Chrome test/);
  });
  it('the pin toggle reflects KV pins', async () => {
    await j(web, '/api/pin', 'POST', { ref: 'ch/2026-10-29-chrome', pinned: true }, origin);
    expect(await (await call('/p/ch/r/2026-10-29-chrome/', { jwt: web })).text()).toContain('aria-label="Pinned. Unpin report"');
    expect(await (await call('/', { jwt: web })).text()).toContain('class="lr-panel hub-pin"');
  });
});
