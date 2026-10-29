# MenuBar

Lynx's horizontal primary navigation: a frosted pill of icon-plus-label links that flip and bloom their own hue on hover.

**Use** it once per app, at the top of the agent workspace, for 3–5 top-level destinations. For in-page views use Tabs.

**Consumer provides** optional `items`: `{ icon, label, href, gradient, iconColor }[]`. Defaults are Home (blue), Notifications (orange), Settings (green), Profile (red). `icon` is a 20px lucide icon (`h-5 w-5`); `gradient` is the item's radial glow (the defaults use the hue at 0.15 → 0.06 → 0); `iconColor` is one of the compiled hover classes `group-hover:text-blue-500 | orange-500 | green-500 | red-500 | violet-500 | pink-500 | emerald-400`.

**Look** — shell `radius-2xl`, `border` at 40%, `background` 80% → 40% vertical fade, `shadow-lg`, `blur-lg` backdrop, `space-2` padding; items `radius-xl`, `space-4`×`space-2`, label `nav-label` in `muted-foreground`, icon in `foreground`.

**Motion** (framer-motion, from the source) — only the hovered item reacts; the shell itself stays still. Hovering an item flips its front face down on X (rotateX 0 → −90°) while a back face flips up from 90° (spring stiffness 100, damping 20); its own glow, and no other, grows from scale 0.8 to 2 (spring 300/25) and fades in over `duration-bloom` with `ease-standard`; the icon takes its hue over `duration-color`.

- Do give each destination its own hue; the hue is the item's identity.
- Don't put more than five items in it, or text-only items — the icon carries the hue.
