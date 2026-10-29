# Separator

A 1px hairline that divides content horizontally or vertically.

**Use** between sections inside one surface (agent header and details) or between inline links. For list rows prefer `ItemSeparator`.

**Consumer provides** `orientation` and, for vertical, a parent with a height (flex row with a fixed height works).

| prop | values | default |
| --- | --- | --- |
| `orientation` | `horizontal` · `vertical` | `horizontal` |
| `decorative` | `true` hides it from assistive tech; `false` exposes `role="separator"` | `true` |

**Lynx treatment** — colour is `border/60` (Lynx's divider strength, the same as the message action bar's divider) instead of a solid `border`, so lines recede on frosted shells.

- Don't use a separator as a section heading substitute; add a label.
