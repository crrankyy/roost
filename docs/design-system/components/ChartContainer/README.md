# ChartContainer

The wrapper for recharts charts that maps a `config` of series to colours and labels and styles axes, grid and tooltip.

**Use** around any recharts chart (bar, line, area) to get themed series colours (`var(--color-<key>)`) and Lynx tooltips and legends.

**Consumer provides** `config` (`{ key: { label, color } }` or `theme: { light, dark }`) and one recharts chart as the child. Use `ChartTooltip content={<ChartTooltipContent />}` and `ChartLegend content={<ChartLegendContent />}`. Size the container with `className`; it defaults to 16:9.

**Lynx treatment** — the tooltip is Lynx's citation preview surface: `radius-lg`, `border-border/50`, `bg-popover/95`, `backdrop-blur`, `shadow-popover`, 12px text. Axis ticks are `muted-foreground`, grid lines `border/50`, the hover cursor `muted/60`, and legend labels `muted-foreground`. Use `agent` for a single series.

- Do keep values and labels in text tokens; series colour belongs on the mark only.
- Don't plot two series in violet and blue; they are too close for colour-blind readers.

Note: the preview uses static bars because recharts primitives (BarChart, Bar) are not exported from the bundle.
