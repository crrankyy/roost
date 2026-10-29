# Kbd

A keycap that shows a keyboard shortcut inline with text, in menus or in tooltips.

**Use** in hints ("Press Enter to send"), command menus and tooltips. Group a chord with `KbdGroup`.

**Consumer provides** the key label or a lucide icon (`Command`, sized to 12px) as children.

**Lynx treatment** — `radius-md` keycap with a `border-border/50` hairline, `muted/60` fill and 11px `font-mono` `muted-foreground`, matching the `.kbd` text style. Inside a tooltip it sits on `background/60` instead of inverting, because Lynx tooltips are light-on-popover, not dark chips.

- Do write keys as they are printed ("Shift", "Esc", "K").
- Don't use Kbd for code or values; use `font-mono` text.
