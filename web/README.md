# Roost web

Roost is the hub for reports built by the report-builder skill: home, projects, triage (confirm, reclassify, quarantine), lists and search, settings, and each report shown as its own page under Roost's bar. Vite + React 18 + TypeScript, built only from the Roost design system in `ui/`.

```
npm install
npm run dev         # http://localhost:5173
npm run typecheck
npm run build       # type-checks, then builds to dist/ (reports/ is copied to dist/reports/)
npm run preview     # serves dist/
```

## Layout

| Path | What it is |
|---|---|
| `src/main.tsx` | Mounts the app and loads `ui/bundle.css` once |
| `src/App.tsx` | The shell: the HubBar and its breadcrumbs, Settings, the filter sheet, the publish dialog, toasts |
| `src/screens.tsx` | Home, all reports / search / archive, project, triage |
| `src/ReportPage.tsx` | A report: its built file in a frame, with the HubBar and any Banner rendered into the report's own page |
| `src/store.tsx` | Session state: triage decisions and filings, pins, archive, read marks, filters, search; palette and light/dark are remembered per browser |
| `src/router.ts` | Hash routes: `#/`, `#/reports`, `#/archive`, `#/pinned`, `#/triage/<id>`, `#/p/<project>`, `#/r/<report>[/v<n>]` |
| `src/data.ts`, `data/roost-sample.json` | Sample data: 3 projects, 8 reports (9 versions), 2 reports waiting in triage |
| `reports/` | The built reports the sample data points at, served at `/reports/<file>` |
| `ui/src/` | The Roost design system's components (imported as `@roost/ui`) and `roost.css`, the hub layer |
| `ui/bundle.css` | One stylesheet: the report-builder's six palettes, its `report.css` and `charts.css`, then `roost.css` |
| `ui/README.md`, `ui/index.d.ts`, `ui/tokens.json` | The design system's guide, its component types, its tokens |

## Notes

- **Reports are never rewritten.** A report's link is its id and version only; project, stream and kind are metadata, so reclassifying never breaks a link. In production a Worker serves each report at `/p/<project>/r/<slug>/` and injects the bar the way `ReportPage.tsx` does here.
- **Changing the hub's look:** edit `ui/src/roost.css`, then rebuild `ui/bundle.css`: it is the six theme files from the report-builder's `assets/themes/` (each `:root {` selector rewritten to `.roost-scope[data-palette="<name>"] {`, Catppuccin also keeping `:root`), then `assets/report.css`, `assets/charts.css` and `ui/src/roost.css`, concatenated in that order.
- **Charts** in `Chart` and `Spark` are drawn by the report-builder's `charts.js` (`window.ReportCharts`). The app itself does not need it; the reports carry their own.
- **Fonts:** none are bundled. Body text uses Coolvetica where installed, then the system sans.
- **Sample data** only: the projects, runs and dates are made up; the reports are real report-builder files.
