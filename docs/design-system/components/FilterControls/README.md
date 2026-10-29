# FilterControls

The filters over Recent and over a project page: project, kind, date range, include archived. Inline in one row from 760px; a bottom sheet on phones.

**Desktop row** — `.hub-filters` (role group, `aria-label`): a project Select (168px), a "Kind" outline Button that opens a DropdownMenu of checkbox items, each a KindBadge (with a `.hub-filter-count` pill when some are chosen, and "Clear kinds" last), a date Select (156px: Any time, Last 7 / 30 / 90 days, then Custom range…), a `.hub-choice` label with a Switch for "Include archived", and a ghost "Reset" at the far right once anything is set.

**Phone sheet** — a "Filter" outline sm Button in the section head opens a Drawer: title "Filter recent reports" with a live description ("3 filters on · 3 of 15 reports match"), then `.hub-field` blocks: Project (full-width Select), Kind (a `.hub-kinds` two-column grid of Checkbox + KindBadge, with "3 of 13"), Date range (an outline sm ToggleGroup: 7 days, 30 days, 90 days, Custom; Custom reveals a range Calendar in an `lr-inset` with the span written under it), and a `.hub-setting` row for Include archived. The footer holds the primary "Show 3 reports" and a ghost "Reset filters".

**Behaviour** — filters scope everything below them; the count in the button and sheet updates as you change them. There is no search box.
