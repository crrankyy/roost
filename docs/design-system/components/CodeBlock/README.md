# CodeBlock

Code in a report: a file excerpt, a command, a diff. Scrolls sideways instead of wrapping.

**Use** `figure.lr-code` with an optional `figcaption` (the file path or what the snippet is), then `pre > code`. For a diff, put each changed line in `span.lr-add` or `span.lr-del` (shown with + and −). With `reports.js` loaded, a Copy button appears in the caption; it copies the code as it reads after the change, leaving removed lines out.

**Look** — `radius-xl`, a muted ground, 12.5/20 mono; added lines tinted green, removed lines red.

- Do keep excerpts short and link the full file by commit.
- Don't paste secrets; the publisher warns, but the reader still sees them.
