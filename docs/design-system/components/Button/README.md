# Button

The one push-control for commands: an outline and a label, with a glow in the button's hue that fills it from the inside on hover.

**Use** `default` once per view for the thing the view is for ("Run agent", "Send"). `outline` for secondary tools that sit beside it (attach, voice), `ghost` inside toolbars and menus, `secondary` for low-stakes saves, `destructive` only for stopping or deleting an agent's work, `link` inline in prose.

**Consumer provides** the label (sentence case, verb first) and, for icon-only buttons (`size="icon"`), an `aria-label`. Lucide icons go first; the button sizes them to 16px.

| prop | values | default |
| --- | --- | --- |
| `variant` | `default` · `outline` · `secondary` · `ghost` · `destructive` · `link` | `default` |
| `size` | `default` (h-9) · `sm` (h-8, rounded-lg) · `lg` (h-10) · `icon` (36×36) | `default` |
| `asChild` | render the child element (e.g. an `<a>`) with button styling | `false` |

**Lynx treatment** — no resting fill on any variant. `default`: `foreground` outline at 80% and `foreground` text, blue glow. `outline`: `border` outline, `muted-foreground` text brightening to `foreground`, mauve glow. `secondary`: `input` outline, `foreground` text, mauve glow. `ghost`: no outline until hover, mauve glow. `destructive`: `destructive-text` outline and text, red glow. `link`: text only, no glow. Corners `radius-xl`; disabled 30% opacity; keyboard focus a 2px solid `focus-ring` with a 2px `background` offset.

**Motion** — `lynx-halo`: a radial glow (hue at 32% → 14% → 6%) grows from 60% to 125% of the button over `duration-halo` on `ease-spring` while it fades in. The button clips it, so the glow fills the outline and never spills past it. Reduced motion keeps the fade only.

- Do keep one `default` per surface.
- Don't add a background fill or an outer glow shadow; colour lives inside the outline, on hover.
