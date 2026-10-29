# Item

A flexible row with media, title, description and actions, for lists of agents, sources or settings.

**Use** `default` inside a list or `ItemGroup`, `outline` for a stand-alone row that needs its own shell, `muted` for a paused or secondary row. Use `asChild` with an `<a>` to make the whole row a link.

**Consumer provides** `ItemMedia` (`variant="icon"` for a lucide icon, `image` for a thumbnail), `ItemContent` with `ItemTitle` / `ItemDescription`, and `ItemActions`. Group rows with `ItemGroup` and `ItemSeparator`.

| prop | values | default |
| --- | --- | --- |
| `variant` | `default` · `outline` · `muted` | `default` |
| `size` | `default` (p-4) · `sm` | `default` |
| `ItemMedia variant` | `default` · `icon` · `image` | `default` |

**Lynx treatment** — rows are `radius-xl`; `outline` becomes a full shell (`radius-2xl`, `border-border/50`, `bg-card/75`, `backdrop-blur-xl`, `shadow-lg`). Icon media is the Lynx avatar tile: `radius-xl`, `agent-border` edge, `agent-soft` fill, `agent` icon and `glow-agent`. Link rows hover to `agent-soft`; focus uses the 2px `focus-ring` with offset.

- Do keep descriptions to one line of status ("Paused · resumes at 9:00").
- Don't mix `outline` and `default` rows in one group.
