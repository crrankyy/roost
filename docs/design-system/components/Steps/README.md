# Steps

An ordered path: a build order, a rollout, a runbook procedure. Numbered markers joined by a rail.

**Use** `ol.lr-steps` of `li.lr-step`, each a `.lr-num` then a block with an `h3` (the step, verb first) and a `p`. Add `data-done` to tick a finished step (the number becomes a check on an `agent` fill). Usually inside `.lr-panel.lr-card`.

**Look** — 24px markers, a 1px `agent-border` rail between them, `space-5` between steps; body 14/20 `muted-foreground`.

- Do keep steps in the order they must happen; for options use Findings.
- Don't hide a step's command in prose; put it in a CodeBlock under the step.
