# Collapsible

An unstyled show/hide region driven by a trigger, for one expandable block.

**Use** for a single disclosure such as an agent's tool-call activity or "Permissions used". For several related questions use `Accordion`.

**Consumer provides** `CollapsibleTrigger` (usually `asChild` around a ghost `Button` with a chevron) and `CollapsibleContent`; `open`/`onOpenChange` or `defaultOpen`.

**Lynx treatment** — the primitive has no styles. Lynx composes it as an activity panel: an `agent-border` / `agent-soft` shell at `radius-xl`, a ghost button trigger whose chevron rotates when open, and steps in 12px `muted-foreground` with `agent` marks.

- Do reflect the state in the trigger (rotate the chevron; Radix sets `aria-expanded`).
- Don't hide primary actions inside a collapsed region.
