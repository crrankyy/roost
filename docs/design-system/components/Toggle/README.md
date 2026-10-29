# Toggle

A two-state button for a single on/off option, such as web search or deep thinking for the next run.

**Use** `default` inside toolbars and composers, `outline` when the toggle stands alone on a surface. Pair icon-only toggles with an `aria-label`.

**Consumer provides** the label and/or a lucide icon (sized to 16px), plus `pressed`/`defaultPressed` and `onPressedChange`.

| prop | values | default |
| --- | --- | --- |
| `variant` | `default` · `outline` | `default` |
| `size` | `default` (h-9) · `sm` (h-8, rounded-lg, text-xs) · `lg` (h-10) | `default` |

**Lynx treatment** — radius-xl; resting text is `muted-foreground` and brightens to `foreground` on an `agent-soft` hover, like the message action bar. On: `agent-soft` fill, `foreground` text and the icon turns `agent`; `outline` also gains an `agent-border` edge. Disabled drops to 30%; keyboard focus is a 2px solid `focus-ring` with a 2px `background` offset.

**Motion** — items bloom a soft `violet-500` radial glow behind them (MenuBar's item glow, scaled to lists) on hover, keyboard highlight and the selected/active state: opacity over `duration-bloom` with `ease-standard`, scale 0.8 → 1.15 with `ease-spring`; state changes ride Lynx's overshoot curve: `ease-spring` over `duration-color`, and a press shrinks it to 95%. Reduced motion keeps the fade and drops the travel.

- Do use Toggle for settings that apply to the next action; use Switch for persistent settings.
- Don't rely on the fill alone for text-only toggles in dense rows; prefer an icon so the violet mark shows state.
