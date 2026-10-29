# Loader

A small loader for indeterminate waits: four large dots with four small dots inset between them, both sets turning and drifting against each other.

**Use** inline next to a status ("Fetching sources") or inside a busy Button.

**Consumer provides** nothing required (shadcn's `Spinner` is the same component under its old name); size it with `className` (`size-4` default, 16px; `size-6`, `size-10`…) or style — every part scales with the box. It renders a `span` with the `loader` class, `role="status"` and `aria-label="Loading"`; override the label when context needs it.

**Look** — large dots (24% of the box) on the four sides in `agent` (mauve: 4.8:1 on the Latte ground, 8.6:1 on Mocha); small dots (19% of an 8%-inset box) in `blue-500` (Catppuccin blue: 4.3:1 Latte, 8.3:1 Mocha), replacing the original's 45° hue shift. Inside a `button` the large dots take the label colour and the small ones the label colour at 55%, so it matches any Button variant.

**Motion** — both sets turn half a turn per second; the large set eases, the small set runs linearly, so they drift against each other. Under reduced motion both slow to 2.4s.

- Do pair it with text when the wait is longer than a second.
- Don't show more than one spinner per region.
