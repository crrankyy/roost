#!/usr/bin/env node
// Generates src/generated/lynx.ts from the design system: Lynx class recipes and the closed-state markup of
// the controls hub pages render on the server. Runs bundle.js in node:vm against npm react@18.3.1 (same as lib/).
// Re-run (`npm run gen`) whenever docs/design-system/ changes.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
console.error = () => {}; // React warns that useLayoutEffect is a no-op on the server; expected here
const React = require('react');
const ReactDOM = require('react-dom');
const { renderToStaticMarkup } = require('react-dom/server');

const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, sheet: { insertRule() {} } });
const ctx = {
  console: { ...console, error() {}, warn() {} }, setTimeout, clearTimeout, queueMicrotask, React, ReactDOM,
  document: {
    createTextNode: el, createElement: el, getElementsByTagName: () => [el()], body: el(), head: el(), addEventListener() {}, querySelector: () => null,
    documentElement: { getAttribute() {}, setAttribute() {}, classList: { add() {}, remove() {}, contains: () => false } },
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {} }, navigator: { userAgent: 'node' },
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../docs/design-system/components/bundle.js', import.meta.url), 'utf8'), ctx, { filename: 'bundle.js' });
const L = ctx.Lynx;
const h = React.createElement;
const render = (node) => renderToStaticMarkup(node).replace(/radix-:R[0-9a-z]*:/g, 'radix-@@ID@@');
const slot = (name) => `@@${name}@@`;

const cls = {
  btnDefault: L.buttonVariants({}),
  btnOutline: L.buttonVariants({ variant: 'outline' }),
  btnOutlineSm: L.buttonVariants({ variant: 'outline', size: 'sm' }),
  btnOutlineIcon: L.buttonVariants({ variant: 'outline', size: 'icon' }),
  btnGhost: L.buttonVariants({ variant: 'ghost' }),
  btnGhostSm: L.buttonVariants({ variant: 'ghost', size: 'sm' }),
  btnGhostIcon: L.buttonVariants({ variant: 'ghost', size: 'icon' }),
  btnDestructiveSm: L.buttonVariants({ variant: 'destructive', size: 'sm' }),
  toggleOutlineSm: L.toggleVariants({ variant: 'outline', size: 'sm' }),
};

const icon = (name, size = 16) => render(h(L.Icons[name], { size, 'aria-hidden': 'true' }));

const tpl = {
  liveAvatar: render(h(L.LiveAvatar, { size: 28, hue: 'mauve', label: 'Roost' })),
  themeToggle: render(h(L.ThemeToggle)),
  selectTrigger: render(h(L.Select, { value: 'v' },
    h(L.SelectTrigger, { 'aria-label': slot('LABEL'), id: slot('TID') }, h(L.SelectValue, null, slot('VALUE'))),
    h(L.SelectContent, null, h(L.SelectItem, { value: 'v' }, 'v')))),
  switchOff: render(h(L.Switch, { id: slot('SID'), 'aria-label': slot('LABEL') })),
  switchOn: render(h(L.Switch, { id: slot('SID'), 'aria-label': slot('LABEL'), checked: true })),
  checkboxOff: render(h(L.Checkbox, { id: slot('CID') })),
  checkboxOn: render(h(L.Checkbox, { id: slot('CID'), checked: true })),
  toggleGroup: render(h(L.ToggleGroup, { type: 'single', variant: 'outline', size: 'sm', value: 'on', 'aria-label': slot('LABEL') },
    h(L.ToggleGroupItem, { value: 'on' }, slot('ON')), h(L.ToggleGroupItem, { value: 'off' }, slot('OFF')))),
  avatarFolder: render(h(L.Avatar, null, h(L.AvatarFallback, null, h(L.Icons.Folder, { size: 16, 'aria-hidden': 'true' })))),
  breadcrumb: render(h(L.Breadcrumb, null, h(L.BreadcrumbList, null,
    h(L.BreadcrumbItem, null, h(L.BreadcrumbLink, { href: slot('HREF') }, slot('LINK'))),
    h(L.BreadcrumbSeparator),
    h(L.BreadcrumbItem, null, h(L.BreadcrumbPage, null, slot('PAGE')))))),
  breadcrumb3: render(h(L.Breadcrumb, null, h(L.BreadcrumbList, null,
    h(L.BreadcrumbItem, null, h(L.BreadcrumbLink, { href: slot('HREF') }, slot('LINK'))),
    h(L.BreadcrumbSeparator),
    h(L.BreadcrumbItem, null, h(L.BreadcrumbLink, { href: slot('HREFB') }, slot('LINKB'))),
    h(L.BreadcrumbSeparator),
    h(L.BreadcrumbItem, null, h(L.BreadcrumbPage, null, slot('PAGE')))))),
  alert: render(h(L.Alert, null, h('i', null, slot('ICON')), h(L.AlertTitle, null, slot('TITLE')), h(L.AlertDescription, null, slot('BODY')))),
  alertDestructive: render(h(L.Alert, { variant: 'destructive' }, h('i', null, slot('ICON')), h(L.AlertTitle, null, slot('TITLE')), h(L.AlertDescription, null, slot('BODY')))),
};
// The <i> wrapper only marks where the icon goes; Alert styles its direct svg child.
tpl.alert = tpl.alert.replace('<i>@@ICON@@</i>', '@@ICON@@');
tpl.alertDestructive = tpl.alertDestructive.replace('<i>@@ICON@@</i>', '@@ICON@@');

const icons = Object.fromEntries(['Inbox', 'Check', 'ChevronDown', 'ChevronRight', 'Folder', 'FileText', 'RotateCcw', 'ArrowRight', 'AlertTriangle', 'X', 'Calendar'].map((n) => [n, icon(n)]));
icons.Check14 = icon('Check', 14);
icons.Folder14 = icon('Folder', 14);
icons.ChevronRight16 = icon('ChevronRight', 16);

for (const [k, v] of Object.entries(tpl)) if (!['liveAvatar', 'themeToggle', 'avatarFolder'].includes(k) && !v.includes('@@')) throw new Error(`template ${k} lost its slots`);

const out = `// GENERATED by scripts/gen-lynx.mjs from docs/design-system/. Do not edit; run \`npm run gen\`.
/* eslint-disable */
export const cls = ${JSON.stringify(cls, null, 2)} as const;

/** Closed-state markup rendered from the Lynx components; @@SLOT@@ markers are filled by fill() in pages/html.ts. */
export const tpl = ${JSON.stringify(tpl, null, 2)} as const;

/** Lucide icons as Lynx.Icons renders them. */
export const icons = ${JSON.stringify(icons, null, 2)} as const;
`;
mkdirSync(new URL('../src/generated/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/generated/lynx.ts', import.meta.url), out);
console.log(`wrote src/generated/lynx.ts (${(out.length / 1024).toFixed(1)} KB)`);
