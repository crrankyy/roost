# Sidebar

The app-shell sidebar (shadcn) for workspace navigation: agents list, sections and a footer, collapsible to icons or off-canvas. Not Lynx's GlowSidebar, which is a decorative nav card.

**Use** it as the left rail of the workspace. `variant="sidebar"` docks to the edge, `floating` sits as a frosted card, `inset` frames the main content as a raised panel. Below 768px it becomes a left Sheet.

**Consumer provides** `SidebarProvider` (`defaultOpen` / `open` / `onOpenChange`) wrapping `Sidebar` and `SidebarInset` (main content). Inside `Sidebar`: `SidebarHeader`, `SidebarContent` > `SidebarGroup` (`SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent` > `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton` (`isActive`, `hue`: `violet` · `blue` · `orange` · `green` · `red` · `pink`, default `violet`) + `SidebarMenuBadge` / `SidebarMenuAction` / `SidebarMenuSub`), `SidebarFooter`, optional `SidebarRail`; `SidebarTrigger` toggles it.

| prop (`Sidebar`) | values | default |
| --- | --- | --- |
| `variant` | `sidebar` · `floating` · `inset` | `sidebar` |
| `collapsible` | `offcanvas` · `icon` · `none` | `offcanvas` |
| `side` | `left` · `right` | `left` |

**Lynx treatment** — frosted panel (`sidebar` at 80%, `backdrop-blur-xl`, 50%-`border` edge); `floating` is a `radius-2xl` `background`/75 card with `shadow-lg`, `inset` raises the content in a `radius-2xl` hairline panel. Menu entries look like GlowSidebar's: 48px tall, `radius-xl`, 16px padding, `nav-label` text in `muted-foreground` with a 20px `foreground` icon, no fill at rest, 8px apart (`size="sm"` is 36px with 16px icons). The active entry fills `agent-soft`, goes `foreground` medium with an `agent` icon, and its badge turns `agent`. Solid `focus-ring` everywhere; the rail glows `agent-border` on hover.

**Motion** — GlowSidebar's, on hover or keyboard focus of an entry (`lynx-flip`): the content flips on Y — the front face turns away (pivot right) as a back face turns in (pivot left) over `duration-bloom`; the label brightens to `foreground`, the icon takes the entry's `hue`, and a blurred radial glow in that hue (ellipse 100% 150%, 18% → 7%) grows from 0.8 to 1.5 behind the entry on `ease-spring`. Only the hovered entry reacts. Reduced motion drops the flip and keeps the colour and glow.

**Labels for icon-only parts** — `SidebarMenuButton` takes a `tooltip` prop, but `SidebarGroupAction` (the + beside a group label), `SidebarMenuAction` (a row's hover action, e.g. delete) and `SidebarMenuBadge` don't. Give each an `aria-label` and wrap it in `Tooltip` > `TooltipTrigger asChild`, never a `title` attribute. A badge ignores the pointer by default (`pointer-events-none`), so a badge that needs a tooltip also needs `className="pointer-events-auto"` and `tabIndex={0}` so keyboard users can reach it.

**Rows that belong to an agent** — an agent's own row, or a chat owned by an agent, takes that agent's hue: spread `agentScope(hue)` on its `SidebarMenuItem` (`<SidebarMenuItem {...agentScope(agent.hue)}>`). The selected fill (`agent-soft`), the active icon and badge (`agent`) and the focus ring then follow the agent instead of mauve, so Lynx's selected row is flamingo and the Research agent's is teal. Rows that belong to no agent (New chat, Settings) keep mauve.

- Do mark exactly one `SidebarMenuButton` as `isActive`, and give entries distinct hues the way GlowSidebar does.
- Don't put more than one level of `SidebarMenuSub` under an item.
