# ReportTable

A data table for comparing items across attributes, always inside a horizontal scroller so a phone never scrolls the page sideways.

**Use** `.lr-table-wrap` around `table.lr-table`, usually inside `.lr-panel.lr-card`. The first column names the row (medium weight); `lr-table-plain` makes it regular. Right-align numbers with `lr-num-cell` on both the `th` and the `td`. ReportBadges work in cells.

**Look** — 14/20 body; headers 12px medium `muted-foreground`, no wrap; hairlines at 50% (80% under the header); rows tint `agent-soft` on hover.

- Do sort rows by what the reader scans for.
- Don't put paragraphs in cells; move them to an ExpandableList.
