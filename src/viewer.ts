// Browser-identity actions (SPEC 2): pin, prefs, archive, triage.
import { updateIndex } from './api';
import { ID_RE, KINDS, filesProject, findStream, manifestKey, triage as applyTriage, type Manifest, type ReportEntry, type TriageAction } from './model';
import { readRegistry } from './api';
import { PALETTE_IDS, type Prefs, type ViewEnv } from './pages/data';
import { ApiError, casUpdate } from './store';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });

/** Viewer POSTs must come from a Roost page (CSRF), on top of the Access JWT. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) throw new ApiError(403, 'bad_origin', 'Cross-origin request refused');
}

async function body(req: Request): Promise<any> {
  sameOrigin(req);
  try { return await req.json(); } catch { throw new ApiError(400, 'bad_json'); }
}

function parseRef(ref: unknown): [string, string] {
  const m = typeof ref === 'string' ? ref.match(/^([a-z0-9-]+)\/(\d{4}-\d{2}-\d{2}-[a-z0-9-]+)$/) : null;
  if (!m) throw new ApiError(400, 'bad_ref', 'ref must be <project>/<report id>', 'ref');
  return [m[1], m[2]];
}

async function requireReport(env: ViewEnv, project: string, id: string) {
  const obj = await env.REPORTS.get(manifestKey(project));
  const m = obj ? ((await obj.json()) as Manifest) : null;
  if (!m?.reports.some((r) => r.id === id)) throw new ApiError(404, 'unknown_report');
}

// ponytail: KV read-modify-write without a lock; one person, one tap at a time.
export async function pin(req: Request, env: ViewEnv) {
  const b = await body(req);
  const [project, id] = parseRef(b.ref);
  await requireReport(env, project, id);
  const ref = `${project}/${id}`;
  const pins = ((await env.STATE.get<string[]>('pins', 'json')) ?? []).filter((r) => r !== ref);
  const next = b.pinned === false ? pins : [...pins, ref];
  await env.STATE.put('pins', JSON.stringify(next));
  return json({ pins: next });
}

export async function prefs(req: Request, env: ViewEnv) {
  const b = await body(req);
  const cur = (await env.STATE.get<Prefs>('prefs', 'json')) ?? { theme: 'system', palette: 'catppuccin' };
  if (b.theme !== undefined && !['light', 'dark', 'system'].includes(b.theme)) throw new ApiError(422, 'bad_theme', 'theme is light, dark or system', 'theme');
  if (b.palette !== undefined && !PALETTE_IDS.includes(b.palette)) throw new ApiError(422, 'bad_palette', `palette is one of ${PALETTE_IDS.join(', ')}`, 'palette');
  const next: Prefs = { theme: b.theme ?? cur.theme, palette: b.palette ?? cur.palette };
  await env.STATE.put('prefs', JSON.stringify(next));
  return json(next);
}

export async function archive(req: Request, env: ViewEnv) {
  const b = await body(req);
  const [project, id] = parseRef(b.ref);
  const archived = b.archived !== false;
  const entry = await casUpdate<Manifest, any>(env.REPORTS, manifestKey(project), (m) => {
    const e = m?.reports.find((r) => r.id === id);
    if (!m || !e) throw new ApiError(404, 'unknown_report');
    e.archived = archived ? (e.archived ?? new Date().toISOString()) : null;
    m.updated = new Date().toISOString();
    return { doc: m, result: e };
  });
  await updateIndex(env, project);
  return json(entry);
}

/** POST /api/triage/<project>/<id>: confirm, undo, reclassify (also across projects), publish anyway, reject. */
export async function triageAction(req: Request, env: ViewEnv, project: string, id: string) {
  const b = await body(req);
  const now = new Date().toISOString();
  const actions = ['confirm', 'undo', 'reclassify', 'publish', 'reject'];
  if (!actions.includes(b?.action)) throw new ApiError(400, 'bad_field', `action is one of ${actions.join(', ')}`, 'action');
  let a: TriageAction = { action: b.action };
  if (b.action === 'reclassify') {
    if (b.kind !== undefined && !(KINDS as readonly string[]).includes(b.kind)) throw new ApiError(422, 'unknown_kind', 'Unknown kind', 'kind');
    if (b.stream !== undefined && b.stream !== null && !(typeof b.stream === 'string' && ID_RE.test(b.stream))) throw new ApiError(422, 'bad_id', 'Bad stream', 'stream');
    const ns = b.new_stream;
    if (ns && !(typeof ns.id === 'string' && ID_RE.test(ns.id) && ns.id.length <= 64)) throw new ApiError(422, 'bad_id', 'New stream names are lowercase words joined by hyphens', 'new_stream');
    a = { action: 'reclassify', ...(b.kind ? { kind: b.kind } : {}), ...(b.stream !== undefined ? { stream: b.stream } : {}), ...(ns ? { new_stream: { id: ns.id, title: String(ns.title || ns.id).slice(0, 120) } } : {}) };
    if (b.project && b.project !== project) return move(env, project, id, b.project, a, now);
  }
  const entry = await casUpdate<Manifest, ReportEntry>(env.REPORTS, manifestKey(project), (m) => applyTriage(m, id, a, now));
  await updateIndex(env, project);
  return json({ entry });
}

// ponytail: two CAS writes, target first; a crash between them leaves the report listed in both projects
// until the next triage action on it. Rare, visible, and nothing is lost.
async function move(env: ViewEnv, from: string, id: string, to: string, a: TriageAction & { action: 'reclassify' }, now: string) {
  const reg = (await readRegistry(env)).doc;
  if (!reg.projects.some((p) => p.id === to && p.status === 'active')) throw new ApiError(422, 'unknown_project', `No active project ${to}`, 'project');
  const srcObj = await env.REPORTS.get(manifestKey(from));
  const src = srcObj ? ((await srcObj.json()) as Manifest) : null;
  const orig = src?.reports.find((r) => r.id === id);
  if (!src || !orig || orig.moved_to) throw new ApiError(404, 'unknown_report');
  if (orig.versions.some((v) => v.state === 'quarantined')) throw new ApiError(422, 'review_required', 'Review the secret findings before moving this report');
  const home = filesProject(src, orig);
  const entry = await casUpdate<Manifest, ReportEntry>(env.REPORTS, manifestKey(to), (m) => {
    if (!m) throw new ApiError(404, 'unknown_project');
    if (m.reports.some((r) => r.id === id)) throw new ApiError(409, 'id_taken', `${to} already has a report ${id}`);
    const copy: ReportEntry = { ...structuredClone(orig), home: home === to ? undefined : home, stream: null };
    delete copy.moved_to;
    m.reports.push(copy);
    const keep = a.new_stream || a.stream !== undefined ? a : { ...a, stream: orig.stream && findStream(m, orig.stream) ? orig.stream : null };
    return applyTriage(m, id, keep, now);
  });
  await casUpdate<Manifest, null>(env.REPORTS, manifestKey(from), (m) => {
    const e = m?.reports.find((r) => r.id === id);
    if (!m || !e) throw new ApiError(404, 'unknown_report');
    e.moved_to = to;
    e.classification.triage = false;
    m.updated = now;
    return { doc: m, result: null };
  });
  await updateIndex(env, from);
  await updateIndex(env, to);
  return json({ entry, moved_to: to });
}
