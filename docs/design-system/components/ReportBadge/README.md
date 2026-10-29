# ReportBadge

A small pill with a coloured dot for a verdict, status or severity inside a report: "Borrow ideas", "Skip", "Blocker".

**Use** `<span class="lr-badge" data-tone="…">` in table cells, subject cards and findings. Tones: none (neutral, for "skip" or "n/a"), `accent`, `green`, `blue`, `peach`, `red`, `yellow`. `lr-badge-plain` drops the dot for plain tags; wrap tags in `.lr-tags` so they wrap.

**Look** — `radius-full`, caption type, 2px × 10px padding; a 6px dot in the tone; 10% tint and 38% edge of the tone; words in `foreground` (neutral stays `muted-foreground`).

- Do keep each verdict word mapped to one tone across a report (say, accent = borrow, green = adopt).
- Don't make badges clickable.
