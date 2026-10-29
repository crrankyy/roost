# Roost: build and deployment plan

> Once approved, this file is copied verbatim to `docs/PLAN.md` as the first commit. Building then goes one phase at a time, each phase as a commit series on its own branch. Target: **https://roost.crrankyy.workers.dev**.

## 0. Context and blockers (read first)

Roost hosts the HTML reports Claude Code writes, so you can read them from your phone. It is one Worker behind Cloudflare Access, with R2 for files and manifests, KV for viewer state, and ntfy for pushes. `docs/SPEC.md` is the source of truth. Where this plan departs from the spec it says so (§10), and the spec gets updated in the same change.

**Blockers. Each one needs you before the phase it gates:**

| # | Blocker | Needed by | What you do |
|---|---|---|---|
| B1 | ~~wrangler login~~ **Done.** Logged in to account `22a51a88…b870`. I still need to confirm that its workers.dev subdomain is `crrankyy` (checked at first deploy) | Phase 1 | Nothing, unless the subdomain differs |
| B2 | Enabling Access on the workers.dev route, attaching your **lynx** policy, reading off the AUD tag and team domain | Phase 1 deploy | Dashboard clicks, listed in §7 |
| B3 | Creating the Access service token and a Service Auth policy for it | Phase 2 | Dashboard clicks; the secret is shown once (§7) |
| B4 | Subscribing your phone to the ntfy topic | Phase 4 | I print the topic; you add it in the ntfy app |
| B5 | Decisions in §10 marked **ASK** | Before the phase named | Reply in review |

Decided with you already: local git with one commit series per phase (no remote); begin / PUT-per-file / commit uploads (changes SPEC 5.1–5.2); React islands on every hub page; Access reuses your existing **lynx** policy.

---

## 1. Repo layout

```
roost/
  wrangler.jsonc         Worker config: bindings REPORTS, STATE; vars; preview_urls off
  package.json           devDependencies only (justified below); scripts: gen, test, deploy
  tsconfig.json
  src/                   the Worker (TypeScript, no framework)
    index.ts             fetch(): auth → route table → handler; one try/catch → error page / JSON
    auth.ts              Access JWT verification (WebCrypto RS256, JWKS cache), identity
    routes.ts            the routing table (§2.1) as a plain array of [method, pattern, handler]
    store.ts             R2 JSON get/put, casUpdate() with onlyIf + retries, KV helpers
    model.ts             TypeScript types (§3.2) + pure manifest/index transforms (unit-tested)
    kinds.ts             the 13 kinds, labels, typed-field names (CLI keeps a copy; a test asserts equality)
    publish.ts           begin / put / commit / ds-put handlers
    viewer.ts            pin, prefs, archive, triage actions
    pages/
      html.ts            `html` tagged template: auto-escapes interpolations; raw() for trusted partials
      layout.ts          <html> shell: theme attrs, DS links, HubHeader, island loader
      parts.ts           ReportRow, TriagePrompt items, PinnedReports, IndexLists rows, StreamCard, FilterControls, KindBadge, Breadcrumb
      home.ts  project.ts  kind.ts  triage.ts  notfound.ts
    chrome.ts            HTMLRewriter injection into served reports (§2.3)
    generated/lynx.ts    BUILD OUTPUT, committed: Lynx class recipes + closed-state markup snapshots
  public/_roost/         served by the Worker (imported as text modules, so everything passes auth)
    islands.js           mounts Lynx Select / DropdownMenu / Drawer / Calendar / Switch / RadioGroup / Sonner over SSR placeholders
    chrome.js            pill toggle, scroll hide/show, version switch, pin/archive, theme-toggle → KV
    chrome.css           layout-only fix for the pill in a real (body-scrolling) page, see §10 Q6
  cli/roost.mjs          the CLI: one file, Node 20+, built-ins + fetch only
  skill/roost-report/    the Claude Code skill (§6); install copies cli/roost.mjs into it
  scripts/
    gen-lynx.mjs         runs bundle.js in node:vm → writes src/generated/lynx.ts
    upload-ds.mjs        uploads docs/design-system/ to ds/lynx-reports/v1/ via the service API (create-if-absent)
    seed.mjs             seeds registry/projects.json and config/settings.json (create-if-absent)
    install.sh           installs the skill + `roost` on a machine
  test/
    unit/*.test.mjs      node:test, for the CLI (lint, secrets, resolve, flags)
    worker/*.test.ts     vitest + @cloudflare/vitest-pool-workers (Miniflare R2/KV)
    visual/hub.spec.ts   Playwright screenshots → test/visual/out/ + contact sheet
    fixtures/            sample reports (incl. one with a fake AWS key), sample manifests
  docs/                  existing inputs, untouched; + PLAN.md
```

There is no vendored design-system copy. `upload-ds.mjs` reads `docs/design-system/` directly, and the Worker reads it from R2.

**devDependencies** (the Worker ships zero runtime dependencies):
- `wrangler`, `typescript` and `@cloudflare/workers-types` for build and deploy.
- `vitest` and `@cloudflare/vitest-pool-workers` for Worker tests against local R2/KV.
- `react@18.3.1` and `react-dom@18.3.1`, used only by `gen-lynx.mjs`: `react-dom/server` renders the closed-state markup of Lynx controls, using the same versions as `lib/`.
- `@playwright/test` for the visual checks.

No router: about 30 routes fit a small pattern-matching table, so Hono isn't worth adding.

## 2. Worker design

### 2.1 Routing table (SPEC 4, plus the API)

| Method | Path | Identity | Handler |
|---|---|---|---|
| GET | `/` | browser | home page; advances `seen.last_visit` after render |
| GET | `/triage` (`?i=<n>` on phones) | browser | triage inbox and review |
| GET | `/p/<project>/` (`?group=kind`) | browser | project page |
| GET | `/p/<project>/kind/<kind>/` | browser | project filtered by kind |
| GET | `/p/<project>/stream/<stream>/` | browser | filtered by stream; an alias gets a 301 to the canonical id |
| GET | `/kind/<kind>/` | browser | all projects filtered by kind |
| GET | `/p/<project>/r/<id>` | browser | 301 → trailing slash (relative assets need it) |
| GET | `/p/<project>/r/<id>/` and `…/<asset path>` | browser | latest **live** version + chrome; marks seen |
| GET | `/p/<project>/r/<id>/v<N>/` and `…/<asset path>` | browser | that version + chrome; pending, quarantined or rejected → "Not available" page (404) |
| GET | `/_ds/lynx-reports/v1/<path>` | any valid | R2 `ds/lynx-reports/v1/<path>` |
| GET | `/_roost/<file>?v=<hash>` | any valid | embedded scripts and CSS |
| POST | `/api/publish` | service | begin: validate, claim version N |
| PUT | `/api/publish/<upload>/<path>` | service | stream one file into R2 |
| POST | `/api/publish/<upload>/commit` | service | finalise (idempotent) |
| GET / PUT | `/api/registry` | service | read / CAS-write `registry/projects.json` (`If-Match` etag) |
| GET | `/api/manifest/<project>` | service | the manifest (CLI stream checks, export) |
| POST | `/api/stream/<project>/<stream>` | service | rename / merge / done / archive |
| GET | `/api/raw/<project>/<id>/v<N>/<path>` | service | raw bytes, any state, no chrome (export) |
| PUT | `/api/ds/lynx-reports/v1/<path>` | service | create-if-absent; 200 if identical, 409 if different |
| POST | `/api/reindex` | service | rebuild `index/recent.json` from all manifests |
| GET | `/api/whoami` | any valid | `{identity, email?, common_name?}` for `roost doctor` |
| POST | `/api/pin` | browser | `{ref, pinned}` |
| POST | `/api/prefs` | browser | `{theme?, palette?}` |
| POST | `/api/archive` | browser | `{ref, archived}` (report; streams and projects are archived via the CLI) |
| POST | `/api/triage/<project>/<id>` | browser | `{action: confirm \| undo \| reclassify \| publish \| reject, …}` |

There is no `DELETE` route and no `R2Bucket.delete()` anywhere. A test greps `src/` for `.delete(` and fails if it finds one.

### 2.2 Hub page rendering

- **Templates:** `html\`…\`` tagged template literals. Every `${}` is HTML-escaped unless it is wrapped in `raw()`. Only the partials and `generated/lynx.ts` use `raw()`. Attribute values are escaped the same way, and URLs are built only from validated ids (`[a-z0-9-]`).
- **Lynx classes:** `scripts/gen-lynx.mjs` loads `lib/react*.js` and `bundle.js` into `node:vm` with a small DOM stub. I tested this: `Lynx.buttonVariants({variant:'outline',size:'sm'})` returns the real class string. The script writes:
  - the class recipes for each variant we use (button outline / ghost / default × sm / icon, toggle outline, badge);
  - closed-state markup for each island control, made with `react-dom/server.renderToStaticMarkup(Lynx.X)`. Each has a placeholder for its variable text, such as a SelectTrigger showing "All projects".

  The generated file is committed, and `npm run gen` regenerates it when the design system changes.
- **Islands:** a control the server renders gets `data-island="select"` and a JSON props attribute. `islands.js` loads after React and `bundle.js` and runs `createRoot(el).render(<Lynx.Select …/>)`. The closed-state markup is identical, so nothing visibly changes. Without JS the page is still readable, and every filter is also a plain link/query string, so the controls only change the URL.
- **Pages that load React + bundle.js:** home, project (including its kind and stream views), `/kind/<kind>/` and `/triage`. The header palette Select is on all of them. **Reports never load React.** The pill uses the button and toggle class recipes plus about 120 lines of vanilla `chrome.js`. ToggleGroup, Toggle, Breadcrumb, Avatar, Alert, LiveAvatar and Collapsible are static markup (Collapsible is `<details>` with `hub-chev`), because they need no Radix behaviour.
- **Shared partials:** `layout()` holds `<html data-theme data-palette data-hub-theme>`, the stylesheets in the order hub.css states (tokens, palettes, bundle, reports, hub), `HubHeader` (LiveAvatar 28px mauve, "Roost", palette control, ThemeToggle) and `.hub > .hub-page`. The other partials are ReportRow, the triage item, the pin card, the IndexLists row (`hub-row-h`), StreamCard, FilterControls (desktop row + Drawer trigger) and KindBadge (`lr-badge[data-kind]`).
- **Theme "system":** the server can't resolve it, so `layout()` writes `data-hub-theme="system"` plus a 3-line inline `<head>` script that sets `data-theme` from `matchMedia` before first paint.
- **Viewer POSTs** check that `Origin` equals the request host (CSRF), on top of the JWT.

### 2.3 Report chrome (HTMLRewriter)

A report version is served from R2 as a stream through `HTMLRewriter`. It is never buffered.
- `html`: set `data-theme`, `data-palette` and `data-hub-theme` from KV `prefs` (system → same inline script).
- `head` (prepend): `palettes.css` and `bundle.css`. (append): `hub.css`, `/_roost/chrome.css`, and the system-theme script. The order matches the Report artboard, which loads bundle.css inside the report.
- `body`: add the classes `rh-report` and `lr-report`. Prepend the banner (`.rh-banner` > Alert markup) when the version is old **or** the report is archived. The archived banner takes precedence, and only one shows at a time. Append the `.rh-pill` markup (collapsed chip; expanded panel `hidden`), a `<script type="application/json" id="rh-data">` with the versions, pin state and refs, and `<script src="/_roost/chrome.js?v=…">`.
- Non-HTML assets stream straight from R2 with their stored content-type.
- `chrome.js`:
  - Toggles the panel, with Escape to collapse.
  - Hides the pill while scrolling down on phones and shows it again on scroll up or at the end (the artboard's logic on `window`).
  - Version rows link to `/v<N>/`.
  - Pin is `POST /api/pin`, and Archive / Unarchive are `POST /api/archive` followed by a reload.
  - It intercepts the report's own `[data-lr-theme-toggle]` and saves the choice to `/api/prefs`, so one setting rules everywhere.
- **Seen:** serving any HTML version to the browser identity adds `project/id` to `seen.opened` in KV (via `ctx.waitUntil`). The service identity never marks anything seen.

### 2.4 JWT validation

`auth.ts` takes `Cf-Access-Jwt-Assertion`, splits it, finds the `kid`, and verifies RS256 with `crypto.subtle` against `https://<TEAM_DOMAIN>/cdn-cgi/access/certs`. The certs are cached in module scope for 1 hour and refetched on an unknown `kid`. It then checks:
- `iss === "https://" + TEAM_DOMAIN`;
- `aud` includes `POLICY_AUD`;
- `exp`/`nbf` with 60 s leeway.

Identity is:
- **service** when the `common_name` claim equals the var `SERVICE_TOKEN_ID` (the token's Client ID, which is not a secret);
- **browser** when an `email` claim is present;
- **403** otherwise.

A missing or invalid token gets 403 with a plain body. Each route declares the identity it needs, and the wrong one gets 403 `{"error":{"code":"wrong_identity"}}`.

### 2.5 Caching headers

Everything sits behind Access, so nothing is `public`.

| What | Cache-Control |
|---|---|
| `/_ds/lynx-reports/v1/*` | `private, max-age=31536000, immutable` + ETag (v1 never changes; v2 is a new path) |
| `/_roost/*?v=<hash>` | `private, max-age=31536000, immutable` (hash of the file content, computed at build) |
| Report version assets (non-HTML) | `private, max-age=31536000, immutable` under `/v<N>/`; `private, no-cache` under the latest URL |
| Report HTML (any URL) | `private, no-store`, because the injected pill/banner/pin state is dynamic |
| Hub pages, `/api/*` | `private, no-store` |

## 3. Storage

### 3.1 R2 keys

Same as SPEC 4: `registry/projects.json`, `config/settings.json`, `index/recent.json`, `p/<project>/manifest.json`, `p/<project>/r/<id>/v<N>/{index.html,report.json,assets/…}`, and `ds/lynx-reports/v1/…`. No other prefixes.

### 3.2 Schemas

```ts
type Kind = 'investigation'|'incident'|'review'|'audit'|'architecture'|'plan'|'analysis'
          |'benchmark'|'experiment'|'research'|'explainer'|'runbook'|'summary';

interface Registry { projects: Project[] }
interface Project { id: string; title: string; description: string;
  match: { remotes: string[]; paths: string[]; keywords: string[] }; status: 'active'|'archived' }

interface Settings { ds_version: 'v1'; kinds: Kind[] }            // ntfy topic NOT here, see §10 Q1

interface Manifest { project: string; updated: string; streams: Stream[]; reports: ReportEntry[] }
interface Stream { id: string; title: string; description: string;
  status: 'active'|'done'|'archived'; aliases: string[]; started: string; last_report: string|null }

interface ReportEntry {            // report-level classification; overrides each version's report.json
  id: string; title: string; summary: string; kind: Kind; stream: string|null; tags: string[];
  status: 'draft'|'final'|'superseded'; typed: Record<string, string|number|boolean>;
  archived: string|null;           // ISO date archived, null = not
  supersedes: string|null; superseded_by: string|null;
  created: string; latest: number|null;            // latest LIVE version
  classification: { by: 'claude'|'user'; confirmed: boolean; triage: boolean; why: string;
                    proposed_stream?: { id: string; title: string } };
  versions: VersionEntry[] }
interface VersionEntry { n: number; state: 'pending'|'live'|'quarantined'|'rejected';
  upload: string; files: { path: string; size: number; sha256: string }[];
  published: string|null; change_note: string;
  findings: { file: string; line: number; kind: string; masked: string }[];
  allow_secrets: boolean; source: { branch?: string; commit?: string; session?: string; unattended: boolean } }

interface RecentIndex { updated: string;
  reports: RecentItem[];          // latest 100 live, non-archived, across projects
  triage: TriageItem[];           // all open triage + quarantine items
  projects: ProjectSummary[];     // counts, active-stream count, last activity
  streams: StreamSummary[] }      // streams with a report in the last 14 days, with 10-bucket spark counts
```

`report.json` holds exactly the SPEC 3.4 shape, written once at commit and never rewritten.

### 3.3 Read-modify-write

`casUpdate(key, mutate)` works like this:
- `get` the object (or treat it as missing), parse it, apply `mutate(doc)` (a pure function from `model.ts`), then `put(key, json, { onlyIf: { etagMatches: etag } })`.
- For a missing object it uses a create-if-absent condition. Exactly which condition R2 accepts is verified in phase 2 (§10 Q12).
- R2 returns `null` when the precondition fails. The function then waits a jittered backoff (25, 50, 100, 200, 400 ms ± 50%) and retries from the read, **at most 6 attempts**, then returns 409 `cas_exhausted`.
- `mutate` must be idempotent. Each operation carries its upload or action id, so replaying a half-applied retry is harmless.

### 3.4 Publish without halfway inconsistency

R2 has no multi-object transactions, so "atomically" (SPEC 5.2) becomes the following. The spec gets updated to say so.

1. **Begin** CAS-appends `VersionEntry{n: max(n)+1, state: 'pending'}` to the manifest. The version number is claimed *before* any file is written, so two concurrent publishes can never write the same `v<N>` keys.
2. **PUT** each file streams to `p/…/v<N>/<path>` with R2's `sha256` integrity check. A PUT is accepted only for a pending version, for a declared path, and when the object does not already exist. Nothing is ever overwritten.
3. **Commit** checks that every declared file exists, writes `report.json` (create-if-absent), then CASes the manifest: the version becomes `live` (or `quarantined`), and `latest`, the classification, the stream's `last_report`, `supersedes` and `triage` are set. This step is idempotent: running it again on a committed upload returns the same result.
4. **Index:** CAS `index/recent.json` by *recomputing this project's slice from its manifest* (not by applying a delta). Any later successful write therefore heals an index that missed an update. If the index CAS is exhausted, the publish still succeeds, the response carries `index_stale: true`, and the CLI calls `/api/reindex`.
5. **ntfy** runs in `ctx.waitUntil` after commit.

The manifest is the source of truth. A crash between steps leaves at most a `pending` version: never served, and never shown in lists. The CLI retries commit, and `roost doctor` lists pending versions older than an hour. An abandoned pending version keeps its number, so a gap can appear (§10 Q4).

### 3.5 KV (`STATE`), from SPEC 6.5

| Key | Value |
|---|---|
| `pins` | `string[]` of `project/id`, newest first |
| `seen` | `{ last_visit: string, opened: string[] }`; `opened` is trimmed to entries newer than `last_visit` |
| `prefs` | `{ theme: 'light'|'dark'|'system', palette: 'catppuccin'|… (14) }`; the default is `system` / `catppuccin` |

## 4. API

All requests and responses are JSON unless noted. Errors look like `{ "error": { "code", "message", "field"? } }`.

| Endpoint | Request | Response | Errors |
|---|---|---|---|
| `POST /api/publish` (service) | `{project, id?, slug?, title, summary, kind, stream?, tags, status, typed, change_note, supersedes?, classification:{why, triage, confirmed}, proposed_stream?, source, unattended, allow_secrets, findings[], files:[{path,size,sha256}]}` | `{upload, id, version, put_base}` | 400 bad body, 404 project, 409 cas, 413 size, 422 `unknown_kind` / `unknown_stream` / `project_archived` / `bad_path` |
| `PUT /api/publish/<upload>/<path>` (service) | raw bytes, `Content-Type` | `{ok:true}` | 404 upload, 409 not pending / exists, 413, 422 undeclared path / sha mismatch |
| `POST /api/publish/<upload>/commit` (service) | `{}` | `{url, project, id, version, state:'live'\|'quarantined', triage, index_stale}` | 404, 409, 422 `missing_files` |
| `GET/PUT /api/registry` (service) | PUT: `Registry` + `If-Match` | `Registry` + `ETag` | 409 etag, 422 invalid (id rules, immutability of ids that have reports) |
| `GET /api/manifest/<p>` (service) | — | `Manifest` | 404 |
| `POST /api/stream/<p>/<s>` (service) | `{op:'create'\|'rename'\|'merge'\|'done'\|'archive'\|'unarchive', to?, title?, description?}` | `Stream` | 404, 409, 422 |
| `GET /api/raw/<p>/<id>/v<N>/<path>` (service) | — | raw bytes | 404 |
| `PUT /api/ds/lynx-reports/v1/<path>` (service) | raw bytes | `{status:'created'\|'same'}` | 409 `ds_immutable` |
| `POST /api/reindex` (service) | — | `{reports, triage}` counts | — |
| `GET /api/whoami` (any) | — | `{identity, email?, common_name?}` | 403 |
| `POST /api/pin` (browser) | `{ref, pinned}` | `{pins}` | 404 ref |
| `POST /api/prefs` (browser) | `{theme?, palette?}` | `Prefs` | 422 unknown palette/theme |
| `POST /api/archive` (browser) | `{ref, archived}` | `ReportEntry` | 404 |
| `POST /api/triage/<p>/<id>` (browser) | `{action:'confirm'}` / `{action:'undo', token}` / `{action:'reclassify', project?, kind?, stream?\|null, new_stream?:{id,title}}` / `{action:'publish'}` / `{action:'reject'}` | `{entry, undo_token?}` | 404, 409, 422 (confirm on a quarantined item → 422 `review_required`) |

- **Reclassifying to another project** moves the *classification*: an entry is added to the target manifest and the old entry becomes `moved_to`. Files stay at their original keys; nothing moves or is deleted. The URL redirects. See §10 Q9.
- **Reject** sets the version to `rejected` and the report to archived. Its bytes stay in R2.

## 5. CLI (`cli/roost.mjs`)

### 5.1 Commands and flags (SPEC 5.1)

```
roost publish <dir> [--project P] [--kind K] [--stream S | --new-stream S] [--slug X] [--title T]
      [--summary S] [--tags a,b] [--status draft|final] [--typed '{json}'] [--change-note "…"]
      [--supersedes ID] [--why "…"] [--confirmed] [--unattended] [--allow-secrets] [--dry-run] [--json]
roost project add|edit|archive|list [--json]      # add/edit take --id --title --description --remote --path --keyword
roost stream rename|merge|done|archive <project> <stream> [--to S]
roost export <project> <out-dir>
roost doctor [--json]
```

Two flags are added beyond the spec. Both go into the spec update.
- `--confirmed`: the user answered the combined question. It sets `classification.confirmed = true`.
- `--why`: Claude's reason for the classification, stored in `classification.why`.

Config comes from the env vars `ROOST_URL`, `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`. If they are unset, the CLI falls back to `~/.config/roost/env` (mode 600; see §10 Q15).

**Publish order:**
1. Resolve the project:
   - normalised `git remote get-url origin` (no protocol, user, `.git` or case) against `match.remotes`;
   - then cwd against `match.paths` globs;
   - otherwise semantic-only.
2. Fetch the manifest, check the kind and stream, and slugify.
3. Lint.
4. Scan for secrets.
5. Decide whether confirmation is needed.
6. Run `--dry-run`, or begin → PUT files (4 in parallel) → commit.
7. Print the URL.

ntfy is sent by the Worker, not the CLI (§10 Q1).

### 5.2 Exit codes and `--json`

| Code | Meaning | `--json` adds |
|---|---|---|
| 0 | published (or dry run passed) | `url, project, id, version, state, triage, warnings[]` |
| 1 | network / server / auth failure | `error{code,message,status}` |
| 2 | usage or lint **errors** | `errors[{rule, file, line, message}]`, `warnings[]` |
| 3 | needs confirmation (attended, a confidence rule says ask) | `needs:['project'\|'kind'\|'stream'], proposal{…}, candidates[]` |
| 4 | secret findings, attended, no `--allow-secrets` | `findings[{file,line,kind,masked}]` |

With `--json`, one JSON object goes to stdout and human text goes to stderr. With `--unattended`, codes 3 and 4 never occur:
- an ask becomes `triage: true`;
- secret findings become `quarantined`;
- `--new-stream` becomes `proposed_stream` with the report unstreamed.

### 5.3 Lint rules (SPEC 7)

| Rule id | Level | Check |
|---|---|---|
| `missing-index` | error | no `index.html` |
| `unknown-kind` / `unknown-stream` | error | not in the vocabulary / manifest (aliases resolve) |
| `local-path` | error | `file://`, `localhost`, `127.0.0.1`, `/Users/…`, `/home/…`, `C:\…` in `href` / `src` / `url()` / `srcset`, or absolute paths other than `/_ds/lynx-reports/v1/` and `/p/<project>/r/…` |
| `size` | error | folder > 25 MB or any file > 10 MB |
| `reserved-rh` | error | `id` or `class` token starting with `rh-` |
| `title-mismatch` | warn | `<title>` ≠ classified title |
| `external-fetch` | warn | `http(s)://` script, link or font `src` |
| `no-viewport` | warn | missing `<meta name="viewport">` |
| `big-file` | warn | single file > 2 MB |
| `secrets` | warn | any finding from §5.4 (quarantine when unattended) |
| `no-summary` | warn | empty summary |
| `raw-colour-svg` | warn | `#hex`, `rgb()/hsl()` or a CSS named colour in `fill` / `stroke` / `style` inside inline `<svg>` |

Parsing uses regexes over the HTML text with line numbers. This is a deliberate shortcut (marked `ponytail:` in the code). It can miss exotic markup, which is acceptable for a lint of our own authored reports.

### 5.4 Secret patterns (SPEC 5.5)

These run over text files (html, css, js, json, md, txt, csv, svg). Findings are masked to `••••` plus the last 4 characters.

| Kind | Pattern (sketch) |
|---|---|
| aws-access-key | `\b(AKIA\|ASIA)[0-9A-Z]{16}\b` |
| aws-secret | 40-char base64 within 40 chars of `aws` / `secret` |
| github | `\bgh[pousr]_[A-Za-z0-9]{36,}\b`, `github_pat_[A-Za-z0-9_]{60,}` |
| slack | `\bxox[abposr]-[A-Za-z0-9-]{10,}` |
| stripe | `\b[sr]k_(live\|test)_[A-Za-z0-9]{16,}` |
| anthropic / openai | `\bsk-ant-[A-Za-z0-9_-]{20,}`, `\bsk-(proj-)?[A-Za-z0-9_-]{20,}` |
| cloudflare | `CF_[A-Z_]*(TOKEN\|KEY\|SECRET)\s*[=:]\s*\S{20,}`, 40-char tokens next to `cloudflare` |
| private-key | `-----BEGIN [A-Z ]*PRIVATE KEY-----` |
| dotenv | `^\s*[A-Z][A-Z0-9_]*(KEY\|SECRET\|TOKEN\|PASSWORD\|PASS)[A-Z0-9_]*\s*=\s*\S{6,}` |
| high-entropy | `[A-Za-z0-9+/=_-]{32,}` with Shannon entropy ≥ 4.5 bits/char, excluding hex digests next to `sha`/`commit` and data: URIs |
| email | RFC-ish email, except `noreply@`/`example.com` (see §10 Q14) |
| home-path | `/Users/<name>/`, `/home/<name>/`, `C:\Users\<name>\` in text |

### 5.5 Other commands

- `project add/edit/archive` does a GET of the registry, edits it, then PUTs with `If-Match`. There is no delete.
- `stream` commands go through `POST /api/stream`.
- `export` fetches the manifest and `GET /api/raw/…` for every version and every file. It writes `<out>/manifest.json` and `<out>/r/<id>/v<N>/…`, with the same layout as R2, and is resumable (it skips files whose size and sha256 match).
- `doctor` checks:
  - Node ≥ 20;
  - the env vars are set;
  - `/api/whoami` returns `identity: service`;
  - `/_ds/lynx-reports/v1/tokens.css` responds 200;
  - the registry is readable;
  - which project the current folder resolves to;
  - pending versions older than an hour.

## 6. Skill (`skill/roost-report/`)

```
skill/roost-report/
  SKILL.md                when to use; steps; confidence rules; the one combined question; unattended mode
  template/index.html     starting report = the ReportExample card's markup with /_ds/lynx-reports/v1/ links, placeholders
  reference/kinds.md      13 kinds, boundary rules, tie-breaks, typed fields (from SPEC 3.2)
  reference/authoring.md  SPEC 7 rules + lint table, condensed; pointers to the Chart, BarList, ShareBar, Sparkline cards
  reference/charts.md     the Chart contract: form by question, title-as-finding, data-series 1–6 / muted, Show data table
  bin/roost.mjs           copy of cli/roost.mjs (install.sh copies it; `roost` on PATH points here)
```

**SKILL.md outline:**
1. **When:** the user asks for a report, or a session produced a findings write-up worth keeping.
2. **Write** to `./.roost/<slug>/` (git-ignored by the install), starting from `template/index.html`. Follow the ReportExample shape (header with lead = answer, 2–4 Stats, Findings, `lr-section-head` sections, SourceList, footer; `.lr-shell-single` under three sections). Charts follow `reference/charts.md`.
3. **Classify:** pick the kind using the boundary rules and tie-breaks, then the stream (run `roost project list --json` and read the manifest via `roost publish --dry-run --json`), then title, summary, tags and typed fields.
4. **Dry run:** `roost publish <dir> … --dry-run --json`. Fix every lint error and iterate until exit code ≠ 2.
5. **Confidence (SPEC 5.3):**
   - Project: the CLI reports `match: remote|path|semantic|none`.
   - Kind: Claude asks if two kinds pass the boundary rules.
   - Stream: Claude asks when the choice is ambiguous or a new stream is proposed.

   If anything says ask, Claude sends **one** AskUserQuestion holding the whole proposal ("Publishing to *Payments API › auth-migration* as an **investigation**. OK?"), with the alternatives as options. On yes, publish with `--confirmed`. An unmatched project → ask which project. `roost project add` is offered only after the user confirms.
6. **Secrets:** on exit 4, show the masked findings and ask "publish anyway?". Yes → `--allow-secrets`; no → fix the report.
7. **Publish** and print the URL.
8. **Unattended:** when the session can't ask (headless `claude -p`, a scheduled run, or a question left unanswered), always pass `--unattended`. Never create a stream or a project.

## 7. Infrastructure and deployment

**[me]** = I run it with wrangler or a script. **[you]** = it needs you, with the reason.

**Phase 1:**
1. **[you]** `! npx wrangler login` (B1). The OAuth login opens your browser.
2. **[me]** `npx wrangler r2 bucket create roost` and `npx wrangler kv namespace create ROOST_STATE`. I paste the namespace id into `wrangler.jsonc`.
3. **[me]** Write `wrangler.jsonc`:
   ```jsonc
   {
     "name": "roost", "main": "src/index.ts", "compatibility_date": "2026-10-01",
     "workers_dev": true, "preview_urls": false,            // preview URLs would sit outside the Access app
     "r2_buckets": [{ "binding": "REPORTS", "bucket_name": "roost" }],
     "kv_namespaces": [{ "binding": "STATE", "id": "<from step 2>" }],
     "vars": { "POLICY_AUD": "<step 6>", "TEAM_DOMAIN": "<team>.cloudflareaccess.com", "SERVICE_TOKEN_ID": "<phase 2>" },
     "rules": [{ "type": "Text", "globs": ["public/_roost/*"] }]
   }
   ```
4. **[me]** First deploy with `npx wrangler deploy`. With empty vars the Worker fails closed (403 on everything). I confirm that the URL is `roost.crrankyy.workers.dev`.
5. **[you]** In the dashboard (B2), go to Workers & Pages → roost → Settings → Domains & Routes → workers.dev → **Enable Cloudflare Access**. In the Access application it creates, replace the default policy with your existing **lynx** policy (Access → Applications → roost → Policies → add existing policy). The dashboard is required because the one-click Access toggle has no wrangler command.
6. **[you]** Copy the **Application Audience (AUD) tag** (Access → Applications → roost → Overview) and your **team domain** (Zero Trust → Settings → Custom pages / team name). Paste both to me. **[me]** Put them in `vars` and redeploy.
7. **[me]** Hand-upload one report for the phase 1 check: `wrangler r2 object put roost/p/demo/r/2026-10-29-memory-research/v1/index.html --file docs/reference/memory-research.html --remote`, plus a hand-written manifest, and the design-system files via a phase 1 wrangler loop. (`upload-ds.mjs` takes over in phase 2 and is a no-op on identical files.)

**Phase 2:**

8. **[you]** Zero Trust → Access → Service credentials → **Create service token** "roost-publisher", duration non-expiring (or 1 year). Copy the Client ID and Secret (the secret is shown once). Then Access → Applications → roost → Policies → **add a policy, action Service Auth, include: Service Token = roost-publisher**. This is a separate policy, so the lynx policy stays untouched. Service tokens and the policy action can't be created with wrangler.
9. **[you]** On each machine: `mkdir -p ~/.config/roost && chmod 700 ~/.config/roost`, then create `~/.config/roost/env` (mode 600) containing `ROOST_URL=https://roost.crrankyy.workers.dev`, `CF_ACCESS_CLIENT_ID=…` and `CF_ACCESS_CLIENT_SECRET=…`. I never see or store the secret. Give me only the **Client ID**, which goes in `SERVICE_TOKEN_ID`.
10. **[me]** `node scripts/upload-ds.mjs`. It PUTs every file under `docs/design-system/` (except `.DS_Store`) to `/api/ds/lynx-reports/v1/…`. It is create-if-absent, re-runnable, and never deletes.
11. **[me + you]** `node scripts/seed.mjs` writes `config/settings.json` and an empty registry if they are absent. Then `roost project add` for your real projects: you tell me the list, or I propose entries from `~/` git remotes for you to confirm.

**Phase 4:**

12. **[me]** `openssl rand -hex 24 | npx wrangler secret put NTFY_TOPIC`, and I print the topic once for you.
13. **[you]** In the ntfy app, subscribe to `ntfy.sh/<topic>` (B4). Optionally mute the `published` tag and keep `needs-you`.

**Phase 6:**

14. **[me]** `scripts/install.sh` on this Mac copies `skill/roost-report` to `~/.claude/skills/roost-report`, symlinks `~/.local/bin/roost`, then runs `roost doctor`. **[you]** Run the same `install.sh` on each other machine, after step 9.

No secret ever lands in the repo: `.gitignore` covers `.dev.vars`, `.roost/` and `test/visual/out/`, and a pre-commit check runs the CLI's own secret scan over staged files.

## 8. Testing

- **Unit (`node --test test/unit`):**
  - every lint rule (pass and fail fixtures);
  - every secret pattern, including masking, and no false positive on the DS files and `memory-research.html`;
  - remote/path normalisation and globbing;
  - flag parsing and exit codes;
  - `model.ts` transforms (begin, commit, quarantine, triage confirm/undo/reclassify, archive, supersede, stream rename/merge alias, index slice recompute), imported directly in vitest;
  - a test that the kinds list is equal in the CLI and the Worker.
- **Worker (`vitest` + `@cloudflare/vitest-pool-workers`, local R2/KV):** JWTs are minted with a test RSA key, and `fetchMock` serves the certs.
  - No header, a bad signature, the wrong aud or an expired token → **403** on `/`, `/_ds/…`, `/api/publish` and a report URL.
  - Browser identity on `/api/publish` → 403. Service identity on `/api/pin` → 403.
  - **Concurrent publishes:** `Promise.all` of 5 full begin → put → commit flows to one project, some to the same report id. Every one succeeds, versions are `1..N` with no duplicates, the manifest lists every one, and `recent.json` agrees.
  - Republish → v2. v1 still serves, with the "older version" banner.
  - Archive → the report is gone from home, the project page and kind views; its URL serves with the archived banner; unarchive restores it.
  - Unattended publish with a fake AWS key → `quarantined`, not served (404 page), shown in `/triage` masked `••••MPLE`.
  - Reject → the bytes are still in R2.
  - Theme and palette attributes appear on `<html>` of a served report.
  - `src/` contains no `.delete(`.
- **Visual (Playwright, against `wrangler dev` with fixture data seeded from the artboards' sample data):**
  - Home, project (by stream and by kind), kind view, filter sheet open, triage (item, reclassify, quarantine), and a report (pill collapsed and expanded, old banner, archived banner).
  - Each at 380 × 844 and 1240 × 900, in light and dark. Home and report also get a sweep of all 14 palettes × 2 themes.
  - Output: `test/visual/out/` plus `contact-sheet.html`.
  - The `.dc.html` artboards need the Claude Design runtime, so there's no automatic pixel diff. I compare the screenshots against the artboard markup and structure. You compare the contact sheet with the canvas (§10 Q16).
  - The suite also asserts there is no horizontal scroll at 380px and no console errors.

## 9. Phases

Each phase is a branch `phase-N-<name>`, as a commit series, and ends with a "how to verify" note.

| # | Work items | Done when | You check on your phone |
|---|---|---|---|
| 1 Serve | git init; scaffold; `auth.ts`; R2 serving of versions + `/_ds/`; a minimal manifest read for "latest"; Not-available page; deploy + Access (steps 1–7); Worker tests for 403 and serving | all tests green; unauthenticated `curl` of `/`, `/_ds/…/tokens.css` and `/api/whoami` → 403 | log in through Access, open `/p/demo/r/2026-10-29-memory-research/` and `/v1/`; the report renders with DS styles |
| 2 Publish | `store.ts` CAS; `model.ts`; begin/put/commit; registry, stream, raw, ds, reindex, whoami; `upload-ds.mjs`, `seed.mjs`; CLI publish/project/stream/export/doctor with lint + secrets; quarantine state; unit + concurrency tests; SPEC 5.1/5.2 update | `roost doctor` all green from this Mac; a concurrent-publish test passes locally **and** against remote (a 3-way publish to a `test` project); export round-trips | open the URL `roost publish` printed; republish → `/v2/`, and `/v1/` still opens |
| 3 Browse | `html.ts`, `layout.ts`, partials, `gen-lynx.mjs`, `islands.js`; home, project (stream/kind toggle), stream/kind views, `/kind/`; filters (row + sheet, query strings); archive endpoint + `?archived=1`; visual suite | contact sheet matches the artboards at both widths and both themes | home and project pages at phone width, the filter sheet, include-archived |
| 4 Attention | `/triage` (inbox column ≥1000px, one-at-a-time with previous/next on phones), confirm + Undo toast, reclassify, quarantine review, publish anyway, reject; pins; "new" dots + `last_visit`; prefs endpoint + palette/theme controls; ntfy (steps 12–13) | quarantine acceptance test passes; palette persists across pages | an unattended test publish → ntfy `needs-you` push → confirm in triage; change the palette and see it on the next page |
| 5 Report chrome | `chrome.ts` HTMLRewriter, pill and banners, `chrome.js` scroll/escape/versions/pin/archive, theme before paint, seen marking, theme-toggle interception | report visual states match `Report.dc.html`; seen clears the dot | open a fresh report → pill → switch to v1 → banner → pin → back home → dot gone, pinned row present |
| 6 Claude Code | skill folder, template from ReportExample, references, `install.sh`, doctor on this Mac; an end-to-end run: a new session writes and publishes a report | the produced report lints with 0 errors, follows ReportExample + Chart contract, publishes; registered-repo publish asks nothing; unregistered asks the project; `--unattended` + fake key quarantines | **the full acceptance list in PROMPT.md**, walked on your phone |

## 10. Open questions and risks

**Spec conflicts and changes I'd make (I'll update SPEC.md in the phase noted):**
1. **ASK. Who sends ntfy, and where the topic lives.** SPEC 5.2 step 7 has the CLI notify (with a `ROOST_NTFY_TOPIC` override), while SPEC 5.6 and 9 have the Worker secret `NTFY_TOPIC` *and* the topic in R2 `config/settings.json`. I recommend the Worker sends after commit, because that is one place and it covers browser-triggered events. The topic would live only in the secret: anything in settings.json is not a secret. I'd drop `ROOST_NTFY_TOPIC`. Phase 2.
2. **"Atomically"** (5.2 step 6) isn't possible across R2 objects. It becomes "manifest first, then a self-healing index" (§3.4). Phase 2.
3. **The upload format** becomes begin / PUT / commit (you've agreed). This changes 5.1 and 5.2 and adds `--confirmed` and `--why`. Phase 2.
4. **ASK. Version gaps.** An abandoned upload keeps its claimed number, so a report could show v1, v2, v4. The alternative, staging plus a copy at commit, doubles R2 writes and leaves staging objects forever, because nothing may be deleted. I'd accept gaps; they only happen if a publish dies and is never retried.
5. **New var `SERVICE_TOKEN_ID`** (the Client ID) tells service from browser identity. Phase 1/2, SPEC 9.

**Design system and screens (for you to fix upstream; I won't edit them):**

6. **ASK. `.rh-pill` is `position: absolute`.** It assumes the artboard's `.rh-viewport` / `.rh-scroll` container. In a real report the body scrolls, so the pill would scroll away. Upstream fix: `body > .rh-pill { position: fixed }`. Until then I'd ship that single layout rule in `/_roost/chrome.css` (no colours). The alternative, wrapping the report in an inner 100vh scroller, would break iOS toolbar collapse and the report's own sticky ToC offsets.
7. **`bundle.css` carries Tailwind preflight** (`h1–h6` font-size inherit, `a` colour inherit, `table` collapse) and an `@import` of Google Fonts. Injecting it into reports, as the Report artboard does, resets any report markup outside the `lr-` classes, and makes every report fetch Google Fonts. Lint *warns authors* about external fonts while the chrome adds one itself. I'll follow the artboard and verify `memory-research.html` still looks right. Upstream option: a `chrome.css` subset in the DS.
8. **Report ToC theme switch** (`reports.js`) saves to `localStorage`. Under Roost, `chrome.js` intercepts it and saves to KV, which keeps "one hub-wide setting". I'm flagging it because it's behaviour layered over the DS script.
9. **ASK. Reclassifying to another project:** URLs carry the project (`/p/<project>/r/<id>/`), so a cross-project move can't keep "URL never breaks" without a redirect, and files can't move (no delete). I'd keep the files in place, add `moved_to` on the old entry, and 301 from the old URL. Alternatively, triage reclassify could be limited to kind and stream, with project changes only via the CLI.
10. The screens README lists 20 artboards. `HomePhone` etc. are wrappers around `Main`/`Project`/`Report`/`Triage`, so there is no separate phone markup to match. The canvas `hub.css` is older than the DS copy (3 diffs: link halo rule, load-order comment, `.hub-secret code` width), and the DS copy wins, as its README says.
11. The artboards don't load `palettes.css`, but the DS `hub.css` load order includes it. I'll follow hub.css.

**Platform risks:**

12. **R2 create-if-absent.** I'm not certain which `onlyIf` form R2 accepts for "only if the object doesn't exist" (`etagDoesNotMatch: '*'` vs. an `uploadedBefore` trick). I'll run a small test in phase 2, locally and remotely. If neither works, version files are still safe, because begin claims N first; only the first manifest write needs it, and seeding creates manifests on `project add`.
13. **Free-plan CPU (10 ms):** JWT verification, HTMLRewriter on a 76 KB report and the home render should fit. I'll measure with `wrangler tail` in phases 1 and 3. KV free tier allows 1,000 writes a day: every report view writes `seen` and every home load writes `last_visit`, which is far below that for one person. KV is eventually consistent (about 60 s across locations), so a pin made on the laptop may take a minute to show on the phone.
14. **ASK. Email addresses** as a secret pattern will flag your own email in every report that mentions it, and quarantine unattended runs. I'd allowlist the owner email(s). Which ones?
15. **ASK. Credentials file:** SPEC says env vars. I'd add the `~/.config/roost/env` fallback so Claude Code sessions find the token without editing shell profiles. Is that OK?
16. **Visual check limits:** the `.dc.html` artboards can't be rendered outside Claude Design, so "matches closely" is a human check of my contact sheet against the canvas, plus my structural comparison.
17. **"New" semantics:** `last_visit` advances on *every* home load, so a report seen listed on home (but not opened) stops being new on the next home load, even seconds later. That is the spec, but you may want "advance only after 30 min idle". Your call; I default to the spec.
18. **Reusing the lynx policy:** anyone that policy allows can also read Roost. If it allows more than you, tell me and I'll add an `OWNER_EMAIL` check in the Worker.
19. The repo-root `projects/` folder is empty and unexplained. I'll leave it alone. Is it meant for something?

## Verification (whole build)

The PROMPT.md acceptance list is the final check, run in phase 6 on your phone. Each item maps to an automated test in §8 where one is possible:
- 403s;
- concurrent publishes;
- v2 + banner;
- archive / unarchive;
- quarantine + mask;
- export round-trip;
- lint-clean skill output.

The visual items go through the contact sheet.

---

## Status (30 Oct 2026)

All six phases are built, committed on `main` and deployed to https://roost.crrankyy.workers.dev, with Access in front (AUD `8b492c11…`, team `green-disk-aaef`, service token `56ce728e….access`).

Verified on the live Worker:
- Every unauthenticated path tried (`/`, `/_ds/…`, `/api/whoami`, `/api/publish`) redirects to Access login.
- `roost doctor`: all checks pass.
- `scripts/upload-ds.mjs`: 186 files, all unchanged (idempotent).
- Three concurrent publishes to one report land as v1, v2, v3, and the manifest agrees.
- A fake AWS key: attended exits 4 (masked `••••MPLE`); `--unattended` quarantines into triage.
- `roost export roost` recreates every version plus the manifest.
- A report written by a headless Claude Code session with the skill is published.

Verified locally (44 Worker tests, 13 CLI tests, Playwright contact sheet at 380/1240 px, light/dark, 14 palettes): chrome banners and pill, archive everywhere, triage flows, ntfy payload, pages against the artboards.

Owner walkthrough (30 Oct): pins, the new dot, versions, the older-version banner, archive/unarchive, palette and triage work on phone and laptop. ntfy is not subscribed yet (owner will do it later). The theme icon mismatch found then is fixed.

Decisions taken on the §10 open questions:
- Q1: ntfy is sent by the Worker only.
- Q4: version gaps are accepted.
- Q6: one layout rule in `chrome.css`.
- Q9: a cross-project move keeps the files in place and the old URL redirects.
- Q14: emails are allowlisted with `ROOST_ALLOW_EMAILS`.
- Q15: the CLI falls back to `~/.config/roost/env`.

Upstream DS issues:
- `.rh-pill` is absolute.
- `bundle.css` carries preflight and the Google Fonts import.
- `ThemeToggle` emits a `title` attribute.
- The theme icons disagree: `ThemeToggle` shows the current mode, `reports.js` shows the mode you'd switch to. You chose "current mode" everywhere; `chrome.css` flips the report icon until `reports.css` is fixed.
