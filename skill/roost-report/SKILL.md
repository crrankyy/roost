---
name: roost-report
description: Write an HTML report of this session's findings in the lynx-reports style and publish it to Roost (the user's private report hub) with the `roost` CLI. Use when the user asks for a report, write-up, summary, investigation notes, review, audit, plan, benchmark or explainer to read later or on their phone, says "publish this", "send it to Roost" or "make a report", or when a scheduled or unattended run ends with findings worth keeping.
---

# Roost report

Roost hosts the reports Claude Code writes so the user can read them from any device. A report is a folder with `index.html` (plus optional `assets/`), written to the authoring contract below and published with `roost publish`. The publisher, not you, writes `report.json`.

## 1. Write the report

1. Make a folder outside the repo: `~/.roost/drafts/<slug>/` (slug = kebab-case title, at most 60 characters). Never write drafts into the working tree.
2. Start from `template/index.html` in this skill folder. It is the ReportExample card: keep its shape, replace every word of content.
   - `body.lr-report` > `.lr-shell` > `aside.lr-nav` (ReportToc) + `main.lr-main`. Count your `section.lr-section` elements: **three or more keeps the `aside.lr-nav` ToC** (one link per section, with `reports.js` loaded); only one or two use `.lr-shell.lr-shell-single` with no `aside`.
   - First section: ReportHeader (KindBadge with `data-kind` = the kind, title, **the answer in `.lr-lead`** with its number), then 2–4 Stats, then the main Findings.
   - Each later section starts with `.lr-section-head`. The last section is the SourceList, then `footer.lr-footer`.
   - Load `/_ds/lynx-reports/v1/tokens.css` then `/_ds/lynx-reports/v1/components/reports.css`; add `/_ds/lynx-reports/v1/components/reports.js` at the end of the body only when there is a ToC, chart tooltips or code to copy.
   - `<title>` = the title you will publish with.
3. Components are in `reference/components.md`. Charts follow `reference/charts.md` and the markup in `reference/chart-example.html`:
   - pick the form by the question (BarList to compare, line for a trend, ShareBar for parts of a whole, Sparkline beside a Stat);
   - the chart title states the finding with its number;
   - colour series only with `data-series="1"`…`"6"` in order, or `"muted"`. **Never a hex, rgb or named colour**, anywhere in inline SVG;
   - every chart gets a `details.lr-chart-data` "Show data" table.
4. Rules (the publisher enforces them):

| Blocks the publish | Warns |
| --- | --- |
| No `index.html` | `<title>` differs from the classified title |
| Links to `file://`, `localhost`, `127.0.0.1`, `/Users/…`, `/home/…`, `C:\…`, or absolute paths other than `/_ds/lynx-reports/v1/…` and `/p/<project>/r/…` | External scripts, stylesheets or fonts (vendor into `assets/`) |
| Over 25 MB per folder or 10 MB per file | Missing `<meta name="viewport">` |
| Any `id` or `class` starting `rh-` (reserved for Roost's chrome) | A file over 2 MB; a missing summary |
| Unknown kind or stream | Possible secrets; raw colours in inline SVG |

   Also: assets are linked relatively (`assets/chart.svg`); code is linked by commit on GitHub; all data is baked in (no API calls at view time); no `localStorage`; it works at 380px with wide tables in `.lr-table-wrap`; keep the bottom-right corner free of fixed elements.

## 2. Classify

Read `reference/kinds.md` and pick **one** kind by its boundary rule and the tie-breaks. Then:

```sh
roost project list --json          # the registry, and which project this folder resolves to ("resolved")
roost publish <dir> --kind K --title "…" --summary "…" --dry-run --json   # also checks lint, secrets, stream
```

- **Project.** `resolved.match` is `remote` or `path`: use it without asking. `none`: match semantically against the registry's descriptions and keywords, then ask. **Never create a project.** Offer `roost project add` only after the user says which project and confirms.
- **Stream.** Pick a stream from the project's manifest when one clearly fits (its id or description), or none when clearly none fits. If two fit, or you would propose a new one (`--new-stream <id>`), ask. Never create a stream without the user's yes. If three or more unstreamed reports share a theme, you may suggest a stream once.
- **Also:** `--summary` (one sentence, the answer), `--tags a,b` for cross-cutting topics, `--typed '{"root_cause":"…"}'` for the kind's typed fields, `--change-note "…"` when republishing (same slug = new version of the same report), `--supersedes <id>` when this replaces a different report, and `--why "…"` (your reason for the classification, one line).

## 3. Ask once, only if needed

Ask **one** combined question (AskUserQuestion) when any rule says ask: the project matched only semantically, two kinds are plausible, or the stream is ambiguous or new. Put the whole proposal in it, with the alternatives as options. For example: "Publishing to *Payments API › auth-migration* as an **investigation**. OK?" When the user says yes, publish with `--confirmed`. When nothing says ask, don't ask.

## 4. Publish

```sh
roost publish ~/.roost/drafts/<slug> --kind K --title "…" --summary "…" [--project P] [--stream S | --new-stream S] \
  [--tags …] [--typed '…'] [--change-note "…"] [--why "…"] [--confirmed] --json
```

Run it from the session's working directory, because the project is resolved from the git remote and the path. Handle the exit codes:

| Exit | Meaning | Do |
| --- | --- | --- |
| 0 | Published | Give the user `url` (and say if `state` is `quarantined` or `triage` is true) |
| 2 | Lint errors (`errors[]`) | Fix the report and run again; never publish around a lint error |
| 3 | Needs confirmation (`needs[]`, `proposal`, `candidates`) | Ask the one combined question, then rerun with the answers and `--confirmed` |
| 4 | Possible secrets (`findings[]`, masked) | Show the findings and ask "Publish anyway?". Yes: rerun with `--allow-secrets`. No: remove them and rerun |
| 1 | Network, auth or server error | Report the `error`; suggest `roost doctor` |

## 5. Unattended runs

When no one can answer (a scheduled or headless run such as `claude -p`, or a question left unanswered), add `--unattended` and never ask:
- the report publishes with your best guess and lands in Roost's triage inbox for the user to confirm;
- possible secrets quarantine it instead of stopping;
- a new stream is only proposed, never created;
- with no project match at all, don't publish; say so in your final output.

## 6. Checks before you publish

- The lead states the answer with a number; Findings are sentences; titles of charts are findings.
- Kind badge in the header matches `--kind`; `<title>` matches `--title`.
- Three or more sections: `.lr-shell` with the `aside.lr-nav` ToC and `reports.js`. One or two: `.lr-shell-single`, no ToC.
- `--dry-run --json` shows no `errors`.
