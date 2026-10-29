# KindBadge

The pill that names a report's kind, in that kind's hue. It leads the eyebrow of every ReportHeader and every row in Report Hub's indexes.

**Use** `<span class="lr-badge" data-kind="<kind>">Kind</span>` with one of the 13 kinds; the word is always written out, sentence case.

| kind | hue | kind | hue |
| --- | --- | --- | --- |
| investigation | sapphire | experiment | pink |
| incident | red | research | lavender |
| review | mauve | explainer | green |
| audit | peach | runbook | maroon |
| architecture | blue | summary | flamingo |
| plan | teal | benchmark | yellow |
| analysis | sky | | |

**Look** — the hue fills the dot and tints the pill (10% fill, 38% edge); the word stays `foreground`, so every kind reads at full contrast in every palette.

- Do keep the word: several palettes reuse a hue across slots, so colour alone never identifies a kind.
- Don't invent kinds; the list is fixed in Report Hub's config.
