# TriageReview

The triage page's detail panel: one flagged report with Claude's proposed classification, and the way to confirm, reclassify, or, for a quarantined report, publish or reject.

**Layout** — from 1000px the page is `.hub-split`: a 340px inbox list (`button.hub-row.hub-inbox-item`, `data-selected`) beside `article.lr-panel.hub-detail`. On phones only the detail shows, with a back link, "Triage · 1 of 3" and previous/next icon buttons (`.hub-onlynarrow`).

**Detail** — an `lr-header`: a status ReportBadge (`peach` "Needs confirming" or `red` "Quarantined"), how it was published, the title, the lead, and "Open report" (or "Preview report" when quarantined). Then `.lr-inset.hub-proposed`: "Claude’s proposed classification", `.hub-proposed-line` (Folder icon + project › stream icon + stream, "as", KindBadge), and a caption saying why.

**Confirm** — a primary "Confirm" and an outline "Reclassify", with "the link stays the same" under them. Confirmed, a success Callout says where it was filed and names the next report.

**Reclassify** — an `lr-inset` form: Project (Select), Stream (RadioGroup: the proposal marked "proposed", the project's streams, "No stream", "Propose a new stream" with a name Input), Kind (Select of KindBadges); "Save and confirm" and "Cancel".

**Quarantined** — a destructive Alert first ("Not published: 2 likely secrets found"), the findings as `.hub-secret` rows (number, file and line, kind of secret, the value masked to its last four characters in `code`), then "Reject" and a destructive "Publish anyway", with the consequence written under them.

- Do mask every secret; never show more than its last four characters.
- Don't offer delete: rejected reports stay archived and unpublished.
