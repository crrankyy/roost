# ScrollArea

A fixed-size region with a slim custom scrollbar, for long logs and lists inside a panel.

**Use** for run logs, source lists and tool-call histories that must stay inside a card or sidebar. Page-level scrolling stays native.

**Consumer provides** a height (and width if needed) via `className` or style, the children, and optionally `type` (`hover` default, `always`, `scroll`, `auto`). Add `<ScrollBar orientation="horizontal" />` for sideways content.

**Lynx treatment** — the thumb is `muted-foreground/30`, brightening to `/50` on hover (stock used `border`, which vanished on dark shells); it stays fully rounded and 10px wide with a transparent track.

- Do set an explicit height; without one nothing scrolls.
- Don't nest scroll areas in the same direction.
