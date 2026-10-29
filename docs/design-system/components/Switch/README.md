# Switch

A pill toggle for a setting that takes effect immediately, such as web browsing or long-term memory.

**Use** in settings rows with the Label and hint on the left and the Switch on the right. Use Checkbox when the change waits for a Save button.

**Consumer provides** `id`, `checked`/`defaultChecked`, `onCheckedChange`, and a Label (or `aria-label`).

**Lynx treatment** — the 44×24 pill track is kept. Off: `input` track that warms to `muted-foreground/30` on hover. On: `agent` track with `shadow-glow-agent`. Thumb is `background` with `shadow-lg`. Keyboard focus is a 2px solid `focus-ring` with a 2px `background` offset; disabled 30%.

**Motion** — state changes ride Lynx's overshoot curve: `ease-spring` over `duration-color` — the thumb overshoots as it slides. Reduced motion keeps the fade and drops the travel.

- Do say in the hint what the agent will do differently when it is on.
- Don't restyle the track per instance.
