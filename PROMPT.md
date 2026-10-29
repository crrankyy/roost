# Roost: plan the build and deployment

You are planning, and then building, **Roost**: a private, single-user Cloudflare Worker that hosts the static HTML reports Claude Code writes, so they can be read from any device. This repo (`~/roost`) is where it will live. It is empty apart from the docs listed below.

**Your first deliverable is a plan, not code.** Read the inputs, then write `docs/PLAN.md` and stop for my review. Build only after I approve it, one phase at a time.

## Inputs

Read these before planning. The spec is the source of truth; when this prompt and the spec disagree, the spec wins, and you flag the conflict.

| Path | What it is |
| --- | --- |
| `docs/SPEC.md` | The full spec: architecture, data model, URLs, publishing, viewing, authoring contract, design system, build phases. Read all of it. |
| `docs/design-system/` | Snapshot of the lynx-reports design system: `tokens.css`, `tokens.json`, `README.md` (the brand book), `Palettes.md`, `components/` (bundle.css/js, `lib/` React 18.3.1 UMD, palettes.css, reports.css/js, hub.css, index.d.ts) and a `README.md` + `preview.html` per component card. These are the files the Worker serves at `/_ds/lynx-reports/v1/`. |
| `docs/screens/` | The Claude Design artboards for every hub screen and the report chrome (`.dc.html` source; see its README for how to read them). Match them. |
| `docs/reference/memory-research.html` | A real report in the target style, written before the design system existed. Useful for tone and density. Not a template: the ReportExample card is. |

Don't edit anything in `docs/design-system/` or `docs/screens/`. They are snapshots of artifacts I maintain in Claude Design; if something in them is wrong, list it in the plan and I'll fix it upstream.

## What to build

Everything in SPEC.md section 1 "In scope", in the six phases of section 9:

1. **Serve**: the Worker, R2 bucket `roost`, KV `ROOST_STATE`, Access JWT validation, serving report versions and `/_ds/` files.
2. **Publish**: `POST /api/publish`, manifest and `index/recent.json` writes with R2 ETag preconditions and retries, the `roost` CLI (publish, project, stream, export, doctor) with lint and secret scan, quarantine.
3. **Browse**: home and project pages, kind and stream views, filters, archive.
4. **Attention**: triage inbox and review, pins, "new" markers, ntfy, theme and palette preferences in KV.
5. **Report chrome**: ReportPill and ReportBanner injected with HTMLRewriter, scroll behaviour, seen tracking, theme set before first paint.
6. **Claude Code integration**: a skill that writes reports to the authoring contract (SPEC section 7, the ReportExample card, the Chart contract), classifies them by the confidence rules (5.3), and runs the publisher.

## Constraints

- **Nothing is ever deleted**, by any endpoint, command or script. Archive, reject and supersede are metadata. No `DELETE` handlers; no R2 `delete()` calls anywhere in the code.
- **Single user.** No user model, no per-project permissions. Access does authentication; the Worker re-validates the JWT on every request and separates service-token (publish) from browser (viewer actions) identities as SPEC 2 describes.
- **Free tier.** Workers, R2, KV and Access free plans; workers.dev URL; no custom domain, no D1, no Queues, no Durable Objects unless you argue for one in the plan.
- **Hub pages are server-rendered HTML** using Lynx's compiled class recipes from `bundle.css`. Load React and `bundle.js` only on pages that need a Radix control, and say in the plan which pages those are. Native `<select>` / `<details>` / `<dialog>` fallbacks are fine where they keep the look.
- **Use the design system as-is.** Pages are built from `hub.css`, `reports.css` and the component markup in the cards and screens. No new colours, no raw hex: tokens and palette slots only. Every page works at 380px and in all 14 palettes, light and dark.
- **The CLI is one Node 20+ script with no runtime dependencies** (built-ins and `fetch` only), so it can be copied onto any machine with the skill.
- **Reports stay plain HTML.** The publisher writes `report.json`; authors never do.
- **Notifications carry metadata only** (title, project, kind, URL), never report content.
- Keep the Worker small and readable: TypeScript, no framework, or a router as light as Hono if you want one. Justify any dependency.

## The plan (`docs/PLAN.md`)

Write it for me to review in one sitting. Include:

1. **Repo layout**: every top-level folder and what lives there (Worker, CLI, skill, scripts, tests, the vendored design-system copy if you keep one).
2. **Worker design**: routing table matching SPEC section 4; how hub pages are rendered (templates, escaping, which shared partials); HTMLRewriter injection for report chrome; JWT validation; caching headers for `/_ds/` (immutable, versioned) versus pages and reports.
3. **Storage**: R2 key layout, the manifest and global index schemas as TypeScript types, the read-modify-write with `onlyIf` ETag and its retry policy, and how a publish updates the manifest and index without leaving them inconsistent if it fails halfway. KV keys from SPEC 6.5.
4. **API**: every endpoint with method, auth identity, request and response shapes, and error codes.
5. **CLI**: commands and flags from SPEC 5.1, the lint rules table from SPEC 7, the secret patterns from 5.5, the multipart upload format, exit codes and `--json` output that the skill parses.
6. **Skill**: its folder layout, `SKILL.md` outline, the report template it starts from, how it applies the confidence rules and asks one combined question, and how it behaves unattended.
7. **Infrastructure and deployment**: the exact steps, split into what you can run with `wrangler` and what I must do in the Cloudflare dashboard. At minimum:
   - create the R2 bucket and KV namespace; write `wrangler.jsonc` with bindings `REPORTS`, `STATE`, vars `POLICY_AUD`, `TEAM_DOMAIN`;
   - first deploy; enable Access on the workers.dev route (dashboard); Access policy allowing only my email; read off the AUD tag and team domain into the vars;
   - create the Access service token; add a Service Auth rule for it; where `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` live on each of my machines;
   - generate the ntfy topic; `wrangler secret put NTFY_TOPIC`; subscribe my phone;
   - upload `docs/design-system/` to `ds/lynx-reports/v1/` with a script (idempotent; never deletes);
   - seed `registry/projects.json` and `config/settings.json`;
   - install the CLI and the skill on a machine and run `roost doctor`.
   Mark which steps need me and why. Never put secrets in the repo.
8. **Testing**: unit tests for lint, secret scan, classification parsing and manifest updates; Worker tests with Miniflare / `@cloudflare/vitest-pool-workers` against local R2 and KV, including concurrent publishes to one project (the ETag path) and an unauthenticated request (403); a visual check of each hub page against `docs/screens/` at 380px and 1240px, light and dark, with Playwright screenshots.
9. **Phases**: for each of the six, the work items, what "done" means, and how I verify it on my phone. Phase 1 should end with a hand-uploaded report readable behind Access.
10. **Open questions and risks**: anything the spec leaves undecided, anything in the design-system or screens that looks wrong or missing, and anything you would change in the spec. Ask; don't silently decide.

## Acceptance (the whole build)

- From my phone, logged in through Access, I can open the home page, see a report published minutes earlier marked new, open it, see the pill, switch versions, pin it, and change the palette, with the choice applied to the next report I open.
- An unauthenticated request to any path, including `/_ds/` and `/api/`, gets 403 from Access or the Worker.
- `roost publish` from a session in a registered repo publishes without asking; from an unregistered folder it asks which project; with `--unattended` and a fake AWS key in the folder it quarantines, and the item shows in triage with the key masked.
- Two publishes to the same project at once both land, with consistent version numbers and manifest.
- Republishing a report creates `v2`; `v1` still renders and shows the "older version" banner.
- Archiving hides a report from every index; its URL still works with the archived banner; unarchive restores it. Nothing in R2 is ever removed.
- Every hub page matches its artboard closely at 380px and 1240px, light and dark.
- `roost export <project> <dir>` recreates every version and the manifest locally.
- A new Claude Code session with the skill installed produces a report that passes lint with no errors, follows the ReportExample shape and the Chart contract, and publishes.

## Working agreement

- Plan first; stop for review. Then one phase per pull request or commit series, each ending with how to verify it.
- Keep `docs/SPEC.md` current: when we change a decision, update the spec in the same change.
- When something needs me (dashboard clicks, secrets, my email, ntfy on my phone), stop and tell me exactly what to do.
