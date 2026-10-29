// Project page (SPEC 6.2), its stream and kind views, and the cross-project kind view (SPEC 4).
import { readRegistry } from '../api';
import { cls, icons, tpl } from '../generated/lynx';
import { ACTIVE_DAYS, DAY_MS, findStream, KINDS, type Kind, type Stream } from '../model';
import {
  ago, applyFilters, everything, kindLabel, listProject, manifest, parseFilters, plural, projectTriage, viewer,
  type Listed, type ViewEnv, type Viewer,
} from './data';
import { fill, html, raw, type Raw } from './html';
import { page } from './layout';
import { empty, filterControls, icon, kindBadge, list, reportRow, secHead, svg, triageStrip } from './parts';

const notFound = (prefs: Viewer['prefs'], what: string) =>
  page({ title: 'Not found · Roost', prefs, status: 404, body: html`${empty(`${what} doesn't exist.`)}` });

function titleBlock(crumbs: [string, string][], title: string, caption: string, avatar = true) {
  const bc = crumbs.length === 1
    ? fill(tpl.breadcrumb, { HREF: crumbs[0][1], LINK: crumbs[0][0], PAGE: title })
    : fill(tpl.breadcrumb3, { HREF: crumbs[0][1], LINK: crumbs[0][0], HREFB: crumbs[1][1], LINKB: crumbs[1][0], PAGE: title });
  return html`<div style="display: flex; flex-direction: column; gap: 12px; padding: 0 4px">${bc}
<div style="display: flex; align-items: center; gap: 12px">${avatar ? raw(tpl.avatarFolder) : ''}<div style="display: flex; flex-direction: column; min-width: 0"><h1 class="hub-h1">${title}</h1><p class="hub-caption">${caption}</p></div></div></div>`;
}

const isActive = (s: Stream, now: number) => s.status === 'active' && !!s.last_report && Date.parse(s.last_report) >= now - ACTIVE_DAYS * DAY_MS;

function toggleGroup(base: string, byKind: boolean) {
  // ToggleGroup's two states are links, so it needs no React.
  const item = (label: string, on: boolean, href: string) =>
    html`<button type="button" data-href="${href}" role="radio" aria-checked="${on ? 'true' : 'false'}" data-state="${on ? 'on' : 'off'}" class="${raw(tglItem)}">${label}</button>`;
  return html`<div role="radiogroup" aria-label="Group reports by" class="${raw(tglRoot)}">${item('By stream', !byKind, base)}${item('By kind', byKind, `${base}${base.includes('?') ? '&' : '?'}group=kind`)}</div>`;
}
const tglRoot = tpl.toggleGroup.match(/^<div[^>]*class="([^"]*)"/)![1];
const tglItem = tpl.toggleGroup.match(/<button[^>]*class="([^"]*)"/)![1];

function kindGroups(rows: Listed[], v: Viewer, showProject: boolean) {
  const groups = new Map<Kind, Listed[]>();
  for (const r of rows) groups.set(r.kind, [...(groups.get(r.kind) ?? []), r]);
  const ordered = [...groups.entries()].sort((a, b) => b[1][0].published.localeCompare(a[1][0].published));
  return html`<div class="hub-kindgroups">${ordered.map(([k, rs]) => html`<article class="lr-panel" style="display: flex; flex-direction: column; min-width: 0">
<div class="hub-card-head" style="padding-bottom: 0">${kindBadge(k)}<span class="hub-caption" style="flex: 1">${plural(rs.length, 'report')}</span></div>
<div class="hub-list">${rs.map((r) => reportRow(r, v, { summary: false, badge: false, path: showProject || !!r.stream }))}</div></article>`)}</div>`;
}

export async function projectPage(req: Request, env: ViewEnv, projectId: string, view: { kind?: string; stream?: string } = {}): Promise<Response> {
  const url = new URL(req.url);
  const f = parseFilters(url);
  const [v, reg, m] = await Promise.all([viewer(env), readRegistry(env), manifest(env, projectId)]);
  const p = reg.doc.projects.find((x) => x.id === projectId);
  if (!p || !m) return notFound(v.prefs, 'This project');
  const now = Date.now();
  const base = `/p/${p.id}/`;

  let stream: Stream | undefined;
  if (view.stream) {
    stream = findStream(m, view.stream);
    if (!stream) return notFound(v.prefs, 'This stream');
    if (stream.id !== view.stream) return Response.redirect(new URL(`/p/${p.id}/stream/${stream.id}/${url.search}`, req.url).toString(), 301);
  }
  if (view.kind && !(KINDS as readonly string[]).includes(view.kind)) return notFound(v.prefs, 'This kind');

  const all = listProject(m, p, f.archived || stream?.status === 'archived' || p.status === 'archived').sort((a, b) => b.published.localeCompare(a.published));
  const rows = applyFilters(all, { ...f, project: '' });
  const live = all.filter((r) => !r.archived);
  const activeStreams = m.streams.filter((s) => isActive(s, now)).sort((a, b) => (b.last_report ?? '').localeCompare(a.last_report ?? ''));
  const last = live[0]?.published;
  const caption = `${plural(live.length, 'report')} · ${plural(activeStreams.length, 'active stream')}${last ? ` · last activity ${ago(last)}` : ''}${p.status === 'archived' ? ' · archived' : ''}`;
  const fc = filterControls({ f, path: url.pathname, projects: [], items: all, withProject: false, sheetTitle: 'Filter reports' });

  // A stream or kind view: one list.
  if (stream || view.kind) {
    const subset = stream ? rows.filter((r) => r.stream === stream!.id) : rows.filter((r) => r.kind === view.kind);
    const title = stream ? stream.id : kindLabel(view.kind!);
    const sub = stream
      ? `${stream.title !== stream.id ? `${stream.title} · ` : ''}${plural(subset.length, 'report')} · ${stream.status}${stream.description ? ` · ${stream.description}` : ''}`
      : `${plural(subset.length, 'report')} in ${p.title}`;
    const body = html`${titleBlock([['Home', '/'], [p.title, base]], title, sub, false)}
<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">${fc.phone}<span class="hub-phone" style="flex: 1"></span>${fc.desk}</div>
<section class="hub-sec" aria-label="Reports">${subset.length ? list(subset.map((r) => reportRow(r, v, { badge: !view.kind, path: !stream }))) : empty('No reports match.')}</section>`;
    return page({ title: `${title} · ${p.title} · Roost`, prefs: v.prefs, body, data: { page: 'list' } });
  }

  const byKind = url.searchParams.get('group') === 'kind';
  const triage = projectTriage(m, p);
  const inActive = new Set(activeStreams.map((s) => s.id));
  const general = rows.filter((r) => !r.stream);
  const quiet = m.streams.filter((s) => !inActive.has(s.id) && s.status !== 'archived');
  const groupBase = `${base}${url.search.replace(/[?&]group=kind/, '').replace(/^&/, '?')}`;

  let main: Raw;
  if (byKind) {
    const scoped = rows.filter((r) => !r.stream || inActive.has(r.stream));
    main = html`<section class="hub-sec" aria-labelledby="kinds-h">${secHead('kinds-h', 'By kind', `${plural(scoped.length, 'report')} in active streams and General, newest kind first`)}
${scoped.length ? kindGroups(scoped, v, false) : empty('No reports match.')}</section>`;
  } else {
    const cards = activeStreams.map((s) => {
      const rs = rows.filter((r) => r.stream === s.id);
      return html`<article class="lr-panel" style="display: flex; flex-direction: column; min-width: 0">
<div class="hub-card-head"><span class="hub-tile-quiet">${icon(svg.stream)}</span>
<div class="hub-card-title"><h3 class="hub-card-name">${s.id}</h3><span class="hub-caption">${plural(rs.length, 'report')} · latest ${ago(s.last_report!).toLowerCase()}</span></div>
<a href="/p/${p.id}/stream/${s.id}/" style="font-size: 12px; line-height: 16px; padding: 8px 4px; white-space: nowrap">All ${rs.length}</a></div>
<div class="hub-list">${rs.slice(0, 3).map((r) => reportRow(r, v, { summary: false, path: false }))}</div></article>`;
    });
    main = html`${cards.length ? html`<section class="hub-sec" aria-labelledby="active-h">${secHead('active-h', 'Active streams', 'Latest 3 reports each')}<div class="hub-streams">${cards}</div></section>` : ''}
<section class="hub-sec" aria-labelledby="general-h">${secHead('general-h', 'General', 'Reports without a stream')}${general.length ? list(general.map((r) => reportRow(r, v, { path: false }))) : empty('No reports without a stream.')}</section>`;
  }

  const doneCount = quiet.reduce((n, s) => n + all.filter((r) => r.stream === s.id).length, 0);
  const done = quiet.length ? html`<section class="hub-sec" aria-label="Done streams"><details class="lr-panel" data-disclosure>
<summary class="${raw(cls.btnGhost)} hub-disclosure" style="list-style: none" data-state="closed"><span class="hub-chev" style="display: flex; color: var(--muted-foreground)">${raw(icons.ChevronRight)}</span><span class="hub-label">Done streams</span><span class="hub-count">${plural(quiet.length, 'stream')} · ${plural(doneCount, 'report')}</span></summary>
<div class="hub-list" style="padding-top: 0">${quiet.map((s) => html`<a class="hub-row hub-row-h" href="/p/${p.id}/stream/${s.id}/">
<span class="hub-tile-quiet">${icon(svg.stream)}</span>
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column"><span class="hub-label">${s.id}</span><span class="hub-caption">${plural(all.filter((r) => r.stream === s.id).length, 'report')} · ${s.status === 'done' ? 'done' : 'quiet'}${s.last_report ? ` · last ${ago(s.last_report).toLowerCase()}` : ''}</span></span>
<span style="color: var(--muted-foreground); display: flex">${raw(icons.ChevronRight)}</span></a>`)}</div></details></section>` : '';

  const body = html`${titleBlock([['Home', '/']], p.title, caption)}
${triageStrip(triage, 'project')}
<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">${fc.phone}<span class="hub-phone" style="flex: 1"></span>${fc.desk}${toggleGroup(groupBase, byKind)}</div>
${main}
${done}`;
  return page({ title: `${p.title} · Roost`, prefs: v.prefs, body, data: { page: 'project' } });
}

export async function kindPage(req: Request, env: ViewEnv, kind: string): Promise<Response> {
  const url = new URL(req.url);
  const f = parseFilters(url);
  const v = await viewer(env);
  if (!(KINDS as readonly string[]).includes(kind)) return notFound(v.prefs, 'This kind');
  const all = (await everything(env, f.archived)).flatMap(({ p, m }) => listProject(m, p, f.archived)).filter((r) => r.kind === kind)
    .sort((a, b) => b.published.localeCompare(a.published));
  const rows = applyFilters(all, f);
  const projects = [...new Map(all.map((r) => [r.project, { id: r.project, title: r.project_title }])).values()];
  const fc = filterControls({ f: { ...f, kinds: [] }, path: url.pathname, projects, items: all, withProject: true, sheetTitle: 'Filter reports' });
  const body = html`${titleBlock([['Home', '/']], kindLabel(kind), `${plural(rows.length, 'report')} across all projects`, false)}
<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">${fc.phone}<span class="hub-phone" style="flex: 1"></span>${fc.desk}</div>
<section class="hub-sec" aria-label="Reports">${rows.length ? list(rows.map((r) => reportRow(r, v, { badge: false }))) : empty('No reports of this kind yet.')}</section>`;
  return page({ title: `${kindLabel(kind)} · Roost`, prefs: v.prefs, body, data: { page: 'list' } });
}
