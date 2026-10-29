import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  KINDS, globToRegex, lint, listFiles, mask, normaliseRemote, parseArgs, resolveProject, scanSecrets, slugify,
} from '../../cli/roost.mjs';

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

test('lint: a good report has no errors or warnings', () => {
  const r = lint(fx('good'), { kind: 'investigation', title: 'Why refresh tokens expire early', summary: 's' });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test('lint: blocking rules', () => {
  const r = lint(fx('bad'), { kind: 'gossip', stream: 'nope', streams: [{ id: 'auth', aliases: ['old'] }], title: 'Bad', summary: '' });
  assert.deepEqual(rules(r.errors), ['local-path', 'reserved-rh', 'unknown-kind', 'unknown-stream']);
  assert.equal(r.errors.filter((e) => e.rule === 'local-path').length, 4);
  assert.deepEqual(rules(r.warnings), ['external-fetch', 'no-summary', 'no-viewport', 'raw-colour-svg']);
  assert.equal(lint(fx('good'), { stream: 'old', streams: [{ id: 'auth', aliases: ['old'] }], summary: 's' }).errors.length, 0, 'aliases resolve');
  assert.deepEqual(rules(lint([], {}).errors), ['missing-index']);
});

test('lint: size limits and title mismatch', () => {
  const files = [{ path: 'index.html', abs: 'test/fixtures/good/index.html', size: 100 }, { path: 'assets/big.bin', abs: '', size: 3 * 1024 * 1024 }, { path: 'assets/huge.bin', abs: '', size: 11 * 1024 * 1024 }];
  const r = lint(files, { title: 'Other', summary: 's' });
  assert.deepEqual(rules(r.errors), ['size']);
  assert.deepEqual(rules(r.warnings), ['big-file', 'title-mismatch']);
  const total = Array.from({ length: 3 }, (_, i) => ({ path: `a${i}.bin`, abs: '', size: 9 * 1024 * 1024 }));
  assert.ok(lint([files[0], ...total], { summary: 's' }).errors.some((e) => e.rule === 'size' && e.file === ''));
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

test('lint: the reference report has no blocking errors', () => {
  const r = lint([{ path: 'index.html', abs: 'docs/reference/memory-research.html', size: 76081 }], { kind: 'research', summary: 's' });
  assert.deepEqual(r.errors, []);
});
