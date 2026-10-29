# HoverCard

A read-only preview that appears when the pointer rests on a link or mention, like an agent's profile behind `@research-agent`.

**Use** it for supplementary detail sighted users can skip: agent profile, source preview, model info. Never put the only copy of information or any action in it; it is not reachable by touch.

**Consumer provides** `HoverCard` (`openDelay`, `closeDelay`, `open`), a `HoverCardTrigger` (an `<a>` by default) and `HoverCardContent` (`align`, `side`; width 16rem).

**Lynx treatment** — `radius-2xl` floating surface: `popover` at 90%, 50%-`border` hairline, `shadow-lg`, `backdrop-blur-xl`, padding 16px. Pair it with Lynx's avatar tile (`radius-xl`, `agent-border` edge, `agent-soft` fill, `agent` icon) as in the preview.

**Layering** — `HoverCardContent` renders in a portal on `<body>`, so a sidebar or scroll container never clips it.

- Do link the trigger to the full page the card summarises.
- Don't place buttons inside; use Popover for interactive content.
