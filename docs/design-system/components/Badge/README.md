# Badge

A small pill that labels state or metadata, such as the model an agent used or a run's status.

**Use** `default` for the active or agent-related label (model name, "Running"), `secondary` for neutral status, `outline` for quiet attributes ("Read only"), `destructive` for failures.

**Consumer provides** short text (one or two words, sentence case) and optionally a leading lucide icon, sized to 12px automatically.

| prop | values | default |
| --- | --- | --- |
| `variant` | `default` · `secondary` · `outline` · `destructive` | `default` |

**Lynx treatment** — `default` is Lynx's model badge: `agent-border` edge, `agent-soft` fill, `foreground` text in Latte (mauve on the tint is 4.3:1) and `agent` text in Mocha, icon always `agent`. `secondary` uses `secondary` on a `border/60` edge; `outline` is `muted-foreground` on translucent `background`. `destructive` is a soft red pill (`destructive/10` fill, red edge) with `foreground` text, keeping the red to the edge and icon. Weight drops to medium.

- Do pair status colour with a word; never colour alone.
- Don't make badges clickable; use a Button or Toggle.
