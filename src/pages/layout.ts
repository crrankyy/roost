// The <html> shell of every hub page: theme before first paint, DS stylesheets, HubHeader, islands.
import { cls, tpl } from '../generated/lynx';
import { assetUrl } from '../assets';
import { PALETTES, type Prefs } from './data';
import { html, jsonScript, raw, type Raw } from './html';
import { button, icon, island, selectTrigger, svg } from './parts';

const DS = '/_ds/lynx-reports/v1';

/** Attributes on <html>, plus the inline script that resolves "system" before paint. Shared with report chrome. */
export function themeAttrs(p: Prefs) {
  const theme = p.theme === 'system' ? 'light' : p.theme;
  return { theme, palette: p.palette, hub: p.theme };
}
export const SYSTEM_THEME_SCRIPT = `<script>(function(){var r=document.documentElement;if(r.getAttribute('data-hub-theme')!=='system')return;var d=matchMedia('(prefers-color-scheme: dark)').matches;r.setAttribute('data-theme',d?'dark':'light');r.classList.toggle('dark',d)})()</script>`;

const paletteLabel = (id: string) => [...PALETTES.Expressive, ...PALETTES.Minimal].find(([p]) => p === id)?.[1] ?? 'Catppuccin';

function header(p: Prefs) {
  return html`<header class="lr-panel hub-bar">
<a class="hub-brand" href="/">${raw(tpl.liveAvatar)}<span>Roost</span></a>
<div class="hub-desk" style="align-items: center; gap: 8px">${island('palette', { palette: p.palette, palettes: PALETTES, variant: 'select' }, selectTrigger('Palette', paletteLabel(p.palette), 'width: 168px'))}</div>
<div class="hub-phone">${island('palette', { palette: p.palette, palettes: PALETTES, variant: 'menu' }, button(cls.btnOutlineIcon, icon(svg.palette), 'aria-label="Choose palette"'))}</div>
${island('theme', {}, raw(tpl.themeToggle))}
</header>`;
}

export function page(opts: { title: string; prefs: Prefs; body: Raw; data?: unknown; status?: number }): Response {
  const t = themeAttrs(opts.prefs);
  const doc = html`<!doctype html>
<html lang="en" data-theme="${t.theme}" data-palette="${t.palette}" data-hub-theme="${t.hub}"${t.theme === 'dark' ? raw(' class="dark"') : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${opts.title}</title>
${raw(SYSTEM_THEME_SCRIPT)}
<link rel="stylesheet" href="${DS}/tokens.css">
<link rel="stylesheet" href="${DS}/components/palettes.css">
<link rel="stylesheet" href="${DS}/components/bundle.css">
<link rel="stylesheet" href="${DS}/components/reports.css">
<link rel="stylesheet" href="${DS}/components/hub.css">
<style>body{margin:0}</style>
</head>
<body>
<div class="hub"><div class="hub-page">
${header(opts.prefs)}
${opts.body}
</div></div>
<script type="application/json" id="roost-data">${jsonScript(opts.data ?? {})}</script>
<script src="${DS}/components/lib/react.production.min.js"></script>
<script src="${DS}/components/lib/react-dom.production.min.js"></script>
<script src="${DS}/components/bundle.js"></script>
<script src="${assetUrl('islands.js')}"></script>
</body>
</html>`;
  return new Response(doc.s, { status: opts.status ?? 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' } });
}
