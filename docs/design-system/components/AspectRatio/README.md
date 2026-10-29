# AspectRatio

A box that holds its child at a fixed width-to-height ratio as the width changes.

**Use** for media whose frame must not jump while it loads: run replays, screenshots, link previews, avatar crops.

**Consumer provides** `ratio` (a number, e.g. `16 / 9`) and exactly one child that fills the box (`img`, `video`, or a placeholder div at 100% × 100%).

**Lynx treatment** — none on the primitive (it has no styles). Style the child: Lynx placeholders use `radius-2xl`, an `agent-border` edge and `agent-soft` fill with an `agent` icon, as in the preview.

- Do give the child `object-fit: cover` for images.
- Don't put text-heavy content inside; the ratio crops overflow on narrow widths.
