# Card

A frosted panel that groups one agent, run or stat with an optional header, body and footer.

**Use** for a self-contained unit the user can act on: an agent summary, a run result, a weekly stat. Nest controls inside; never nest cards.

**Consumer provides** `CardHeader` (with `CardTitle`, `CardDescription`), `CardContent`, `CardFooter` as children. All parts accept `className` and div props.

**Lynx treatment** — the shell recipe: `radius-2xl`, `border-border/50`, `bg-card/75` with `backdrop-blur-xl` and `shadow-lg`, like the composer and message bubbles. Padding drops from 24px to 20px; `CardTitle` is 16px semibold instead of 24px so a card reads as part of the thread, not a page header. The footer gets an 8px gap for button rows.

- Do put one `default` Button in a footer, with `outline` or `ghost` beside it.
- Don't stack cards inside cards; use `Item` rows or `Separator` inside one shell.
