# ReportExample

A complete report built only from the report layer: the shape every Claude Code report should follow. It is a shortened version of the Lynx memory research report.

**Use** it as the template. A report is one page: `body.lr-report` > `.lr-shell` > `aside.lr-nav` (ReportToc) + `main.lr-main`. The first `section.lr-section` opens with the ReportHeader, then Stats and Findings; later sections each start with `.lr-section-head` and hold SubjectCards, ReportTables, ExpandableLists, BudgetStacks, Steps, Timelines, Callouts and Figures; the last section is the SourceList, followed by `footer.lr-footer`.

**Loads** — `tokens.css`, then `reports.css`, then (optional) `reports.js` at the end of the body. In Report Hub these come from `/_ds/lynx-reports/v1/`. No React, no bundle.

**Order of a report**

1. ReportHeader: kind badge, title, the answer in the lead.
2. Two to four Stats, then the main Findings.
3. The evidence, one section per question.
4. What to do next: Steps or a decision Callout.
5. SourceList and footer.

- Do lead with the answer; a reader who stops after the header should have it.
- Don't add sections the question didn't ask for.
