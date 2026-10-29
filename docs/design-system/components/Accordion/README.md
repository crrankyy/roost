# Accordion

A vertical stack of headed sections where each one expands to reveal its body.

**Use** for FAQ-style help, agent settings groups and permission explanations, where readers scan headings and open one or two.

**Consumer provides** `type` (`single` or `multiple`), `AccordionItem`s with a unique `value`, each holding an `AccordionTrigger` (the heading) and `AccordionContent`.

| prop | values | default |
| --- | --- | --- |
| `type` | `single` · `multiple` | required |
| `collapsible` (single) | allow closing the open item | `false` |
| `defaultValue` / `value` | open item(s) | none |

**Lynx treatment** — items divide with `border-border/50` hairlines; triggers are 14px medium `foreground` (no underline on hover); the chevron rests `muted-foreground`, brightens on hover and turns `agent` when open. Body copy is `muted-foreground` with relaxed leading. Focus is the 2px `focus-ring` with offset. Open/close keeps the stock height animation.

- Do write triggers as questions or short nouns in sentence case.
- Don't put form controls that must be seen in a closed item.
