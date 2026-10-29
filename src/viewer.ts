// Browser-identity actions (SPEC 2): pin, prefs, archive. Triage actions join in phase 4.
import { updateIndex } from './api';
import { manifestKey, type Manifest } from './model';
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
