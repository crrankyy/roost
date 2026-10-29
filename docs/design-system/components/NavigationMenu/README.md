# NavigationMenu

A top navigation bar whose items can open rich panels of links, for marketing-style or workspace-level site navigation.

**Use** it for primary navigation with grouped destinations (Agents, Runs, Docs). For commands use AppMenubar; for Lynx's compact icon nav use MenuBar.

**Consumer provides** `NavigationMenu` (`value` / `defaultValue`) > `NavigationMenuList` of `NavigationMenuItem`s; each holds either `NavigationMenuTrigger` + `NavigationMenuContent` (your grid of `NavigationMenuLink`s) or a single `NavigationMenuLink` styled with `navigationMenuTriggerStyle()`. Links are unstyled: give them a `radius-lg` padded block with an `agent-soft` hover, as in the preview.

**Lynx treatment** — the list is a Lynx shell (`radius-2xl`, `background` at 75%, 50%-`border`, `shadow-lg`, `backdrop-blur-lg`). Triggers are h-9 `radius-xl`, `muted-foreground` that brightens and fills `agent-soft` on hover, focus, open or active; solid `focus-ring`. The viewport is the standard floating surface: `radius-2xl`, `popover` at 90%, `backdrop-blur-xl`, `shadow-lg`.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`. Reduced motion keeps the fade and drops the travel.

- Do give each panel link a title and a one-line description.
- Don't nest a second level inside a panel.
