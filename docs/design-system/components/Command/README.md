# Command

A searchable command list (cmdk) for jumping to agents and running actions by typing; the basis of the command palette and comboboxes.

**Use** `Command` inline inside a Popover for comboboxes, or `CommandDialog` (open with ⌘K) as the app-wide palette.

**Consumer provides** `Command` (or `CommandDialog` with `open` / `onOpenChange`) containing `CommandInput` (`placeholder`), `CommandList` > `CommandEmpty`, `CommandGroup` (`heading`) > `CommandItem` (icon, label, optional `CommandShortcut`, `onSelect`, `disabled`), and `CommandSeparator`.

**Lynx treatment** — `radius-2xl`, `popover` at 90% with `backdrop-blur-xl` (no border of its own, so it sits cleanly inside a Popover; `CommandDialog` gets the Dialog shell with `shadow-2xl`). Input row has a 50%-`border` divider and `muted-foreground` search icon. Items are `radius-lg` `px-2.5 py-1.5`; the selected item fills `agent-soft` and its icon turns `agent`. Headings `text-xs` `muted-foreground`, shortcuts at 70%.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`. Reduced motion keeps the fade and drops the travel.

- Do write items as nouns for places and verbs for actions.
- Don't add a border around `Command` when it is inside a Popover.
