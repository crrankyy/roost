# BudgetStack

An ordered stack of layers, each with a share bar: what goes into a budget (a prompt, a bundle, a request) and how much each part takes.

**Use** `.lr-stack` (role list) of `.lr-layer` rows: a `.lr-num`, a name block (`.lr-layer-name`, `.lr-layer-sub`), and a bar block (`.lr-bar` with an inner `span` whose width is the share, plus `.lr-bar-label`). `.lr-divider` puts a dashed, labelled line between layers; `data-volatile` marks a layer that changes often (dashed peach edge and bar).

**Look** — `radius-xl` rows at 70% card; 6px bars in `agent`; on phones the bar drops under the name.

- Do set every bar against the same maximum so lengths compare.
- Don't use it for data over time; that is a chart.
