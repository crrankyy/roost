# Alert

A static, in-flow message panel with an icon, a title and a description.

**Use** `default` for something the user should know or decide (an agent needs permission), `destructive` when a run failed or data is at risk. For transient confirmations use a toast.

**Consumer provides** a leading lucide icon (positioned automatically), `AlertTitle` and `AlertDescription`.

| prop | values | default |
| --- | --- | --- |
| `variant` | `default` · `destructive` | `default` |

**Lynx treatment** — a shell: `radius-2xl`, `border-border/50`, `bg-card/75`, `backdrop-blur-xl`, `shadow-lg`. The icon is `agent`; the title is `foreground` and the description `muted-foreground`. `destructive` keeps the text neutral and puts the red on the edge (`destructive/50`; `red-400/40` in dark) and the icon (`red-500` / `red-400`), since red text fails 4.5:1 in both themes.

- Do say what happened and what to do next.
- Don't stack more than two alerts; merge them.
