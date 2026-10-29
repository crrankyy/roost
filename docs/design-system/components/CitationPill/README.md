# CitationPill

A numbered source marker placed at the end of a sentence in a report; hover or focus shows the source's type and title.

**Use** it inline after the sentence it supports, one pill per source, numbered from 1 in the order cited.

**Consumer provides** `citation` (`{ label, type: "Blog post" | "GitHub repo" | "Document", href }`) and `index` (0-based; shown as index + 1). It opens `href` in a new tab and labels itself "Source N: label, type".

**Look** — 20px `radius-full` pill, `citation` type (10px, 600), `violet-400` at 10% fill / 35% edge, `violet-300` number. The preview card is a 176px `popover` panel, `radius-lg`, `violet-400` at 25% edge, `shadow-popover`, with the type in `violet-300`, the title in `micro`, and "Open source" in 9px `muted-foreground`.

**Motion** — the preview fades in on hover or keyboard focus (opacity transition); the pill brightens its fill to 25% and its edge to 70%.

