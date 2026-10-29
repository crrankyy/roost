# ToggleGroup

A set of Toggles where one (`type="single"`) or several (`type="multiple"`) options are on: a mode switch or formatting bar.

**Use** `single` for exclusive modes (Chat · Agent · Research, time ranges), `multiple` for independent flags (bold, italic). For switching panels of content use Tabs instead.

**Consumer provides** `type`, `value`/`defaultValue`, `onValueChange`, an `aria-label`, and `ToggleGroupItem` children with a `value` each. `variant` and `size` on the root apply to every item.

| prop | values | default |
| --- | --- | --- |
| `type` | `single` · `multiple` | required |
| `variant` | `default` · `outline` | `default` |
| `size` | `default` · `sm` · `lg` | `default` |

**Lynx treatment** — the items sit in a frosted tray (radius-xl, `border-border/50`, `bg-background/60`, backdrop-blur, p-1) like the Tabs list; items are rounded-lg Toggles: muted at rest, `agent-soft` fill with an `agent` icon when on.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`; state changes ride Lynx's overshoot curve: `ease-spring` over `duration-color`, and a press shrinks an item to 95%. Reduced motion keeps the fade and drops the travel.

- Do use `size="sm"` for icon-only formatting bars.
- Don't put more than five items in one group; use a Select.
