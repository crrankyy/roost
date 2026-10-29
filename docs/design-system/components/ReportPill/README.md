# ReportPill

Report Hub's only chrome inside a report: a small pill in the bottom-right corner that opens to the report's place in the hub, its versions, pin and archive. The Worker injects it with HTMLRewriter; reports keep the corner and the `rh-` prefix free for it.

**Collapsed** — `button.rh-chip` (36px tall): FileText icon, "v2", "of 4" in `.rh-v`, and an up chevron; `aria-expanded="false"`.

**Expanded** — `section.lr-panel.rh-panel` (340px, or the viewport less 24px): `.rh-crumb` (Folder icon, project › stream links, KindBadge) with a ghost icon button to close; "Versions" and `.rh-versions` of `button.rh-version` rows (`.n` number, `.d` date with "· latest" on the newest, `.ck` check on the one being viewed, `.note` the change note; `aria-current` on the current one); then `.rh-actions`: a pressed outline Toggle "Pinned", an outline "Archive" (or "Unarchive"), and "Back to <project>".

**Behaviour** — wrapped in `.rh-pill` (absolute bottom-right, 12px in, 20px from 1000px). On phones it slides away while scrolling down (`data-hidden="true"`) and returns on scroll up or at the end. The report gets `.rh-report` so its shell keeps 96px of bottom space and the footer is never covered. Escape and the close button collapse it.
