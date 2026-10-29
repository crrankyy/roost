# Roost — Spec

29 Oct 2026 · Excers

Roost is a private, single-user Cloudflare Worker that hosts the static HTML reports Claude Code writes, so they can be read from any device instead of only the machine that ran the session. Reports are filed by project, classified by kind and stream, versioned, and published by a CLI that Claude Code runs at the end of a session.

> Naming: the product was called "Report Hub" while it was designed. The design system (lynx-reports) and the Claude Design canvas still use that name, and their CSS prefixes stay as they are: `hub-` for Roost's own pages and `rh-` for the chrome Roost injects into reports.

## 1. Scope

**In scope**

- Hosting static report folders from R2 behind Cloudflare Access on a workers.dev URL.
- A user-owned project registry; Claude matches each session to a project.
- Per-report classification: a fixed kind vocabulary plus optional project-scoped streams.
- Immutable versions, archiving, a triage inbox, pins and "new" markers.
- ntfy push notifications on publish.
- A publisher CLI with validation, secret scanning and quarantine.
- A hub-wide palette and light/dark setting applied to the hub and every report.
- The lynx-reports design system, served by the Worker at `/_ds/lynx-reports/v1/`.
- A Claude Code skill that writes reports to the authoring contract and publishes them.

**Non-goals for the first version**

- Full-text search (browse and filter only; D1 later if needed).
- Multiple users or per-project permissions.
- Hard deletion of anything.
- A custom domain (workers.dev now; a redirect covers a later move).

## 2. Architecture

One Worker fronts everything. R2 holds reports, manifests, the registry and the design-system files; KV holds the viewer's state; Cloudflare Access gates every request before it reaches the Worker.

```
Publisher CLI (run by Claude Code) ──service token──┐
                                                    ├──> Cloudflare Access ──> Worker `roost` ──┬── R2 `roost`   (reports, manifests, registry, settings, /_ds files)
Browser (phone or laptop) ─────────email login─────┘                          (checks the JWT) ├── KV `ROOST_STATE` (pins, seen, theme, palette)
                                                                                                └── ntfy.sh (push to phone)
```

| Component | Role | Notes |
| --- | --- | --- |
| Worker `roost` | Serves report files, renders the hub pages, injects report chrome, exposes the publish and viewer APIs | Stateless; config in `wrangler.jsonc` |
| R2 bucket `roost` | Report versions, project manifests, project registry, settings, design-system assets | Nothing is ever deleted |
| KV namespace `ROOST_STATE` | Pins, last-visit time, opened report ids, theme and palette | Single user, a few small keys |
| Cloudflare Access | Email login for the browser; service token for the publisher | One-click Access on the workers.dev route |
| ntfy.sh | Push notifications on publish (including triage and quarantine), sent by the CLI | Random topic name in `ROOST_NTFY_TOPIC` on each machine, metadata only |
| Publisher CLI `roost` | Validates, classifies, uploads, notifies | Single Node script, no dependencies beyond Node 20+ |

**Access and authentication**

- Enable Access on the Worker's workers.dev route (Worker → Settings → Domains & Routes → Enable Cloudflare Access). Policy: allow only the owner's email.
- The Worker still validates the `Cf-Access-Jwt-Assertion` header on every request (issuer = the team domain, audience = `POLICY_AUD`, keys from `<team>.cloudflareaccess.com/cdn-cgi/access/certs`). Requests without a valid token get 403.
- The publisher authenticates with an Access service token (`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` in the environment of each machine, or in `~/.config/roost/env`). The Access application has a separate Service Auth policy for that token. The Worker tells the identities apart by the JWT: `common_name` equal to the var `SERVICE_TOKEN_ID` (the token's Client ID) is the publisher; an `email` claim is the browser.
- Write endpoints for publishing (`/api/publish`, registry and stream commands) accept only the service-token identity. Browser sessions can call only the viewer actions: pin, mark seen, set theme/palette, triage confirm/reclassify/publish/reject, archive/unarchive.

## 3. Data model

Four records carry the system: the project registry (owned by the user), the kind vocabulary (fixed in config), streams (per project, in the manifest), and report versions (written only by the publish API). Each project's manifest indexes its streams and reports.

### 3.1 Project registry

Stored at `registry/projects.json`. The user creates and edits projects with `roost project add|edit|archive`; Claude reads the registry but never writes it without the user's confirmation.

```json
{ "id": "payments-api", "title": "Payments API",
  "description": "Card + UPI payment service, refunds, reconciliation",
  "match": { "remotes": ["github.com/me/payments-api"],
             "paths": ["~/work/payments*"],
             "keywords": ["razorpay", "settlement"] },
  "status": "active" }
```

- `id`: kebab-case, unique, immutable once a report exists.
- `match.remotes` and `match.paths` are decisive matches; `keywords` and `description` feed semantic matching only.
- A monorepo is one project, or several projects sharing a remote with different path globs.
- `status`: `active` or `archived`.

### 3.2 Kinds

A closed, global vocabulary of 13 kinds, fixed in the Worker and CLI config. Adding a kind is a config change by the user. There is no catch-all kind.

| Kind | What it is | Boundary rule | Typed fields |
| --- | --- | --- | --- |
| investigation | Debugging, root-causing a bug or odd behaviour | Not a production event, else incident | `symptom`, `root_cause`, `resolved` |
| incident | Something broke for real users | Has real impact and a timeline | `severity`, `started`, `duration`, `impact` |
| review | Assessment of one change: PR, diff, branch | One change; a codebase sweep is an audit | `target_ref`, `verdict` |
| audit | Systematic sweep: security, deps, tech debt, a11y, cost | Covers a surface, not one change | `scope`, `findings_count`, `severity_max` |
| architecture | Design proposals, ADRs, system design | Decides what or how to structure | `decision_status` |
| plan | Implementation, migration, rollout plans | Decides the order of work, design settled | `status`, `target_date` |
| analysis | Data or metrics answering a question | Inputs are data already held | `dataset`, `question` |
| benchmark | Performance measurements and comparisons | Has a baseline and numbers | `baseline_ref`, `headline_delta` |
| experiment | Spikes, prototypes, A/B, hypothesis tests | Starts with a hypothesis, ends with an outcome | `hypothesis`, `outcome` |
| research | Tool/library evaluations, comparisons, literature | Inputs mostly external | `question`, `recommendation` |
| explainer | How something works: walkthroughs, onboarding | Describes, changes nothing | `subject` |
| runbook | Operational procedures | Written to be executed | `last_verified` |
| summary | Session recaps, progress, release notes, stream wrap-ups | Reports what was done | `period`, `release` |

Tie-breaks: a perf investigation is an investigation when finding *why* it is slow and a benchmark when measuring *how fast*. A security review of one PR is a review; of the repo, an audit. A design-plus-rollout doc is architecture when the design is contested, a plan when settled. Typed fields are optional; the hub shows filled ones as badges.

### 3.3 Streams

A stream is a long-running thread of work inside a project (a feature, migration, subsystem or question). Stored in the project manifest.

| Field | Purpose |
| --- | --- |
| `id`, `title`, `description` | Identity; the description is what Claude matches against |
| `status` | `active`, `done` or `archived` |
| `aliases` | Old ids that still resolve after a rename or merge |
| `started`, `last_report` | Computed, used for sorting |

- A report belongs to at most one stream. Cross-cutting topics go in tags.
- Streams are flat; no nesting.
- Reports without a stream appear under General.
- Creating a stream always requires the user's confirmation (unattended runs never create one; see 5.4).
- Rename and merge are metadata-only (stream is not in the URL); the old id becomes an alias.
- A stream is shown as active while it has a report in the last 14 days.
- When three or more unstreamed reports share a theme, Claude may suggest a stream once; it never creates one on its own.

### 3.4 Report and version metadata

Each version stores a `report.json` written by the publish API, never by the report author.

```json
{ "id": "2026-10-29-auth-token-expiry", "version": 2,
  "project": "payments-api", "kind": "investigation", "stream": "auth-migration",
  "title": "Why refresh tokens expire early", "summary": "Clock skew on the auth pod",
  "tags": ["auth"], "status": "final",
  "typed": { "symptom": "401s after 10 min", "resolved": true },
  "created": "2026-10-29T17:30:00+05:30", "published": "2026-10-29T17:42:10+05:30",
  "change_note": "Added fix verification",
  "classification": { "by": "claude", "confirmed": true, "triage": false, "why": "git remote matched" },
  "flags": { "quarantined": false, "secret_findings": 0 },
  "source": { "branch": "fix/auth", "commit": "a1b2c3d", "session": "…", "unattended": false },
  "supersedes": null, "archived": false }
```

- `status`: `draft`, `final` or `superseded`.
- Versions are immutable. Classification (`kind`, `stream`, `tags`, `status`, `archived`) is report-level and can change without a new version; it lives in the project manifest and overrides the stored copy.
- `supersedes` points at a different report this one replaces; that report is marked superseded and dimmed in indexes.

### 3.5 Project manifest

`p/<project>/manifest.json` is the index the Worker renders from: the project's streams plus one entry per report (current classification, latest version, the version list with dates and change notes, flags, triage state). Only the publish API and viewer actions write it. Writes are read-modify-write with an R2 ETag precondition (`onlyIf`; `etagDoesNotMatch: '*'` to create), retried up to six times with jittered backoff. A publish claims its version number in the manifest (as `pending`) before writing any file, so concurrent publishes never share a version; a pending version is never served or listed. A small global index (`index/recent.json`: the latest ~100 reports across projects, plus open triage items) is maintained alongside so the home page needs one read.

## 4. URLs and storage layout

URLs carry only project and report id, so reclassifying a report never breaks a link; kind and stream views are computed filters.

| URL | Serves |
| --- | --- |
| `/` | Home page |
| `/triage` | Triage inbox and review |
| `/p/<project>/` | Project page |
| `/p/<project>/r/<date>-<slug>/` | Latest version of a report |
| `/p/<project>/r/<date>-<slug>/v<N>/` | A specific version |
| `/p/<project>/kind/<kind>/` | Project filtered by kind |
| `/p/<project>/stream/<stream>/` | Project filtered by stream (aliases redirect) |
| `/kind/<kind>/` | All projects filtered by kind |
| `/_ds/lynx-reports/v1/…` | Design-system files (tokens.css, palettes.css, bundle.css, bundle.js, lib/, reports.css, reports.js, hub.css) |
| `/_roost/…` | Roost's own scripts (pill behaviour, filters, triage actions) |
| `/api/…` | Publish API (service token) and viewer actions (browser) |

Query parameters on any index: `?archived=1` includes archived items; `?from=YYYY-MM-DD&to=…`, `?kind=a,b`, `?project=x` filter.

**R2 keys**

```
registry/projects.json
config/settings.json                      # kind config, design-system version (the ntfy topic is only in the Worker secret)
index/recent.json
p/<project>/manifest.json
p/<project>/r/<id>/v<N>/index.html
p/<project>/r/<id>/v<N>/report.json
p/<project>/r/<id>/v<N>/assets/…
ds/lynx-reports/v1/…
```

- Report id = `<YYYY-MM-DD>-<slug>`, slug kebab-case, ≤ 60 characters. The date is the first publish date and never changes.
- Publishing to an existing id writes `v<N+1>`; earlier versions are never rewritten.
- Quarantined versions are written under the same keys but the Worker refuses to serve them until confirmed.
- A breaking design-system change ships as `ds/lynx-reports/v2/`; `v1` stays forever so old reports render unchanged.

## 5. Publishing

The publisher is the only way content enters the system: Claude classifies, the CLI validates against the registry and vocabulary, uploads a new version, the Worker updates the manifest, and ntfy notifies.

### 5.1 CLI

```
roost publish <dir> [--project P] [--kind K] [--stream S | --new-stream S] \
              [--slug X] [--title T] [--summary S] [--tags a,b] [--status draft|final] \
              [--typed '{json}'] [--change-note "…"] [--supersedes ID] [--why "…"] \
              [--confirmed] [--unattended] [--allow-secrets] [--dry-run] [--json]
roost project add|edit|archive|list
roost stream create|rename|merge|done|archive|unarchive <project> <stream> [--to S]
roost export <project> <out-dir>
roost doctor                      # checks env, Access token, connectivity
```

A single Node script (Node 20+, no dependencies), shipped with the Claude Code skill. Configuration from the environment, falling back to `~/.config/roost/env` (mode 600): `ROOST_URL`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`, optional `ROOST_ALLOW_EMAILS` (addresses the secret scan ignores), `ROOST_NTFY_TOPIC` and `ROOST_NTFY_SERVER` (default `https://ntfy.sh`). `--confirmed` records that the user answered the combined question; `--why` is Claude's reason for the classification. Exit codes: 0 published, 1 network/server/auth, 2 usage or lint errors, 3 needs confirmation, 4 secret findings (attended). `--json` prints one object on stdout.

### 5.2 Steps

1. **Resolve project** from git remote, then working-directory path, then semantic match against the registry.
2. **Classify**: Claude proposes kind, stream, tags, typed fields, title and summary; the CLI checks kind against the vocabulary and stream against the manifest.
3. **Lint** the folder against the authoring contract (section 7): errors stop the publish, warnings print.
4. **Scan for secrets**; findings are warnings (see 5.5).
5. **Confirm** with the user when any confidence rule says ask, as one combined question.
6. **Upload** in three steps, so no request parses a large body (the free plan allows 10 ms of CPU): `POST /api/publish` validates and claims version N in the manifest; each file is `PUT` and streamed into R2 with its sha256 checked, never overwriting; `POST …/commit` writes `report.json`, makes the version live (or quarantined) in the manifest, then recomputes that project's slice of the global index. The manifest is the source of truth; the index is rebuilt from manifests if a write to it fails.
7. **Notify**: after a successful commit the CLI sends the ntfy push from the publishing machine and prints the report URL. (ntfy.sh rate-limits the shared egress IPs of Cloudflare Workers, so the Worker cannot send reliably.)

### 5.3 Classification confidence

| Field | Publish without asking | Ask |
| --- | --- | --- |
| Project | Git remote or path match | Semantic-only match, or no match |
| Kind | One kind clearly fits the boundary rules | Two kinds plausible |
| Stream | Clear match to an active stream, or clearly none | Ambiguous between streams, or a new stream proposed |

When asking, Claude sends one confirmation with the whole proposal, e.g. "Publishing to *Payments API › auth-migration* as an **investigation**. OK?" Claude never creates a project; an unmatched session asks which project, and offers `roost project add` only after the user confirms.

### 5.4 Unattended sessions and triage

When no one can answer (`--unattended`, scheduled runs, or a question left unanswered), the report publishes with Claude's best guess and `classification.triage = true`, with the reason (`classification.why`). It appears in the triage inbox, where the user confirms in one tap (with an Undo toast) or reclassifies. A new stream proposed unattended is not created; the report publishes unstreamed with the proposal attached, and reclassify offers it as "Propose a new stream".

### 5.5 Secrets and quarantine

- **Attended:** the CLI prints findings; Claude asks "publish anyway?" before uploading. `--allow-secrets` records the override.
- **Unattended:** the version uploads with `flags.quarantined = true`. The Worker does not serve it; it shows in triage with the findings (file, line, kind of secret, value masked to its last four characters). A quarantined item can only be reviewed, never confirmed from the strip. "Publish anyway" serves it; "Reject" marks the version rejected (kept in R2, archived, never served).
- Detection: common key and token patterns (Cloudflare, GitHub, AWS, OpenAI/Anthropic-style keys, Slack, Stripe), private-key blocks, `.env`-style lines, high-entropy strings, email addresses, home-directory paths.

### 5.6 Notifications

- ntfy.sh topic = a long random string in `ROOST_NTFY_TOPIC` on each publishing machine (env or `~/.config/roost/env`). The CLI sends every notification; a failed push is a warning, never a failed publish.
- Payload: title, project, kind and the report URL only; no summary or content.
- Two tags: `published` on every publish, `needs-you` on triage and quarantine, so either can be muted.
- Self-hosted ntfy later needs only a server URL change.

## 6. Viewing

Every page is built for a phone first: the common visit is opening the report a session just made, then catching up, then browsing.

The screens were designed in the **Report Hub** canvas in Claude Design (20 artboards: home, project, filters, triage, report chrome; light and dark; phone and desktop) and are built from the lynx-reports design system: `components/hub.css` plus its Report Hub cards. **Hub pages are server-rendered HTML** using Lynx's class recipes (`buttonVariants`, `toggleVariants`, `badgeVariants`, compiled in `bundle.css`); React and the bundle load only for the Radix controls that need behaviour (Select, DropdownMenu, Drawer, Calendar, Collapsible, Switch, SonnerToaster). Static fallbacks (native `<select>`, `<details>`, `<dialog>`) are acceptable where they keep the look.

### 6.1 Home page, top to bottom

1. **Triage strip** (TriageStrip) — only when non-empty: "3 reports need confirming", three across from 760px. Each item confirms in one tap without opening the report (Undo toast). Quarantined items show a red "2 secret findings" badge and only "Review".
2. **Pinned** (PinnedReports) — a sideways-scrolling row, only when something is pinned.
3. **Recent** (ReportRow) — the last 15 reports across projects; on phones 10 with "Show 5 more". Row: unread dot, title, time (pin icon when pinned), KindBadge, project › stream, one-line summary.
4. **Active streams** (IndexLists) — streams with a report in the last 14 days, sorted by latest report, with counts.
5. **Projects** (IndexLists) — name, counts, last activity; archived projects hidden.

From 1000px, Recent is the main column and streams + projects a 360px side column. FilterControls sit above Recent: an inline row from 760px (project Select, Kind menu of KindBadges with a count pill, date Select with presets then Custom range…, Include archived switch, Reset); on phones a Filter button opens a bottom sheet with the same filters and "Show N reports". The header (HubHeader) holds a 28px LiveAvatar in mauve, "Roost", the palette control and the theme toggle.

### 6.2 Project page

Breadcrumb, project title and stats; then the project's own triage items; active streams as StreamCards (latest three reports each, "All N"); General (reports without a stream); done streams in a collapsed disclosure. A "By stream / By kind" ToggleGroup regroups the page into kind groups ordered by their newest report, each row naming its stream. The same filters apply.

### 6.3 Triage

`/triage` lists the open items (an inbox column from 1000px; on phones one item at a time with previous/next). TriageReview shows the status, how it was published, title, lead, "Open report", and Claude's proposed classification with the reason. Actions: Confirm, or Reclassify (project Select, stream RadioGroup including "No stream" and "Propose a new stream" with a name field, kind Select; "Save and confirm"). Quarantined: a destructive Alert, the masked findings, "Reject" and "Publish anyway". Nothing in the hub deletes. Reclassifying into another project moves only the metadata: the files stay under their original R2 prefix (the entry records it as `home`), the old entry is marked `moved_to`, and the old URL redirects. "Preview report" on a quarantined item serves that version under `/triage/preview/…` with `Content-Security-Policy: sandbox`, so its scripts never run on Roost's origin; the report URL itself still refuses it.

### 6.4 Report chrome

The Worker injects chrome into each served report with HTMLRewriter (no iframe, so anchors and full-screen charts work):

- **ReportPill** — bottom-right. Collapsed: a 36px chip "v2 of 4". Expanded: project › stream breadcrumb with KindBadge, the version list with dates and change notes (current one checked), Pin toggle, Archive/Unarchive, "Back to <project>". On phones it slides away while scrolling down and returns on scroll up or at the end. Reports get `rh-report` so 96px of bottom space keeps the footer clear.
- **ReportBanner** — sticky at the top for an older version ("Viewing v2 of 4", what the latest adds, "Open latest version") or an archived report ("Archived on 27 Oct", "Unarchive"). One banner at a time.
- **Theme** — before first paint the Worker sets `data-theme`, `data-palette` and `data-hub-theme` on `<html>` from KV; `reports.js` then leaves the theme alone.
- **Seen** — serving a report through the Worker marks it seen.

### 6.5 Pins, "new" markers, theme

Stored in KV under a single owner key set:

| Key | Value |
| --- | --- |
| `pins` | Ordered list of report refs (`project/id`) |
| `seen` | `last_visit` timestamp + ids opened since then |
| `prefs` | `{ theme: "light" \| "dark" \| "system", palette: "catppuccin" \| … }` |

- A report is new when published after `last_visit` and not in the opened list. `last_visit` advances when the home page loads; the opened list is trimmed to entries newer than it.
- The palette choice is one of the 14 palettes in `palettes.css`, grouped Expressive and Minimal.

### 6.6 Archiving

Archived reports, streams and projects disappear from indexes and filters; URLs keep working with a banner. Restorable at any time. Archiving a stream hides its reports; archiving a project hides the whole project. `?archived=1` shows everything. Nothing is deleted from R2.

## 7. Report authoring contract

A report is a folder with `index.html` and optional `assets/`; the publisher writes `report.json`, so reports stay plain HTML. Reports are lightweight by design.

```
my-report/
  index.html      required entry point
  assets/         optional: images, data, scripts, fonts
```

**Shape** — follow the ReportExample card: `<html>` > `body.lr-report` > `.lr-shell` > `aside.lr-nav` (ReportToc) + `main.lr-main`. The first section opens with the ReportHeader (KindBadge, title, the answer in the lead), then 2–4 Stats and the main Findings; later sections start with `.lr-section-head`; the last is the SourceList and `footer.lr-footer`. Use `.lr-shell-single` and no ToC for fewer than three sections. Load `/_ds/lynx-reports/v1/tokens.css` then `/_ds/lynx-reports/v1/reports.css`, and `reports.js` at the end of the body when the report has a ToC, a theme switch, chart tooltips or code to copy.

**Rules**

- **Links:** assets relative (`assets/chart.png`). Other reports via `/p/<project>/r/<id>/` (latest) or `/v<N>/`. Code is linked by commit on GitHub. The only other permitted absolute paths are `/_ds/lynx-reports/v1/…`.
- **Forbidden references:** `file://`, `localhost`, `127.0.0.1`, local absolute paths (`/Users/…`, `/home/…`, `C:\…`), links into the working tree.
- **Snapshot:** no API calls at view time; all data is baked into the folder.
- **External resources:** CDN scripts and fonts allowed but discouraged; vendor into `assets/` where possible.
- **Size:** ≤ 25 MB per folder, ≤ 10 MB per file.
- **Mobile:** viewport meta tag; works at 380px; wide tables and code scroll in their own container; no hover-only interactions. Type follows the Report group: body 14/24, lead 15/26, title 30/36 (24/30 on phones).
- **Charts:** follow the Chart contract (BarList, line, ShareBar, Sparkline; titles state the finding; series only via `data-series` 1–6 or `muted`; never a raw colour; a "Show data" table for every chart).
- **Scripts:** allowed; no reliance on `localStorage` (one origin for all reports).
- **Reserved:** ids and classes prefixed `rh-`; keep the bottom-right corner free of fixed-position elements.
- **Title:** `<title>` matches the classified title.

**Publisher lint**

| Blocks the publish | Warns only |
| --- | --- |
| Missing `index.html` | `<title>` differs from the classified title |
| Kind not in the vocabulary, unknown stream | External CDN or font fetches |
| Local paths, `file://`, localhost links | Missing viewport meta tag |
| Over the size limits | Any single file over 2 MB |
| Uses the reserved `rh-` namespace | Possible secrets (quarantined when unattended) |
| | Missing summary |
| | Raw hex, rgb or named colours inside inline SVG (break dark mode and palettes) |

## 8. Design system: lynx-reports

lynx-reports is a Claude Design System artifact (https://claude.ai/artifact/GzzTcW7XCN5brcHAdZA3dt), forked from Lynx. A snapshot of its built files is in `docs/design-system/`; the Worker serves them from R2 at `/_ds/lynx-reports/v1/`.

| File | What | Used by |
| --- | --- | --- |
| `tokens.css` | Catppuccin tokens (Latte light, Mocha dark) as CSS variables, plus type classes | Everything |
| `components/palettes.css` | 13 more palettes via `data-palette` on `<html>` | Hub pages and reports |
| `components/reports.css` | Report layer, `lr-` classes, CSS only (~38 KB, ~8.5 KB gzipped); includes LiveAvatar, halo and bloom | Reports, hub pages |
| `components/reports.js` | Optional: theme (defers to `data-hub-theme`), ToC highlight, chart tooltips, copy buttons (~5 KB) | Reports |
| `components/hub.css` | Roost's page and chrome layer: `hub-` (pages) and `rh-` (pill, banners) | Hub pages, injected chrome |
| `components/bundle.css` / `bundle.js` / `lib/` | 54 Lynx React components (React 18.3.1 UMD in `lib/`) and their compiled Tailwind classes | Hub pages (classes always; JS only for Radix controls) |
| `components/index.d.ts` | Component props, as documentation | Developers |
| `components/<Card>/README.md` + `preview.html` | Guidelines and live previews for every component | Developers, Claude Code |
| `README.md` | The brand book: usage rules for reports, charts and hub pages | Everyone |

**Report layer cards:** ReportExample, ReportHeader, ReportToc, KindBadge, ReportBadge, Stat, Finding, SubjectCard, ReportTable, ExpandableList, BudgetStack, Steps, Timeline, Callout, Verdict, CodeBlock, Figure, SourceList.

**Chart cards:** Chart (the contract: form by question, mark specs, frame with title-as-finding, legend, data table, tooltips), BarList, ShareBar, Sparkline. Series colours `--lr-series-1…6` (blue, peach, teal, mauve, yellow, pink) are the palette's hues at a fixed lightness per theme (0.60 light, 0.62 dark, chroma ≥ 0.12), validated colour-blind safe for Catppuccin, and follow every palette.

**Roost cards (Report Hub · Pages and · Chrome):** HubHeader, ReportRow, TriageStrip, PinnedReports, StreamCard, IndexLists, FilterControls, TriageReview, ReportPill, ReportBanner. The full screens are in `docs/screens/` (the Claude Design canvas's artboards) for reference.

**Kind hues:** investigation sapphire, incident red, review mauve, audit peach, architecture blue, plan teal, analysis sky, benchmark yellow, experiment pink, research lavender, explainer green, runbook maroon, summary flamingo. Badges always show the kind's word, never colour alone.

## 9. Operations and build phases

Everything runs on Cloudflare's free tier for a single user; the only secrets are the Access service token and the ntfy topic.

**Operations**

- Deploy with `wrangler deploy` from the `roost` repo; bindings: R2 `REPORTS` (bucket `roost`), KV `STATE` (`ROOST_STATE`), vars `POLICY_AUD`, `TEAM_DOMAIN`, `SERVICE_TOKEN_ID`. The Worker holds no secrets. Preview URLs are off, so only the Access-protected workers.dev route exists.
- Design-system files are uploaded to `ds/lynx-reports/v1/` by a deploy script from `docs/design-system/` (or a vendored copy in the repo).
- Backup: `roost export <project> <dir>` pulls every version and the manifest; R2 itself is the system of record.
- Custom domain later: add it to the Worker; Access covers every hostname on it; redirect the workers.dev URL.

**Build phases**

1. **Serve** — Worker, R2, Access with JWT validation; serve a hand-uploaded report and the `/_ds/` files, with versions.
2. **Publish** — publish API, manifest and index writes with ETag retries, CLI with lint and secret scan, project registry and stream commands, `roost doctor`.
3. **Browse** — home and project pages, filters, kind and stream views, archive.
4. **Attention** — triage inbox and review, quarantine, pins, "new" markers, ntfy, theme and palette preferences.
5. **Report chrome** — pill and banners injected with HTMLRewriter, scroll behaviour, seen tracking.
6. **Claude Code integration** — a skill that writes reports to the authoring contract (using the ReportExample template and the Chart contract), classifies them, and runs the publisher. The skill lives in `skill/roost-report/` (SKILL.md, the ReportExample template, the report-layer and chart cards copied by `scripts/build-skill.mjs`, and a copy of the CLI); `scripts/install.sh` installs it to `~/.claude/skills/roost-report` and links `roost` into `~/.local/bin`. Drafts are written to `~/.roost/drafts/<slug>/`, outside any repository.

**Decided**

- One hub-wide palette and theme setting, in KV, applied on hub pages and inside reports before first paint.
- lynx-reports drops 13 chat-only components (AgentChatbox, MessageThread, MessageActionBar, ThinkingPanel, AgentThinking, ThinkingIndicator, ThinkingCycle, AgentOrb, AgentStack, InputOTP, Slider, Textarea, Carousel); desktop nav, desktop power tools, Avatar and LiveAvatar are kept.
- Hub pages are server-rendered HTML; React only for interactive Radix controls.
