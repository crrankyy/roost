# ShareBar

One whole split into its parts, as a single horizontal bar: where reports came from, how a budget divides.

**Use** `.lr-sharebar` with one `span` per part, each with `data-series` (slots `1`, `2`, `3` … in order, `muted` for "Other") and `--v` set to its percentage; the parts should sum to 100. Give the bar `role="img"` and an `aria-label` listing every part. Follow it with a `.lr-legend` whose keys carry the same `data-series` and the value in a `strong`.

**Look** — 14px tall, a 2px surface gap between parts, 4px rounded ends.

- Do keep it to five parts or fewer; fold the rest into "Other".
- Don't use it for values that don't add up to a whole.
