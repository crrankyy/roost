# ButtonGroup

Joins related Buttons, Inputs and Selects into one segmented control with shared edges.

**Use** for a run's controls (Run · Schedule · More), a split action (primary + chevron menu) or a prefix + field + action row. Nest groups for gaps between clusters; use `orientation="vertical"` for a tool rail.

**Consumer provides** the children (Button, Input, SelectTrigger, `ButtonGroupText`, `ButtonGroupSeparator`) and an `aria-label` for the group.

| prop | values | default |
| --- | --- | --- |
| `orientation` | `horizontal` · `vertical` | `horizontal` |

**Lynx treatment** — children keep their own Lynx look (radius-xl, halos); the group only squares the inner corners and removes doubled borders. `ButtonGroupText` is a frosted `muted/60` tile with a `border-border/50` hairline and muted text; `ButtonGroupSeparator` is a `bg-border/60` divider, needed between two filled (`default`) buttons.

- Do keep variants matched inside a group (all `outline`, or `default` + separator + `default`).
- Don't mix a `default` and an `outline` button in one group; their two outline weights compete.
