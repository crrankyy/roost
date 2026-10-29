# InputGroup

A single frosted field that holds an input or textarea together with icons, text, kbd hints and small buttons.

**Use** for search fields with icons/shortcuts, URL fields with a prefix and action, and multi-line fields (`InputGroupTextarea` + a `block-end` addon of actions).

**Consumer provides** one `InputGroupInput` or `InputGroupTextarea` plus `InputGroupAddon`s containing `InputGroupText`, `InputGroupButton`, icons or Kbd. Set `data-disabled="true"` on the root when the control is disabled.

| part / prop | values | default |
| --- | --- | --- |
| `InputGroupAddon align` | `inline-start` · `inline-end` · `block-start` · `block-end` | `inline-start` |
| `InputGroupButton size` | `xs` · `sm` · `icon-xs` · `icon-sm` | `xs` |
| `InputGroupButton variant` | any Button variant | `ghost` |

**Lynx treatment** — the root carries the Input shell (radius-xl, `bg-background/75`, `border-border/50`, backdrop-blur), becoming radius-2xl around a textarea like the composer. Focus inside shows a 2px `focus-ring` with an `agent-border` edge on the whole group; invalid controls turn the edge `destructive`. Addons and text are `muted-foreground`.

**Motion** — focusing the field runs the composer's hue-cycling glow (blue → violet → pink → green, `duration-glow-cycle`, linear) as a drop-shadow outside the field around the whole group. Reduced motion keeps the fade and drops the travel.

- Do use `outline` icon buttons for secondary actions and at most one `default` icon button for the primary one.
- Don't nest an InputGroup inside a ButtonGroup.
