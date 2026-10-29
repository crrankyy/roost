# Drawer

A bottom sheet (vaul) the user can drag down to dismiss, for quick actions on touch screens and narrow layouts.

**Use** it on mobile for an agent's quick actions or a short form; on desktop prefer Dialog or Sheet.

**Consumer provides** `Drawer` (`open` / `onOpenChange`, `shouldScaleBackground` default true), a `DrawerTrigger`, and `DrawerContent` with `DrawerHeader` (`DrawerTitle`, `DrawerDescription`), body and `DrawerFooter` (stacked full-width buttons, `DrawerClose asChild` for dismiss). Constrain the inner width yourself (e.g. max 420px, centred).

**Lynx treatment** — top corners `radius-2xl`, frosted `background` at 90% with `backdrop-blur-xl`, `shadow-2xl` and a 50%-`border` hairline; the drag handle is a slim `muted-foreground` at 30% pill; overlay `black/50` with blur; title `text-base`.

- Do put the main action first in the footer and a ghost "Close" last.
- Don't put long scrolling content in a drawer; use a Sheet.
