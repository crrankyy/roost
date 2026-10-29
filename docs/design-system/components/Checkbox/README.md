# Checkbox

A square tick control for independent yes/no choices, such as which permissions an agent gets.

**Use** in lists where several options can be on at once and nothing happens until the form is saved. For an instant setting use Switch; for one-of-many use RadioGroup.

**Consumer provides** `id`, `checked`/`defaultChecked` (`true`, `false` or `"indeterminate"`), `onCheckedChange`, and a Label after it.

**Lynx treatment** — 16px, rounded-md, `bg-background/75` with a `muted-foreground/80` edge (meets 3:1 in both themes) that turns `agent` on hover. Checked: `agent` fill and edge, `agent-foreground` tick, `shadow-glow-agent` bloom. Keyboard focus is a 2px solid `focus-ring` with a 2px `background` offset; disabled 30%.

**Motion** — state changes ride Lynx's overshoot curve: `ease-spring` over `duration-color` — the check zooms in from 50%. Reduced motion keeps the fade and drops the travel.

- Do give each option a one-line muted hint explaining what the agent can then do.
- Don't use a checkbox to trigger an action immediately.
