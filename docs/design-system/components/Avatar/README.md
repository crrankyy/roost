# Avatar

A circle that identifies an agent or person by image, initials or icon.

**Use** beside messages, in agent lists and in assignee fields. Agents get an icon or initials; people get a photo with initials as fallback.

**Consumer provides** `AvatarImage` (`src`, `alt`) and `AvatarFallback` (initials or a lucide icon, shown while the image loads or if it fails). Resize the root with `className` (default 40px; 32px in threads).

**Lynx treatment** — every Lynx avatar is a circle (`radius-full`), at any size: `agent-border` edge, `agent-soft` fill and fallback text in 12px medium `agent`, matching the agent avatar in MessageThread. Images use `object-cover`.

- Do use Avatar for people (photo or initials) and project tiles (initials); use LiveAvatar for something that should feel alive.
- Do always include a fallback; images fail.
- Don't use the agent tint for people if you need to tell them apart; override the fallback colour.
