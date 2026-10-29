# Input

The single-line text field for names, URLs, search terms and IDs.

**Use** with a Label above it (or inside a Field). For prefixes, icons or inline buttons use InputGroup instead of wrapping the Input yourself.

**Consumer provides** `type`, `value`/`defaultValue`, `placeholder`, an associated `<Label htmlFor>`, and `aria-invalid` + `aria-describedby` when validation fails.

**Lynx treatment** — h-9, radius-xl, frosted `bg-background/75` with a `border-border/50` hairline and `shadow-sm` (the composer's shell in miniature); placeholder `muted-foreground/70`; hover lifts the edge to `border`; keyboard focus is a 2px `focus-ring` (agent violet) with no offset and the edge turns `agent-border`. `aria-invalid` turns the edge `destructive` (`red-400` in dark). Disabled drops to 30%.

**Motion** — focusing the field runs the composer's hue-cycling glow (blue → violet → pink → green, `duration-glow-cycle`, linear) as a drop-shadow outside the field. Reduced motion keeps the fade and drops the travel.

- Do write placeholders as an example or hint, never as the label.
- Don't colour the text of an invalid field; colour the edge and show a FieldError below.
