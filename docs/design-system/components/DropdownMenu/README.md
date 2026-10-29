# DropdownMenu

A menu of actions that opens from a button, for an agent's or run's secondary commands.

**Use** it behind a "more" icon button or a labelled outline Button. Use checkbox items for on/off preferences and a radio group for one-of-many modes.

**Consumer provides** `DropdownMenu` (`open`, `modal`), `DropdownMenuTrigger asChild`, and `DropdownMenuContent` with `DropdownMenuItem` (icon first, label, optional `DropdownMenuShortcut`, `disabled`), `DropdownMenuCheckboxItem` (`checked`), `DropdownMenuRadioGroup` + `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, and `DropdownMenuSub` / `SubTrigger` / `SubContent` for nesting. `inset` on items and labels aligns them with indicator rows.

**Lynx treatment** — `radius-2xl` floating surface: `popover` at 90%, 50%-`border` hairline, `shadow-lg`, `backdrop-blur-xl` with `p-1.5`. Items are `radius-lg`, `px-2.5 py-1.5`; the highlighted item fills `agent-soft` and its icon turns `agent`; resting icons are `muted-foreground`. Check and radio indicators are `agent`. Labels are `text-xs` `muted-foreground`, separators `border` at 60%, shortcuts `muted-foreground` at 70%.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`. Reduced motion keeps the fade and drops the travel.

- Do group related items and separate destructive ones at the bottom.
- Don't colour items red; name the action clearly and confirm with AlertDialog.
