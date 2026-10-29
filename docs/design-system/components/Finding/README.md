# Finding

A numbered point: a conclusion, a change to make, or an issue found. The default unit of a report's argument.

**Use** `.lr-panel.lr-finding` with `.lr-num`, then an `h3` (the point, as a sentence) and a `p` (why, in one or two sentences). For audits and reviews, wrap the heading in `.lr-finding-head` with a ReportBadge for severity. Lay several out in `.lr-grid.lr-grid-2`.

**Look** — `space-4` padding; the 24px number is an `agent-soft` circle with an `agent-border` edge and `glow-agent`; heading 14/20 medium; body 14/20 `muted-foreground`.

- Do number findings in reading order and refer to them by number elsewhere.
- Don't put more than one point in a finding.
