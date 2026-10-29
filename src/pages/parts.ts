// Shared hub partials, matching the Report Hub cards (docs/design-system/components/<Card>/README.md).
import { cls, icons, tpl } from '../generated/lynx';
import type { Kind, StreamSummary, TriageItem } from '../model';
import {
  KINDS, activeFilterCount, ago, filterQuery, kindLabel, plural, type Filters, type Listed, type Viewer, isNew,
} from './data';
import { fill, html, jsonAttr, raw, type Raw } from './html';

// Lucide icons the bundle does not export, copied from the artboards.
export const svg = {
  pin: raw('<path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>'),
  stream: raw('<line x1="6" x2="6" y1="3" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path>'),
  palette: raw('<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>'),
  filter: raw('<path d="M3 6h18"></path><path d="M7 12h10"></path><path d="M10 18h4"></path>'),
  archive: raw('<rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path>'),
  history: raw('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>'),
  back: raw('<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>'),
};
export const icon = (paths: Raw, klass = 'i', extra = 'aria-hidden="true"') =>
  raw(`<svg class="${klass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`);

export const reportUrl = (project: string, id: string) => `/p/${project}/r/${id}/`;
export const kindBadge = (k: Kind | string, style = '') => html`<span class="lr-badge" data-kind="${k}"${style ? raw(` style="${style}"`) : ''}>${kindLabel(k)}</span>`;
export const where = (projectTitle: string, stream: string | null) => html`<span class="hub-path">${projectTitle}${stream ? html` › <b>${stream}</b>` : ''}</span>`;

let seq = 0;
export const uid = (p: string) => `${p}-${++seq}`;

/** An island: server-rendered closed state, mounted by /_roost/islands.js. */
export const island = (name: string, props: unknown, inner: Raw, extra = '') =>
  html`<div data-island="${name}" data-props="${raw(jsonAttr(props))}" style="display: contents"${raw(extra)}>${inner}</div>`;

export const selectTrigger = (label: string, value: string, style = '', id = uid('sel')) =>
  raw(fill(tpl.selectTrigger, { LABEL: label, VALUE: value, TID: id, ID: id }).s.replace('<button ', `<button style="${style}" `));

export const button = (klass: string, inner: Raw | string, attrs = '') => html`<button type="button" class="${klass}"${raw(attrs ? ` ${attrs}` : '')}>${inner}</button>`;
export const linkButton = (klass: string, href: string, inner: Raw | string, attrs = '') => html`<a class="${klass}" href="${href}"${raw(attrs ? ` ${attrs}` : '')}>${inner}</a>`;

// ---------- rows ----------

export interface RowOpts { compact?: boolean; summary?: boolean; badge?: boolean; path?: boolean; more?: boolean }

export function reportRow(r: Listed, v: Viewer, o: RowOpts = {}) {
  const ref = `${r.project}/${r.id}`;
  const unread = isNew(v, ref, r.published);
  const pinned = v.pins.includes(ref);
  return html`<a class="hub-row${o.more ? ' hub-more' : ''}" href="${reportUrl(r.project, r.id)}"${r.superseded || r.archived ? raw(' style="opacity: .6"') : ''}>
<span class="hub-row-top"><span class="hub-dot" data-on="${unread ? 'true' : 'false'}"${unread ? raw(' role="img" aria-label="Unread"') : ''}></span><span class="hub-row-title">${r.title}</span><span class="hub-time">${pinned ? icon(svg.pin, 'i-12', 'role="img" aria-label="Pinned"') : ''}${ago(r.published)}</span></span>
${o.badge === false && o.path === false ? '' : html`<span class="hub-meta">${o.badge === false ? '' : kindBadge(r.kind)}${o.path === false ? '' : where(r.project_title, r.stream)}${r.archived ? html`<span class="lr-badge lr-badge-plain">Archived</span>` : ''}${r.superseded ? html`<span class="lr-badge lr-badge-plain">Superseded</span>` : ''}</span>`}
${o.summary === false || !r.summary ? '' : html`<span class="hub-sum">${r.summary}</span>`}
</a>`;
}

export const list = (rows: Raw[], extra: Raw | string = '') => html`<div class="lr-panel hub-list">${rows}${extra}</div>`;
export const empty = (text: string) => html`<div class="lr-panel hub-list"><p class="hub-caption" style="padding: 12px">${text}</p></div>`;

export const secHead = (id: string, title: string, count = '', right: Raw | string = '') =>
  html`<div class="hub-sec-head"><h2 id="${id}" class="hub-sec-title">${title}${count ? html` <span class="hub-count">${count}</span>` : ''}</h2>${right}</div>`;

// ---------- triage strip (TriageStrip) ----------

export function triageStrip(items: TriageItem[], scope: 'home' | 'project') {
  if (!items.length) return '';
  const shown = scope === 'home' ? items.slice(0, 3) : items;
  const title = `${plural(items.length, 'report')} ${items.length === 1 ? 'needs' : 'need'} confirming`;
  const caption = scope === 'home' ? 'Published by unattended runs. Check where Claude filed them.' : `Filed here by ${items.length === 1 ? 'an unattended run' : 'unattended runs'}`;
  const item = (t: TriageItem) => {
    const wherePart = `${t.project_title}${t.stream ? ` › ${t.stream}` : ', no stream'}`;
    const review = `/triage?r=${encodeURIComponent(`${t.project}/${t.id}`)}`;
    const foot = t.quarantined
      ? html`<span class="lr-badge" data-tone="red">${plural(t.findings.length, 'secret finding')} · not published</span>${linkButton(cls.btnOutlineSm, review, 'Review')}`
      : html`<span class="hub-micro">${t.unattended ? 'Unattended · ' : ''}${ago(t.published)}</span>${button(cls.btnOutlineSm, html`${raw(icons.Check)}Confirm`, `data-confirm="${t.project}/${t.id}" aria-label="Confirm ${escAttr(t.title)}"`)}`;
    if (scope === 'project') {
      return html`<div class="hub-titem" style="flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px 16px">
<div style="flex: 1 1 260px; min-width: 0; display: flex; flex-direction: column; gap: 6px"><a class="hub-titem-title" href="${review}">${t.title}</a>
<div class="hub-proposal"><span>${wherePart}</span><span>as</span>${kindBadge(t.kind)}<span>· ${t.unattended ? 'unattended · ' : ''}${ago(t.published)}</span></div></div>
<div class="hub-actions">${t.quarantined ? foot : html`${linkButton(cls.btnGhostSm, review, 'Reclassify')}${button(cls.btnOutlineSm, html`${raw(icons.Check)}Confirm`, `data-confirm="${t.project}/${t.id}" aria-label="Confirm ${escAttr(t.title)}"`)}`}</div></div>`;
    }
    return html`<div class="hub-titem"><a class="hub-titem-title" href="${review}">${t.title}</a>
<div class="hub-proposal"><span>${wherePart}</span><span>as</span>${kindBadge(t.kind)}</div>
<div class="hub-titem-foot">${foot}</div></div>`;
  };
  return html`<section class="lr-panel hub-triage" aria-labelledby="triage-h">
<div class="hub-triage-head"><span class="hub-tile">${raw(icons.Inbox)}</span>
<div style="flex: 1; min-width: 0; display: flex; flex-direction: column"><h2 id="triage-h" class="hub-label">${title}</h2><p class="hub-caption">${caption}</p></div>
${scope === 'home' ? html`<a href="/triage" style="font-size: 12px; line-height: 16px; white-space: nowrap; padding: 8px 4px">Review all</a>` : ''}</div>
<div class="hub-triage-items"${scope === 'project' ? raw(' style="grid-template-columns: minmax(0, 1fr)"') : ''}>${shown.map(item)}</div>
</section>`;
}

const escAttr = (s: string) => s.replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]!);

// ---------- pins (PinnedReports) ----------

export function pinned(items: Listed[]) {
  if (!items.length) return '';
  return html`<section class="hub-sec" aria-labelledby="pinned-h">
<div class="hub-sec-head" style="min-height: 20px"><h2 id="pinned-h" class="hub-sec-title">Pinned</h2></div>
<div class="hub-pins">${items.map((p) => html`<a class="lr-panel hub-pin" href="${reportUrl(p.project, p.id)}">
<span style="color: var(--agent); display: flex">${icon(svg.pin)}</span>
<span class="hub-pin-text"><span class="hub-pin-title">${p.title}</span>
<span class="hub-meta" style="padding-left: 0; flex-wrap: nowrap">${kindBadge(p.kind)}<span style="white-space: nowrap">${p.project_title}${p.stream ? ` › ${p.stream}` : ''}</span></span></span></a>`)}</div>
</section>`;
}

// ---------- index lists (IndexLists) ----------

function spark(counts: number[]) {
  const max = Math.max(...counts) || 1;
  const pts = counts.map((c, i) => [4 + i * (112 / (counts.length - 1)), 24 - (c / max) * 20]);
  return html`<svg class="lr-spark" viewBox="0 0 120 28" style="width: 60px; height: 20px" aria-hidden="true"><polyline points="${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}"></polyline><circle data-series="1" cx="116" cy="${pts[pts.length - 1][1].toFixed(1)}" r="3"></circle></svg>`;
}

export function streamRows(streams: StreamSummary[]) {
  return streams.map((s) => html`<a class="hub-row hub-row-h" href="/p/${s.project}/stream/${s.id}/">
<span class="hub-tile-quiet">${icon(svg.stream)}</span>
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column"><span class="hub-label">${s.id}</span><span class="hub-caption">${s.project_title} · latest ${ago(s.last_report).toLowerCase()}</span></span>
${spark(s.spark)}<span class="lr-badge lr-badge-plain" style="white-space: nowrap">${plural(s.reports, 'report')}</span></a>`);
}

export function projectRows(projects: { id: string; title: string; reports: number; active_streams: number; last: string | null; archived?: boolean }[]) {
  return projects.map((p) => html`<a class="hub-row hub-row-h" href="/p/${p.id}/">
${raw(tpl.avatarFolder)}
<span style="flex: 1; min-width: 0; display: flex; flex-direction: column"><span class="hub-label">${p.title}</span><span class="hub-caption">${plural(p.reports, 'report')} · ${plural(p.active_streams, 'active stream')}${p.archived ? ' · archived' : ''}</span></span>
<span class="hub-time">${p.last ? ago(p.last) : ''}</span><span style="color: var(--muted-foreground); display: flex">${raw(icons.ChevronRight)}</span></a>`);
}

// ---------- filters (FilterControls) ----------

export interface FilterCtx { f: Filters; path: string; projects: { id: string; title: string }[]; items: { project: string; kind: Kind; published: string; archived?: boolean }[]; withProject: boolean; sheetTitle: string }

/** The desktop row (an island) and the phone Filter button (opens the Drawer island). */
export function filterControls(c: FilterCtx) {
  const { f } = c;
  const projectLabel = c.projects.find((p) => p.id === f.project)?.title ?? 'All projects';
  const rangeLabel = f.range === '7' ? 'Last 7 days' : f.range === '30' ? 'Last 30 days' : f.range === '90' ? 'Last 90 days' : f.range === 'custom' ? `${f.from || '…'} – ${f.to || '…'}` : 'Any time';
  const kindsLabel = f.kinds.length ? html`Kind<span class="hub-filter-count">${f.kinds.length}</span>` : 'All kinds';
  const props = { ...c, kinds: KINDS };
  const desk = html`<div class="hub-filters hub-desk" role="group" aria-label="Filter reports" style="flex: 1">
${c.withProject ? selectTrigger('Project', projectLabel, 'width: 168px') : ''}
${button(cls.btnOutline, html`${kindsLabel}${raw(icons.ChevronDown)}`, `aria-label="Kind${f.kinds.length ? `, ${f.kinds.length} selected` : ''}"`)}
${selectTrigger('Date range', rangeLabel, 'width: 156px')}
<label class="hub-choice" style="margin-left: 8px; gap: 8px; color: var(--muted-foreground)">${fill(f.archived ? tpl.switchOn : tpl.switchOff, { SID: uid('arch'), LABEL: 'Include archived' })}Include archived</label>
${activeFilterCount(f, c.withProject) ? html`<span style="flex: 1"></span>${linkButton(cls.btnGhostSm, c.path, html`${raw(icons.RotateCcw)}Reset`)}` : ''}
</div>`;
  const n = activeFilterCount(f, c.withProject);
  const phone = html`<div class="hub-phone">${button(cls.btnOutlineSm, html`${icon(svg.filter)}Filter${n ? html`<span class="hub-filter-count">${n}</span>` : ''}`, 'aria-label="Open filters"')}</div>`;
  return { desk: island('filters', props, desk, ' data-variant="desk"'), phone: island('filter-sheet', props, phone) };
}

export const query = filterQuery;
