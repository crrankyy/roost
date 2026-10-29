# Tooltip

A small label that names an icon-only control on hover or keyboard focus.

**Use** it on every icon button (attach, voice, regenerate) and for truncated text. Keep it to a few words; add the keyboard shortcut if there is one.

**Consumer provides** a `TooltipProvider` once near the app root (`delayDuration`), then per control `Tooltip` > `TooltipTrigger asChild` (the button) + `TooltipContent` (`side`, `sideOffset` default 4). The trigger still needs its own `aria-label`.

**Lynx treatment** — modelled on Lynx's citation preview: `radius-lg`, `popover` at 95% with `backdrop-blur`, 50%-`border` hairline, `shadow-popover`, `text-xs` with `px-2.5 py-1.5`.

**Layering** — `TooltipContent` renders in a portal on `<body>`, like Popover, Dialog and the menus, so it is never clipped by a sidebar, a scroll area or anything with its own stacking context. No z-index work is needed around it.

- Do repeat the button's `aria-label` text in the tooltip.
- Do use it for every hover label, including the Sidebar's `SidebarGroupAction`, `SidebarMenuAction` and badges. Never use the HTML `title` attribute: the browser draws its own unstyled label after a delay.
- Don't put links or long sentences in a tooltip; use HoverCard or Popover.
