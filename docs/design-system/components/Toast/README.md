# Toast

A transient notification that slides in at the bottom-right, fired imperatively with `toast()`.

**Use** to confirm finished background work ("Research agent finished") or report a recoverable failure with a retry. Persistent problems belong in an `Alert`.

**Consumer provides** one `<Toaster />` near the app root, then calls `toast({ title, description, action, variant })`. `action` is a `ToastAction` with `altText`. Only one toast shows at a time.

| option | values | default |
| --- | --- | --- |
| `variant` | `default` · `destructive` | `default` |
| `action` | `<ToastAction altText="…">Label</ToastAction>` | none |

**Lynx treatment** — a modal-grade shell: `radius-2xl`, `border-border/50`, `bg-background/90`, `backdrop-blur-xl`, `shadow-2xl`, p-4. Titles are medium `foreground`, descriptions `muted-foreground`. The action is a small outline control that hovers to `agent-soft`; close hovers the same. `destructive` keeps the frosted ground with a red edge rather than a red fill (white on light red fails 4.5:1). The viewport caps at 420px from the `sm` breakpoint.

- Do keep titles to one line; past tense for completed work.
- Don't put the only path to an action in a toast; it disappears.
