import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  KINDS, filingProblem, globToRegex, lint, listFiles, mask, normaliseRemote, parseArgs, readFiling, resolveProject, scanSecrets, slugify,
} from '../../cli/roost.mjs';
import { expected, page } from '../fixtures/filing.mjs';

const fx = (name) => listFiles(join('test/fixtures', name));
const rules = (list) => [...new Set(list.map((x) => x.rule))].sort();

test('kinds match the Worker', () => {
  const src = readFileSync('src/model.ts', 'utf8');
  const worker = [...src.match(/KINDS = \[([\s\S]*?)\]/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(KINDS, worker);
});

test('parseArgs', () => {
  assert.deepEqual(parseArgs(['dir', '--kind', 'plan', '--dry-run', '--tags=a,b', '--json']), {
    pos: ['dir'], flags: { kind: 'plan', 'dry-run': true, tags: 'a,b', json: true },
  });
});

test('normaliseRemote', () => {
  for (const r of ['git@github.com:Me/Payments-API.git', 'https://github.com/me/payments-api', 'https://tok@github.com/me/payments-api.git/', 'ssh://git@github.com/me/payments-api.git']) {
    assert.equal(normaliseRemote(r), 'github.com/me/payments-api', r);
  }
  assert.equal(normaliseRemote('ssh://git@host:2222/x/y.git'), 'host:2222/x/y');
});

test('globToRegex', () => {
  const re = globToRegex('~/work/payments*');
  assert.ok(re.test(join(homedir(), 'work/payments-api')));
  assert.ok(re.test(join(homedir(), 'work/payments-api/src')));
  assert.ok(!re.test(join(homedir(), 'work/other')));
  assert.ok(globToRegex('/a/**/c').test('/a/b/x/c'));
});

test('resolveProject: remote beats path; monorepo splits by path; none otherwise', () => {
  const p = (id, remotes, paths, status = 'active') => ({ id, title: id, description: '', match: { remotes, paths, keywords: [] }, status });
  const reg = { projects: [p('pay', ['github.com/me/pay'], []), p('web', [], ['/src/web*']), p('mono-a', ['github.com/me/mono'], ['/m/a']), p('mono-b', ['github.com/me/mono'], ['/m/b']), p('old', ['github.com/me/old'], [], 'archived')] };
  assert.equal(resolveProject(reg, '/x', 'git@github.com:me/pay.git').match, 'remote');
  assert.equal(resolveProject(reg, '/src/web-app', '').project, 'web');
  assert.equal(resolveProject(reg, '/m/b/pkg', 'https://github.com/me/mono').project, 'mono-b');
  assert.equal(resolveProject(reg, '/x', 'github.com/me/old').match, 'none');
  assert.equal(resolveProject(reg, '/nowhere', '').project, null);
});

test('slugify', () => {
  assert.equal(slugify('Why refresh tokens expire early!'), 'why-refresh-tokens-expire-early');
  assert.equal(slugify('Rosé  Pine — v2'), 'rose-pine-v2');
  assert.ok(slugify('x'.repeat(80)).length <= 60);
});

test('filing: read from the page, the same way the Worker reads it', () => {
  assert.deepEqual(readFiling(page()), expected);
  assert.equal(readFiling(page({ stream: 'perf' })).stream, 'perf');
  assert.equal(readFiling('<html><title>x</title></html>'), null);
  assert.equal(filingProblem(readFiling(page())), '');
  assert.match(filingProblem(readFiling(page({ kind: 'research' }))), /report:kind is "research"/);
  assert.match(filingProblem(readFiling(page({ project: 'Payments API' }))), /not a project id/);
  assert.match(filingProblem(readFiling(page({ date: '17 Nov' }))), /YYYY-MM-DD/);
  assert.match(filingProblem(null), /no report:kind/);
});

test('lint: a good report has no errors or warnings', () => {
  const r = lint(fx('good'));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test('lint: blocking rules', () => {
  const r = lint(fx('bad'));
  assert.deepEqual(rules(r.errors), ['filing', 'host-slot', 'local-path', 'reserved-rh']);
  assert.equal(r.errors.filter((e) => e.rule === 'local-path').length, 4);
  assert.deepEqual(rules(r.warnings), ['external-fetch', 'no-viewport', 'raw-colour-svg']);
  assert.deepEqual(rules(lint([]).errors), ['missing-index']);
});

test('lint: an embedded font blocks the publish; the served fonts are allowed', () => {
  const files = [{ path: 'index.html', abs: 'test/fixtures/embedded-font/index.html', size: 1 }];
  assert.deepEqual(rules(lint(files).errors), ['embedded-font']);
  assert.deepEqual(lint(fx('good')).errors, [], '/_fonts/v1/ links pass');
});

test('lint: size limits', () => {
  const files = [{ path: 'index.html', abs: 'test/fixtures/good/index.html', size: 100 }, { path: 'assets/big.bin', abs: '', size: 3 * 1024 * 1024 }, { path: 'assets/huge.bin', abs: '', size: 11 * 1024 * 1024 }];
  const r = lint(files);
  assert.deepEqual(rules(r.errors), ['size']);
  assert.deepEqual(rules(r.warnings), ['big-file']);
  const total = Array.from({ length: 3 }, (_, i) => ({ path: `a${i}.bin`, abs: '', size: 9 * 1024 * 1024 }));
  assert.ok(lint([files[0], ...total]).errors.some((e) => e.rule === 'size' && e.file === ''));
});

test('secrets: finds and masks, skips allowed emails', () => {
  const f = scanSecrets(fx('leaky'));
  const kinds = [...new Set(f.map((x) => x.kind))].sort();
  assert.deepEqual(kinds, ['aws-access-key', 'dotenv-secret', 'email', 'github-token', 'home-path', 'private-key']);
  const aws = f.find((x) => x.kind === 'aws-access-key');
  assert.deepEqual(aws, { file: 'index.html', line: 4, kind: 'aws-access-key', masked: '••••MPLE' });
  assert.ok(!f.some((x) => x.masked.includes('AKIA')));
  assert.equal(scanSecrets(fx('leaky'), { allowEmails: ['someone@company.io'] }).filter((x) => x.kind === 'email').length, 0);
  assert.equal(mask('abcdef'), '••••cdef');
});

test('secrets: no false positives on the design system or the reference report', () => {
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [{ path: n, abs: join(d, n), size: statSync(join(d, n)).size }]));
  const files = [...walk('docs/design-system').filter((f) => !f.path.endsWith('.min.js') && f.path !== 'bundle.js'), { path: 'index.html', abs: 'docs/reference/memory-research.html', size: 1 }];
  const found = scanSecrets(files);
  assert.deepEqual(found.map((x) => `${x.abs ?? ''}${x.file}:${x.line} ${x.kind} ${x.masked}`), []);
});

test('lint: the skill\'s samples, built, have no blocking errors', () => {
  const r = lint([{ path: 'index.html', abs: 'test/fixtures/built-sample/index.html', size: 1 }]);
  assert.deepEqual(r.errors, []);
});

test('ntfy request carries metadata only and tags by need', async () => {
  const { ntfyRequest } = await import('../../cli/roost.mjs');
  const cfg = { ntfyServer: 'https://ntfy.sh', ntfyTopic: 'roost-abc' };
  const r = ntfyRequest(cfg, { title: 'Rosé report', project: 'Payments API', kind: 'audit', url: 'https://x/p/a/r/b/', needsYou: true });
  assert.equal(r.url, 'https://ntfy.sh/roost-abc');
  assert.equal(r.init.headers.Tags, 'needs-you');
  assert.equal(r.init.headers.Click, 'https://x/p/a/r/b/');
  assert.match(r.init.headers.Title, /^=\?UTF-8\?B\?/);
  assert.equal(r.init.body, 'Payments API · audit · needs you');
  assert.equal(ntfyRequest(cfg, { title: 'Plain', project: 'P', kind: 'plan', url: 'u', needsYou: false }).init.headers.Tags, 'published');
});
