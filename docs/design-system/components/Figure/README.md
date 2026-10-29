# Figure

An image, screenshot or diagram with a caption that states what it shows and a line for where it came from.

**Use** `figure.lr-figure` holding an `img` or inline `svg` (give a diagram `role="img"` and an `aria-label` that states what it shows), then a `figcaption` with the point and a `.lr-src` span for the source. Images live in the report's `assets/` folder.

**Look** — media fills the width up to its own size, `radius-xl`; caption 12/16 `muted-foreground`, source in meta size.

- Do draw diagrams with token colours (`var(--border)`, `var(--agent)`, `var(--foreground)`) so they follow the theme.
- Do use Chart, BarList, ShareBar or Sparkline for data; Figure is for pictures, not numbers.
- Don't use a screenshot of text; set the text.
