# Sheet

A panel that slides in from a screen edge over a dimmed page, for detail views and secondary forms that need more room than a dialog.

**Use** `side="right"` for run details, agent settings and source lists; `left` for mobile navigation (Sidebar uses it automatically); `top`/`bottom` rarely.

**Consumer provides** `Sheet` (`open` / `onOpenChange`), a `SheetTrigger`, and `SheetContent` with `SheetHeader` (`SheetTitle`, `SheetDescription`), body and `SheetFooter`.

| prop (`SheetContent`) | values | default |
| --- | --- | --- |
| `side` | `right` · `left` · `top` · `bottom` | `right` |

**Lynx treatment** — the panel is frosted like a dialog (`background` at 90%, `backdrop-blur-xl`, `shadow-2xl`, 50%-`border` hairline on the inner edge) and rounds its inner corners to `radius-2xl`; overlay `text` at 30% (Latte) or `crust` at 70% (Mocha) with blur; quiet `agent-soft` close X with the solid `focus-ring`.

- Do keep the primary action in the footer, bottom right.
- Don't stack a sheet on top of a dialog.
