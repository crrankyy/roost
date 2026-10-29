# ReportBanner

A sticky notice at the top of a report when what you are reading is not the live, current version: an older version, or an archived report.

**Use** `div.rh-banner` (sticky at the top, padded to the report's width) holding a Lynx Alert: an icon, an `AlertTitle`, and an `AlertDescription` with the context and one action.

- **Older version** — "Viewing v2 of 4", from when, what the latest adds, and "Open latest version".
- **Archived** — "Archived on 27 Oct", that it's hidden from lists but the link works, and "Unarchive".

Only one banner shows at a time; an archived report viewed at an older version shows the archived banner. The Worker injects banners with the pill.
