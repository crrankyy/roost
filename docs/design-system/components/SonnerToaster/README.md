# SonnerToaster

Sonner's stacked toast region, fired with `sonnerToast()`, for several notifications at once.

**Use** when multiple agents may report at the same time (bookings, archives, completions) and toasts should stack; for one-at-a-time messages `Toast` is enough.

**Consumer provides** one `<SonnerToaster />` (any Sonner `Toaster` prop: `position`, `expand`, `richColors`, `closeButton`) and calls `sonnerToast('Title', { description, action: { label, onClick } })` or `sonnerToast.success(...)`.

| prop | values | default |
| --- | --- | --- |
| `position` | `bottom-right` · `top-center` · … | `bottom-right` |
| `expand` | show the stack expanded | `false` |

**Lynx treatment** — the theme follows the page (`data-theme`). Each toast is the Lynx shell: `radius-2xl`, `border-border/50`, `bg-background/90`, `backdrop-blur-xl`, `shadow-2xl`, `font-sans`. Descriptions are `muted-foreground`. The action button is Lynx's primary (`foreground` fill, `background` text, `radius-lg`) and the cancel button is `secondary`.

- Do give undo actions to anything an agent did on the user's behalf.
- Don't enable `richColors`; it brings its own palette that ignores Lynx tokens.
