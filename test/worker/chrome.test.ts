import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Manifest } from '../../src/model';
import { browser, call, publishPage, service, setupAccess } from './helpers';

let svc = '', web = '';
const R2 = (env as any).REPORTS as R2Bucket;
const origin = { origin: 'https://roost.test' };
const j = (jwt: string, path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) =>
  call(path, { jwt, method, body: body === undefined ? undefined : JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers } });
const lynx = (n: number) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chrome test</title><link rel="stylesheet" href="/_ds/lynx-reports/v1/tokens.css"></head><body class="lr-report"><main id="content">body v${n}</main></body></html>`;

beforeAll(async () => {
  await setupAccess();
  svc = await service();
  web = await browser();
  const cur = await j(svc, '/api/registry');
  await j(svc, '/api/registry', 'PUT', { projects: [{ id: 'ch', title: 'Chrome Project', description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' }] }, { 'if-match': cur.headers.get('etag')! });
  // Two versions published before report-builder (as every report on the deployment was): no format, a lynx page.
  const m = (await (await R2.get('p/ch/manifest.json'))!.json()) as Manifest;
  m.reports.push({
    id: '2026-10-29-chrome', title: 'Chrome test', summary: 's', kind: 'architecture', stream: null, tags: [], status: 'final', typed: {},
    archived: null, supersedes: null, superseded_by: null, created: '2026-10-29T00:00:00Z', latest: 2,
    classification: { by: 'claude', confirmed: true, triage: false, why: '' },
    versions: [1, 2].map((n) => ({ n, state: 'live' as const, upload: `u${n}`, files: [], published: `2026-10-2${8 + n}T00:00:00Z`, change_note: n === 1 ? 'First draft.' : 'Added the cost estimates.', findings: [], allow_secrets: false, source: { unattended: false } })),
  });
  await R2.put('p/ch/manifest.json', JSON.stringify(m));
  for (const n of [1, 2]) await R2.put(`p/ch/r/2026-10-29-chrome/v${n}/index.html`, lynx(n), { httpMetadata: { contentType: 'text/html; charset=utf-8' } });
});

describe('legacy chrome (versions from before report-builder) is unchanged', () => {
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
    expect(html).not.toContain('data-host');
    expect(html).toContain('Back to Chrome Project');
  });
  it('an older version shows the older-version banner', async () => {
    const html = await (await call('/p/ch/r/2026-10-29-chrome/v1/', { jwt: web })).text();
    expect(html).toContain('body v1');
    expect(html).toContain('Viewing v1 of 2');
  });
  it('archived wins over older-version; one banner only', async () => {
    await j(web, '/api/archive', 'POST', { ref: 'ch/2026-10-29-chrome' }, origin);
    const html = await (await call('/p/ch/r/2026-10-29-chrome/v1/', { jwt: web })).text();
    expect(html).toMatch(/Archived on \d+ \w{3}/);
    expect(html.match(/class="rh-banner"/g)).toHaveLength(1);
    await j(web, '/api/archive', 'POST', { ref: 'ch/2026-10-29-chrome', archived: false }, origin);
  });
});

describe('hosted: a report-builder version under Roost\'s bar', () => {
  beforeAll(async () => {
    const r = await publishPage(svc, 'ch', '2026-10-29-chrome', { body: { kind: 'architecture', title: 'Chrome test', change_note: 'Ported to report-builder' } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
  });
  it('sets data-host and the bar\'s geometry before the report\'s scripts, mounts the bar, adds no lynx CSS', async () => {
    const html = await (await call('/p/ch/r/2026-10-29-chrome/', { jwt: web })).text();
    expect(html).toMatch(/<html lang="en" data-host="roost" data-theme="dark" class="roost-hosted" style="--sticky-top: calc\(var\(--roost-bar-h\) \+ 16px\)">/);
    expect(html).toMatch(/<link rel="stylesheet" href="\/_app\/report-bar.css"><\/head>/);
    expect(html).toMatch(/<body>\s*<div id="roost-bar" class="hub roost-report-bar"><\/div><div id="roost-note" class="hub roost-report-note"><\/div>/);
    expect(html).toContain('<script type="module" src="/_app/report-bar.js"></script></body>');
    expect(html).not.toContain('/_ds/');
    expect(html).not.toContain('rh-pill');
    const data = JSON.parse(html.match(/<script type="application\/json" id="roost-data">(.*?)<\/script>/s)![1]);
    expect(data).toMatchObject({ ref: 'ch/2026-10-29-chrome', version: 3, project: { id: 'ch', name: 'Chrome Project' }, prefs: { theme: 'dark', palette: 'nord' } });
    expect(data.report).toMatchObject({ kind: 'architecture', title: 'Chrome test', versions: [{ n: 1 }, { n: 2 }, { n: 3, note: 'Ported to report-builder' }] });
  });
  it('system theme leaves light/dark to the page; the older lynx versions keep their chrome', async () => {
    await j(web, '/api/prefs', 'POST', { theme: 'system' }, origin);
    expect(await (await call('/p/ch/r/2026-10-29-chrome/', { jwt: web })).text()).toMatch(/<html lang="en" data-host="roost" class="roost-hosted"/);
    const v1 = await (await call('/p/ch/r/2026-10-29-chrome/v1/', { jwt: web })).text();
    expect(v1).toContain('rh-pill');
    expect(v1).toContain('Viewing v1 of 3');
  });
  it('the hub data: pins, unread, legacy flag', async () => {
    await j(web, '/api/pin', 'POST', { ref: 'ch/2026-10-29-chrome', pinned: true }, origin);
    await (env as any).STATE.put('seen', JSON.stringify({ last_visit: '2000-01-01T00:00:00Z', opened: [] }));
    const hub = await (await call('/api/hub', { jwt: web })).json<any>();
    expect(hub.reports.find((r: any) => r.id === 'ch/2026-10-29-chrome')).toMatchObject({ pinned: true, unread: true, legacy: false, claim: 'Refresh tokens expire early & silently' });
    await call('/p/ch/r/2026-10-29-chrome/', { jwt: web }); // opening it marks it seen
    await (env as any).STATE.put('seen', JSON.stringify({ last_visit: '2000-01-01T00:00:00Z', opened: ['ch/2026-10-29-chrome'] }));
    expect((await (await call('/api/hub', { jwt: web })).json<any>()).reports.find((r: any) => r.id === 'ch/2026-10-29-chrome').unread).toBe(false);
  });
});
