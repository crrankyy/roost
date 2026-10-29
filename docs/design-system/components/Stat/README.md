# Stat

A headline number with what it measures and where it came from. Two to four sit in a row under the ReportHeader.

**Use** `.lr-panel.lr-stat` with `.lr-stat-value`, `.lr-stat-label` (a phrase that reads on from the number) and `.lr-stat-src`. Add `.lr-delta` with `data-trend="good" | "bad"` beside the value for a change against a baseline. Lay them out in `.lr-grid.lr-grid-4` (one column on phones, two from 560px, four from 1000px).

**Look** — value 26/32 semibold, tabular figures; label caption `muted-foreground`; source 10px at 70%, pinned to the bottom so a row lines up.

- Do give every number its source.
- Don't show more than four; put the rest in a table.
