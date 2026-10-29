// Constraint: nothing is ever deleted. No DELETE handlers, no R2 delete() calls anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

test('no delete calls or DELETE routes in src, cli, scripts, public', () => {
  const dirs = ['src', 'cli', 'scripts', 'public'].filter((d) => { try { return statSync(d).isDirectory(); } catch { return false; } });
  for (const f of dirs.flatMap(walk)) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /\.delete\(/, f);
    assert.doesNotMatch(s, /['"]DELETE['"]/, f);
  }
});
