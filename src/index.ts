import { authenticate, type AuthEnv, type Identity } from './auth';
import * as api from './api';
import { serveAsset } from './assets';
import { home } from './pages/home';
import { kindPage, projectPage } from './pages/project';
import { triagePage, triagePreview } from './pages/triage';
import * as viewer from './viewer';
import { ID_RE, REPORT_ID_RE, filesProject, manifestKey, versionKey, type Manifest } from './model';
import { ApiError } from './store';
import { injectChrome } from './chrome';
import { viewer as loadViewer } from './pages/data';

export interface Env extends AuthEnv {
  REPORTS: R2Bucket;
  STATE: KVNamespace;
}

type Need = 'browser' | 'service' | 'any';
type Handler = (req: Request, env: Env, m: RegExpMatchArray, who: Identity, ctx: ExecutionContext) => Promise<Response> | Response;

const IMMUTABLE = 'private, max-age=31536000, immutable';
const NO_STORE = 'private, no-store';

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8', csv: 'text/csv; charset=utf-8', pdf: 'application/pdf', ts: 'text/plain; charset=utf-8',
};
const typeOf = (path: string) => TYPES[path.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': NO_STORE } });
export const apiError = (status: number, code: string, message = code, field?: string) =>
  json({ error: { code, message, ...(field ? { field } : {}) } }, status);

/** Rejects traversal and odd segments; returns the decoded relative path or null. */
function safePath(raw: string): string | null {
  let p: string;
  try { p = decodeURIComponent(raw); } catch { return null; }
  if (p === '') return '';
  if (p.startsWith('/') || p.includes('\\') || p.includes('\0')) return null;
  return p.split('/').every((s) => s !== '' && s !== '.' && s !== '..') ? p : null;
}

function page(status: number, title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Roost</title><link rel="stylesheet" href="/_ds/lynx-reports/v1/tokens.css"><link rel="stylesheet" href="/_ds/lynx-reports/v1/components/reports.css"></head>
<body class="lr-report"><main class="lr-main" style="max-width:672px;margin:0 auto;padding:48px 16px"><section class="lr-panel lr-card"><h1 class="lr-title">${title}</h1><p class="lr-lead">${body}</p><p><a href="/">Back to Roost</a></p></section></main></body></html>`;
  return new Response(html, { status, headers: { 'content-type': TYPES.html, 'cache-control': NO_STORE } });
}
const notFound = () => page(404, 'Not found', 'Nothing lives at this address.');

async function readManifest(env: Env, project: string): Promise<Manifest | null> {
  const obj = await env.REPORTS.get(manifestKey(project));
  return obj ? ((await obj.json()) as Manifest) : null;
}

async function serveDs(_req: Request, env: Env, m: RegExpMatchArray): Promise<Response> {
  const path = safePath(m[1]);
  if (!path) return notFound();
  const obj = await env.REPORTS.get(`ds/lynx-reports/v1/${path}`);
  if (!obj) return notFound();
  return new Response(obj.body, {
    headers: { 'content-type': obj.httpMetadata?.contentType ?? typeOf(path), 'cache-control': IMMUTABLE, etag: obj.httpEtag },
  });
}

async function serveReport(req: Request, env: Env, m: RegExpMatchArray, _who: Identity, ctx: ExecutionContext): Promise<Response> {
  const [, project, id, slash, vn, rest] = m;
  if (!ID_RE.test(project) || !REPORT_ID_RE.test(id)) return notFound();
  if (!slash) return Response.redirect(new URL(`/p/${project}/r/${id}/`, req.url).toString(), 301);
  if (/^v\d+$/.test(rest ?? '')) return Response.redirect(new URL(`/p/${project}/r/${id}/${rest}/`, req.url).toString(), 301);
  const path = safePath(rest ?? '');
  if (path === null) return notFound();
  const manifest = await readManifest(env, project);
  const entry = manifest?.reports.find((r) => r.id === id);
  if (!entry) return notFound();
  if (entry.moved_to) return Response.redirect(new URL(`/p/${entry.moved_to}/r/${id}/${vn ? `v${vn}/` : ''}${rest ?? ''}`, req.url).toString(), 301);
  const n = vn ? Number(vn) : entry.latest;
  const version = entry.versions.find((v) => v.n === n);
  if (!version) return notFound();
  if (version.state !== 'live') {
    return page(404, 'Not available', 'This version is waiting in triage or was rejected, so it is not served.');
  }
  const file = path || 'index.html';
  const obj = await env.REPORTS.get(versionKey(filesProject(manifest!, entry), id, version.n, file));
  if (!obj) return notFound();
  // .html is always served as HTML (and gets chrome), whatever type the uploader sent.
  const type = /\.html?$/i.test(file) ? TYPES.html : obj.httpMetadata?.contentType ?? typeOf(file);
  if (!type.startsWith('text/html')) {
    return new Response(obj.body, { headers: { 'content-type': type, 'cache-control': vn ? IMMUTABLE : 'private, no-cache' } });
  }
  const [v, reg] = await Promise.all([loadViewer(env), api.readRegistry(env)]);
  const p = reg.doc.projects.find((x) => x.id === project) ?? { id: project, title: project, description: '', match: { remotes: [], paths: [], keywords: [] }, status: 'active' as const };
  if (file === 'index.html') ctx.waitUntil(markSeen(env, `${project}/${id}`, v.seen));
  const res = new Response(obj.body, { headers: { 'content-type': type, 'cache-control': NO_STORE } });
  return injectChrome(res, { m: manifest!, p, e: entry, n: version.n, v });
}

/** SPEC 6.4: serving a report through the Worker marks it seen. */
async function markSeen(env: Env, ref: string, seen: { last_visit: string; opened: string[] }) {
  if (seen.opened.includes(ref)) return;
  await env.STATE.put('seen', JSON.stringify({ ...seen, opened: [...seen.opened, ref] }));
}

function whoami(_req: Request, _env: Env, _m: RegExpMatchArray, who: Identity): Response {
  return json(who.kind === 'service' ? { identity: 'service', common_name: who.commonName } : { identity: 'browser', email: who.email });
}

// [method, pattern, identity, handler]. First match wins.
const routes: [string, RegExp, Need, Handler][] = [
  ['GET', /^\/$/, 'browser', (req, env, _m, _w, ctx) => home(req, env, ctx)],
  ['GET', /^\/p\/([a-z0-9-]+)\/$/, 'browser', (req, env, m) => projectPage(req, env, m[1])],
  ['GET', /^\/p\/([a-z0-9-]+)\/kind\/([a-z]+)\/$/, 'browser', (req, env, m) => projectPage(req, env, m[1], { kind: m[2] })],
  ['GET', /^\/p\/([a-z0-9-]+)\/stream\/([a-z0-9-]+)\/$/, 'browser', (req, env, m) => projectPage(req, env, m[1], { stream: m[2] })],
  ['GET', /^\/triage$/, 'browser', (req, env) => triagePage(req, env)],
  ['GET', /^\/triage\/preview\/([a-z0-9-]+)\/([0-9a-z-]+)\/v(\d+)\/(.*)$/, 'browser', async (_r, env, m) => {
    const path = safePath(m[4]);
    return (path !== null && (await triagePreview(env, m[1], m[2], +m[3], path))) || notFound();
  }],
  ['GET', /^\/kind\/([a-z]+)\/$/, 'browser', (req, env, m) => kindPage(req, env, m[1])],
  ['GET', /^\/(p\/[a-z0-9-]+|p\/[a-z0-9-]+\/(?:kind|stream)\/[a-z0-9-]+|kind\/[a-z]+)$/, 'browser', (req, _e, m) => Response.redirect(new URL(`/${m[1]}/`, req.url).toString(), 301)],
  ['GET', /^\/_roost\/([a-z.]+)$/, 'any', (_r, _e, m) => serveAsset(m[1]) ?? notFound()],
  ['GET', /^\/_ds\/lynx-reports\/v1\/(.+)$/, 'any', serveDs],
  ['GET', /^\/p\/([^/]+)\/r\/([^/]+)(\/)?(?:v(\d+)\/)?(.*)$/, 'browser', serveReport],
  ['GET', /^\/api\/whoami$/, 'any', whoami],
  ['POST', /^\/api\/publish$/, 'service', (req, env) => api.publishBegin(req, env)],
  ['PUT', /^\/api\/publish\/([^/]+)\/([^/]+)\/(\d+)\/([0-9a-f-]{36})\/(.+)$/, 'service', (req, env, m) => api.publishPut(req, env, m[1], m[2], +m[3], m[4], m[5])],
  ['POST', /^\/api\/publish\/([^/]+)\/([^/]+)\/(\d+)\/([0-9a-f-]{36})\/commit$/, 'service', (_r, env, m) => api.publishCommit(env, m[1], m[2], +m[3], m[4])],
  ['GET', /^\/api\/registry$/, 'service', (_r, env) => api.registryGet(env)],
  ['PUT', /^\/api\/registry$/, 'service', (req, env) => api.registryPut(req, env)],
  ['GET', /^\/api\/manifest\/([^/]+)$/, 'service', (_r, env, m) => api.manifestGet(env, m[1])],
  ['POST', /^\/api\/stream\/([^/]+)\/([^/]+)$/, 'service', (req, env, m) => api.streamPost(req, env, m[1], m[2])],
  ['GET', /^\/api\/raw\/([^/]+)\/([^/]+)\/v(\d+)\/(.+)$/, 'service', (_r, env, m) => api.rawGet(env, m[1], m[2], +m[3], m[4])],
  ['PUT', /^\/api\/ds\/lynx-reports\/v1\/(.+)$/, 'service', (req, env, m) => api.dsPut(req, env, m[1])],
  ['POST', /^\/api\/reindex$/, 'service', (_r, env) => api.reindex(env)],
  ['POST', /^\/api\/pin$/, 'browser', (req, env) => viewer.pin(req, env)],
  ['POST', /^\/api\/prefs$/, 'browser', (req, env) => viewer.prefs(req, env)],
  ['POST', /^\/api\/archive$/, 'browser', (req, env) => viewer.archive(req, env)],
  ['POST', /^\/api\/triage\/([a-z0-9-]+)\/([0-9a-z-]+)$/, 'browser', (req, env, m) => viewer.triageAction(req, env, m[1], m[2])],
];

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const who = await authenticate(req, env);
    if (!who) return new Response('Forbidden', { status: 403, headers: { 'cache-control': NO_STORE } });
    const url = new URL(req.url);
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    for (const [m, re, need, handler] of routes) {
      const match = url.pathname.match(re);
      if (!match || m !== method) continue;
      if (need !== 'any' && need !== who.kind) return apiError(403, 'wrong_identity');
      try {
        return await handler(req, env, match, who, ctx);
      } catch (e) {
        if (e instanceof ApiError) return apiError(e.status, e.code, e.message, e.field);
        console.error(e);
        return url.pathname.startsWith('/api/') ? apiError(500, 'internal') : page(500, 'Something broke', 'The error was logged.');
      }
    }
    return url.pathname.startsWith('/api/') ? apiError(404, 'not_found') : notFound();
  },
} satisfies ExportedHandler<Env>;
