# Skeleton

A pulsing placeholder block that holds the shape of content while it loads.

**Use** for first loads of threads, cards and lists, sized to match the content that will replace it.

**Consumer provides** the size and shape via `className` or style (width, height, radius); compose several to sketch a layout.

**Lynx treatment** — `radius-lg` by default and a `muted-foreground/15` fill, which stays visible on white and on dark shells (stock `muted` vanished on white). Match Lynx shapes: `radius-xl` for avatar tiles, `radius-2xl` for message bubbles and cards.

- Do mirror the real layout so nothing jumps when content arrives.
- Don't use skeletons for work of unknown length; use Loader or Spinner.
