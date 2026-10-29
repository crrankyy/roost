# ReportToc

The report's sidebar: the project mark, the sections, and a foot with the date and a theme switch. Sticky beside the content from 1000px; above it, wrapping, on phones.

**Use** `aside.lr-nav` as the first child of `.lr-shell`, holding three panels: `.lr-brand` (a LiveAvatar, `.lr-brand-name` = the project, `.lr-brand-sub` = the report's short name), `nav > ul.lr-toc` of `a.lr-toc-link` (a 16px icon and the section name, `href="#section-id"`), and `.lr-nav-foot` (the date and a `button.lr-icon-btn[data-lr-theme-toggle]` with `.lr-moon` and `.lr-sun` icons). Add `lynx-bloom` to links and `lynx-halo` to the button for Lynx's hover glows.

**Behaviour** — with `reports.js`, the link for the section in view gets `data-active` (an `agent-soft` fill, icon in `agent`), and the button switches and remembers the theme, unless Report Hub has set it.

- Do keep section names to two or three words.
- Don't add a ToC to a report with fewer than three sections; use `lr-shell-single`.
