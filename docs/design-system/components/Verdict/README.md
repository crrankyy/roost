# Verdict

The outcome of a review, stated once, right after the ReportHeader: approve, request changes, or reject.

**Use** `.lr-verdict` with `data-verdict="approve" | "changes" | "reject"`, a `.lr-verdict-mark` holding a check, alert or x icon, then `.lr-verdict-word` and a `p` saying what it rests on (refer to findings by number).

**Look** — `radius-2xl`, 8% tint and 40% edge of the verdict's hue (green, peach, red); a 36px filled circle mark; the word at 18/28 semibold.

- Do say exactly what blocks merging.
- Don't use it outside reviews; for a recommendation use a decision Callout.
