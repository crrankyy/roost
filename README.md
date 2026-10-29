# Roost

Roost is a private home for the reports Claude Code writes.

At the end of a session, Claude Code can write up what it found as a report: an investigation, a code review, a plan, a benchmark. Normally that report sits in a folder on the machine that ran the session. Roost puts it online, behind your own login, so you can read it later on your phone or any other computer.

It runs on your own Cloudflare account, and only you can get in.

## What you get

- **One place for every report.** Reports are filed by project, so the work from each repo stays together.
- **Readable anywhere.** The hub and every report work on a phone as well as a desktop, in light or dark mode.
- **A push notification when a report lands**, sent to your phone through [ntfy](https://ntfy.sh).
- **Nothing gets lost.** A report is never overwritten or deleted. Publishing it again creates a new version, and the old ones stay readable. Old work is archived, not removed.
- **Sorted for you.** Each report gets a kind (investigation, plan, review and so on) and can belong to a stream, a running thread of related reports. If Claude isn't sure where a report belongs, it files the report with its best guess and adds it to a triage inbox for you to confirm.
- **Safe by default.** Before anything is uploaded, Roost checks the report for broken links, oversized files and anything that looks like a password or API key. If a report might contain a secret, the publish stops and asks first. In an unattended run, the report is quarantined until you review it.
- **A consistent look.** Reports use a shared design system, so they all read the same way.

## How it works

There are three parts:

1. **The hub**: a Cloudflare Worker that stores reports and serves them, with Cloudflare Access in front so only your email can sign in.
2. **The `roost` command**: a small command-line tool that checks a report, uploads it and sends the notification.
3. **The Claude Code skill**: it teaches Claude how to write a report in the house style and publish it with `roost`. Ask Claude for "a report", "a write-up" or "send it to Roost" and it takes care of the rest.

```
Claude Code ──> roost CLI ──> Cloudflare Access ──> Roost Worker ──> your reports
                                     ▲
         your phone or laptop ───────┘ (email login)
```

## Getting started

You need a Cloudflare account, Node 20 or newer, and Claude Code.

### 1. Deploy the hub

```sh
npm install
npx wrangler login
npx wrangler r2 bucket create roost
npx wrangler kv namespace create ROOST_STATE   # put the id it prints in wrangler.jsonc
npm run deploy
```

Until Cloudflare Access is set up, the hub answers every request with "forbidden". That's deliberate.

### 2. Lock it down with Cloudflare Access

In the Cloudflare dashboard:

1. Open **Workers & Pages → roost → Settings → Domains & Routes**, and turn on **Cloudflare Access** for the workers.dev address. Allow only your own email.
2. Copy the application's **AUD tag** and your **team domain** into `vars` in `wrangler.jsonc`.
3. Under **Zero Trust → Access → Service credentials**, create a service token for publishing. Add a **Service Auth** policy for it to the roost application, and put the token's **Client ID** in `SERVICE_TOKEN_ID`.
4. Deploy again with `npm run deploy`.

> **Tip:** if sign-in loops or every request is refused, check the AUD tag. The reliable value is the `kid` in the Access login page's address.

### 3. Set up each machine

Create `~/.config/roost/env`, readable only by you (`chmod 600`):

```sh
ROOST_URL=https://roost.<your-subdomain>.workers.dev
CF_ACCESS_CLIENT_ID=...
CF_ACCESS_CLIENT_SECRET=...
ROOST_NTFY_TOPIC=...   # optional: a long random name, then subscribe to it in the ntfy app
```

Then install the skill and the `roost` command:

```sh
sh scripts/install.sh
```

The installer finishes by running `roost doctor`, which checks your setup end to end. Every line should say `ok`.

### 4. First run only

```sh
node scripts/seed.mjs        # creates the hub's settings
node scripts/upload-ds.mjs   # uploads the design system that reports use
roost project add --id my-app --title "My App" --remote github.com/me/my-app
```

Add a project for each repo you work in. Claude uses the git remote, the folder path or keywords to work out which project a session belongs to.

## Everyday use

Most of the time you won't run `roost` yourself. Ask Claude Code for a report and it writes and publishes one, then gives you the link.

When you want to do it by hand:

| Command | What it does |
| --- | --- |
| `roost publish <folder>` | Check a report folder and publish it |
| `roost project add / edit / archive / list` | Manage your projects |
| `roost stream create / rename / merge / done` | Organise related reports into streams |
| `roost export <project> <folder>` | Download a whole project, every version included |
| `roost doctor` | Check that everything is set up and working |

Add `--json` to most commands for machine-readable output.

## Working on Roost

```sh
npm run dev         # run the Worker locally
npm test            # Worker tests and CLI tests
npm run typecheck
```

After changing `cli/roost.mjs`, run `node scripts/build-skill.mjs` to copy it into the skill, then `sh scripts/install.sh` to install it.

## More detail

- [`docs/SPEC.md`](docs/SPEC.md): what Roost does and why, in full.
- [`docs/PLAN.md`](docs/PLAN.md): how it's built, including the API and the setup steps.
- [`skill/roost-report/SKILL.md`](skill/roost-report/SKILL.md): how Claude writes and files a report.
- [`docs/design-system/`](docs/design-system/): the lynx-reports design system.
