#!/usr/bin/env node
// roost: the Roost publisher CLI (SPEC 5, PLAN 5). One file, Node 20+, built-ins and fetch only.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KINDS = [
  'investigation', 'incident', 'review', 'audit', 'architecture', 'plan', 'analysis',
  'benchmark', 'experiment', 'research', 'explainer', 'runbook', 'summary',
];
const MB = 1024 * 1024;
const TEXT_EXT = /\.(html?|css|m?js|json|md|txt|csv|svg|xml|ts|ya?ml|env)$/i;
const CT = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
  jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2', woff: 'font/woff',
  ttf: 'font/ttf', txt: 'text/plain; charset=utf-8', md: 'text/markdown; charset=utf-8', csv: 'text/csv; charset=utf-8', pdf: 'application/pdf',
};
export const EXIT = { ok: 0, failure: 1, invalid: 2, confirm: 3, secrets: 4 };

class CliError extends Error {
  constructor(message, code = EXIT.failure, extra = {}) { super(message); this.exitCode = code; this.extra = extra; }
}

// ---------- args and config ----------

export function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    const key = a.slice(2, eq > 0 ? eq : undefined);
    if (eq > 0) flags[key] = a.slice(eq + 1);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { pos, flags };
}
const BOOL_FLAGS = new Set(['unattended', 'allow-secrets', 'dry-run', 'json', 'confirmed']);

export function loadConfig(env = process.env) {
  const cfg = { ...env };
  const file = join(homedir(), '.config', 'roost', 'env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && cfg[m[1]] === undefined) cfg[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return {
    url: (cfg.ROOST_URL ?? '').replace(/\/+$/, ''),
    id: cfg.CF_ACCESS_CLIENT_ID ?? '', secret: cfg.CF_ACCESS_CLIENT_SECRET ?? '',
    ntfyTopic: cfg.ROOST_NTFY_TOPIC ?? '', ntfyServer: (cfg.ROOST_NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, ''),
    allowEmails: (cfg.ROOST_ALLOW_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    file,
  };
}

function client(cfg) {
  // Local `wrangler dev` with DEV_IDENTITY=1 (see .dev.vars) needs no Access token; deployed Workers ignore the header.
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cfg.url);
  if (!cfg.url || (!local && (!cfg.id || !cfg.secret))) {
    throw new CliError(`Set ROOST_URL, CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET (env or ${cfg.file}).`);
  }
  return async function req(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
    const h = local ? { 'x-dev-identity': 'service', ...headers } : { 'CF-Access-Client-Id': cfg.id, 'CF-Access-Client-Secret': cfg.secret, ...headers };
    let payload = body;
    if (body !== undefined && !(body instanceof Uint8Array) && typeof body !== 'string') { payload = JSON.stringify(body); h['content-type'] = 'application/json'; }
    let res;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await fetch(cfg.url + path, { method, body: payload, headers: h, redirect: 'manual' });
        if (res.status >= 500 && attempt < 2) { await new Promise((r) => setTimeout(r, 500 * (attempt + 1))); continue; }
        break;
      } catch (e) {
        if (attempt >= 2) throw new CliError(`Network error talking to ${cfg.url}: ${e.message}`, EXIT.failure, { error: { code: 'network', message: e.message } });
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    if (res.status >= 300 && res.status < 400) throw new CliError('Access redirected to a login page: the service token was not accepted.', EXIT.failure, { error: { code: 'access_redirect', status: res.status } });
    if (raw) return res;
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: { code: 'not_json', message: text.slice(0, 200) } }; }
    if (!res.ok) {
      const err = data.error ?? { code: String(res.status), message: text.slice(0, 200) };
      throw new CliError(`${method} ${path} → ${res.status} ${err.code}: ${err.message ?? ''}`, EXIT.failure, { error: { ...err, status: res.status } });
    }
    return { data, etag: res.headers.get('etag') };
  };
}

// ---------- project resolution ----------

export function normaliseRemote(r) {
  return String(r).trim().toLowerCase()
    .replace(/^[a-z+]+:\/\//, '').replace(/^[^@/]+@/, '').replace(/^([^/:]+):(?!\d)/, '$1/')
    .replace(/\/+$/, '').replace(/\.git$/, '');
}

export function expandHome(p) { return p.startsWith('~') ? join(homedir(), p.slice(1)) : p; }

export function globToRegex(glob) {
  const g = expandHome(glob).replace(/\/+$/, '');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') { re += '.*'; i++; } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}(?:/.*)?$`); // the folder or anything inside it
}

function git(args, cwd) {
  try { return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
}

/** SPEC 5.2 step 1: remote, then path. Semantic matching is Claude's job; the CLI reports 'none'. */
export function resolveProject(registry, cwd, remote = git(['remote', 'get-url', 'origin'], cwd)) {
  const active = registry.projects.filter((p) => p.status === 'active');
  if (remote) {
    const r = normaliseRemote(remote);
    const hit = active.filter((p) => p.match.remotes.some((x) => normaliseRemote(x) === r));
    // A monorepo can share one remote across projects split by path; prefer the path match then.
    if (hit.length === 1) return { project: hit[0].id, match: 'remote', why: `git remote matched ${r}` };
    if (hit.length > 1) {
      const byPath = hit.find((p) => p.match.paths.some((g) => globToRegex(g).test(cwd)));
      if (byPath) return { project: byPath.id, match: 'remote', why: `git remote and path matched ${r}` };
    }
  }
  for (const p of active) {
    if (p.match.paths.some((g) => globToRegex(g).test(cwd))) return { project: p.id, match: 'path', why: `working directory matched ${p.id}` };
  }
  return { project: null, match: 'none', why: '' };
}

// ---------- files, lint, secrets ----------

export function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      if (name.startsWith('.')) continue; // .DS_Store, .git and other dotfiles never publish
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile()) out.push({ path: relative(dir, p).split(sep).join('/'), abs: p, size: st.size });
    }
  };
  walk(dir);
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const NAMED_COLOURS = 'black|white|red|green|blue|yellow|orange|purple|pink|brown|gray|grey|cyan|magenta|lime|navy|teal|maroon|olive|silver|gold|indigo|violet|crimson|coral|salmon|tomato|orchid|plum|khaki|beige|ivory|lavender|turquoise|tan|chocolate|firebrick|darkred|darkblue|darkgreen|lightblue|lightgreen|lightgray|lightgrey|darkgray|darkgrey|skyblue|steelblue|royalblue|slategray|slategrey';

function badLink(v) {
  const s = v.trim();
  if (/^file:/i.test(s)) return 'file:// link';
  if (/^(https?:)?\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])([:/]|$)/i.test(s)) return 'localhost link';
  if (/^[a-z]:[\\/]/i.test(s)) return 'Windows absolute path';
  if (/^\/(Users|home)\//.test(s)) return 'local absolute path';
  if (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/_ds/lynx-reports/v1/') && !/^\/p\/[a-z0-9-]+\/r\//.test(s)) return 'absolute path outside /_ds/ and /p/';
  return '';
}

/** SPEC 7 lint. ponytail: regexes over the text, not a parser; misses exotic markup, fine for our own reports. */
export function lint(files, { kind, stream, streams = [], title, summary } = {}) {
  const errors = [];
  const warnings = [];
  const add = (list, rule, file, line, message) => list.push({ rule, file, line, message });
  if (!files.some((f) => f.path === 'index.html')) add(errors, 'missing-index', '', 0, 'index.html is required');
  if (kind !== undefined && !KINDS.includes(kind)) add(errors, 'unknown-kind', '', 0, `Kind "${kind}" is not one of: ${KINDS.join(', ')}`);
  if (stream && !streams.some((s) => s.id === stream || s.aliases?.includes(stream))) add(errors, 'unknown-stream', '', 0, `No stream "${stream}" in this project (use --new-stream to propose one)`);
  const total = files.reduce((a, f) => a + f.size, 0);
  if (total > 25 * MB) add(errors, 'size', '', 0, `Folder is ${(total / MB).toFixed(1)} MB; the limit is 25 MB`);
  for (const f of files) {
    if (f.size > 10 * MB) add(errors, 'size', f.path, 0, `${(f.size / MB).toFixed(1)} MB; the per-file limit is 10 MB`);
    else if (f.size > 2 * MB) add(warnings, 'big-file', f.path, 0, `${(f.size / MB).toFixed(1)} MB; keep single files under 2 MB`);
  }
  for (const f of files) {
    if (!/\.(html?|css|svg)$/i.test(f.path)) continue;
    const text = readFileSync(f.abs, 'utf8');
    for (const m of text.matchAll(/\b(?:href|src|srcset|poster|action|data)\s*=\s*(["'])(.*?)\1|url\(\s*(["']?)([^"')]*)\3\s*\)/gis)) {
      const values = m[2] !== undefined ? (/srcset/i.test(m[0]) ? m[2].split(',').map((x) => x.trim().split(/\s+/)[0]) : [m[2]]) : [m[4]];
      for (const v of values) {
        const why = badLink(v ?? '');
        if (why) add(errors, 'local-path', f.path, lineOf(text, m.index), `${why}: ${v}`);
      }
    }
    if (/\.html?$/i.test(f.path)) {
      for (const m of text.matchAll(/\b(class|id)\s*=\s*(["'])(.*?)\2/gis)) {
        if (m[3].split(/\s+/).some((t) => t.startsWith('rh-'))) add(errors, 'reserved-rh', f.path, lineOf(text, m.index), `${m[1]}="${m[3]}" uses the reserved rh- prefix`);
      }
      for (const m of text.matchAll(/<(script|link|img|iframe|source)\b[^>]*\b(?:src|href)\s*=\s*(["'])(https?:)?\/\/(.*?)\2[^>]*>/gis)) {
        if (/^<link\b/i.test(m[0]) && !/rel\s*=\s*["']?(stylesheet|preload|icon|modulepreload)/i.test(m[0])) continue;
        add(warnings, 'external-fetch', f.path, lineOf(text, m.index), `External fetch: //${m[4]} (vendor it into assets/)`);
      }
      for (const m of text.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) {
        const svg = m[0];
        const re = new RegExp(`\\b(fill|stroke|stop-color|color)\\s*[=:]\\s*["']?\\s*(#[0-9a-f]{3,8}\\b|rgba?\\(|hsla?\\(|(?:${NAMED_COLOURS})\\b)`, 'gi');
        for (const c of svg.matchAll(re)) add(warnings, 'raw-colour-svg', f.path, lineOf(text, m.index + c.index), `Raw colour in inline SVG (${c[1]}: ${c[2]}); use data-series or tokens`);
      }
    }
    if (f.path === 'index.html') {
      if (!/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(text)) add(warnings, 'no-viewport', f.path, 0, 'Missing <meta name="viewport">');
      const t = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
      if (title && decodeEntities(t ?? '') !== title) add(warnings, 'title-mismatch', f.path, 0, `<title> "${t ?? ''}" differs from the classified title "${title}"`);
    }
  }
  if (!summary) add(warnings, 'no-summary', '', 0, 'No summary; the hub shows one line under the title');
  return { errors, warnings };
}

export function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

export const mask = (s) => `••••${s.slice(-4)}`;

function entropy(s) {
  const f = {};
  for (const c of s) f[c] = (f[c] ?? 0) + 1;
  return Object.values(f).reduce((a, n) => a - (n / s.length) * Math.log2(n / s.length), 0);
}

const SECRET_PATTERNS = [
  ['aws-access-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['aws-secret', /(?:aws|secret)[\w\s"':=]{0,40}?\b([A-Za-z0-9/+]{40})\b/gi, 1],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}/g],
  ['slack-token', /\bxox[abposr]-[A-Za-z0-9-]{10,}/g],
  ['stripe-key', /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ['anthropic-key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['openai-key', /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{20,}/g],
  ['cloudflare-token', /\bCF_[A-Z_]*(?:TOKEN|KEY|SECRET)\s*[=:]\s*["']?([A-Za-z0-9_-]{20,})/g, 1],
  ['cloudflare-token', /cloudflare[\w\s"':=-]{0,30}?\b([A-Za-z0-9_-]{40})\b/gi, 1],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['dotenv-secret', /^\s*(?:export\s+)?[A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASS)[A-Z0-9_]*\s*=\s*["']?([^\s"'<]{6,})/gm, 1],
  ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['home-path', /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\/|\b[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/g],
];

/** SPEC 5.5. Findings carry only masked values. */
export function scanSecrets(files, { allowEmails = [] } = {}) {
  const findings = [];
  const seen = new Set();
  const push = (file, line, kind, value) => {
    const k = `${file}:${line}:${kind}`;
    if (!seen.has(k)) { seen.add(k); findings.push({ file, line, kind, masked: mask(value) }); }
  };
  for (const f of files) {
    if (!TEXT_EXT.test(f.path) || f.size > 10 * MB) continue;
    const text = readFileSync(f.abs, 'utf8');
    for (const [kind, re, group] of SECRET_PATTERNS) {
      for (const m of text.matchAll(re)) {
        const v = m[group ?? 0] ?? m[0];
        if (kind === 'email') {
          const e = v.toLowerCase();
          if (/(^noreply@|^no-reply@|@example\.(com|org|net)$|@users\.noreply\.github\.com$)/.test(e) || allowEmails.includes(e)) continue;
          if (/\.(png|jpe?g|gif|svg|webp|css|js)$/.test(e)) continue; // retina image names like icon@2x.png
        }
        push(f.path, lineOf(text, m.index), kind, v);
      }
    }
    for (const m of text.matchAll(/[A-Za-z0-9+/=_-]{32,}/g)) {
      const v = m[0];
      if ((v.match(/\//g) ?? []).length > 1) continue; // paths and URLs
      if (/base64,$/.test(text.slice(Math.max(0, m.index - 7), m.index))) continue; // data: URIs
      if (/^[A-Za-z]+(?:[-_][A-Za-z]+)+$/.test(v)) continue; // long kebab or snake words
      const line = lineOf(text, m.index);
      if (findings.some((x) => x.file === f.path && x.line === line)) continue; // already named by a specific pattern
      if (entropy(v) >= 4.5) push(f.path, line, 'high-entropy', v);
    }
  }
  return findings;
}

// ---------- helpers ----------

export function slugify(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
}
export function localDate(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const typeOf = (p) => CT[p.split('.').pop().toLowerCase()] ?? 'application/octet-stream';

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => { while (queue.length) await fn(queue.shift()); }));
}

// ---------- notifications (SPEC 5.6) ----------

/** The ntfy push for a publish: title, project, kind and URL only, never report content. */
export function ntfyRequest(cfg, { title, project, kind, url, needsYou }) {
  // Header values must be Latin-1; ntfy reads RFC 2047 encoded words for anything else.
  const header = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);
  return {
    url: `${cfg.ntfyServer}/${cfg.ntfyTopic}`,
    init: {
      method: 'POST', body: `${project} · ${kind}${needsYou ? ' · needs you' : ''}`,
      headers: { Title: header(title), Tags: needsYou ? 'needs-you' : 'published', Click: url, Priority: needsYou ? '4' : '3' },
    },
  };
}

// Sent from the publishing machine: ntfy.sh rate-limits Cloudflare Workers' shared egress IPs (522/429 from the Worker).
async function notifyPublish(cfg, n, log) {
  if (!cfg.ntfyTopic) return false;
  const { url, init } = ntfyRequest(cfg, n);
  try {
    const res = await fetch(url, init);
    if (!res.ok) { log(`warning: ntfy answered ${res.status}; no push sent`); return false; }
    return true;
  } catch (e) {
    log(`warning: ntfy unreachable (${e.message}); no push sent`);
    return false;
  }
}

// ---------- commands ----------

async function cmdPublish({ pos, flags }, cfg, log) {
  const dir = pos[0] ? resolve(pos[0]) : '';
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) throw new CliError('Usage: roost publish <dir> [flags]', EXIT.invalid);
  const req = client(cfg);
  const unattended = !!flags.unattended;
  const confirmed = !!flags.confirmed && !unattended;
  const files = listFiles(dir);
  const indexHtml = files.find((f) => f.path === 'index.html');
  const htmlTitle = indexHtml ? decodeEntities(readFileSync(indexHtml.abs, 'utf8').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '') : '';
  const title = typeof flags.title === 'string' ? flags.title : htmlTitle;
  if (!title) throw new CliError('A title is required: --title or a <title> in index.html', EXIT.invalid);
  if (flags.stream && flags['new-stream']) throw new CliError('Use --stream or --new-stream, not both', EXIT.invalid);
  const kind = flags.kind;
  if (typeof kind !== 'string') throw new CliError('--kind is required', EXIT.invalid);

  const registry = (await req('/api/registry')).data;
  const cwd = process.cwd();
  const resolved = resolveProject(registry, cwd);
  let project = typeof flags.project === 'string' ? flags.project : resolved.project;
  const decisive = !!resolved.project && project === resolved.project;
  const needs = [];
  if (!project) {
    if (unattended) throw new CliError('No project matched and none was given; unattended runs cannot ask.', EXIT.invalid);
    return { code: EXIT.confirm, out: { ok: false, needs: ['project'], match: resolved.match, candidates: registry.projects.filter((p) => p.status === 'active').map(({ id, title, description, match }) => ({ id, title, description, keywords: match.keywords })) } };
  }
  const projectRec = registry.projects.find((p) => p.id === project);
  if (!projectRec) throw new CliError(`Unknown project "${project}". Ask the user, then \`roost project add\`.`, EXIT.invalid, { needs: ['project'] });
  if (!decisive) needs.push('project');
  const manifest = (await req(`/api/manifest/${project}`)).data;

  const slug = typeof flags.slug === 'string' ? slugify(flags.slug) : slugify(title);
  if (!slug) throw new CliError('Could not make a slug; pass --slug', EXIT.invalid);
  const existing = manifest.reports.filter((r) => r.id.slice(11) === slug).sort((a, b) => b.created.localeCompare(a.created))[0];
  const id = existing?.id ?? `${localDate()}-${slug}`;
  const newStream = typeof flags['new-stream'] === 'string' ? slugify(flags['new-stream']) : '';
  if (newStream) needs.push('stream');
  const stream = typeof flags.stream === 'string' ? flags.stream : null;

  const summary = typeof flags.summary === 'string' ? flags.summary : '';
  const { errors, warnings } = lint(files, { kind, stream, streams: manifest.streams, title, summary });
  const findings = scanSecrets(files, cfg);
  if (findings.length) warnings.push(...findings.map((f) => ({ rule: 'secrets', file: f.file, line: f.line, message: `Possible ${f.kind}: ${f.masked}` })));
  for (const w of warnings) log(`warning [${w.rule}] ${w.file}${w.line ? `:${w.line}` : ''} ${w.message}`);
  if (errors.length) {
    for (const e of errors) log(`error [${e.rule}] ${e.file}${e.line ? `:${e.line}` : ''} ${e.message}`);
    return { code: EXIT.invalid, out: { ok: false, errors, warnings } };
  }

  let typed = {};
  if (typeof flags.typed === 'string') {
    try { typed = JSON.parse(flags.typed); } catch { throw new CliError('--typed must be JSON', EXIT.invalid); }
  }
  const proposal = { project, project_title: projectRec.title, stream: newStream || stream, new_stream: !!newStream, kind, title, summary, id, republish: !!existing };
  if (needs.length && !confirmed && !unattended) {
    return { code: EXIT.confirm, out: { ok: false, needs, match: resolved.match, proposal, warnings } };
  }
  if (findings.length && !unattended && !flags['allow-secrets']) {
    return { code: EXIT.secrets, out: { ok: false, findings, proposal, warnings } };
  }
  const why = typeof flags.why === 'string' ? flags.why : decisive ? resolved.why : 'chosen by Claude';
  const triage = unattended; // SPEC 5.4: every unattended publish lands in triage
  const body = {
    project, id, kind, title, summary, stream, typed, status: flags.status === 'draft' ? 'draft' : 'final',
    tags: typeof flags.tags === 'string' ? flags.tags.split(',').map((t) => slugify(t)).filter(Boolean) : [],
    change_note: typeof flags['change-note'] === 'string' ? flags['change-note'] : existing ? '' : 'First version.',
    supersedes: typeof flags.supersedes === 'string' ? flags.supersedes : null,
    ...(newStream ? { new_stream: { id: newStream, title: flags['new-stream'], description: '' } } : {}),
    classification: { why, triage, confirmed: confirmed || (decisive && !needs.length) },
    unattended, allow_secrets: !!flags['allow-secrets'], findings,
    source: { unattended, branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd) || undefined, commit: git(['rev-parse', '--short', 'HEAD'], cwd) || undefined, session: process.env.CLAUDE_SESSION_ID },
  };
  const bufs = new Map(files.map((f) => [f.path, readFileSync(f.abs)]));
  body.files = files.map((f) => ({ path: f.path, size: bufs.get(f.path).length, sha256: sha256(bufs.get(f.path)) }));
  if (flags['dry-run']) {
    log(`dry run: would publish ${project}/${id} (${files.length} files) as ${kind}${stream ? ` in ${stream}` : ''}`);
    return { code: EXIT.ok, out: { ok: true, dry_run: true, match: resolved.match, proposal, warnings, findings } };
  }
  const begun = (await req('/api/publish', { method: 'POST', body })).data;
  await pool(files, 4, async (f) => {
    await req(`${begun.put_base}${f.path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: bufs.get(f.path), headers: { 'content-type': typeOf(f.path) } });
  });
  let done;
  for (let attempt = 0; ; attempt++) {
    try { done = (await req(`${begun.put_base}commit`, { method: 'POST', body: {} })).data; break; } catch (e) { if (attempt >= 2) throw e; }
  }
  if (done.index_stale) await req('/api/reindex', { method: 'POST' }).catch(() => {});
  const url = cfg.url + done.url;
  const notified = await notifyPublish(cfg, { title, project: projectRec.title, kind, url, needsYou: !!done.triage }, log);
  log(`${done.state === 'quarantined' ? 'Quarantined (needs review in /triage)' : 'Published'}: ${url}`);
  return { code: EXIT.ok, out: { ok: true, url, project, id, version: done.version, state: done.state, triage: done.triage, notified, match: resolved.match, warnings } };
}

async function cmdProject({ pos, flags }, cfg, log) {
  const req = client(cfg);
  const sub = pos[0];
  const { data: reg, etag } = await req('/api/registry');
  if (sub === 'list' || !sub) {
    for (const p of reg.projects) log(`${p.id}${p.status === 'archived' ? ' (archived)' : ''}: ${p.title}`);
    return { code: EXIT.ok, out: { ok: true, projects: reg.projects, resolved: resolveProject(reg, process.cwd()) } };
  }
  const id = flags.id ?? pos[1];
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new CliError('Give a kebab-case project id: --id <id>', EXIT.invalid);
  const list = (v) => (v === undefined ? undefined : String(v).split(',').map((s) => s.trim()).filter(Boolean));
  let p = reg.projects.find((x) => x.id === id);
  if (sub === 'add') {
    if (p) throw new CliError(`Project ${id} exists; use roost project edit`, EXIT.invalid);
    p = { id, title: flags.title ?? id, description: flags.description ?? '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' };
    reg.projects.push(p);
  } else if (!p) throw new CliError(`No project ${id}`, EXIT.invalid);
  if (sub === 'add' || sub === 'edit') {
    if (typeof flags.title === 'string') p.title = flags.title;
    if (typeof flags.description === 'string') p.description = flags.description;
    for (const [flag, key] of [['remote', 'remotes'], ['path', 'paths'], ['keyword', 'keywords']]) {
      const v = list(flags[flag]);
      if (v) p.match[key] = [...new Set([...p.match[key], ...v])];
    }
    if (flags.status === 'active') p.status = 'active';
  } else if (sub === 'archive') p.status = 'archived';
  else throw new CliError('Usage: roost project add|edit|archive|list', EXIT.invalid);
  await req('/api/registry', { method: 'PUT', body: reg, headers: { 'if-match': etag ?? '""' } });
  log(`${sub} ${id}: ok`);
  return { code: EXIT.ok, out: { ok: true, project: p } };
}

async function cmdStream({ pos, flags }, cfg, log) {
  const [op, project, stream] = pos;
  if (!['create', 'rename', 'merge', 'done', 'archive', 'unarchive'].includes(op) || !project || !stream) {
    throw new CliError('Usage: roost stream create|rename|merge|done|archive|unarchive <project> <stream> [--to S] [--title T]', EXIT.invalid);
  }
  const body = { op, ...(flags.to ? { to: flags.to } : {}), ...(flags.title ? { title: flags.title } : {}), ...(flags.description ? { description: flags.description } : {}) };
  const { data } = await client(cfg)(`/api/stream/${project}/${stream}`, { method: 'POST', body });
  log(`${op} ${project}/${stream}: ok`);
  return { code: EXIT.ok, out: { ok: true, stream: data } };
}

async function cmdExport({ pos }, cfg, log) {
  const [project, out] = pos;
  if (!project || !out) throw new CliError('Usage: roost export <project> <out-dir>', EXIT.invalid);
  const req = client(cfg);
  const { data: m } = await req(`/api/manifest/${project}`);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(m, null, 2));
  let written = 0, skipped = 0;
  const jobs = [];
  for (const r of m.reports) for (const v of r.versions) {
    if (v.state === 'pending') continue;
    for (const f of [...v.files, { path: 'report.json' }]) jobs.push({ r, v, f });
  }
  await pool(jobs, 4, async ({ r, v, f }) => {
    const dest = join(out, 'r', r.id, `v${v.n}`, ...f.path.split('/'));
    if (f.sha256 && existsSync(dest) && sha256(readFileSync(dest)) === f.sha256) { skipped++; return; }
    const res = await req(`/api/raw/${project}/${r.id}/v${v.n}/${f.path.split('/').map(encodeURIComponent).join('/')}`, { raw: true });
    if (!res.ok) throw new CliError(`Export failed for ${r.id}/v${v.n}/${f.path}: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (f.sha256 && sha256(buf) !== f.sha256) throw new CliError(`Checksum mismatch for ${r.id}/v${v.n}/${f.path}`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    written++;
  });
  log(`Exported ${project}: ${written} files written, ${skipped} unchanged, into ${out}`);
  return { code: EXIT.ok, out: { ok: true, project, written, skipped, reports: m.reports.length } };
}

async function cmdDoctor(_args, cfg, log) {
  const checks = [];
  const check = async (name, fn) => {
    try { const detail = await fn(); checks.push({ name, ok: true, detail: detail ?? '' }); log(`ok    ${name}${detail ? `: ${detail}` : ''}`); }
    catch (e) { checks.push({ name, ok: false, detail: e.message }); log(`FAIL  ${name}: ${e.message}`); }
  };
  await check('node 20+', () => { if (+process.versions.node.split('.')[0] < 20) throw new Error(process.version); return process.version; });
  await check('config', () => {
    const missing = ['url', 'id', 'secret'].filter((k) => !cfg[k]).map((k) => ({ url: 'ROOST_URL', id: 'CF_ACCESS_CLIENT_ID', secret: 'CF_ACCESS_CLIENT_SECRET' })[k]);
    if (missing.length) throw new Error(`missing ${missing.join(', ')} (env or ${cfg.file})`);
    return cfg.url;
  });
  await check('ntfy topic', () => { if (!cfg.ntfyTopic) throw new Error(`ROOST_NTFY_TOPIC is not set; publishes won't push to your phone`); return `${cfg.ntfyServer}/${cfg.ntfyTopic.slice(0, 10)}…`; });
  if (checks.every((c) => c.ok)) {
    const req = client(cfg);
    await check('service token accepted', async () => {
      const { data } = await req('/api/whoami');
      if (data.identity !== 'service') throw new Error(`identity is ${data.identity}; check SERVICE_TOKEN_ID on the Worker`);
      return data.common_name;
    });
    await check('design system served', async () => {
      const res = await req('/_ds/lynx-reports/v1/tokens.css', { raw: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}; run scripts/upload-ds.mjs`);
    });
    let reg;
    await check('registry readable', async () => { reg = (await req('/api/registry')).data; return `${reg.projects.length} projects`; });
    if (reg) {
      await check('this folder', () => { const r = resolveProject(reg, process.cwd()); return r.project ? `${r.project} (${r.match})` : 'no project matched; Claude will ask'; });
      await check('no stuck uploads', async () => {
        const stuck = [];
        for (const p of reg.projects) {
          const { data: m } = await req(`/api/manifest/${p.id}`).catch(() => ({ data: { reports: [] } }));
          for (const r of m.reports) for (const v of r.versions) if (v.state === 'pending') stuck.push(`${p.id}/${r.id}/v${v.n}`);
        }
        if (stuck.length) throw new Error(`pending versions: ${stuck.join(', ')}`);
      });
    }
  }
  const ok = checks.every((c) => c.ok);
  return { code: ok ? EXIT.ok : EXIT.failure, out: { ok, checks } };
}

const USAGE = `roost publish <dir> [--project P] [--kind K] [--stream S | --new-stream S] [--slug X] [--title T]
      [--summary S] [--tags a,b] [--status draft|final] [--typed '{json}'] [--change-note "…"]
      [--supersedes ID] [--why "…"] [--confirmed] [--unattended] [--allow-secrets] [--dry-run] [--json]
roost project add|edit|archive|list [--id ID --title T --description D --remote R --path GLOB --keyword K] [--json]
roost stream create|rename|merge|done|archive|unarchive <project> <stream> [--to S] [--title T]
roost export <project> <out-dir>
roost doctor [--json]`;

export async function main(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  const args = parseArgs(rest);
  for (const k of BOOL_FLAGS) if (typeof args.flags[k] === 'string') { args.pos.push(args.flags[k]); args.flags[k] = true; }
  const asJson = !!args.flags.json;
  const log = (s) => (asJson ? process.stderr : process.stdout).write(`${s}\n`);
  const cfg = loadConfig();
  const commands = { publish: cmdPublish, project: cmdProject, stream: cmdStream, export: cmdExport, doctor: cmdDoctor };
  let result;
  try {
    if (!commands[cmd]) throw new CliError(USAGE, cmd ? EXIT.invalid : EXIT.ok);
    result = await commands[cmd](args, cfg, log);
  } catch (e) {
    const code = e instanceof CliError ? e.exitCode : EXIT.failure;
    if (code === EXIT.ok) { process.stdout.write(`${USAGE}\n`); return 0; }
    result = { code, out: { ok: false, error: { message: e.message, ...(e.extra?.error ?? {}) }, ...(e.extra ?? {}) } };
    log(e.message);
  }
  if (asJson) process.stdout.write(`${JSON.stringify(result.out)}\n`);
  else if (result.code === EXIT.confirm) log(`Needs confirmation: ${result.out.needs.join(', ')}${result.out.proposal ? `\n${JSON.stringify(result.out.proposal, null, 2)}` : ''}`);
  else if (result.code === EXIT.secrets) log(`Possible secrets found. Publish anyway with --allow-secrets, or fix them:\n${result.out.findings.map((f) => `  ${f.file}:${f.line} ${f.kind} ${f.masked}`).join('\n')}`);
  return result.code;
}

const self = (() => { try { return realpathSync(process.argv[1] ?? '') === fileURLToPath(import.meta.url); } catch { return false; } })();
if (self) main().then((code) => process.exit(code));
