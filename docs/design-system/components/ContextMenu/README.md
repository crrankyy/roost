# ContextMenu

A menu that opens at the pointer on right-click (or long-press) over a region, for power-user shortcuts on runs, messages and files.

**Use** it only to duplicate actions that are also reachable elsewhere (a DropdownMenu or buttons); it is invisible until discovered.

**Consumer provides** `ContextMenu`, a `ContextMenuTrigger` wrapping the target region, and `ContextMenuContent` with the same parts as DropdownMenu: `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup` / `RadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuSub` / `SubTrigger` / `SubContent`.

**Lynx treatment** — identical to DropdownMenu: `radius-2xl` floating surface: `popover` at 90%, 50%-`border` hairline, `shadow-lg`, `backdrop-blur-xl` with `p-1.5`. Items are `radius-lg`, `px-2.5 py-1.5`; the highlighted item fills `agent-soft` and its icon turns `agent`; resting icons are `muted-foreground`. Check and radio indicators are `agent`. Labels are `text-xs` `muted-foreground`, separators `border` at 60%, shortcuts `muted-foreground` at 70%.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`. Reduced motion keeps the fade and drops the travel.

- Do mirror the order of the equivalent DropdownMenu.
- Don't make it the only way to reach an action.
