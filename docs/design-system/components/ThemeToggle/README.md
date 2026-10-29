# ThemeToggle

A single outlined icon button that switches Lynx between Latte and Mocha: it shows a sun in the light theme and a moon in the dark theme.

**Use** it once, in a settings area or the top corner of the shell.

**Consumer provides** nothing. It reads and writes the theme on `<html>` (`data-theme` and the `.dark` class; in the Next.js app, next-themes). Its label says what a click will do ("Switch to dark theme" / "Switch to light theme").

**Look** — a 36px `radius-xl` button with a `border` outline and a `foreground` 1.2rem icon, no fill. Keyboard focus is the 2px `focus-ring`.

**Motion** — on click the outgoing icon shrinks to 75%, turns 12° and fades while the incoming one settles to full size, both on `ease-spring` over `duration-toggle` (700ms). Hover fills the button with a glow clipped to its outline: `yellow` behind the sun, `lavender` behind the moon.

- Don't add a "system" third state here; the source disables system theme.
