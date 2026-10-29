# StreamCard

A group of reports in a card: an active stream with its latest three reports, or, grouped by kind, one kind's reports.

**Use** `article.lr-panel` (flex column) with `.hub-card-head` and a `.hub-list` of compact ReportRows (no summary).

- **Stream** — the head is a `.hub-tile-quiet` stream icon, `.hub-card-title` (`h3.hub-card-name` = the stream id, and a caption "4 reports · latest 2h ago"), and an "All N" link to the filtered view. Rows show the KindBadge only.
- **Kind group** — the head is the KindBadge and a count; rows show `.hub-path` (project › stream) instead of a badge.

**Layout** — `.hub-streams` lays stream cards out three across from 1000px; `.hub-kindgroups` two across. Both stack below.

- Do order stream cards by their latest report, and kind groups by their newest report.
- Don't show done streams here; they live in the collapsed "Done streams" disclosure (a Collapsible with `.hub-disclosure`).
