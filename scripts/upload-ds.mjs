#!/usr/bin/env node
// Uploads docs/design-system/ to ds/lynx-reports/v1/ through the service API.
// Idempotent: the Worker creates absent files, answers "same" for identical ones and refuses changed ones. Never deletes.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { loadConfig } from '../cli/roost.mjs';

const ROOT = new URL('../docs/design-system/', import.meta.url).pathname;
const TYPES = { css: 'text/css; charset=utf-8', html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', md: 'text/markdown; charset=utf-8', ts: 'text/plain; charset=utf-8' };
const walk = (d) => readdirSync(d).flatMap((n) => (n.startsWith('.') ? [] : statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

const cfg = loadConfig();
if (!cfg.url || !cfg.id || !cfg.secret) { console.error(`Set ROOST_URL and the Access service token (env or ${cfg.file}).`); process.exit(1); }
const counts = { created: 0, same: 0, failed: 0 };
const files = walk(ROOT);
const queue = [...files];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const abs = queue.shift();
    const rel = relative(ROOT, abs).split(sep).join('/');
    const res = await fetch(`${cfg.url}/api/ds/lynx-reports/v1/${rel.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'PUT', body: readFileSync(abs), redirect: 'manual',
      headers: { 'CF-Access-Client-Id': cfg.id, 'CF-Access-Client-Secret': cfg.secret, 'content-type': TYPES[rel.split('.').pop()] ?? 'application/octet-stream' },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) counts[body.status]++;
    else { counts.failed++; console.error(`${res.status} ${rel}: ${body.error?.message ?? ''}`); }
  }
}));
console.log(`${files.length} files: ${counts.created} created, ${counts.same} unchanged, ${counts.failed} failed`);
process.exit(counts.failed ? 1 : 0);
