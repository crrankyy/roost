# ReportRow

One report in a list: the unit of Recent, stream cards, the project page and kind groups.

**Use** `a.hub-row` inside `.lr-panel.hub-list`, linking to the report. It holds:

- `.hub-row-top`: `.hub-dot` (`data-on="true"` for unread, with `role="img" aria-label="Unread"`; `"false"` keeps its space), `.hub-row-title`, and `.hub-time` (relative time, with a 12px pin icon first when pinned).
- `.hub-meta`: a KindBadge, then `.hub-path` (project, and ` › <b>stream</b>` when it has one).
- `.hub-sum`: the report's one-line summary, cut with an ellipsis. Leave it out in compact lists (stream cards, kind groups).

**Look** — 12px padding, `radius-xl`; hairlines between rows that vanish around the hovered row; hover fills `agent-soft`. Meta and summary align with the title (16px indent past the dot); in `.hub-compact` lists they don't indent.

- Do show "new" until the report is opened through the hub, on any device (seen state lives in KV).
- Don't truncate titles; let them wrap.
