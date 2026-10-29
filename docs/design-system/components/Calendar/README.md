# Calendar

A month grid for picking a date or date range, such as when an agent should run or which meetings to summarize.

**Use** inline inside a Card or Popover, `mode="single"` for one date and `mode="range"` for a span. For a compact field, open it from a Button in a Popover.

**Consumer provides** `mode`, `selected`, `onSelect`, and optionally `defaultMonth`, `today`, `disabled` matchers, `captionLayout` ("label" or "dropdown") and `buttonVariant` for the month arrows. All other react-day-picker props pass through.

**Lynx treatment** — transparent root so it inherits its host shell; 36px day cells (h-9) with radius-xl hit areas. Days hover `agent-soft`; today is an `agent-soft` tile with `agent` text; the selected day and range ends fill `agent` with `agent-foreground` text and `shadow-glow-agent`; range middles are an `agent-soft` strip. Outside days are muted; focus is a 2px `focus-ring`.

- Do set `today` explicitly when showing a fixed demo month.
- Don't place the Calendar directly on the page background without a Card or Popover shell.
