# Popover

A floating panel anchored to a trigger for small, non-blocking settings or details.

**Use** it for an agent's model and budget, a filter, or a short form that edits something in place. Use Tooltip for one-line labels and HoverCard for read-only previews.

**Consumer provides** `Popover` (`open` / `onOpenChange`), `PopoverTrigger` (usually `asChild` with an outline Button) and `PopoverContent` (`align`, `side`, `sideOffset` default 4; width 18rem, padding 16px).

**Lynx treatment** — `radius-2xl` floating surface: `popover` at 90%, 50%-`border` hairline, `shadow-lg`, `backdrop-blur-xl`. Because the trigger is an outline Button, its `lynx-halo-violet` stays bloomed while the popover is open (`data-state="open"`).

- Do keep content to one task with at most two actions.
- Don't put navigation menus in a popover; use DropdownMenu.
