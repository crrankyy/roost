# AppMenubar

shadcn's `Menubar`, exported as `AppMenubar` (the name `MenuBar` belongs to Lynx's own flip-icon nav): a desktop-style row of menus (Agent, Run, View, Help) for workspace-level commands.

**Use** it in a desktop workspace header or editor toolbar where commands are many and keyboard driven. For site navigation use NavigationMenu or Lynx's MenuBar.

**Consumer provides** `AppMenubar` (or `Menubar`; `value` / `defaultValue` / `onValueChange` for the open menu) containing `MenubarMenu` (`value`) > `MenubarTrigger` + `MenubarContent`, with the same item parts as DropdownMenu: `MenubarItem`, `MenubarCheckboxItem`, `MenubarRadioGroup` / `RadioItem`, `MenubarLabel`, `MenubarSeparator`, `MenubarShortcut`, `MenubarSub` / `SubTrigger` / `SubContent`.

**Lynx treatment** — the bar is a Lynx shell like MenuBar: `radius-2xl`, `background` at 75%, 50%-`border`, `shadow-lg`, `backdrop-blur-lg`. Triggers are `radius-xl`, `muted-foreground` brightening to `foreground` on hover, `agent-soft` when open, solid `focus-ring` on keyboard focus. Menus: `radius-2xl` floating surface: `popover` at 90%, 50%-`border` hairline, `shadow-lg`, `backdrop-blur-xl` with `p-1.5`. Items are `radius-lg`, `px-2.5 py-1.5`; the highlighted item fills `agent-soft` and its icon turns `agent`; resting icons are `muted-foreground`. Check and radio indicators are `agent`. Labels are `text-xs` `muted-foreground`, separators `border` at 60%, shortcuts `muted-foreground` at 70%.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`. Reduced motion keeps the fade and drops the travel.

- Do give every frequent item a shortcut.
- Don't use more than about six top-level menus.
