#!/usr/bin/env node
// Uploads fonts-dist/ (built by build-fonts.sh) to Roost's /_fonts/v1/ through the service API.
// Idempotent: the Worker creates absent files, answers "same" for identical ones and refuses changed ones (ship v2).
import { readFileSync, readdirSync } from 'node:fs';
import { loadConfig } from '../bin/roost.mjs';

const DIR = new URL('../fonts-dist/', import.meta.url).pathname;
const TYPES = { css: 'text/css; charset=utf-8', woff2: 'font/woff2' };
const cfg = loadConfig();
if (!cfg.url) { console.error(`Set ROOST_URL and the Access service token (env or ${cfg.file}).`); process.exit(1); }
const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cfg.url);
const auth = local ? { 'x-dev-identity': 'service' } : { 'CF-Access-Client-Id': cfg.id, 'CF-Access-Client-Secret': cfg.secret };
let failed = 0;
for (const name of readdirSync(DIR).filter((n) => /\.(css|woff2)$/.test(n))) {
  const res = await fetch(`${cfg.url}/api/fonts/v1/${name}`, {
    method: 'PUT', body: readFileSync(DIR + name), redirect: 'manual', headers: { ...auth, 'content-type': TYPES[name.split('.').pop()] },
  });
  const body = await res.json().catch(() => ({}));
  console.log(`${res.ok ? body.status : `FAIL ${res.status}`} ${name}${res.ok ? '' : ` ${body.error?.message ?? ''}`}`);
  if (!res.ok) failed++;
}
process.exit(failed ? 1 : 0);
