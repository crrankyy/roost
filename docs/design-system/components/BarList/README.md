# BarList

A ranked comparison of a few items, drawn with CSS: name, bar, value. The default way to compare magnitudes in a report.

**Use** `.lr-barlist` holding `.lr-bar-row` elements, each with `.lr-bar-name`, `.lr-bar-track > span` and `.lr-bar-val`. Set `--v` on the inner span to the item's share of the largest value (0–100), and write the real value in `.lr-bar-val`. Sort rows by value. Give the row `data-series` to colour it: all rows slot `1` for a plain comparison, one row `1` and the rest `muted` for emphasis, `muted` for an "Other" tail. Wrap it in `figure.lr-chart` with a title that states the finding.

**Look** — 10px bars with a 4px rounded end, square at the start; values in 14/20 medium, tabular; on phones the bar drops under the name.

- Do keep it to about ten rows; past that use a ReportTable.
- Don't colour rows by their value; length already shows it.
