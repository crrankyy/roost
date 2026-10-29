#!/usr/bin/env node
// Seeds config/settings.json in R2 if it is absent (uses your wrangler login). Projects are added with `roost project add`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = 'roost/config/settings.json';
const wrangler = (...args) => execFileSync('npx', ['wrangler', ...args, '--remote'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const dir = mkdtempSync(join(tmpdir(), 'roost-seed-'));
try {
  wrangler('r2', 'object', 'get', KEY, '--file', join(dir, 'existing.json'));
  console.log('config/settings.json exists; left unchanged');
} catch {
  const settings = { ds_version: 'v1', kinds: ['investigation', 'incident', 'review', 'audit', 'architecture', 'plan', 'analysis', 'benchmark', 'experiment', 'research', 'explainer', 'runbook', 'summary'] };
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(settings, null, 2));
  wrangler('r2', 'object', 'put', KEY, '--file', join(dir, 'settings.json'), '--content-type', 'application/json');
  console.log('config/settings.json created');
}
