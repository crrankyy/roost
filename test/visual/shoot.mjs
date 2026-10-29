#!/usr/bin/env node
// Screenshots hub pages from a seeded local `wrangler dev` at 380 and 1240 px, light and dark, plus palette sweeps.
// Writes test/visual/out/*.png and contact-sheet.html. Fails on console errors or horizontal scroll at 380px.
// Usage: node test/visual/shoot.mjs [base] [--only name,name] [--palettes]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith('http')) ?? 'http://localhost:8787';
const only = (args[args.indexOf('--only') + 1] ?? '').split(',').filter((x) => args.includes('--only') && x);
const PAGES = [
  ['home', '/'],
  ['project', '/p/payments-api/'],
  ['project-kind', '/p/payments-api/?group=kind'],
  ['stream', '/p/payments-api/stream/auth-migration/'],
  ['kind', '/kind/plan/'],
  ['filtered', '/?kind=plan,research&range=30'],
  ['archived', '/?archived=1'],
  ['filter-sheet', '/', async (p) => { await p.getByRole('button', { name: 'Open filters' }).first().click(); await p.waitForTimeout(600); }, 'phone'],
  ['kind-menu', '/', async (p) => { await p.getByRole('button', { name: /^Kind|All kinds/ }).first().click(); await p.waitForTimeout(400); }, 'desk'],
  ['triage', '/triage'],
  ['triage-reclassify', '/triage', async (p) => { await p.getByRole('button', { name: 'Reclassify' }).first().click(); await p.waitForTimeout(400); }],
  ['triage-quarantine', '/triage', async (p) => {
    const href = await p.locator('[data-href*="dependency-audit"]').first().getAttribute('data-href');
    await p.goto(new URL(href, p.url()).href, { waitUntil: 'networkidle' });
  }],
];
const SIZES = [['phone', 380, 844], ['desk', 1240, 900]];
const THEMES = ['light', 'dark'];
const PALETTES = ['catppuccin', 'tokyo-night', 'rose-pine', 'nord', 'dracula', 'kanagawa', 'graphite', 'ash', 'solarized', 'gruvbox', 'everforest', 'github', 'ayu', 'flexoki'];

mkdirSync('test/visual/out', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
const shots = [];

async function shoot(name, path, size, theme, palette, action) {
  const [label, w, hgt] = size;
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, colorScheme: theme, deviceScaleFactor: 1 });
  await ctx.addInitScript(([t, pal]) => {
    // Force the KV prefs the server would set: the attributes on <html> before first paint.
    document.addEventListener('DOMContentLoaded', () => {});
    const set = () => { const r = document.documentElement; if (!r) return; r.setAttribute('data-theme', t); r.setAttribute('data-hub-theme', t); r.setAttribute('data-palette', pal); r.classList.toggle('dark', t === 'dark'); };
    new MutationObserver(set).observe(document, { childList: true, subtree: false });
    set();
  }, [theme, palette]);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`${name} ${label} ${theme}: console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) problems.push(`${name} ${label} ${theme}: ${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => problems.push(`${name} ${label} ${theme}: ${e.message}`));
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.evaluate(([t, pal]) => { const r = document.documentElement; r.setAttribute('data-theme', t); r.setAttribute('data-palette', pal); r.classList.toggle('dark', t === 'dark'); }, [theme, palette]);
  if (action) await action(page);
  await page.waitForTimeout(250);
  if (w <= 380) {
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) problems.push(`${name} ${label} ${theme} ${palette}: horizontal scroll (${sw}px > ${w}px)`);
  }
  const file = `${name}-${label}-${theme}${palette === 'catppuccin' ? '' : `-${palette}`}.png`;
  await page.screenshot({ path: `test/visual/out/${file}`, fullPage: !action });
  shots.push({ name, label, theme, palette, file });
  await ctx.close();
}

for (const [name, path, action, onlySize] of PAGES) {
  if (only.length && !only.includes(name)) continue;
  for (const size of SIZES) {
    if (onlySize && size[0] !== onlySize) continue;
    for (const theme of THEMES) await shoot(name, path, size, theme, 'catppuccin', action);
  }
}
if (args.includes('--palettes')) {
  for (const pal of PALETTES.slice(1)) for (const theme of THEMES) await shoot('home', '/', SIZES[0], theme, pal);
}
await browser.close();

const cards = shots.map((s) => `<figure><figcaption>${s.name} · ${s.label} · ${s.theme}${s.palette === 'catppuccin' ? '' : ` · ${s.palette}`}</figcaption><a href="${s.file}"><img src="${s.file}" loading="lazy"></a></figure>`).join('\n');
writeFileSync('test/visual/out/contact-sheet.html', `<!doctype html><meta charset="utf-8"><title>Roost contact sheet</title>
<style>body{font:14px system-ui;margin:16px;background:#888}main{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}figure{margin:0;background:#fff;padding:8px;border-radius:8px}figure img{display:block;max-width:420px;max-height:900px;object-fit:contain;object-position:top}figcaption{margin-bottom:6px}</style>
<h1>Roost contact sheet</h1><p>${problems.length ? `<b>${problems.length} problems</b><br>${problems.join('<br>')}` : 'No console errors; no horizontal scroll at 380px.'}</p><main>${cards}</main>`);
console.log(`${shots.length} screenshots in test/visual/out/`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
