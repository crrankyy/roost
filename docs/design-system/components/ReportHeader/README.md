# ReportHeader

The top of every report: an eyebrow with the kind badge and scope, the title, a lead that states the answer, and a meta line.

**Use** once per report, first in `lr-main`. The lead is the conclusion in one or two sentences, never "This report covers…".

**Markup** — `<header class="lr-header">` holding `.lr-eyebrow` (a KindBadge plus a short scope line), `h1.lr-title`, `p.lr-lead`, and an optional `.lr-meta` row of spans (project › stream, date, version, commit) that the dot separators join.

**Look** — title 24/30 on phones, 30/36 from 560px, semibold, −0.025em; lead 15/26 `muted-foreground`, max 720px; eyebrow and meta in caption and meta sizes.

- Do state the finding with its number in the lead.
- Don't repeat the kind in the title; the badge carries it.
