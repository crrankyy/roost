// Service-token endpoints: publishing, registry, streams, export, design-system upload (PLAN 4).
import {
  ID_RE, KINDS, REPORT_ID_RE, begin, filesProject, commit, manifestKey, mergeSlice, projectSlice, reportJson, streamOp, versionKey,
  type BeginInput, type Finding, type Manifest, type RecentIndex, type Registry, type StreamOp,
} from './model';
import { ApiError, casUpdate, getJson, putIfAbsent } from './store';

export interface ApiEnv { REPORTS: R2Bucket }

export const REGISTRY_KEY = 'registry/projects.json';
export const INDEX_KEY = 'index/recent.json';
const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_FILES = 2000;
const SHA_RE = /^[0-9a-f]{64}$/;

const now = () => new Date().toISOString();
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store', ...headers } });

async function body<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new ApiError(400, 'bad_json'); }
}

export function safeRelPath(p: unknown): p is string {
  return typeof p === 'string' && p.length > 0 && p.length <= 512 && !p.startsWith('/') && !/[\\\0]/.test(p)
    && p.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
}

const str = (v: unknown, field: string, max = 500, optional = false): string => {
  if ((v === undefined || v === null || v === '') && optional) return '';
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new ApiError(400, 'bad_field', `${field} must be a string up to ${max} characters`, field);
  return v;
};
const bool = (v: unknown) => v === true;

export async function readRegistry(env: ApiEnv): Promise<{ doc: Registry; etag: string }> {
  return (await getJson<Registry>(env.REPORTS, REGISTRY_KEY)) ?? { doc: { projects: [] }, etag: '' };
}

async function activeProject(env: ApiEnv, id: string) {
  const p = (await readRegistry(env)).doc.projects.find((x) => x.id === id);
  if (!p) throw new ApiError(404, 'unknown_project', `No project ${id}`, 'project');
  return p;
}

/** Recomputes one project's slice of index/recent.json. Returns false when the index could not be written. */
export async function updateIndex(env: ApiEnv, project: string): Promise<boolean> {
  const p = (await readRegistry(env)).doc.projects.find((x) => x.id === project);
  const m = (await getJson<Manifest>(env.REPORTS, manifestKey(project)))?.doc;
  if (!p || !m) return true;
  try {
    await casUpdate<RecentIndex, null>(env.REPORTS, INDEX_KEY, (cur) => ({ doc: mergeSlice(cur, project, projectSlice(m, p, now()), now()), result: null }));
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.code === 'cas_exhausted') return false;
    throw e;
  }
}

// ---------- publish ----------

function parseBegin(b: any): BeginInput & { project: string } {
  const project = str(b.project, 'project', 64);
  if (!ID_RE.test(project)) throw new ApiError(422, 'bad_id', 'project must be kebab-case', 'project');
  const id = str(b.id, 'id', 71);
  if (!REPORT_ID_RE.test(id) || id.length - 11 > 60) throw new ApiError(422, 'bad_id', 'id must be YYYY-MM-DD-<slug> with a slug of at most 60 characters', 'id');
  if (!KINDS.includes(b.kind)) throw new ApiError(422, 'unknown_kind', `Kind must be one of ${KINDS.join(', ')}`, 'kind');
  const files = b.files;
  if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) throw new ApiError(400, 'bad_field', 'files must be a non-empty array', 'files');
  let total = 0;
  for (const f of files) {
    if (!safeRelPath(f?.path)) throw new ApiError(422, 'bad_path', `Bad file path ${f?.path}`, 'files');
    if (!Number.isInteger(f.size) || f.size < 0) throw new ApiError(400, 'bad_field', `Bad size for ${f.path}`, 'files');
    if (!SHA_RE.test(f.sha256)) throw new ApiError(400, 'bad_field', `Bad sha256 for ${f.path}`, 'files');
    if (f.size > MAX_FILE) throw new ApiError(413, 'too_large', `${f.path} is over 10 MB`, 'files');
    total += f.size;
  }
  if (total > MAX_TOTAL) throw new ApiError(413, 'too_large', 'Report folder is over 25 MB', 'files');
  if (new Set(files.map((f: any) => f.path)).size !== files.length) throw new ApiError(422, 'bad_path', 'Duplicate file path', 'files');
  if (!files.some((f: any) => f.path === 'index.html')) throw new ApiError(422, 'missing_index', 'index.html is required', 'files');
  const unattended = bool(b.unattended);
  const findings: Finding[] = Array.isArray(b.findings) ? b.findings.map((f: any) => ({
    file: String(f.file ?? ''), line: Number(f.line) || 0, kind: String(f.kind ?? ''), masked: String(f.masked ?? '').slice(-8),
  })) : [];
  const allow = bool(b.allow_secrets);
  if (findings.length && !unattended && !allow) throw new ApiError(422, 'secrets_unacknowledged', 'Secret findings need --allow-secrets when attended');
  const id_ = (v: any, field: string) => {
    const s = str(v?.id, field, 64);
    if (!ID_RE.test(s)) throw new ApiError(422, 'bad_id', `${field} id must be kebab-case`, field);
    return s;
  };
  let new_stream = b.new_stream ? { id: id_(b.new_stream, 'new_stream'), title: str(b.new_stream.title ?? b.new_stream.id, 'new_stream.title', 120), description: str(b.new_stream.description, 'new_stream.description', 500, true) } : undefined;
  let proposed_stream = b.proposed_stream ? { id: id_(b.proposed_stream, 'proposed_stream'), title: str(b.proposed_stream.title ?? b.proposed_stream.id, 'proposed_stream.title', 120) } : undefined;
  if (new_stream && unattended) { proposed_stream = { id: new_stream.id, title: new_stream.title }; new_stream = undefined; } // SPEC 5.4
  const c = b.classification ?? {};
  const typed = b.typed && typeof b.typed === 'object' && !Array.isArray(b.typed)
    ? Object.fromEntries(Object.entries(b.typed).filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))) as Record<string, string | number | boolean>
    : {};
  return {
    project, id, kind: b.kind, title: str(b.title, 'title', 200), summary: str(b.summary, 'summary', 500, true),
    stream: b.stream ? str(b.stream, 'stream', 64) : null,
    tags: Array.isArray(b.tags) ? b.tags.filter((t: unknown) => typeof t === 'string' && ID_RE.test(t)).slice(0, 20) : [],
    status: b.status === 'draft' ? 'draft' : 'final', typed, change_note: str(b.change_note, 'change_note', 500, true),
    supersedes: b.supersedes ? str(b.supersedes, 'supersedes', 71) : null,
    classification: { why: str(c.why, 'classification.why', 500, true), triage: bool(c.triage) || unattended, confirmed: bool(c.confirmed) && !unattended },
    ...(proposed_stream ? { proposed_stream } : {}), ...(new_stream ? { new_stream } : {}),
    upload: crypto.randomUUID(), files: files.map((f: any) => ({ path: f.path, size: f.size, sha256: f.sha256 })),
    findings, allow_secrets: allow,
    source: {
      unattended,
      ...(typeof b.source?.branch === 'string' ? { branch: b.source.branch.slice(0, 200) } : {}),
      ...(typeof b.source?.commit === 'string' ? { commit: b.source.commit.slice(0, 64) } : {}),
      ...(typeof b.source?.session === 'string' ? { session: b.source.session.slice(0, 200) } : {}),
    },
  };
}

export async function publishBegin(req: Request, env: ApiEnv): Promise<Response> {
  const input = parseBegin(await body<any>(req));
  const p = await activeProject(env, input.project);
  if (p.status !== 'active') throw new ApiError(422, 'project_archived', `${p.id} is archived`, 'project');
  const { n } = await casUpdate<Manifest, { n: number }>(env.REPORTS, manifestKey(input.project), (cur) => begin(cur, input.project, input, now()));
  return json({ upload: input.upload, id: input.id, version: n, put_base: `/api/publish/${input.project}/${input.id}/${n}/${input.upload}/` }, 201);
}

async function pendingVersion(env: ApiEnv, project: string, id: string, n: number, upload: string) {
  const m = (await getJson<Manifest>(env.REPORTS, manifestKey(project)))?.doc;
  const e = m?.reports.find((r) => r.id === id);
  const v = e?.versions.find((x) => x.n === n);
  if (!m || !e || !v || v.upload !== upload) throw new ApiError(404, 'unknown_upload');
  return Object.assign(v, { home: filesProject(m, e) });
}

export async function publishPut(req: Request, env: ApiEnv, project: string, id: string, n: number, upload: string, rawPath: string) {
  const path = decodeURIComponent(rawPath);
  const v = await pendingVersion(env, project, id, n, upload);
  if (v.state !== 'pending') throw new ApiError(409, 'not_pending', 'This upload is already committed');
  const f = v.files.find((x) => x.path === path);
  if (!f) throw new ApiError(422, 'undeclared_path', `${path} was not declared at begin`);
  const len = Number(req.headers.get('content-length'));
  if (!req.body && f.size !== 0) throw new ApiError(400, 'empty_body');
  if (req.headers.has('content-length') && len !== f.size) throw new ApiError(422, 'size_mismatch', `${path}: expected ${f.size} bytes, got ${len}`);
  const key = versionKey(v.home, id, n, path);
  const contentType = req.headers.get('content-type') ?? 'application/octet-stream';
  let created: boolean;
  try {
    created = await putIfAbsent(env.REPORTS, key, req.body ?? '', { sha256: f.sha256, httpMetadata: { contentType } });
  } catch (e) {
    // R2 rejects the write when the bytes do not hash to the declared sha256.
    throw new ApiError(422, 'sha_mismatch', `${path}: ${String((e as Error).message)}`);
  }
  if (!created) {
    const head = await env.REPORTS.head(key);
    const same = head?.checksums.sha256 && [...new Uint8Array(head.checksums.sha256)].map((b) => b.toString(16).padStart(2, '0')).join('') === f.sha256;
    if (!same) throw new ApiError(409, 'exists', `${path} already exists with different content`);
  }
  return json({ ok: true, path, created });
}

export async function publishCommit(env: ApiEnv, project: string, id: string, n: number, upload: string) {
  const v = await pendingVersion(env, project, id, n, upload);
  if (v.state === 'pending') {
    const missing: string[] = [];
    for (const f of v.files) if (!(await env.REPORTS.head(versionKey(v.home, id, n, f.path)))) missing.push(f.path);
    if (missing.length) throw new ApiError(422, 'missing_files', `Not uploaded: ${missing.slice(0, 10).join(', ')}`);
  }
  const { state, entry } = await casUpdate<Manifest, any>(env.REPORTS, manifestKey(project), (cur) => {
    return commit(cur, id, n, upload, now());
  });
  const version = entry.versions.find((x: any) => x.n === n);
  await putIfAbsent(env.REPORTS, versionKey(v.home, id, n, 'report.json'), JSON.stringify(reportJson(project, entry, version)), { httpMetadata: { contentType: 'application/json' } });
  const indexed = await updateIndex(env, project);
  return json({
    url: `/p/${project}/r/${id}/${state === 'live' ? '' : `v${n}/`}`, project, id, version: n, state,
    triage: entry.classification.triage, index_stale: !indexed,
  });
}

// ---------- registry, manifests, streams ----------

export async function registryGet(env: ApiEnv) {
  const { doc, etag } = await readRegistry(env);
  return json(doc, 200, { etag: `"${etag}"` });
}

export async function registryPut(req: Request, env: ApiEnv) {
  // Cloudflare weakens the etag when it compresses the GET (W/"…"); the only etag issued here is R2's strong one.
  const ifMatch = (req.headers.get('if-match') ?? '').replace(/^W\//, '').replace(/^"|"$/g, '');
  const next = await body<Registry>(req);
  const cur = await readRegistry(env);
  if (ifMatch !== cur.etag) throw new ApiError(409, 'etag_mismatch', 'The registry changed; re-read it and retry');
  if (!Array.isArray(next?.projects)) throw new ApiError(400, 'bad_field', 'projects must be an array', 'projects');
  const seen = new Set<string>();
  for (const p of next.projects) {
    if (typeof p?.id !== 'string' || !ID_RE.test(p.id) || p.id.length > 64) throw new ApiError(422, 'bad_id', `Bad project id ${p?.id}`, 'id');
    if (seen.has(p.id)) throw new ApiError(422, 'duplicate_id', `Duplicate project ${p.id}`, 'id');
    seen.add(p.id);
    str(p.title, 'title', 120);
    if (!['active', 'archived'].includes(p.status)) throw new ApiError(422, 'bad_field', 'status must be active or archived', 'status');
    const mt = p.match ?? ({} as any);
    p.match = { remotes: (mt.remotes ?? []).map(String), paths: (mt.paths ?? []).map(String), keywords: (mt.keywords ?? []).map(String) };
    p.description = typeof p.description === 'string' ? p.description : '';
  }
  for (const p of cur.doc.projects) {
    if (!seen.has(p.id)) throw new ApiError(422, 'no_delete', `Projects are archived, never removed (${p.id})`, 'id');
  }
  const put = await env.REPORTS.put(REGISTRY_KEY, JSON.stringify(next), {
    httpMetadata: { contentType: 'application/json' },
    onlyIf: cur.etag ? { etagMatches: cur.etag } : { etagDoesNotMatch: '*' },
  });
  if (!put) throw new ApiError(409, 'etag_mismatch', 'The registry changed; re-read it and retry');
  const t = now();
  for (const p of next.projects) {
    await putIfAbsent(env.REPORTS, manifestKey(p.id), JSON.stringify({ project: p.id, updated: t, streams: [], reports: [] } satisfies Manifest), { httpMetadata: { contentType: 'application/json' } });
    await updateIndex(env, p.id);
  }
  return json(next, 200, { etag: `"${put.etag}"` });
}

export async function manifestGet(env: ApiEnv, project: string) {
  const m = await getJson<Manifest>(env.REPORTS, manifestKey(project));
  if (!m) throw new ApiError(404, 'unknown_project');
  return json(m.doc);
}

export async function streamPost(req: Request, env: ApiEnv, project: string, stream: string) {
  if (!ID_RE.test(project) || !ID_RE.test(stream)) throw new ApiError(422, 'bad_id');
  await activeProject(env, project);
  const b = await body<any>(req);
  const ops = ['create', 'rename', 'merge', 'done', 'archive', 'unarchive'];
  if (!ops.includes(b?.op)) throw new ApiError(400, 'bad_field', `op must be one of ${ops.join(', ')}`, 'op');
  if ((b.op === 'rename' || b.op === 'merge') && !(typeof b.to === 'string' && ID_RE.test(b.to))) throw new ApiError(422, 'bad_id', 'to must be kebab-case', 'to');
  const op: StreamOp = b.op === 'create'
    ? { op: 'create', title: str(b.title ?? stream, 'title', 120), description: str(b.description, 'description', 500, true) }
    : b.op === 'rename' ? { op: 'rename', to: b.to, ...(b.title ? { title: str(b.title, 'title', 120) } : {}) }
    : b.op === 'merge' ? { op: 'merge', to: b.to } : { op: b.op };
  const result = await casUpdate<Manifest, any>(env.REPORTS, manifestKey(project), (cur) => streamOp(cur, project, stream, op, now()));
  await updateIndex(env, project);
  return json(result);
}

// ---------- export, design system, reindex ----------

export async function rawGet(env: ApiEnv, project: string, id: string, n: number, path: string) {
  const m = (await getJson<Manifest>(env.REPORTS, manifestKey(project)))?.doc;
  const e = m?.reports.find((r) => r.id === id);
  const obj = await env.REPORTS.get(versionKey(m && e ? filesProject(m, e) : project, id, n, decodeURIComponent(path)));
  if (!obj) throw new ApiError(404, 'not_found');
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': 'private, no-store' } });
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function dsPut(req: Request, env: ApiEnv, path: string) {
  const p = decodeURIComponent(path);
  if (!safeRelPath(p)) throw new ApiError(422, 'bad_path');
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > MAX_FILE * 2) throw new ApiError(413, 'too_large');
  const key = `ds/lynx-reports/v1/${p}`;
  const contentType = req.headers.get('content-type') ?? 'application/octet-stream';
  if (await putIfAbsent(env.REPORTS, key, bytes, { httpMetadata: { contentType } })) return json({ status: 'created' }, 201);
  const existing = await env.REPORTS.get(key);
  const same = existing && hex(await crypto.subtle.digest('SHA-256', await existing.arrayBuffer())) === hex(await crypto.subtle.digest('SHA-256', bytes));
  if (!same) throw new ApiError(409, 'ds_immutable', `${p} differs from the published v1 file; ship a v2 instead`);
  return json({ status: 'same' });
}

export async function reindex(env: ApiEnv) {
  const reg = (await readRegistry(env)).doc;
  const t = now();
  let index: RecentIndex | null = null;
  for (const p of reg.projects) {
    const m = (await getJson<Manifest>(env.REPORTS, manifestKey(p.id)))?.doc;
    if (m) index = mergeSlice(index, p.id, projectSlice(m, p, t), t);
  }
  const doc = index ?? mergeSlice(null, '', { reports: [], triage: [], project: null, streams: [] }, t);
  await casUpdate<RecentIndex, null>(env.REPORTS, INDEX_KEY, () => ({ doc, result: null }));
  return json({ reports: doc.reports.length, triage: doc.triage.length });
}
