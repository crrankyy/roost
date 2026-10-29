# Progress

An outlined pill whose fill grows from the left to show how far a task has got — or, with no value, sweeps from empty to full while the length is unknown.

**Use** for agent runs with known steps or sizes (syncing a calendar, reading N sources) with a `value`; for work of unknown length leave `value` out to get the sweep. For a compact wait inline or in a button use Loader; for an agent composing a reply use ThinkingCycle (AgentThinking).

**Consumer provides** `value` (0–100, or omit/`null` for indeterminate) and an accessible name (`aria-label`, or a visible label linked by `aria-labelledby`). Size with `className` (default full width, 22px tall).

**Look** — the supplied pill loader: a 2px `agent` (mauve) outline, `radius-full`, with an `agent` fill inset 2px from it and the same rounded ends. Outline and fill are 4.8:1 (Latte) and 8.6:1 (Mocha) against the ground. No track fill, no glow.

**Motion** — with a value, the fill eases to it over 500ms (`ease-standard`). Without one, it sweeps from empty to full in 2s and starts again. Under reduced motion the sweep slows to 4s.

- Do show the percentage or step count as text next to the bar.
- Don't animate a fake value; leave `value` out instead.
