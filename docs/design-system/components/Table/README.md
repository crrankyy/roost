# Table

A semantic data table for comparing runs, agents or sources across a few columns.

**Use** for a compact, read-mostly grid of records (recent runs, tool-call counts, durations). For a list with actions per row, use `Item`.

**Consumer provides** `TableHeader` / `TableBody` / `TableFooter` with `TableRow`s of `TableHead` / `TableCell`, and an optional `TableCaption`. Mark a selected row with `data-state="selected"`.

**Lynx treatment** — the scroll wrapper is a shell (`radius-2xl`, `border-border/50`, `bg-card/75`, `backdrop-blur-xl`, `shadow-lg`). Row dividers are `border/50`; hover is `muted/50` and the selected row is `agent-soft`. Headers are 12px medium `muted-foreground` at h-10; cells are px-4 py-3. The caption sits inside the shell in 12px `muted-foreground`.

- Do right-align numbers and set them in `font-mono` for scanning.
- Don't put a table inside a Card; the table is already a shell.
