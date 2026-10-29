# Screens

The Roost screens as designed in the "Report Hub" Claude Design canvas (https://claude.ai/artifact/SifsmYD4FcftAHbGfC51ZN), snapshotted 29 Oct 2026. They are the visual reference for the hub pages and the report chrome.

These are Claude Design `.dc.html` source files, not plain pages: they use `<x-import component-from-global-scope="Lynx.X">` for design-system components, `<dc-import name="Other">` to embed another artboard, `{{value}}` bindings and `<sc-for>` / `<sc-if>` filled by the `renderVals()` script at the bottom of each file. They need the Claude Design runtime to render, so read them as markup: the structure, class names (`hub-*`, `lr-*`, `rh-*`) and sample data are what to copy. Their `ds/lynx/…` links point at the files in `../design-system/`.

| File | Screen |
| --- | --- |
| `Main.dc.html` | Home page (triage strip, pinned, recent, active streams, projects). Desktop light |
| `HomePhone`, `HomePhoneDark`, `HomeDesktopDark` | Home at 380px and dark variants (wrap `Main`) |
| `Project.dc.html` | Project page, `grouping` = stream or kind |
| `ProjectPhone.dc.html` | Project page at 380px |
| `FilterDesktop.dc.html` | Inline filter row with the Kind menu open |
| `FilterSheet.dc.html`, `FilterSheetCustom.dc.html` | Phone filter bottom sheet; custom date range |
| `Triage.dc.html` | Triage inbox and review (desktop) |
| `TriagePhone`, `TriagePhoneReclassify`, `TriagePhoneQuarantine`, `TriageDesktopQuarantine` | Triage variants |
| `Report.dc.html` | Report with injected chrome; props `pill` (collapsed / expanded) and `banner` (none / old / archived) |
| `ReportPhone`, `ReportPhoneExpanded`, `ReportPhoneOld`, `ReportPhoneArchived`, `ReportDesktopArchived` | Report chrome variants |
| `hub.css` | The canvas copy of the hub layer. The design-system copy (`../design-system/components/hub.css`) is newer and wins where they differ |
| `canvas.json` | Artboard positions on the canvas |
