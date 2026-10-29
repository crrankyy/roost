# LiveAvatar

A circle with a slowly spinning, blurred ring around a glowing orb, the whole avatar gently breathing: Lynx's living mark.

**Use** it where something should feel alive: the hub's identity in the header, or beside work that is in progress (a publish running, a report waiting in triage). Use Avatar for people and project tiles.

**Consumer provides** optional `size` (px, default 32), `hue` (a Catppuccin accent, default `flamingo`) and `label` (accessible name, default "Lynx"). It renders as `role="img"`.

**Look** — a `radius-full` circle; the ring sits just outside the orb (12.5% of the size wide), in the hue, blurred, its outer fifth fading to transparent so it has no hard edge; the orb is 50% of the size, filled with the hue and glowing.

**Motion** — the ring turns continuously and the avatar breathes (scale 1 → 1.06). Under reduced motion both stop and the avatar holds still.

- Do keep one LiveAvatar per view; several spinning rings compete.
- Don't use it as a status dot; pair status with a word.
