# Sparkline

A word-sized trend under a Stat value: the shape of the last few periods, with the current one marked.

**Use** an inline `svg.lr-spark` with `viewBox="0 0 120 28"`, one `polyline` (x from 4 to 116, y from 4 to 24, top = high) and one `circle data-series="1"` on the last point. Place it after `.lr-stat-label`, before `.lr-stat-src`. Mark it `aria-hidden="true"`: the Stat's value and delta already say what it shows.

**Look** — the line is 1.5px in the muted series grey, the current point a slot-1 dot with a card-coloured ring; 120 × 28px.

- Do use 8–12 points.
- Don't add axes or labels; a sparkline that needs them is a Chart.
