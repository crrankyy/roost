# Select

A dropdown for picking one value from a list, such as a model or a default agent.

**Use** for 5+ options or when space is tight; for 2–4 options prefer RadioGroup or ToggleGroup.

**Consumer provides** `value`/`defaultValue` and `onValueChange` on `Select`; a `SelectTrigger` (with `SelectValue` and its `placeholder`) and a `SelectContent` holding `SelectItem`s, optionally grouped with `SelectGroup` + `SelectLabel` and split by `SelectSeparator`.

**Lynx treatment** — the trigger is an Input-shaped field (h-9, radius-xl, frosted, `border-border/50`); keyboard focus is a 2px `focus-ring` (agent violet) with no offset and the edge turns `agent-border`, the edge also stays `agent-border` while open and the chevron flips. The list is a floating surface: radius-2xl, `bg-popover/90`, backdrop-blur-xl, `shadow-lg`, p-1.5. Items are rounded-lg and highlight `agent-soft`; the check is `agent`; group labels are text-xs muted.

**Motion** — focusing the field runs the composer's hue-cycling glow (blue → violet → pink → green, `duration-glow-cycle`, linear) as a drop-shadow outside the field (trigger); items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring` (items). Reduced motion keeps the fade and drops the travel.

- Do group long model lists by provider with `SelectLabel`.
- Don't hide why an item is disabled; say it in the item text.
