// Report chrome (SPEC 6.4): ReportPill and ReportBanner injected into a served report with HTMLRewriter, theme set
// on <html> before first paint. No iframe, so anchors and full-screen charts keep working.
import { assetUrl } from './assets';
import { reportView } from './hub';
import { cls, icons, tpl } from './generated/lynx';
import type { Manifest, Project, ReportEntry } from './model';
import { kindLabel, shortDate, type Prefs, type Viewer } from './pages/data';
import { fill, html, jsonScript, raw, type Raw } from './pages/html';

/** Attributes on <html>, plus the inline script that resolves "system" before paint. Shared with report chrome. */
function themeAttrs(p: Prefs) {
  const theme = p.theme === 'system' ? 'light' : p.theme;
  return { theme, palette: p.palette, hub: p.theme };
}
const SYSTEM_THEME_SCRIPT = `<script>(function(){var r=document.documentElement;if(r.getAttribute('data-hub-theme')!=='system')return;var d=matchMedia('(prefers-color-scheme: dark)').matches;r.setAttribute('data-theme',d?'dark':'light');r.classList.toggle('dark',d)})()</script>`;

// Lucide icons the bundle does not export, copied from the artboards.
const svg = {
  pin: raw('<path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>'),
  archive: raw('<rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path>'),
  history: raw('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>'),
  back: raw('<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>'),
};
const icon = (paths: Raw, klass = 'i', extra = 'aria-hidden="true"') =>
  raw(`<svg class="${klass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`);


const DS = '/_ds/lynx-reports/v1';

export interface ChromeCtx { m: Manifest; p: Project; e: ReportEntry; n: number; v: Viewer }

function pill({ m, p, e, n, v }: ChromeCtx) {
  const live = e.versions.filter((x) => x.state === 'live').sort((a, b) => b.n - a.n);
  const ref = `${m.project}/${e.id}`;
  const pinned = v.pins.includes(ref);
  const base = `/p/${m.project}/r/${e.id}/`;
  const toggleCls = cls.toggleOutlineSm;
  return html`<div class="rh-pill" data-hidden="false" id="rh-pill">
<button type="button" class="rh-chip" aria-expanded="false" aria-controls="rh-panel" aria-label="Show Roost controls" data-rh="open">${raw(icons.FileText)}<span>v${n}</span><span class="rh-v">of ${live.length}</span><span style="display: flex; transform: rotate(180deg); color: var(--muted-foreground)">${raw(icons.ChevronDown)}</span></button>
<section class="lr-panel rh-panel" id="rh-panel" aria-label="Roost" hidden>
<div style="display: flex; align-items: center; gap: 8px">
<nav class="rh-crumb" aria-label="Filed under"><span style="display: flex">${raw(icons.Folder14)}</span><a href="/p/${m.project}/">${p.title}</a>${e.stream ? html`<span aria-hidden="true">›</span><a href="/p/${m.project}/stream/${e.stream}/">${e.stream}</a>` : ''}<span class="lr-badge" data-kind="${e.kind}" style="margin-left: 4px">${kindLabel(e.kind)}</span></nav>
<button type="button" class="${cls.btnGhostIcon}" aria-label="Hide Roost controls" aria-expanded="true" data-rh="close">${raw(icons.ChevronDown)}</button>
</div>
<div style="display: flex; flex-direction: column; gap: 4px"><span class="lr-label" style="padding-left: 10px">Versions</span>
<div class="rh-versions">${live.map((x) => html`<button type="button" class="rh-version" aria-current="${x.n === n ? 'true' : 'false'}" data-rh-href="${x.n === e.latest ? base : `${base}v${x.n}/`}">
<span class="n">v${x.n}</span><span class="d">${x.published ? shortDate(x.published) : ''}${x.n === e.latest ? ' · latest' : ''}</span><span class="ck">${x.n === n ? raw(icons.Check14) : ''}</span>${x.change_note ? html`<span class="note">${x.change_note}</span>` : ''}</button>`)}</div></div>
<div class="rh-actions">
<button type="button" class="${toggleCls}" data-state="${pinned ? 'on' : 'off'}" aria-pressed="${pinned ? 'true' : 'false'}" aria-label="${pinned ? 'Pinned. Unpin report' : 'Pin report'}" data-rh="pin">${icon(svg.pin, '', 'aria-hidden="true"')}<span>${pinned ? 'Pinned' : 'Pin'}</span></button>
<button type="button" class="${cls.btnOutlineSm}" data-rh="archive" data-archived="${e.archived ? 'true' : 'false'}">${icon(svg.archive, '', 'aria-hidden="true"')}${e.archived ? 'Unarchive' : 'Archive'}</button>
<a href="/p/${m.project}/" style="margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font: 500 12px/16px var(--font-sans); padding: 8px 6px; color: var(--muted-foreground)">${icon(svg.back, '', 'style="width: 14px; height: 14px" aria-hidden="true"')}Back to ${p.title}</a>
</div>
</section>
</div>`;
}

function banner({ m, e, n }: ChromeCtx) {
  const base = `/p/${m.project}/r/${e.id}/`;
  const live = e.versions.filter((x) => x.state === 'live');
  const action = (label: string, attrs: string) => raw(`<span style="display: flex; gap: 8px; margin-top: 10px">${html`<button type="button" class="${cls.btnOutlineSm}" ${raw(attrs)}>${label}</button>`}</span>`);
  if (e.archived) {
    return html`<div class="rh-banner">${fill(tpl.alert, {
      ICON: raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg.archive}</svg>`),
      TITLE: `Archived on ${shortDate(e.archived)}`,
      BODY: html`<span>Hidden from lists and filters unless you include archived. This link keeps working.</span>${action('Unarchive', 'data-rh="archive" data-archived="true"')}`,
    })}</div>`;
  }
  if (e.latest !== null && n !== e.latest) {
    const cur = e.versions.find((x) => x.n === n);
    const latest = e.versions.find((x) => x.n === e.latest)!;
    return html`<div class="rh-banner">${fill(tpl.alert, {
      ICON: raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg.history}</svg>`),
      TITLE: `Viewing v${n} of ${live.length}`,
      BODY: html`<span>${cur?.published ? `From ${shortDate(cur.published)}. ` : ''}The latest version is v${latest.n}${latest.published ? ` from ${shortDate(latest.published)}` : ''}${latest.change_note ? `: ${latest.change_note}` : '.'}</span>${action('Open latest version', `data-rh-href="${base}"`)}`,
    })}</div>`;
  }
  return '';
}
/** Streams the report through HTMLRewriter, adding the theme, the DS stylesheets the chrome needs, banner and pill. */
export function injectChrome(res: Response, c: ChromeCtx): Response {
  const t = themeAttrs(c.v.prefs);
  const data = { ref: `${c.m.project}/${c.e.id}`, version: c.n, latest: c.e.latest, project: c.m.project };
  const headStart = `${SYSTEM_THEME_SCRIPT}<link rel="stylesheet" href="${DS}/components/palettes.css"><link rel="stylesheet" href="${DS}/components/bundle.css">`;
  const headEnd = `<link rel="stylesheet" href="${DS}/components/hub.css"><link rel="stylesheet" href="${assetUrl('chrome.css')}">`;
  const tail = `${pill(c).s}<script type="application/json" id="rh-data">${jsonScript(data).s}</script><script src="${assetUrl('chrome.js')}" defer></script>`;
  let sawHead = false;
  return new HTMLRewriter()
    .on('html', {
      element(el) {
        el.setAttribute('data-theme', t.theme);
        el.setAttribute('data-palette', t.palette);
        el.setAttribute('data-hub-theme', t.hub);
        if (t.theme === 'dark') el.setAttribute('class', `${el.getAttribute('class') ?? ''} dark`.trim());
      },
    })
    .on('head', {
      element(el) {
        sawHead = true;
        el.prepend(headStart, { html: true });
        el.append(headEnd, { html: true });
      },
    })
    .on('body', {
      element(el) {
        // A report without <head> still gets the stylesheets, at the top of the body.
        const classes = new Set((el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
        classes.add('rh-report');
        el.setAttribute('class', [...classes].join(' '));
        el.prepend(`${sawHead ? '' : headStart + headEnd}${banner(c).toString()}`, { html: true });
        el.append(tail, { html: true });
      },
    })
    .transform(res);
}

/**
 * Hosted mode (report-builder versions): the report's own page, untouched, inside Roost's bar. The page gets
 * data-host="roost" before its scripts run, so its report.css hides its top bar and its report.js leaves light/dark
 * to Roost; web/src/report-bar.tsx renders the bar into #roost-bar. No lynx-reports CSS is added.
 */
export function injectHost(res: Response, c: ChromeCtx): Response {
  const ref = `${c.m.project}/${c.e.id}`;
  const data = { report: reportView(c.m, c.e, c.v.pins, () => false), version: c.n, project: { id: c.p.id, name: c.p.title }, prefs: c.v.prefs };
  return new HTMLRewriter()
    .on('html', {
      element(el) {
        el.setAttribute('data-host', 'roost');
        if (c.v.prefs.theme !== 'system') el.setAttribute('data-theme', c.v.prefs.theme);
        el.setAttribute('class', `${el.getAttribute('class') ?? ''} roost-hosted`.trim());
        const style = el.getAttribute('style');
        el.setAttribute('style', `${style ? `${style.replace(/;?\s*$/, ';')} ` : ''}--sticky-top: calc(var(--roost-bar-h) + 16px)`);
      },
    })
    .on('head', { element(el) { el.append('<link rel="stylesheet" href="/_app/report-bar.css">', { html: true }); } })
    .on('body', {
      element(el) {
        el.prepend('<div id="roost-bar" class="hub roost-report-bar"></div><div id="roost-note" class="hub roost-report-note"></div>', { html: true });
        el.append(`<script type="application/json" id="roost-data">${jsonScript({ ...data, ref }).s}</script><script type="module" src="/_app/report-bar.js"></script>`, { html: true });
      },
    })
    .transform(res);
}
