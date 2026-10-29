# Empty

A centred placeholder for a view with nothing in it yet, with an icon, a message and next actions.

**Use** when a list, thread or table has no data: no runs yet, no sources connected, no results for a filter.

**Consumer provides** `EmptyHeader` with `EmptyMedia` (`variant="icon"` around a lucide icon), `EmptyTitle`, `EmptyDescription`, and `EmptyContent` for buttons. Add a 1px border (`className="border"`) for the dashed outline.

**Lynx treatment** — the outline is a dashed `border` hairline at `radius-2xl`. The icon sits in the Lynx agent tile (`radius-xl`, `agent-border`, `agent-soft`, `agent` icon, `glow-agent`). The title is 16px medium and the description `muted-foreground`; links brighten to `foreground` on hover.

- Do offer one primary action ("Run agent") and at most one secondary.
- Don't blame the user; say what will appear here.
