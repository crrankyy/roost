# GlowSidebar

Lynx's vertical navigation card: the same items as MenuBar, stacked in a 256px frosted panel, flipping on the Y axis.

**Use** it for the side rail of the agent workspace, or as a compact launcher. For a full app shell with groups, collapse and mobile sheet use Sidebar.

**Consumer provides** optional `items` (same shape as MenuBar's: `icon`, `label`, `href`, `gradient`, `iconColor`). Default gradients are ellipses (100% 150%) of the hue at 0.18 → 0.07 → transparent.

**Look** — `w-64`, shell `radius-2xl`, `border` at 40%, `background` 80% → 40% fade, `shadow-lg`, `blur-lg` backdrop, `space-2` padding, `space-2` between items; items `radius-xl`, `space-4`×`space-3`, `space-3` icon-to-label gap, `nav-label` in `muted-foreground`.

**Motion** (framer-motion, from the source) — only the hovered item reacts; the shell itself stays still. An item's front face turns away on Y (rotateY 0 → −90°, pivot right) while the back face turns in from 90° (pivot left), spring 100/20; its own glow, and no other, blooms from 0.8 to 1.5 (spring 300/25) through a `blur-item` (6px) blur.

- Do keep labels to one or two words so the flip reads.
- Don't nest groups inside it.
