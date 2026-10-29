# IndexLists

The home page's side column: active streams and projects, as horizontal rows.

**Use** `a.hub-row.hub-row-h` rows in `.lr-panel.hub-list`:

- **Active stream** — a `.hub-tile-quiet` stream icon, a name block (`.hub-label` stream id, `.hub-caption` "project · latest 2h ago"), and a plain ReportBadge with the count. A stream is active while it has a report in the last 14 days; sort by latest report.
- **Project** — an Avatar with a Folder icon, a name block (`.hub-label` name, `.hub-caption` "21 reports · 3 active streams"), `.hub-time` last activity and a chevron. Archived projects are left out unless archived items are included.
