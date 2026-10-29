# ExpandableList

A numbered list of rules, decisions or findings where each heading opens to its evidence. Built on native `<details>`, so it needs no script and prints fully expanded.

**Use** `.lr-panel.lr-items` holding `details.lr-item` elements: a `summary` with a `.lr-num` and the point as a sentence, then `.lr-item-body` with the explanation and a `.lr-src` line for the evidence. Open the first item (`open`) so the pattern is obvious.

**Look** — rows split by 50% hairlines; summary 14/20 medium with a chevron that turns 180° on `ease-spring`; body indented to the text, 14/20 `muted-foreground`.

- Do write every summary so the list reads as a whole when collapsed.
- Don't nest lists inside a body.
