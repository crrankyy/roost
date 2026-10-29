# Tabs

Switches between sibling views of the same object without leaving the page, such as an agent's Activity, Runs and Permissions.

**Use** it for 2–5 peer views. For page-level navigation use links; for on/off options use ToggleGroup.

**Consumer provides** `Tabs` (`defaultValue` or `value` / `onValueChange`, `orientation`), a `TabsList` of `TabsTrigger` (`value`, optional icon, `disabled`), and one `TabsContent` per value.

**Lynx treatment** — the list is a frosted control (`radius-xl`, 50%-`border`, `background` at 60%, `backdrop-blur`, `p-1`). Triggers are `radius-lg`, resting `muted-foreground` that brightens on hover; the active trigger fills `agent-soft` with `foreground` text and a soft `shadow-glow-agent`. Disabled drops to 30%; focus is the solid 2px `focus-ring`.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`. Reduced motion keeps the fade and drops the travel.

- Do keep labels to one or two words.
- Don't use tabs for steps in a sequence.
