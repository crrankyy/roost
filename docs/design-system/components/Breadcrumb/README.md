# Breadcrumb

Shows where the current page sits in the workspace hierarchy and links back up it.

**Use** it at the top of deep pages (Agents › Research agent › Run 142). Collapse middle levels with `BreadcrumbEllipsis` when the trail is long.

**Consumer provides** `Breadcrumb` > `BreadcrumbList` of `BreadcrumbItem`s holding `BreadcrumbLink` (`href`, or `asChild` for a router link) or the final `BreadcrumbPage`, with a `BreadcrumbSeparator` between items (custom icon via children).

**Lynx treatment** — the trail is `muted-foreground` and links brighten to `foreground` on hover with a `radius-md` solid `focus-ring`; the current page is `foreground` `font-medium`; the ellipsis sits in a `radius-lg` 32px box.

- Do end with the current page as `BreadcrumbPage`, not a link.
- Don't use it as the main navigation.
