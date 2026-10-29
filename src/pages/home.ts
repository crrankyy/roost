// Home page (SPEC 6.1): triage strip, pinned, recent with filters, active streams, projects.
import { readRegistry } from '../api';
import type { Manifest, Project } from '../model';
import {
  applyFilters, everything, index, item, listProject, manifest, parseFilters, projectSlice, viewer,
  type Listed, type ViewEnv, type Viewer,
} from './data';
import { html } from './html';
import { page } from './layout';
import { button, empty, filterControls, list, pinned, projectRows, reportRow, secHead, streamRows, triageStrip } from './parts';
import { cls } from '../generated/lynx';

const RECENT = 15;
const PHONE_RECENT = 10;

/** Pins in pin order, resolved to rows; pins to reports we can't find are skipped. */
export async function pinnedItems(env: ViewEnv, v: Viewer, known: Listed[]): Promise<Listed[]> {
  const out: Listed[] = [];
  const cache = new Map<string, Manifest | null>();
  let reg: Project[] | null = null;
  for (const ref of v.pins) {
    const hit = known.find((r) => `${r.project}/${r.id}` === ref);
    if (hit) { out.push(hit); continue; }
    const [project, id] = ref.split('/');
    if (!cache.has(project)) cache.set(project, await manifest(env, project));
    reg ??= (await readRegistry(env)).doc.projects;
    const m = cache.get(project);
    const p = reg.find((x) => x.id === project);
    const e = m?.reports.find((r) => r.id === id);
    if (m && p && e && e.latest !== null) out.push(item(m, p, e));
  }
  return out;
}

export async function home(req: Request, env: ViewEnv, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const f = parseFilters(url);
  const [v, idx, reg] = await Promise.all([viewer(env), index(env), readRegistry(env)]);
  const projects = reg.doc.projects.filter((p) => f.archived || p.status === 'active');

  let pool: Listed[];
  let projectSummaries = idx.projects.map((p) => ({ ...p, archived: false }));
  if (f.archived) {
    // The index leaves archived items out, so read the manifests.
    const all = await everything(env, true);
    pool = all.flatMap(({ p, m }) => listProject(m, p, true)).sort((a, b) => b.published.localeCompare(a.published));
    projectSummaries = all.map(({ p, m }) => {
      const s = projectSlice(m, { ...p, status: 'active' }, new Date().toISOString()).project!;
      return { ...s, archived: p.status === 'archived' };
    });
  } else {
    pool = idx.reports.map((r) => ({ ...r, archived: false, superseded: r.status === 'superseded' }));
  }
  const filtered = applyFilters(pool, f);
  const recent = filtered.slice(0, RECENT);
  const pins = await pinnedItems(env, v, pool);
  const fc = filterControls({ f, path: '/', projects: projects.map((p) => ({ id: p.id, title: p.title })), items: pool.map(({ project, kind, published, archived }) => ({ project, kind, published, archived })), withProject: true, sheetTitle: 'Filter recent reports' });

  const recentBody = recent.length
    ? list(recent.map((r, i) => reportRow(r, v, { more: i >= PHONE_RECENT })),
      recent.length > PHONE_RECENT ? html`<div class="hub-showmore hub-phone">${button(cls.btnGhostSm, `Show ${recent.length - PHONE_RECENT} more`, 'data-show-more')}</div>` : '')
    : empty(pool.length ? 'No reports match these filters.' : 'Nothing published yet. Reports appear here when `roost publish` runs.');

  const body = html`
${triageStrip(idx.triage, 'home')}
${pinned(pins)}
<div class="hub-cols">
<div class="hub-col">
<section class="hub-sec" aria-labelledby="recent-h">
${secHead('recent-h', 'Recent', filtered.length > RECENT || !recent.length ? `Last ${RECENT} across all projects` : `${recent.length === 1 ? '1 report' : `Last ${recent.length}`} across all projects`, fc.phone)}
${fc.desk}
${recentBody}
</section>
</div>
<div class="hub-col">
${idx.streams.length ? html`<section class="hub-sec" aria-labelledby="streams-h">${secHead('streams-h', 'Active streams', 'Reports in the last 14 days')}${list(streamRows(idx.streams))}</section>` : ''}
<section class="hub-sec" aria-labelledby="projects-h">${secHead('projects-h', 'Projects')}${projectSummaries.length ? list(projectRows(projectSummaries)) : empty('No projects yet. Add one with `roost project add`.')}</section>
</div>
</div>`;

  // SPEC 6.5: last_visit advances when the home page loads; the opened list keeps only entries newer than it.
  ctx.waitUntil(env.STATE.put('seen', JSON.stringify({ last_visit: new Date().toISOString(), opened: [] })));
  return page({ title: 'Roost', prefs: v.prefs, body, data: { page: 'home' } });
}
