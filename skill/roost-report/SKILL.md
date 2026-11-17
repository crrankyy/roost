---
name: roost-report
description: Writes a report as one HTML file from a fixed component library and publishes it to Roost (the user's private report hub) with the `roost` CLI, so every report has the same layout, type, colours and charts and can be read later on any device. Use whenever the user asks for a report, write-up, investigation, debug write-up, explainer, audit, review, benchmark, decision or proposal doc, postmortem, status or progress update, or changelog; says "publish this", "send it to Roost" or "make a report"; or when a scheduled or unattended run ends with findings worth keeping. Do not use for slides, Word or PDF files, or app UI.
---

# Roost report

Roost's copy of the report-builder skill. Reports are filed by the `report:` tags in their own head (written once,
in step 4) and published with `roost publish` (*Publish*, below); nothing else classifies them.

Every report is the same page shell filled with components from a fixed library. Never invent layout,
colours or CSS for a report: pick components, copy their markup, write the words.

## Files (paths from this skill's directory, `$SKILL`)

| File | What it is |
|---|---|
| `assets/skeleton.html` | The page every report starts from |
| `references/gallery.html` | Every component, live, with its rules and the exact markup to copy. The source of truth |
| `assets/themes/*.css` | Colour palettes, one file per palette, light and dark together: `catppuccin.css` (default), `everforest.css`, `github.css`, `rosepine.css`, `dracula.css`, `nord.css` |
| `assets/report.css`, `assets/report.js` | Page and component styles (no colours); light/dark toggle, contents-rail highlighting, print, ID wrapping |
| `assets/charts.css`, `assets/charts.js` | Charts drawn from a JSON spec |
| `assets/prism.js` | Syntax highlighting for code windows (Prism 1.29, MIT), coloured in `report.css` |
| `/_fonts/v1/report-type.css`, `/_fonts/v1/report-mono.css` | Heading (Black Chancery) and code (MonoLisa) faces, served by Roost. Linked, never embedded; `build.py` leaves them as links |
| `scripts/build.py` | Inlines all of the above (except the fonts) into one file |
| `scripts/check.py` | Renders the built report in both themes at desktop and phone width, in slices, and reports problems |
| `scripts/roost-migrate.py` | Adds the Roost filing tags and host slot to a report source written before them (*Inside Roost*) |
| `scripts/build-fonts.sh`, `scripts/upload-fonts.mjs` | Build the served fonts into `fonts-dist/` (from `assets/fonts/` and the licensed MonoLisa files) and upload them to Roost (only when the fonts change) |
| `bin/roost.mjs` | The `roost` CLI that publishes (installed as `roost`) |

Never edit these per report. If a report seems to need new CSS, it needs a different component;
if none fits, tell the user what is missing instead of styling around it.

## Workflow

1. **Pick the report type** from the table below. It gives the section order and the main components.
2. **Outline before writing.** One line per section: its claim, then the components that prove it.
   Write the key findings first; every finding must point to a section.
3. **Copy `$SKILL/assets/skeleton.html`** to `<name>.src.html` next to where the report should live (the user's
   project, or the scratchpad if they name no place).
4. **File it.** Fill the four `report:` meta tags in the head (kind from the table below, the project's slug,
   the stream if there is one, the date: see *Choosing the filing* under *Publish*), and write the scope · date line into the hero's `.hero-meta`, not the top bar.
   Roost lists, colours and files the report by these; see *Inside Roost* below.
5. **Fill it.** For each component, read its entry in the gallery and copy the markup inside its `<template>`
   exactly, class names included (`.step-title`, `.card-title`, not `<b>` or `<h3>`):
   `grep -n 'id="c23"' $SKILL/references/gallery.html`, then read from that line to the entry's `</template>`.
   Read only the entries you use; the gallery is large.
6. **Build:** `python3 $SKILL/scripts/build.py <name>.src.html <name>.html` produces the single file.
7. **Check it** with `check.py` (below), fix, rebuild, check again.
8. **Publish it** (*Publish*, below) and give the user the URL.

## Report types

| Type (`report:kind`) | Section order | Main components |
|---|---|---|
| Investigation / debug write-up (`investigation`) | Key findings → what happened → cause → fix → what's left | key findings, timeline log, quote, record window, diff window, verdict |
| Architecture explainer (`architecture`) | Key findings → the parts → how data moves → one worked example → limits | card grid, flow, state strip, figure, table, record and code windows, detail card |
| Audit / review (`audit`) | Stat row → findings by severity → what's fine → next steps | stat row, finding cards, table with status, status aside |
| Benchmark (`benchmark`) | Stat row → setup and method → results → what explains them → caveats | stat row, charts (bar, column, line, scatter, histogram), table with totals, note on method |
| Decision / proposal (`decision`) | Key findings → the problem → options → recommendation → risks | key findings, option comparison, verdict, status aside |
| Incident postmortem (`postmortem`) | Stat row → timeline → cause → impact → remediation | stat row, timeline log, quote, finding cards, numbered steps, gantt |
| Status / progress (`status`) | Hero with stats, key findings → stages → what changed → blockers → next | hero with stats, key findings, stage cards, meter list, table with status, kind tags |
| Changelog (`changelog`) | Key findings → latest release first, one section per release, "Unreleased" on top | key findings, timeline log, table, "since" tags, diff window. Each release's label is `.kicker.manual` ("v1.1.0 · 2 Nov 2026") so no section number is added |

Every type uses the full shell: top bar, hero, contents rail (leave it out under 4 sections with
`.layout.no-toc`), sections, footer. A report that fits none of these: take the nearest type's shell and
pick components by job from the index, and file it under that nearest type's `report:kind`.

## Component index

Gallery ids in brackets. One line on when to use each; the gallery entry has the full rules.

**Shell.** Top bar [c01]: the name and the theme button only, always `data-slot="host-bar"`. Hero [c02]: label, h1,
lead, the `.hero-meta` line (scope · date · version), then solo, `.hero.media` with a code window or figure, or with stats [c02b].
Contents rail [c03]. Section [c04]. Sub-section [c05]: h3, no h4 ever. Footer [c06].

**Text.** Prose [c07] in `.prose`. Numbered steps [c08]: order matters. Quote [c09]: a record's own words,
`.machine` for machine text. Definition list [c10]: glossary, field reference.

**Summary.** Stat row [c11]: 3 to 6 numbers. Key findings [c12]: 3 to 5, the first thing in `<main>`, before
the first section; each ends with a link to the section that proves it (the skeleton has the slot).
Verdict [c13]: one decision with a status word. Callout [c14]: the single most important point, at most one,
coloured by severity. Note [c15]: context or rule of thumb, under 80 words. Status aside [c16]: risk,
caveat, assumption. Illustration box [c17]: anything not from the record.

**Cards.** Card grid [c18]: `.grid` for 3 parallel ideas, `.grid.two` for 2 or 4 (also for two quotes side by side). Stage cards [c19]: 3 to 5 stages in order.
Option comparison [c20]: one `.recommended`. Finding card [c21]: severity, where, evidence, fix.
Detail card [c22]: one entity in depth.

**Data.** Table [c23] with `.num` and `tfoot`, a centred card with a `<caption>` title and/or a `<p class="source">` footer inside `.table-wrap` (`check.py` fails a table with neither). Table colour [c23b], one per table: heat columns (`th.heat`), changes (`span.change`, arrow and pill from the sign), series keys (`th[data-slot]` matching a chart). Status [c24]: dot plus word. Kind tag [c25]: `.k1`–`.k6`.
Timeline log [c27]: dated events.

**Charts** [c26a–c26l]: column, bar, stacked/100%, line, area, sparkline, scatter, histogram, heatmap,
gantt, meter list, segmented bar. See Charts below.

**Code and records.** Code window [c28]: code that never wraps. Record window [c29]: JSON, logs, prompts,
transcripts that wrap. Diff window [c30]. Side-by-side pair [c31]: two records or diffs compared.

**Diagrams.** State strip [c32]: lifecycle. Flow [c33]: linear pipeline in one row, at most 6 steps (5 reads better).
Figure [c34]: any other diagram as inline SVG (`.edge.dashed` for async or optional,
`text.muted` for secondary labels). Colour diagram parts by kind with the tag slots `.k1`–`.k6`: on a figure `.box` or
`.edge`, a flow step, a `.state` or a `.stages` card (tint plus outline or top edge; same kind, same colour). Screenshot [c34b]: framed image with caption.

**Inline** [c35]: `.pill`, `.pill.dark`, `.pill.label`, `.pill.accent`, `.since`, `<kbd>`, inline code, `.nowrap`.
**Source line:** `<p class="source">Source: …</p>` inside a table's `.table-wrap` (its footer), or straight after a figure or list. Charts use their
spec's `source` instead, never both.

## Writing rules

- **The `<title>` is the report's name; the h1 is its claim.** Roost lists show the title in bold and the h1 on one
  line under it, so keep the title a short name (under 60 characters: "BUG-0005 postmortem", "Fernhill Q3 review") and
  never repeat the claim in it. The top bar's wordmark is the title, word for word.

- **Headlines are claims.** The h1 and each h2 state what the section shows ("One handoff was lost"), not
  its topic ("Handoffs"). Never a question.
- **Bold lead-in, then one sentence**, for findings, list items and notes: "**A run ends at a boundary.** Most…"
- **Plain words.** Name the thing, give the number, say what it means. No hedging stacks, no filler intros.
- **Every number carries something.** Drop stats that say nothing ("Sessions: 1"). Give units and dates.
- **Quote, don't paraphrase,** when the record's words are the evidence. Say if anything was substituted.
- **Real or illustrated, never blurred.** Anything made up goes in an illustration box.
- **Missing data stays missing.** If the record lacks something the report needs (a severity, a repro, an
  impact), say so. If you derive it (risks rated from likelihood and impact), state the rule in a status aside.
- **Say where data came from:** a source line under tables and figures, a chart's `source`, and the footer for
  the whole report.
- **Identifiers and dates never break at their hyphens.** `report.js` does this on its own for any token with a
  hyphen before a digit (BUG-0012, T-072.4, 2026-11-01, note-00001.md); `.nowrap` covers anything else.
- **Sentence case** everywhere except the uppercase labels the CSS already makes.

## Component rules that span the report

- **Section numbers are automatic.** Write only the topic in `<span class="kicker">`; `.kicker.manual`
  for a fixed label such as appendix "A". Each section's `id` matches its contents-rail link.
- **Status colours mean state only:** `.good`, `.warning`, `.serious`, `.critical`, always with a word.
  The same four classes colour verdicts, asides, callouts, status dots and meters.
- **One callout per report.** Its severity matches the finding; no class when it has none.
- **Kind tags keep their number** everywhere in the report, assigned in order of first use. A chart that
  plots the same kinds sets each series' `"slot"` to the tag number so colours match.
- **One entity, one colour, across the whole report.** Slots start at 1 in every chart; when a series
  appears in several charts (a run, a machine, a team), set its `"slot"` so it keeps its colour.
- **Diffs: strip the `+`/`-` from a pasted unified diff; `.add` and `.del` draw their own.
- **Records over 30 lines start closed** (`<details class="record">` without `open`), size in the bar;
  an excerpt says so ("11 of 19 lines"). Diffs never wrap: they scroll sideways like code.
  Line breaks in quotes need `<br>`; record lines marked with `.ln` may sit on separate source lines.
- **Every code window is highlighted.** Code gets a language class, `<pre><code class="language-rust">`,
  and `prism.js` colours it: typescript, javascript, rust, toml, json, bash, python, yaml, markdown, sql,
  go, diff, markup (html/xml). Plain-text excerpts (prompts, pipelines, logs) are tinted by hand: `.k`
  field labels and names, `.s` strings, `.c` arrows and asides. An untinted code window is unfinished.
  Diff and record windows mark lines with `.ln` spans, which Prism can't colour; tint those by hand.
- **No hex colours anywhere in a report**, including inside figure SVGs: use the classes the gallery shows.
- **Images are embedded** as data URIs (PNG or WebP, at most 1600px wide) with alt text and a caption.

## Charts

`<figure class="chart"><script type="application/json">{…spec…}</script></figure>`. `charts.js` draws it
as a bordered card (title and subtitle top-left, legend top-right, source and "Show data" table in the foot)
with tooltips and keyboard focus. `yTitle` and `xTitle` print as "↑ y" above the plot and "x →" under it: don't
type the arrows. A bad spec renders a visible error.

| Type | Data | Use for |
|---|---|---|
| `column`, `bar` | `labels[]`, `series[{name, values[]}]` | comparing categories; bar for ranked or long names |
| `line`, `area` | `labels[]`, `series[]` | trends over time; area for volume |
| `scatter` | `series[{name, points[[x, y, "label", highlight]]}]` | two measures; at most 3 series |
| `histogram` | `values[]` or `bins[{from, to, count}]` | distribution |
| `heatmap` | `rows[]`, `cols[]`, `values[rows][cols]` | a grid of values; `"diverging": true` around `"mid"` |
| `gantt` | `tasks[{name, start, end, group}]`, ISO times or numbers | durations on a timeline |
| `meter` | `items[{name, value, max, target, status, statusLabel}]` | progress against a limit; `target` draws a tick, `statusLabel` replaces the status word ("Miss", "Done"), `"showMax": false` hides "/ max" |
| `segmented` | `parts[{name, value}]`, `"thin": true` | one whole in 6 parts or fewer |
| sparkline | `<span class="spark" data-values="1,2,3"></span>` | a trend inside text, a table or a stat |

Common options: `title`, `subtitle`, `source`, `format {prefix, suffix, decimals}`, `xTitle`, `yTitle`,
`xFormat`, `yFormat`, `stacked`, `normalize`, `showValues`, `zero`, `emphasis` (one series in colour, the
rest grey), and per series `slot` (colour 1–8). `format.trim: true` drops trailing zeros (78, not 78.0).
Bar category names over about 24 characters are cut with "…" on phones. Bar and column take `reference: {value, label}` (or a list):
a dashed line for a budget or target, named in the legend. Grouped columns never print values on the caps.

- **Pick the form by the data's job:** magnitude → bar or column; change over time → line; share of a
  whole → segmented or 100%; distribution → histogram; relation → scatter; one headline number → stat row,
  not a chart.
- **One axis per chart.** Two measures on different scales are two charts.
- **At most 8 series;** fold the rest into "Other". Colours follow the series, never its rank.
- **Title says what to see.** Every chart with axes names both: `yTitle` (top-left, beside the legend) and `xTitle`
  (bottom-right), months and dates included, units in brackets. Never units in the subtitle, which sits centred under the title and gives context (period, filter). Every chart gets a `source`.

## Colour themes

Every colour lives in one theme file in `assets/themes/`; `report.css` and `charts.css` hold none. The skeleton links
`themes/catppuccin.css`. When the user names a palette, link that file instead (`themes/nord.css`);
`build.py` inlines whichever is linked (a report's links name files relative to `assets/`, as the skeleton's do). One theme per report. Each theme carries light and dark, so the
light/dark toggle works the same in all of them.

| Theme | Notes |
|---|---|
| `catppuccin` (default) | Latte light, Mocha dark, mauve accent. Up to 8 chart series. |
| `everforest` | Medium contrast. Light mode is low-contrast by design: all text is one colour, links are underlined, the green accent is a fill only. Up to 7 chart series. |
| `github` | Primer light and dark, blue accent, GitHub's own data-vis and syntax colours. Up to 8 chart series. |
| `rosepine` | Dawn light, main dark, pine/foam accent. Light text is one colour. Up to 5 chart series; scatter plots 2 at most. |
| `dracula` | Alucard light, Dracula dark, purple accent. Dark text is one colour; code comments are dim, as Dracula specifies. Up to 6 chart series. |
| `nord` | Snow Storm light, Polar Night dark, frost accent; links underlined. Up to 8 chart series, three of them close blues: check charts over 5 series in the table view. |

**Adding a theme:** copy an existing theme file and give every variable a value from the new palette, keeping
`light-dark(light, dark)`. Then check it the way the existing headers record: text colours at 4.5:1 or more on
the page and card surfaces, the chart order through the dataviz skill's `validate_palette.js` against both
backgrounds (adjacent colour-blind dE 8 or more, normal-vision 15 or more, first three distinct for scatter),
text on status fills at 4.5:1 (a theme can set `--on-good`, `--on-warning`, `--on-serious`, `--on-critical` where
one text colour can't serve every fill, `--focus-color` where the accent is too faint as a focus ring, and the heading levels `--h1`, `--h2`, `--h3`, `--title`
(chart and table titles): one palette hue each, darkened or lightened only to 3:1 for h1–h3 and 4.5:1 for titles), ink
at 4.5:1 on the table tints (chart 1 at 32% and the diverging poles at 20%, mixed into the page; if ink falls short,
set `--heat-max`, `--tint-up`, `--tint-down` as `light-dark()` colours, as Everforest does), and the status set. A theme with fewer than 8 separable hues sets the extra slots to `var(--chart-other)` and says
how many series it supports. Write the results in the file's header comment, add a row
to the table above, and add the name to the gallery's palette button (`data-palettes`).

## Fonts and colours

Black Chancery for headings, Coolvetica for body text, MonoLisa for code. Roost serves the heading and code faces at
`/_fonts/v1/` (behind its login), and reports only link them: never embed a font, and `roost publish` refuses a report
that does (`url(data:font/…)`). Opened outside Roost, a report falls back to the next font in each stack. Coolvetica is
used only when installed on the machine (its licence forbids embedding and serving), so elsewhere body text falls
back to the system sans. Colours come from the theme (above); the viewer's system setting picks light or dark,
and the theme button overrides it. Code windows are dark in both modes, on purpose. In both themes the
serious and warning colours sit close, which is why every status carries its word. Kind tags use square markers, status uses round dots. All of this lives in the CSS; reports never
set fonts or colours.

## Inside Roost

Roost is the hub these reports are published to. It shows each report as the report's own page, untouched, with its
own bar in place of the top bar, and lists reports by their filing. A report slots in when:

- **Filing tags are set** in the head: `report:kind` (one of the eight in the type table), `report:project` (the
  repository's slug, lower case), `report:stream` (optional, a slug: the line of work, such as `perf` or `releases`)
  and `report:date` (`YYYY-MM-DD`). Roost colours every kind the same way everywhere (investigation, architecture,
  audit, benchmark, decision, postmortem, status, changelog take chart colours 1 to 8), independent of the report's
  own kind tags (`.k1`–`.k6`).
- **The top bar is the host slot:** `<div class="topbar" data-slot="host-bar">` with the wordmark and the theme button
  only. Anything else the bar used to say (scope, date, version) goes in the hero's `.hero-meta`, so it survives when
  Roost hides the bar.
- **The host owns the page chrome.** Roost sets `data-host="roost"` on `<html>` before the report's scripts run.
  `report.css` then hides the top bar and starts the hero 48px down; `report.js` leaves light/dark to the host (Roost
  sets `data-theme`, and writes its choice to `localStorage["report-theme"]`, so the report opened on its own
  matches). Roost also sets `--sticky-top` on `<html>` to its bar's height, so the contents rail and anchor jumps land
  under its bar; `--wrap-max` and `--wrap-pad` are there for a host whose column differs (Roost's matches the
  report's: 1200px, 16px sides).
- **Nothing else changes.** A report built this way reads exactly as before when opened on its own.

## Check before handing over

1. **Run the check** on the built file. It needs `uv` and Chrome:
   ```
   uv run $SKILL/scripts/check.py <name>.html <scratch-dir>
   ```
   It renders light and dark at 1400px and 500px (forcing each theme, whatever the system setting),
   saves each variant as viewport-high slices, and prints chart errors, sideways page scroll, untinted
   code windows and charts with marks drawn black (a theme colour that failed to resolve) per variant, and once
   the filing tags and the top bar's host slot (*Inside Roost*). It exits 1 if it found any. Fix those first.
2. **Look at the slices** with the Read tool: at least every slice of one desktop variant, and the phone
   slices that hold tables, charts, figures and code. Look for clipped or cut-off text, labels colliding,
   cards alone on a row, and anything unreadable in one theme.
3. **Read it as the user:** every key finding points to a section that proves it; every headline is a
   claim; every table and chart says where its data came from; nothing invented sits outside an
   illustration box.

## Publish

A report goes to Roost as a folder holding the built file as `index.html` (plus any files it links relatively).
The filing comes from the report's own head; the CLI reads it and sends nothing else to classify it.

### Where the files go

Write the source to `~/.roost/drafts/<slug>.src.html` and build it straight into the folder that gets published:
`python3 $SKILL/scripts/build.py ~/.roost/drafts/<slug>.src.html ~/.roost/drafts/<slug>/index.html`. Only the built
file goes in that folder: every file in it is published. `<slug>` is the title in kebab case (at most 60 characters).
Never write drafts into the working tree.

### Choosing the filing

Do this while filling step 4, before writing the body:

```sh
roost project list --json     # the registry, and which project this folder resolves to ("resolved")
```

- **`report:project`** is a Roost project id from that list, not a guess at the repo's name. `resolved.match` of
  `remote` or `path`: use it without asking. `none`: match semantically against the descriptions and keywords, then
  ask. **Never create a project**; offer `roost project add` only after the user names the project and confirms.
- **`report:stream`** is a stream id from the project's streams (`roost publish --dry-run --json` lists them under
  `proposal.streams`) when one clearly fits; delete the tag when none does. A stream id that does not exist yet is a
  proposal for a new stream: Roost asks before creating it (exit 3), so only write one when the user wants it.
- **`report:kind`** is the type you picked in step 1. A perf investigation is `investigation` when finding *why* it
  is slow and `benchmark` when measuring *how fast*; a security review of one change or of a whole repo is `audit`; a
  design that is still being chosen is `decision`, one that is settled and explained is `architecture`.
- **`report:date`** is the day the report describes.

### Publishing

```sh
roost publish ~/.roost/drafts/<slug> [--change-note "…"] [--tags a,b] [--supersedes <id>] [--confirmed] --json
```

Run it from the session's working directory: the CLI checks `report:project` against the git remote and path. The
same slug again publishes a new version of the same report (give `--change-note`); `--slug <slug>` keeps the slug
when the title changed. Handle the exit codes:

| Exit | Meaning | Do |
| --- | --- | --- |
| 0 | Published | Give the user `url` (and say if `state` is `quarantined` or `triage` is true) |
| 2 | Lint errors (`errors[]`): missing or invalid filing tags, no host slot, an embedded font, a local path | Fix the report, rebuild, run again; never publish around a lint error |
| 3 | Needs confirmation (`needs[]`, `proposal`, `candidates`) | Ask one combined question (below), then rerun with `--confirmed`, or fix the tags and rerun |
| 4 | Possible secrets (`findings[]`, masked) | Show the findings and ask "Publish anyway?". Yes: rerun with `--allow-secrets`. No: remove them, rebuild, rerun |
| 1 | Network, auth or server error | Report the `error`; suggest `roost doctor` |

**Ask once, only if needed.** When exit 3 says the project matched only semantically or the stream is new, ask
**one** AskUserQuestion with the whole proposal ("Publishing to *Payments API › auth-migration* as an
**investigation**. OK?") and the alternatives as options. If the user picks another filing, change the tags, rebuild
and publish again; if they say yes, rerun with `--confirmed`. When nothing says ask, don't ask.

### Unattended runs

When no one can answer (a scheduled or headless run such as `claude -p`, or a question left unanswered), add
`--unattended` and never ask:
- the report publishes with the filing in its tags and lands in Roost's triage inbox for the user to confirm;
- possible secrets quarantine it instead of stopping;
- a stream that does not exist is only proposed, never created;
- with no project match at all, don't publish; say so in your final output.

