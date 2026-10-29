# SubjectCard

One thing under evaluation (a library, a vendor, an approach, a file) with its verdict, the evidence, and what to take from it.

**Use** in research, audits and comparisons, one card per subject. `article.lr-panel.lr-subject` holds `.lr-subject-top` (an `h3`, a `.lr-subject-meta` line, and a ReportBadge verdict on the right), then any content (a ReportTable, `.lr-cols` with `.lr-label` headings), and last a `.lr-takeaway`.

**Takeaway** — `.lr-takeaway` is the conclusion for the reader's project: `agent-soft` fill, `agent-border` edge, `radius-xl`, its `.lr-label` in `agent`. One per card, always last.

**Look** — padding `space-4` on phones, `space-6` from 560px; title 18/28 semibold; columns stack under 1000px.

- Do keep the verdict to two or three words.
- Don't put a takeaway anywhere but the end of its card.
