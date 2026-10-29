# Chart

The contract for every chart in a report. Claude Code draws each chart as inline SVG when it writes the report, using these classes and colours; there is no charting library. Charts are snapshots, so the data is known at publish time.

## Pick the form first

| The reader must… | Form | Colour job |
| --- | --- | --- |
| See one number (and maybe its trend) | Stat with a Sparkline, not a chart | — |
| Compare a few items | BarList (CSS only), or columns | one series, slot 1 |
| See a trend over time | line; area wash for a single series | slot 1, or slots 1–n for separate series |
| See parts of one whole | ShareBar (CSS only), or stacked bars | slots 1–n |
| See one series against the rest | emphasis: slot 1 for it, `muted` for the rest | 1 hue + grey |
| See above/below a baseline | bars around zero, or a line with a `lr-ref` line | `--lr-div-neg` / `--lr-div-pos` |
| See a range per item | dot with whiskers (`lr-dot` + `lr-whisker`) | one series |

More than about seven classes that all matter: use a ReportTable instead. Never a pie, never two y-axes (draw two charts, or index both to a common base).

## Colour

- Series take `data-series="1"` … `"6"` in that fixed order (blue, peach, teal, mauve, yellow, pink), assigned in sequence and never cycled; past six, fold the tail into "Other" or split the chart. `data-series="muted"` is the de-emphasis grey. `good`, `warning`, `critical` are reserved for status and always come with a word.
- The colours are `--lr-series-1…6`: the palette's own hues set to one lightness per theme, so they pass the colour-blind and contrast checks in light and dark and follow the hub's palette. Magnitude uses `--lr-seq-1…5` (one hue, light to dark); polarity uses `--lr-div-neg`, `--lr-div-mid`, `--lr-div-pos`.
- **Never a raw colour in a chart.** No hex, rgb or named colours: the publisher warns on them, because they break dark mode and palettes.
- Text never wears a series colour: ticks, values and legends use the text tokens; identity comes from the mark or the legend key beside it.

## Marks

| Class | What | Spec |
| --- | --- | --- |
| `lr-line` | a series line | 2px, round joins and caps |
| `lr-area` | the wash under a single series | the series hue at 10% |
| `lr-bar` | a bar or column | at most 24px thick, 4px rounded data end, square at the baseline; 2px gap between touching bars |
| `lr-dot` | an end or data marker | r 4, with a 2px ring in the card colour |
| `lr-whisker` | a range | 2px, round caps |
| `lr-gridline` / `lr-baseline` | grid and zero line | 1px hairlines, solid, recessive |
| `lr-ref` | a target or threshold | 1px dashed, `muted-foreground` |
| `lr-tick` / `lr-value` / `lr-note` | axis text, direct labels, annotations | 11px muted / 12px medium foreground / 11px muted |

Label selectively: the line end, the extreme, the one bar the story is about; never a number on every point. Round ticks to clean numbers and compact from 1,000 (1K, 2.5K).

## Frame

`figure.lr-chart` holds, in order: `h3.lr-chart-title` (the finding with its number, not the topic), an optional `p.lr-chart-sub` (measure and unit), a `.lr-legend` of `.lr-key[data-series]` (`data-shape="line"` for lines) whenever there are two or more series, the SVG (inside `.lr-chart-scroll` when it has more than about six x positions, so phones scroll it instead of shrinking it), a `figcaption` with the context and a `.lr-src` source, and a `details.lr-chart-data` "Show data" table holding every value.

The SVG gets `viewBox` and no fixed size, `role="img"` and an `aria-label` that states the finding.

## Interaction

With `reports.js` loaded, any mark with `data-tip="value|label"` shows a tooltip on hover and keyboard focus, value first. For lines, put transparent hit rects over each x position, each tip listing every series at that x. Tooltips add detail; every value is also in the data table.

- Do write the title as the conclusion: "Publish got 38% faster", not "Publish time".
- Don't animate charts; reports are read, not watched.
- Need zoom, brushing or live data? That report can load the bundle and use ChartContainer; say why in the report.
