# Roost

Roost is the hub where reports built by the **report-builder** skill are filed, found and kept. It has two kinds of screen, built from two families of parts:

- **Hub screens** (home, project, triage, reclassify, quarantine, lists, filters) follow **Report Hub's layout and components**: a header bar, an accent-edged triage panel, pinned reports, recent reports beside active streams and projects, stream cards, an inbox beside a detail. They are flat: hairline panels on a slightly darker page, no glow, no blur, no tinted wash. Classes start with `hub-`.
- **Reports** are the report-builder's own pages, untouched except that their own top bar is hidden: Roost's HubBar replaces it (breadcrumbs, the report's type, search, the version menu, theme), with a Banner under it when the report is not plainly published. Classes start with `roost-`.

Both read their colours from the report-builder's six palettes, so the hub and the reports change palette and light/dark together. This system carries the skill's stylesheets (inside `components/bundle.css`) and its `charts.js` (at the top of `components/bundle.js`), unchanged; when the skill's assets change, rebuild the bundle. The skill's report components are for reports only and are not used on hub screens.

## Writing in Roost

- **Sentence case, plain words.** "2 reports need confirming", "Published by unattended runs. Check where Claude filed them."
- **Counts carry their meaning:** "4 reports · 3 active streams · last activity 40 min ago", "Last 6 across all projects", "2 secret findings · not published".
- **Buttons are verbs:** Confirm, Reclassify, Save and confirm, Reject, Publish anyway, Show 6 reports, Review all.
- **Say why.** A proposed filing always carries one sentence on why Claude chose it; a held-back report says what was found and that no link serves it.
- **A report's own words are never rewritten.** Lists show its `<title>` and, on one line, its h1.
- **Say what is sample data.** The canvas's projects, runs and dates are made up; the page foot says so.

## Visual foundations

**Palettes.** Chosen in Settings › Theme (the gear in the HubBar), with light, dark or match system. The six report-builder themes: Catppuccin (default; Latte light, Mocha dark), Everforest, GitHub, Rosé Pine, Dracula, Nord. Each is the skill's theme file, unchanged except its selector: `.roost-scope[data-palette="nord"]`. Every colour is `light-dark(light, dark)`. `tokens.json` lists Catppuccin (the colour pickers' view); `bundle.css` holds all six.

**Hub surfaces.** The page is `surface-soft`; panels are `canvas` with a `hairline` edge and 16px corners; insets (proposed filing, reclassify) go back to `surface-soft` inside a panel. No shadows anywhere on hub screens except open menus, sheets, dialogs and toasts. The accent is `primary-active`: its 10% tint marks hover and selection, its 40% mix edges the triage panel and accent tiles.

**Badges.** Pills with a round dot. Report types use chart colours, one per type everywhere: Investigation 1, Architecture 2, Audit 3, Benchmark 4, Decision 5, Postmortem 6, Status 7, Changelog 8. States use the status colours, always with words: Needs confirming (warning), Quarantined and secret findings (critical), Filed (good).

**Type.** Hub screens use the sans stack (`--font-sans`: Coolvetica where installed, then the system sans) at 14/20; titles 24/30 semibold, the triage detail title 28/34; captions 12/16 in `muted`. Reports keep their own faces (Black Chancery headings, MonoLisa code). The font files are moving to the Roost server; until then this system ships none and every stack falls back.

**Layout.** One centred column on the reports' own `.wrap` geometry, 1200px at most with 16px sides, so the HubBar stands on the same line on every screen and lines up with a report's text; 24px above the bar (12px on phones), blocks 32px apart (24px on phones). Every screen, reports included, opens with the same header bar (HubBar), and it never scrolls away: it sticks at the top and the page fades out under it; breadcrumbs live in it and nowhere else, after the brand (on phones, on a second row inside the bar). Home: header bar, triage panel, pinned, then a two-column grid (recent | streams and projects: 300px from 760px, 360px from 1000px) whose first heads, Recent and Active streams, share one line (Columns); on desktop the two columns are panes that, once the page has brought them up to the docks, scroll separately. Project: title, project triage panel, filters with By stream / By kind, stream cards three across. Triage: a 340px inbox beside the detail from 1000px; on phones a pager ("Report 1 of 2", previous, next) replaces the inbox. Under 760px the header's search and palette become icon buttons and filters move into a bottom sheet.

**Shapes.** 16px panels, 12px rows, tiles and insets, 10px buttons and inputs, pills fully round.

## Iconography

24px strokes in `currentColor`, drawn at 16px (`Icon`): search, pin, archive, inbox, shield-alert, check, check-circle, x, chevrons, arrows, branch (a stream), folder (a project), filter, history, link, undo, edit, eye, sun, moon, monitor, palette, settings (a gear: the HubBar's Settings button). Branch and folder sit in tiles; every other icon sits next to a word or carries `aria-label`. Reports use none. Never emoji.

## Logo

The mark is a bird on a perch (`assets/Logos`), drawn in `primary-active` on its 10% tint in a 28px circle at the left of the header bar, followed by "Roost" in the sans at 500, 16px.

## The hub's screens

- **Home:** HubBar (no crumbs) · TriagePanel (on desktop it stays docked under the HubBar while it is on the page) (Confirm, Reclassify, Review) · Pinned (PinStrip) · Recent (SectionHead, filters: Select, KindMenu, Select, Switch; RowList of ReportItem) beside Active streams (StreamItem with Sparkline) and Projects (ProjectItem).
- **Project:** HubBar (crumbs: the project) · PageTitle with a folder tile · the project's TriagePanel · filters with ToggleGroup (By stream / By kind) · StreamCards (latest three each, "All N") · General (reports without a stream) · Done streams (Disclosure).
- **Triage:** HubBar (crumbs: Triage) · PageTitle (TriagePager on phones) · InboxItems beside a detail panel: DetailHead, ProposedBox, then Confirm and Reclassify, or the reclassify form (Field, Select, RadioGroup with Propose a new stream and a TextField, Select), or for a held-back report an Alert, SecretList, Reject and Publish anyway (a Dialog confirms). After a decision: a good Alert, Next and Undo.
- **Lists, search, archive:** HubBar (crumbs: All reports, Search, Archive, or project › stream) · PageTitle · filters (a bottom Sheet with KindChecklist and ToggleGroup on phones) · RowList.
- **A report:** the report's own page with its top bar taken out and the HubBar put in its place, inside the page: on the report's canvas, in its palette, at exactly the spot it holds on hub screens, and it stays there while the report scrolls and fades out under it (crumbs: project › stream › report title; KindBadge, search, ReportMenu, ThemeToggle). No band or rule under it. A Banner under the bar (it scrolls away; the bar does not) when the report is waiting, held back, archived or an older version.

## Using the system

**In an app (React 18 + TypeScript):** import from `components/src/index.ts` (the canvas's app uses the alias `@roost/ui`) and load `components/bundle.css` once. Wrap hub screens in `<Root app hub palette mode>` with one `div.roost-scroll` holding a `div.hub-page`; wrap a report screen in `<Root app>` without `hub`. Show a report as an `iframe` of its built file in `div.roost-report-page`, and render the HubBar into the report's own document with a React portal: `div.hub.roost-report-bar > div.hub-page` (sticky) as the first child of its body, then `div.hub.roost-report-note > div.hub-page` for a Banner. Inject `components/src/roost.css` (only Roost's layer; the report already has its palette), add `roost-hosted` to its `html` (anchor jumps and the sticky contents then clear the bar) and hide `.topbar`. Keep the frame hidden until the bar is in, so the report never shifts under it. The Worker does the same when it serves a report.

**On a Design canvas:** load `components/bundle.css`, then `components/bundle.js` (it reads `window.React`; charts.js runs first and defines `window.ReportCharts`); `tokens.css` is not needed. Mount components with `x-import component-from-global-scope="Roost.X"`. Write the page frame as markup (`hub-page`, `hub-cols`, `hub-col`, `hub-sec`, `hub-filters`, `hub-split`, `hub-streams cols-3`) and mount components inside it. Rows draw their own dividers, so pass `first` to the first row of every list. Show a report as its own artboard: its body as markup inside `Roost.Root palette="…"`, each chart a `Roost.Chart` with the report's spec. Inside `.roost-report-page` the report's `.topbar` is hidden by the bundle's CSS.

**A report page outside Roost** needs nothing from here: the skill builds it as one self-contained file.
