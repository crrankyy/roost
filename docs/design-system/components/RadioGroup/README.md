# RadioGroup

A set of round options where exactly one is selected, such as an agent's approval mode.

**Use** for 2–5 visible, mutually exclusive options. For more options use Select; for large choice cards wrap each item in a `FieldLabel` (see Field).

**Consumer provides** `value`/`defaultValue`, `onValueChange`, an accessible name for the group, and `RadioGroupItem` children each with `value`, `id` and a Label.

**Lynx treatment** — items are 16px circles on `bg-background/75` with a `muted-foreground/80` edge that turns `agent` on hover. Selected: `agent` fill with an `agent-foreground` centre dot and `shadow-glow-agent`, matching Checkbox. Keyboard focus is a 2px solid `focus-ring` with a 2px `background` offset; disabled 30%.

**Motion** — state changes ride Lynx's overshoot curve: `ease-spring` over `duration-color` — the dot zooms in from 50%. Reduced motion keeps the fade and drops the travel.

- Do order options from most to least cautious.
- Don't preselect the riskiest option.
