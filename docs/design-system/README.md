lynx-reports is the design system for Report Hub, the site that hosts Claude Code's HTML reports and the index pages around them. It is forked from Lynx, a calm workspace for talking to personal AI agents, and keeps Lynx's foundations: Catppuccin colour (Latte in the light theme, Mocha in the dark), soft radii, Inter, and colour held back for the moments that mean something. Reports are built from its report layer: `components/reports.css` (classes prefixed `lr-`) on top of `tokens.css`, with an optional `components/reports.js`. No React is needed to read a report; the React components are for Report Hub's own pages and for interactive reports.

## Content fundamentals

- **Sentence case everywhere**: "Needs triage", "Active streams", "Open latest version". No Title Case buttons, no all-caps labels.
- **Lead with the count or the conclusion**: "Three findings need action", "Start with the latency alert."
- **Status is one word**: "Connected". Times are "10:42 AM".
- **No emoji.** Meaning is carried by lucide icons and the hue system.
- **Every icon-only control is named twice**: an `aria-label` and a Lynx `Tooltip` with the same words ("Pin report", "Archive report", "Open filters"). Never the browser's `title` attribute, which draws an unstyled label.

## Visual foundations

### Colour

- **The palette is Catppuccin.** Every Catppuccin colour is a token by its own name (`rosewater` … `crust`), Latte values in the light theme and Mocha values in the dark. Everything else aliases into it. Use the role tokens below in components and reach for the Catppuccin names only for new roles.
- **Mocha sits one step darker than stock**: the ground is `mantle`, not `base`. Cards, popovers and menus are `base`, one step lighter than the ground, and the app-shell Sidebar is `crust`, one step darker. In Latte the ground is `base`, cards are `base`, and the Sidebar is `mantle`.
- Ground: `background`; text `foreground`; secondary text `muted-foreground`. Hairlines are `border` at 40–60% so edges stay soft over blur.
- **Mauve is the accent.** The `agent` tokens keep Lynx's names. Use `agent` for selection, checked controls, active tabs and links, `agent-soft` behind hovered or selected items, `agent-border` on agent-tinted pills and tiles, `agent-foreground` on an `agent` fill. The `violet-*` names are aliases of `mauve`. In Latte, set words on `agent-soft` in `foreground`; mauve there is 4.3:1, fine for icons only.
- **Blue marks the person**: avatars for people use `blue-400` at 10% fill / 20–25% edge, icon `blue-300`.
- **Each destination owns a hue** that appears only on hover: Home `blue-500` (blue), Notifications `orange-500` (peach), Settings `green-500` (green), Profile `red-500` (red). Never use these as fills or text at rest.
- **Buttons are an outline and a label, never a fill.** Button `default` and the send button are a `foreground` outline with `foreground` text; `outline` and `secondary` use `border`/`input` edges; `destructive` is a `destructive-text` outline. Colour arrives only as the hover glow inside the outline. Icon buttons grouped in a toolbar shell (the message action bar) drop their own outlines — the shell is the outline.
- Online and success: `emerald-400` (Catppuccin green; dot with `glow-online`). Errors: `destructive` fills, `destructive-text` for words and icons.
- Charts: `chart-1` … `chart-5`.
- **Other palettes.** Catppuccin is the default. Thirteen more (expressive: Tokyo Night, Rosé Pine, Nord, Dracula, Kanagawa; minimal: Graphite, Ash, Solarized, Gruvbox, Everforest, GitHub, Ayu, Flexoki) fill the same slot names from `components/palettes.css`, switched with `data-palette` on `<html>` beside `data-theme`. See Palettes.

### Surfaces and depth

- **Frosted shells**: `radius-2xl`, `border` at 40–50%, `background` (or `card`/`popover`) at 75–90%, backdrop blur `blur-lg` (nav) or `blur-xl` (cards, dialogs, menus), `shadow-lg`; `shadow-2xl` for dialogs and toasts.
- **Glows instead of heavier shadows** for identity: `glow-agent` (checked controls, active tab). Glows are coloured box-shadows with no offset.
- **Halos** fill buttons from the inside (`lynx-halo` + `lynx-halo-blue | violet | red | sun | moon`): on hover a radial glow in the button's hue grows from the centre and fills the button, clipped to its outline — a button's glow never spills past its border. It stays lit while the button is pressed or its menu is open. **Blooms** sit behind list items (`lynx-bloom`): a radial `violet-500` glow on hover, highlight and selection.
- Modal overlays: `text` at 30% in Latte, `crust` at 70% in Mocha, with a light blur.
- **Floating surfaces sit above everything.** Tooltip, HoverCard, Popover, Select, menus, Dialog, AlertDialog and Sheet all render in a portal on `<body>`, so frosted shells (whose `backdrop-filter` creates a stacking context) and scroll areas never clip them.

### Shape

- Avatars are always circles (`radius-full`) at every size. LiveAvatar — a slowly spinning ring around a glowing orb, breathing — is the one living mark; keep it to one per view.
- Controls are `radius-xl` (12px): nav items, buttons, inputs. Shells and panels are `radius-2xl` (16px). Small floating labels (tooltip, citation preview) are `radius` (8px). Pills (badges, citations, switch, status dot) are `radius-full`.

### Type

- One family, Inter (`--font-sans`, loaded from Google Fonts); `--font-mono` (system mono) only for keys in `kbd`.
- Interface sizes are small and quiet: `body` 14/24 for running text in controls and panels, `body-tight` 14/20 for controls, `heading-sm` 14/20 medium for headers and labels, `caption` 12/16, `micro` 11/16, `meta` 10px for speaker and time. `nav-label` 16/24 for navigation. `title` 18/28 and `title-lg` 24px semibold for dialogs and cards only.

### Space and layout

- The reading column is 672px wide (`max-w-2xl`), centred; regions are `space-12` apart.
- Shell padding: `space-2` for nav shells, `space-4` for fields and rows (horizontal), `space-6` for cards and dialogs.

### Motion

Motion is how Lynx feels alive; it is always a response to the person (hover, focus, press).

- **Flip**: nav items turn a front face away and a back face in on hover — MenuBar on the X axis, GlowSidebar and the app-shell Sidebar's entries on Y — on a framer-motion spring (stiffness 100, damping 20, ~0.5s).
- **Glow growth**: item glows scale 0.8 → 1.5–2 on a stiffer spring (300 / 25) and fade in over `duration-bloom` with `ease-standard`; button halos scale 0.7 → 1.45 over `duration-halo`; list blooms scale 0.8 → 1.15 with `ease-spring`.
- **Glows are local**: only the item under the pointer (or keyboard highlight) glows. Shells and containers — the menu bar, sidebar, menus — never light up as a whole.
- **Cycling glow**: every focused text field (via `lynx-focus-glow`) cycles blue → violet → pink → green over `duration-glow-cycle`, linear.
- **Spring settle**: toggles, switch thumbs, checks and the ThemeToggle icon swap use `ease-spring` (a small overshoot): `duration-color` for controls, `duration-toggle` for ThemeToggle.
- **Reveal**: secondary actions (row actions on hover) fade in and rise 4px over `duration-reveal`; colour changes take `duration-color` (icons) or `duration-tint` (field actions).
- Under `prefers-reduced-motion` the glows and halos only fade and the focus glow holds still.

### States

- Hover: resting `muted-foreground` text brightens to `foreground`; icons take their hue; halos and blooms appear.
- Selected / on / active: `agent-soft` fill with `foreground` text (or `agent` for small marks), plus `glow-agent` for checked controls and the active tab.
- Focus: a 2px solid `focus-ring` (3:1+ on every surface in both themes), offset 2px on buttons and toggles, flush on text fields, plus the cycling glow on fields.
- Disabled: 30% opacity (the send button's empty state).
- Pressed (toggle buttons such as helpful / unhelpful): the hover glow stays lit, the outline and icon take the hue.

## Iconography

- Lucide (`lucide-react` 0.454), outline, default 2px stroke. 20px (`h-5 w-5`) in navigation, 16px in buttons and fields, 14px in row actions, 12px in captions.
- The bundle exposes the set Lynx uses as `Lynx.Icons` (Home, Bell, Settings, User, Bot, Sparkles, ArrowUp, Mic, FilePlus2, Wrench, CircleDot, Copy, RotateCcw, ThumbsUp, ThumbsDown, and more).
- Report = `FileText`, project = `Folder`, triage = `Inbox`, person = `UserRound`. Icons are never decorative emoji substitutes and never multi-coloured.
- **No logo**: the source has no Lynx mark (its `public/` files are v0 placeholders). Set "Lynx" in Inter until a mark exists.

## Reports

- **Load** `tokens.css`, then `components/reports.css`, and `components/reports.js` last in the body if the report has a table of contents, a theme switch or code to copy. In Report Hub these are served from `/_ds/lynx-reports/v1/`. Never inline colours: every value comes from the tokens.
- **Shape** — follow ReportExample: `body.lr-report` > `.lr-shell` > `aside.lr-nav` (ReportToc) + `main.lr-main`. The first section opens with the ReportHeader, then two to four Stats and the main Findings; each later section starts with `.lr-section-head`; the last is the SourceList, then `footer.lr-footer`. Use `.lr-shell.lr-shell-single` and no ToC for a report under three sections.
- **Every block sits on `lr-panel`**: frosted `card` at 82%, `border` at 50%, `radius-2xl`, `shadow-lg`, `blur-xl`. Insets inside a panel (`lr-inset`, layers, the takeaway) are `radius-xl`.
- **Lead with the answer.** The `lr-lead` states the conclusion with its number; Findings are sentences; a SubjectCard ends with its `lr-takeaway`; a review states its Verdict right after the header.
- **Kind** — the eyebrow's KindBadge (`data-kind`) names the report's kind in its hue, with the word always written out. Verdicts, statuses and severities are ReportBadges (`data-tone`), one meaning per tone within a report.
- **Numbers** — `lr-num` circles mark Findings, ExpandableList items, Steps and layers; number in reading order and refer back by number.
- **Type** — report sizes are the Report group: `report-title` 30/36 (24/30 on phones), `report-section` 18/28, `report-lead` 15/26, `report-stat` 26/32, `report-label` 11/16; running text stays `body` 14/24 and `body-tight` 14/20 in `muted-foreground` inside blocks.
- **Phones first** — grids are one column under 560px; `lr-grid-4` is two columns from 560px and four from 1000px; tables scroll inside `lr-table-wrap`; the ToC wraps above the content under 1000px.
- **Charts** follow the Chart card: pick the form by the question (BarList to compare, line for a trend, ShareBar for parts of a whole, Sparkline beside a Stat), title each with its finding, colour series only with `data-series` 1–6 (`--lr-series-*`, fixed order, never cycled) or `muted`, and never write a raw colour; give every chart a "Show data" table. Diagrams and screenshots are Figures.
- **Theme** — Report Hub sets `data-theme` and `data-palette` on `<html>` (with `data-hub-theme`) before the report paints; `reports.js` then leaves them alone. Opened elsewhere, the report follows the saved choice or the system setting.
- **Reserved** — `rh-` ids and classes and the bottom-right corner belong to Report Hub's injected pill.

## Report Hub pages

- **Load** `tokens.css`, `components/palettes.css`, `components/bundle.css`, `components/reports.css`, then `components/hub.css`. Classes are `hub-` for the hub's pages and `rh-` for the chrome injected into reports (ReportPill, ReportBanner).
- **Plain HTML first.** Hub pages render as server-side HTML: Lynx buttons, toggles and badges are their class recipes (`buttonVariants`, `toggleVariants`, `badgeVariants`, compiled in `bundle.css`), so most of a page needs no React. Load React and the bundle only for the Radix controls that need behaviour: Select, DropdownMenu, Drawer, Calendar, Collapsible, Switch, SonnerToaster.
- **Order** — what needs me (TriageStrip), then Pinned, then Recent with its FilterControls, then IndexLists (active streams, projects). On a project page: its triage items, StreamCards, General, then done streams collapsed; a ToggleGroup regroups by kind.
- **Rows** — every report in a list is a ReportRow: unread dot, title, time, KindBadge, project › stream, summary. Streams and projects are `hub-row-h` rows in IndexLists.
- **Surfaces** — every block is an `lr-panel`; the triage strip alone adds `agent-border` and `glow-agent`. Section heads are `hub-sec-title` 14/20 medium with a `hub-count` hint; page titles `hub-h1` 24/30.
- **Nothing deletes.** Archive and Unarchive, Reject (kept archived) — never a delete action. Secrets are shown masked to their last four characters.
- **Inside a report** — the ReportPill owns the bottom-right corner; ReportBanner sits sticky at the top for an older version or an archived report. Reports get `rh-report` so 96px of bottom space keeps the footer clear.

## Accessibility notes

- Every role pair passes in both themes: `foreground` 7.1:1 (Latte) and 12.1:1 (Mocha) on the ground; `muted-foreground` 5.5:1 and 7.4:1+; `agent` 4.8:1 and 8.1:1+; `destructive-text` 4.8:1 and 7.6:1; text on `agent` and `destructive` fills 4.8:1+.
- Faded metadata (`muted-foreground` at 45–70%) and the Latte hover hues used as icons (peach 2.6:1, green 3.0:1 on `base`) sit below the usual floor. They only appear on hover or for non-essential metadata.

## Not synced

From `kora.zip`, where the system and its primary agent were called Kora. Every component in `components/` is in this system. The restyled shadcn/ui set is Lynx's look applied to the stock `components/ui` files; `form.tsx`, `use-toast` and `use-mobile` are bundled but have no card. Inter comes from Google Fonts, so there are no font files. Previews run on React 18.3.1; the app itself targets React 19. The design system's tokens are full colours switched by `data-theme` on `<html>`; the app's own `globals.css` still holds its original HSL triplets and `.dark` class, so bring the Catppuccin values across before reusing these components there.

Forked into lynx-reports on 2026-10-29. Removed as having no use in Report Hub: AgentChatbox, MessageThread, MessageActionBar, ThinkingPanel, AgentThinking, ThinkingIndicator, ThinkingCycle, AgentOrb, AgentStack, InputOTP, Slider, Textarea and Carousel. CitationPill moved to its own module. LiveAvatar was removed and then restored. InputGroup's textarea part still renders a plain textarea internally.


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

`components/bundle.js` defines `window.Lynx` (54 components; plus 22 report cards built from components/reports.css and 10 Report Hub cards built from components/hub.css); `components/bundle.css` is its stylesheet; `tokens.css` is every token as a CSS variable plus `@font-face` for the fonts. `components/bundle.css` reads its variables from `tokens.css`. The bundle needs `components/lib/react.production.min.js` (`window.React`), `components/lib/react-dom.production.min.js` (`window.ReactDOM`), loaded before it. Build any UI by mounting these components; never hand-build a control or draw an icon the system provides.

- **Standalone page:** inline `tokens.css` and `components/bundle.css` in a `<style>`, then the library files and `components/bundle.js` as classic scripts (a file containing `</style`, `</script` or `<!--` breaks an inline element: write the sequence `<\/style`, `<\/script` or `\x3C!--` in your copy, or load that file by URL).
- **Design canvas:** bring `tokens.css`, `components/bundle.css`, `components/bundle.js` and `components/index.d.ts` (for the editor’s props panel) onto the canvas in full, as the canvas type’s design-system components reference says (a server-side copy first where it offers one); in each artboard that uses this system, right after the `support.js` line, load `tokens.css` first, then the stylesheet, then the script; skip the library files (the artboard supplies React); mount with `<x-import component-from-global-scope="Lynx.<Comp>" …>`.
- **Slides deck, or any surface that cannot run the bundle:** tokens only — the values are on `api/tokens.md`; the deck takes `tokens.json` by file path for its colour pickers.

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json`, `components/index.d.ts` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` is the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: surface, text, fill, border, chart, palette, type, spacing, radius, shadow, blur, easing, duration. (21.0k)

**Components** (`api/components/<Comp>.md`, 54)

- **Report · Layout**: `ReportExample` — A complete report built only from the report layer: the shape every Claude Code report should follow · `ReportHeader` — The top of every report: an eyebrow with the kind badge and scope, the title, a lead that states the answer, and a meta line · `ReportToc` — The report's sidebar: the project mark, the sections, and a foot with the date and a theme switch
- **Report Hub · Pages**: `HubHeader` — The frame of every Report Hub page: header bar, page title, section heads · `ReportRow` — One report in a list · `TriageStrip` — Reports from unattended runs waiting to be confirmed · `PinnedReports` — The pinned row · `StreamCard` — A stream with its latest reports, or one kind's reports · `IndexLists` — Active streams and projects · `FilterControls` — The desktop filter row and the phone filter sheet · `TriageReview` — Confirm, reclassify, or publish and reject a quarantined report
- **Report Hub · Chrome**: `ReportPill` — The pill injected into each report: place, versions, pin, archive · `ReportBanner` — The notice on an older version or an archived report
- **Report · Charts**: `Chart` — The contract for every chart in a report, drawn as inline SVG · `BarList` — A ranked comparison of a few items, drawn with CSS · `ShareBar` — One whole split into its parts · `Sparkline` — A word-sized trend under a Stat value
- **Report · Content**: `KindBadge` — The pill that names a report's kind, in that kind's hue · `ReportBadge` — A small pill with a coloured dot for a verdict, status or severity · `Stat` — A headline number with what it measures and where it came from · `Finding` — A numbered point: a conclusion, a change to make, or an issue found · `SubjectCard` — One thing under evaluation with its verdict, the evidence, and what to take from it · `ReportTable` — A data table inside a horizontal scroller · `ExpandableList` — A numbered list whose headings open to their evidence · `BudgetStack` — An ordered stack of layers, each with a share bar · `Steps` — An ordered path joined by a rail · `Timeline` — Dated events in order · `Callout` — One aside in a tone · `Verdict` — The outcome of a review · `CodeBlock` — Code with a caption, a diff and a copy button · `Figure` — An image, screenshot or diagram with a caption and its source · `SourceList` — Grouped sources and the report footer
- **Lynx · Reports**: `LiveAvatar` — A circle with a slowly spinning, blurred ring around a glowing orb, the whole avatar gently breathing: Lynx's living mark · `CitationPill` — A numbered source marker placed at the end of an assistant's sentence; hover or focus shows the source's type and title
- **Lynx · Navigation**: `MenuBar` — Lynx's horizontal primary navigation: a frosted pill of icon-plus-label links that flip and bloom their own hue on hover · `GlowSidebar` — Lynx's vertical navigation card: the same items as MenuBar, stacked in a 256px frosted panel, flipping on the Y axis · `ThemeToggle` — A single outlined icon button that switches Lynx between Latte and Mocha: it shows a sun in the light theme and a moon in the dark theme
- **Actions**: `Button` — The one push-control for commands: an outline and a label, with a glow in the button's hue that fills it from the inside on hover · `ButtonGroup` — Joins related Buttons, Inputs and Selects into one segmented control with shared edges · `Toggle` — A two-state button for a single on/off option, such as web search or deep thinking for the next run · `ToggleGroup` — A set of Toggles where one (type="single") or several (type="multiple") options are on: a mode switch or formatting bar
- **Forms**: `Input` — The single-line text field for names, URLs, search terms and IDs · `Label` — The accessible name for a form control, rendered as text-sm medium text above or beside it · `Checkbox` — A square tick control for independent yes/no choices, such as which permissions an agent gets · `RadioGroup` — A set of round options where exactly one is selected, such as an agent's approval mode · `Switch` — A pill toggle for a setting that takes effect immediately, such as web browsing or long-term memory · `Select` — A dropdown for picking one value from a list, such as a model or a default agent · `InputGroup` — A single frosted field that holds an input or textarea together with icons, text, kbd hints and small buttons; the agent composer is an InputGroup · `Field` — Layout parts that pair a control with its label, description and error, and stack fields into fieldsets and choice cards · `Calendar` — A month grid for picking a date or date range, such as when an agent should run or which meetings to summarize
- **Overlays**: `Dialog` — A centred modal for a short, focused decision or form that must be finished before going back to the app · `AlertDialog` — A modal confirmation that interrupts the user before an irreversible or costly action, like stopping or deleting an agent · `Sheet` — A panel that slides in from a screen edge over a dimmed page, for detail views and secondary forms that need more room than a dialog · `Drawer` — A bottom sheet (vaul) the user can drag down to dismiss, for quick actions on touch screens and narrow layouts · `Popover` — A floating panel anchored to a trigger for small, non-blocking settings or details · `HoverCard` — A read-only preview that appears when the pointer rests on a link or mention, like an agent's profile behind @research-agent · `Tooltip` — A small label that names an icon-only control on hover or keyboard focus
- **Menus**: `DropdownMenu` — A menu of actions that opens from a button, for an agent's or run's secondary commands · `ContextMenu` — A menu that opens at the pointer on right-click (or long-press) over a region, for power-user shortcuts on runs, messages and files · `AppMenubar` — shadcn's Menubar, exported as AppMenubar (the name MenuBar belongs to Lynx's own flip-icon nav): a desktop-style row of menus (Agent, Run, View, Help) for work… · `Command` — A searchable command list (cmdk) for jumping to agents and running actions by typing; the basis of the command palette and comboboxes
- **Navigation**: `Tabs` — Switches between sibling views of the same object without leaving the page, such as an agent's Activity, Runs and Permissions · `Breadcrumb` — Shows where the current page sits in the workspace hierarchy and links back up it · `Pagination` — Page controls for long, ordered lists such as run history or source results · `NavigationMenu` — A top navigation bar whose items can open rich panels of links, for marketing-style or workspace-level site navigation · `Sidebar` — The app-shell sidebar (shadcn) for workspace navigation: agents list, sections and a footer, collapsible to icons or off-canvas
- **Layout**: `Card` — A frosted panel that groups one agent, run or stat with an optional header, body and footer · `Accordion` — A vertical stack of headed sections where each one expands to reveal its body · `Collapsible` — An unstyled show/hide region driven by a trigger, for one expandable block · `Separator` — A 1px hairline that divides content horizontally or vertically · `AspectRatio` — A box that holds its child at a fixed width-to-height ratio as the width changes · `ScrollArea` — A fixed-size region with a slim custom scrollbar, for long logs and lists inside a panel · `ResizablePanelGroup` — A split layout whose panels the user resizes by dragging (or arrow-keying) the handles between them
- **Data display**: `Badge` — A small pill that labels state or metadata, such as the model an agent used or a run's status · `Avatar` — A square-ish tile that identifies an agent or person by image, initials or icon · `Table` — A semantic data table for comparing runs, agents or sources across a few columns · `ChartContainer` — The wrapper for recharts charts that maps a config of series to colours and labels and styles axes, grid and tooltip · `Item` — A flexible row with media, title, description and actions, for lists of agents, sources or settings · `Kbd` — A keycap that shows a keyboard shortcut inline with text, in menus or in tooltips · `Empty` — A centred placeholder for a view with nothing in it yet, with an icon, a message and next actions
- **Feedback**: `Alert` — A static, in-flow message panel with an icon, a title and a description · `Progress` — A horizontal bar that shows how far a determinate task has got · `Skeleton` — A pulsing placeholder block that holds the shape of content while it loads · `Spinner` — A small rotating loader icon for indeterminate waits · `Toast` — A transient notification that slides in at the bottom-right, fired imperatively with toast() · `SonnerToaster` — Sonner's stacked toast region, fired with sonnerToast(), for several notifications at once
