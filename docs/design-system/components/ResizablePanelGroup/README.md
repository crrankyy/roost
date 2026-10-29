# ResizablePanelGroup

A split layout whose panels the user resizes by dragging (or arrow-keying) the handles between them.

**Use** for workspace layouts: agent list beside the thread, thread above the run log. Nest groups to mix directions.

**Consumer provides** `direction`, `ResizablePanel` children (with `defaultSize` / `minSize` in percent) and a `ResizableHandle` between each pair; `withHandle` shows the grip.

| prop | values | default |
| --- | --- | --- |
| `direction` | `horizontal` · `vertical` | required |
| `ResizableHandle withHandle` | show the grip tab | `false` |

**Lynx treatment** — the divider is `border/60`; it turns `agent-border` on hover and solid `agent` while dragging. The grip is a frosted `rounded-md` tab (`bg-background/90`, `border-border/50`, `shadow-sm`). Keyboard focus is the 2px `focus-ring` with a background offset.

- Do set `minSize` so a panel cannot collapse to an unusable sliver.
