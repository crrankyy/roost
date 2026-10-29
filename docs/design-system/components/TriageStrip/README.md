# TriageStrip

The first thing on the home page when reports need me: published by unattended runs, waiting for their classification to be confirmed. It isn't rendered at all when there are none.

**Use** `section.lr-panel.hub-triage` with `.hub-triage-head` (a `.hub-tile` Inbox icon, the count as `h2.hub-label`, a caption, and "Review all") and `.hub-triage-items` holding one `.hub-titem` per report: `a.hub-titem-title`, `.hub-proposal` (where Claude filed it, "as", a KindBadge) and `.hub-titem-foot` (the time and an outline sm "Confirm" button with an `aria-label` naming the report).

**Quarantined** — the foot shows a red ReportBadge ("2 secret findings") and "Review" instead of Confirm: a quarantined report can never be confirmed from the strip.

**Behaviour** — Confirm files the report under the proposal in one tap and shows an Undo toast (SonnerToaster). The items sit in three columns from 760px, stacked below. On a project page the strip lists only that project's items.

**Look** — the panel carries an `agent-border` edge and `glow-agent` on top of `shadow-lg`, so it reads first.
