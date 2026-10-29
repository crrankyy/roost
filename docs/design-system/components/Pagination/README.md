# Pagination

Page controls for long, ordered lists such as run history or source results.

**Use** it when users need to reach a specific page; for feeds prefer "Load more" or infinite scroll.

**Consumer provides** `Pagination` > `PaginationContent` of `PaginationItem`s holding `PaginationPrevious`, `PaginationLink` (`href`, `isActive`, `size`), `PaginationEllipsis` and `PaginationNext`. Wire `onClick` / `href` yourself.

| prop (`PaginationLink`) | values | default |
| --- | --- | --- |
| `isActive` | marks the current page (`aria-current="page"`) | `false` |
| `size` | Button sizes: `icon` · `sm` · `default` · `lg` | `icon` |

**Lynx treatment** — links are Lynx ghost/outline Buttons (`radius-xl`, `muted-foreground` brightening on hover, solid `focus-ring`); the current page is tinted `agent-soft` with an `agent-border` edge, `foreground` text and `shadow-glow-agent`.

- Do always show the first and last page.
- Don't show more than about seven page numbers.
