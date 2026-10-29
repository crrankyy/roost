# HubHeader

The frame of every Report Hub page: the header bar, the page title block, and the section heads that introduce each list.

**Use** `.hub` on the page root and `.hub-page` inside it (max 1176px, 12px gutters on phones, 32px from 760px). Then:

- **Header** — `header.lr-panel.hub-bar`: `a.hub-brand` with a 28px LiveAvatar in `mauve` and "Report Hub", then the palette control (an outline icon Button on phones, a palette Select from 760px) and the ThemeToggle.
- **Page title** — on a project page, a Breadcrumb, then an Avatar (Folder icon) beside `h1.hub-h1` (24/30 semibold) and a `p.hub-caption` stats line ("21 reports · 3 active streams · last activity 2h ago").
- **Section head** — `.hub-sec > .hub-sec-head > h2.hub-sec-title` (14/20 medium) with a `.hub-count` hint after it, and controls (a Filter button) at the right.

**Layout** — the home page puts Recent in the main column and streams + projects in a 360px side column (`.hub-cols` > `.hub-col`) from 1000px; one column below. `.hub-phone` and `.hub-desk` swap controls at 760px; `.hub-more` hides extra rows on phones behind "Show 5 more".

**Theme** — the hub's palette and light/dark choice are saved in KV and applied to `<html>` (`data-palette`, `data-theme`, plus `data-hub-theme`) before first paint, on hub pages and inside reports.
