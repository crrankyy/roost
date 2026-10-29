# Palettes

Lynx ships fourteen colour palettes in two groups. Catppuccin is the default and the source of `tokens.css`; the other thirteen live in `components/palettes.css` and recolour the whole system without touching a component.

## How it works

- **Two switches on `<html>`**: `data-theme` picks light or dark, `data-palette` picks the palette. `<html data-theme="dark" data-palette="nord">` is Nord's Polar Night. No `data-palette` (or `catppuccin`) means the Catppuccin values in `tokens.css`.
- **Slots, not new tokens.** Every palette fills Catppuccin's 26 slot names (`rosewater` … `lavender` for accents, `text` … `crust` for neutrals). Every role token (`background`, `agent`, `blue-400`, `destructive` …) already aliases a slot, so roles keep their meaning in every palette: `mauve` is always the agent colour, `blue` is always the person, `flamingo` is always Lynx's avatar.
- **Derived values follow.** Tints, edges, shadows and glows that `tokens.css` writes as fixed colours (`agent-soft`, `agent-border`, `shadow-*`, `glow-*`) are redefined in each palette block with `color-mix` from the slots.
- **Load order**: `tokens.css`, then `components/palettes.css`, then `components/bundle.css`. Palette selectors carry two attributes, so they win over `tokens.css` regardless.
- **Previews and pickers**: put `data-palette` and `data-theme` on any element (a swatch, a thumbnail) to render it in that palette, independent of the page.

## Mapping rules

- **Ground and surfaces** keep Lynx's depth model: in light, the ground and cards are `base` and the sidebar is `mantle`. In dark, the ground is `mantle`, cards are `base` (one step lighter) and the sidebar is `crust` (one step darker).
- **Palettes with fewer hues** reuse their nearest colour for a slot. Rosé Pine has no green, so `green` and `teal` are foam; Dracula has no blue, so `blue` is cyan. Agents can still share a hue in those palettes. Pick hues that differ in lightness, as AgentOrb says.
- **Contrast is checked, not assumed.** Text roles hold 4.5:1 on the ground, cards and sidebar (`text`, `muted-foreground`, `agent`, `destructive-text`); the online/success green, warning peach and the person's blue hold 3:1. Where an original palette colour falls short, it is deepened toward black (light) or lifted toward white (dark) in small steps until it passes. Examples: Nord's purple becomes `#7a6176` in Snow Storm, Rosé Pine Dawn's gold becomes `#b27728`. Catppuccin is left exactly as `tokens.css` defines it.
- **Light variants**: Tokyo Night Day, Rosé Pine Dawn, Kanagawa Lotus and Dracula's Alucard are each palette's own light theme. Nord's light version uses Snow Storm as the ground and Polar Night as text. Kanagawa Lotus's sidebar is softened from the original lotusWhite4 so it doesn't read as a yellow block.

## The palettes

Values are light · dark. Pickers show them in these two groups.

### Expressive

Rich, saturated themes from the editor world.

| Palette | `data-palette` | Light / dark | Ground | Text | Agent (`mauve`) | Lynx (`flamingo`) | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Catppuccin | `catppuccin` | Latte / Mocha | `#eff1f5` · `#181825` | `#4c4f69` · `#cdd6f4` | `#8839ef` · `#cba6f7` | `#dd7878` · `#f2cdcd` | catppuccin.com |
| Tokyo Night | `tokyo-night` | Day / Night | `#e1e2e7` · `#16161e` | `#3358b0` · `#c0caf5` | `#7344b5` · `#bb9af7` | `#d20065` · `#f7768e` | folke/tokyonight.nvim |
| Rosé Pine | `rose-pine` | Dawn / Main | `#faf4ed` · `#191724` | `#575279` · `#e0def4` | `#736287` · `#c4a7e7` | `#d7827e` · `#ebbcba` | rosepinetheme.com |
| Nord | `nord` | Snow Storm / Polar Night | `#eceff4` · `#2e3440` | `#2e3440` · `#eceff4` | `#7a6176` · `#c3a5bd` | `#d08770` · `#d08770` | nordtheme.com |
| Dracula | `dracula` | Alucard / Dracula | `#fffbeb` · `#21222c` | `#1f1f1f` · `#f8f8f2` | `#644ac9` · `#bd93f9` | `#a3144d` · `#ff79c6` | draculatheme.com (light: Alucard) |
| Kanagawa | `kanagawa` | Lotus / Wave | `#f2ecbc` · `#1a1a22` | `#545464` · `#dcd7ba` | `#624c83` · `#957fb8` | `#b35b79` · `#d27e99` | rebelot/kanagawa.nvim |

### Minimal

Quiet neutrals with restrained accents.

| Palette | `data-palette` | Light / dark | Ground | Text | Agent (`mauve`) | Lynx (`flamingo`) | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Graphite | `graphite` | Light / Dark | `#f7f7f9` · `#18181b` | `#1d1d22` · `#ececf0` | `#4f46e5` · `#a5a1ff` | `#b4655c` · `#e3aaa0` | Lynx original |
| Ash | `ash` | Light / Dark | `#f8f7f4` · `#1a1817` | `#262421` · `#ebe8e3` | `#5c5a8a` · `#b4b1db` | `#a86a5c` · `#d9b0a3` | Lynx original |
| Solarized | `solarized` | Light / Dark | `#fdf6e3` · `#002b36` | `#073642` · `#eee8d5` | `#5b5fa5` · `#8f93d2` | `#d33682` · `#d33682` | ethanschoonover.com/solarized |
| Gruvbox | `gruvbox` | Light / Dark | `#fbf1c7` · `#1d2021` | `#3c3836` · `#ebdbb2` | `#8f3f71` · `#d3869b` | `#af3a03` · `#fe8019` | morhetz/gruvbox (faded accents in light) |
| Everforest | `everforest` | Light / Dark | `#fdf6e3` · `#232a2e` | `#5c6a72` · `#d3c6aa` | `#a14c86` · `#d699b6` | `#f85552` · `#e67e80` | sainnhe/everforest (medium) |
| GitHub | `github` | Light / Dark | `#ffffff` · `#0d1117` | `#1f2328` · `#e6edf3` | `#8250df` · `#a371f7` | `#bf3989` · `#db61a2` | Primer (github.com/primer/primitives) |
| Ayu | `ayu` | Light / Dark | `#fcfcfc` · `#0b0e14` | `#5c6166` · `#bfbdb6` | `#8262a3` · `#d2a6ff` | `#f07171` · `#f07178` | ayu-theme/ayu-colors |
| Flexoki | `flexoki` | Light / Dark | `#fffcf0` · `#100f0f` | `#100f0f` · `#cecdc3` | `#5e409d` · `#8b7ec8` | `#a02f6f` · `#ce5d97` | stephango.com/flexoki (400 dark, 600 light) |

Graphite and Ash are Lynx's own minimal palettes: Graphite has cool neutral greys and one indigo agent colour; Ash has warm stone neutrals with every hue kept quiet. Solarized, Gruvbox, Everforest, GitHub, Ayu and Flexoki follow their published palettes. Solarized and Everforest's mid-tone accents are the ones most often deepened or lifted for contrast (for example Solarized's violet becomes `#5b5fa5` in light, `#8f93d2` in dark).

## Using it in an app

- Offer the palette next to the light/dark choice (Settings > Theme), grouped as Expressive and Minimal, with a small rendered preview per palette (`data-palette` + `data-theme` on the thumbnail) and a row of its accent dots.
- Remember the choice per device and set both attributes before first paint, so the page never flashes Catppuccin.
- Never hard-code a palette colour in a component. Use the role tokens; reach for a slot name only for a new role, exactly as with Catppuccin.
