// What the Worker reads to serve the hub and report chrome: the registry, manifests, and the viewer's KV state (SPEC 6.5).
import { readRegistry } from '../api';
import { PALETTES, manifestKey, type Manifest, type Project } from '../model';
import { getJson } from '../store';

export interface Prefs { theme: 'light' | 'dark' | 'system'; palette: string }
export interface Seen { last_visit: string; opened: string[] }
export interface Viewer { pins: string[]; seen: Seen; prefs: Prefs }
export interface ViewEnv { REPORTS: R2Bucket; STATE: KVNamespace }

export const PALETTE_IDS: string[] = [...PALETTES];

export async function viewer(env: ViewEnv): Promise<Viewer> {
  const [pins, seen, prefs] = await Promise.all([
    env.STATE.get<string[]>('pins', 'json'), env.STATE.get<Seen>('seen', 'json'), env.STATE.get<Prefs>('prefs', 'json'),
  ]);
  return {
    pins: pins ?? [],
    seen: seen ?? { last_visit: new Date(0).toISOString(), opened: [] },
    // A palette from the lynx-reports era (tokyo-night, graphite…) falls back to the default.
    prefs: { theme: prefs?.theme ?? 'system', palette: prefs?.palette && PALETTE_IDS.includes(prefs.palette) ? prefs.palette : 'catppuccin' },
  };
}

export const isNew = (v: Viewer, ref: string, published: string) => published > v.seen.last_visit && !v.seen.opened.includes(ref);

export async function manifest(env: ViewEnv, project: string): Promise<Manifest | null> {
  return (await getJson<Manifest>(env.REPORTS, manifestKey(project)))?.doc ?? null;
}

/** All projects' manifests. Few projects, so this stays cheap. */
export async function everything(env: ViewEnv, includeArchivedProjects: boolean) {
  const reg = (await readRegistry(env)).doc;
  const projects = reg.projects.filter((p) => includeArchivedProjects || p.status === 'active');
  const manifests = await Promise.all(projects.map((p) => manifest(env, p.id)));
  return projects.map((p, i) => ({ p, m: manifests[i] })).filter((x): x is { p: Project; m: Manifest } => !!x.m);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string, now = Date.now()) {
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === new Date(now).getUTCFullYear();
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${sameYear ? '' : ` ${d.getUTCFullYear()}`}`;
}

export const kindLabel = (k: string) => k.charAt(0).toUpperCase() + k.slice(1);
