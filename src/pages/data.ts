// What the hub pages read: the global index, the registry, manifests, and the viewer's KV state (SPEC 6.5).
import { INDEX_KEY, readRegistry } from '../api';
import {
  KINDS, liveVersion, manifestKey, projectSlice, streamHidden, triageItem,
  type Kind, type Manifest, type Project, type RecentIndex, type RecentItem, type ReportEntry, type TriageItem,
} from '../model';
import { getJson } from '../store';

export interface Prefs { theme: 'light' | 'dark' | 'system'; palette: string }
export interface Seen { last_visit: string; opened: string[] }
export interface Viewer { pins: string[]; seen: Seen; prefs: Prefs }
export interface ViewEnv { REPORTS: R2Bucket; STATE: KVNamespace }

export const PALETTES = {
  Expressive: [['catppuccin', 'Catppuccin'], ['tokyo-night', 'Tokyo Night'], ['rose-pine', 'Rosé Pine'], ['nord', 'Nord'], ['dracula', 'Dracula'], ['kanagawa', 'Kanagawa']],
  Minimal: [['graphite', 'Graphite'], ['ash', 'Ash'], ['solarized', 'Solarized'], ['gruvbox', 'Gruvbox'], ['everforest', 'Everforest'], ['github', 'GitHub'], ['ayu', 'Ayu'], ['flexoki', 'Flexoki']],
} as const;
export const PALETTE_IDS: string[] = [...PALETTES.Expressive, ...PALETTES.Minimal].map(([id]) => id);

export async function viewer(env: ViewEnv): Promise<Viewer> {
  const [pins, seen, prefs] = await Promise.all([
    env.STATE.get<string[]>('pins', 'json'), env.STATE.get<Seen>('seen', 'json'), env.STATE.get<Prefs>('prefs', 'json'),
  ]);
  return {
    pins: pins ?? [],
    seen: seen ?? { last_visit: new Date(0).toISOString(), opened: [] },
    prefs: { theme: prefs?.theme ?? 'system', palette: prefs?.palette && PALETTE_IDS.includes(prefs.palette) ? prefs.palette : 'catppuccin' },
  };
}

export const isNew = (v: Viewer, ref: string, published: string) => published > v.seen.last_visit && !v.seen.opened.includes(ref);

export async function index(env: ViewEnv): Promise<RecentIndex> {
  return (await getJson<RecentIndex>(env.REPORTS, INDEX_KEY))?.doc ?? { updated: '', reports: [], triage: [], projects: [], streams: [] };
}

export async function manifest(env: ViewEnv, project: string): Promise<Manifest | null> {
  return (await getJson<Manifest>(env.REPORTS, manifestKey(project)))?.doc ?? null;
}

export interface Listed extends RecentItem { archived: boolean; superseded: boolean }

/** Every report of one project, as list items. `archived` includes archived reports and archived streams. */
export function listProject(m: Manifest, p: Project, archived: boolean): Listed[] {
  return m.reports
    .filter((e) => e.latest !== null && (archived || (!e.archived && !streamHidden(m, e))))
    .map((e) => item(m, p, e));
}

export function item(m: Manifest, p: Project, e: ReportEntry): Listed {
  return {
    project: m.project, project_title: p.title, id: e.id, title: e.title, summary: e.summary, kind: e.kind, stream: e.stream,
    status: e.status, published: liveVersion(e)?.published ?? e.created, version: e.latest ?? 0,
    versions: e.versions.filter((v) => v.state === 'live').length,
    archived: !!e.archived || streamHidden(m, e), superseded: e.status === 'superseded',
  };
}

/** All projects' manifests, for archived views and cross-project kind pages. Few projects, so this stays cheap. */
export async function everything(env: ViewEnv, includeArchivedProjects: boolean) {
  const reg = (await readRegistry(env)).doc;
  const projects = reg.projects.filter((p) => includeArchivedProjects || p.status === 'active');
  const manifests = await Promise.all(projects.map((p) => manifest(env, p.id)));
  return projects.map((p, i) => ({ p, m: manifests[i] })).filter((x): x is { p: Project; m: Manifest } => !!x.m);
}

export function projectTriage(m: Manifest, p: Project): TriageItem[] {
  return m.reports.map((e) => triageItem(m, e, p.title)).filter((t): t is TriageItem => !!t);
}

export { projectSlice, KINDS, type Kind };

// ---------- filters (SPEC 4: ?archived=1, ?from=&to=, ?kind=a,b, ?project=x; plus ?range=7|30|90) ----------

export interface Filters { project: string; kinds: Kind[]; range: '' | '7' | '30' | '90' | 'custom'; from: string; to: string; archived: boolean }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(url: URL): Filters {
  const q = url.searchParams;
  const kinds = (q.get('kind') ?? '').split(',').filter((k): k is Kind => (KINDS as readonly string[]).includes(k));
  const range = (['7', '30', '90'] as const).find((r) => r === q.get('range')) ?? '';
  const from = DATE_RE.test(q.get('from') ?? '') ? q.get('from')! : '';
  const to = DATE_RE.test(q.get('to') ?? '') ? q.get('to')! : '';
  return { project: /^[a-z0-9-]+$/.test(q.get('project') ?? '') ? q.get('project')! : '', kinds, range: range || (from || to ? 'custom' : ''), from, to, archived: q.get('archived') === '1' };
}

export const activeFilterCount = (f: Filters, withProject = true) =>
  (withProject && f.project ? 1 : 0) + (f.kinds.length ? 1 : 0) + (f.range ? 1 : 0) + (f.archived ? 1 : 0);

export function applyFilters<T extends { project: string; kind: Kind; published: string }>(items: T[], f: Filters, now = Date.now()): T[] {
  const since = f.range && f.range !== 'custom' ? new Date(now - Number(f.range) * 86_400_000).toISOString() : f.from ? `${f.from}T00:00:00` : '';
  const until = f.range === 'custom' && f.to ? `${f.to}T23:59:59.999` : '';
  return items.filter((r) => (!f.project || r.project === f.project) && (!f.kinds.length || f.kinds.includes(r.kind))
    && (!since || r.published >= since) && (!until || r.published <= until));
}

export function filterQuery(f: Filters, over: Partial<Filters> = {}): string {
  const g = { ...f, ...over };
  const q = new URLSearchParams();
  if (g.project) q.set('project', g.project);
  if (g.kinds.length) q.set('kind', g.kinds.join(','));
  if (g.range && g.range !== 'custom') q.set('range', g.range);
  if (g.range === 'custom') { if (g.from) q.set('from', g.from); if (g.to) q.set('to', g.to); }
  if (g.archived) q.set('archived', '1');
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ---------- time ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ago(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!t) return '';
  const min = Math.max(0, Math.round((now - t) / 60_000));
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 35) return `${Math.floor(days / 7)} weeks ago`;
  return shortDate(iso, now);
}

export function shortDate(iso: string, now = Date.now()) {
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === new Date(now).getUTCFullYear();
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${sameYear ? '' : ` ${d.getUTCFullYear()}`}`;
}

export const kindLabel = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
