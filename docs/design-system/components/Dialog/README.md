# Dialog

A centred modal for a short, focused decision or form that must be finished before going back to the app.

**Use** it to grant an agent a permission, rename a run, or confirm settings with a few fields. For destructive confirmations use AlertDialog; for long detail panels use Sheet.

**Consumer provides** `Dialog` (`open` / `onOpenChange` or uncontrolled), a `DialogTrigger`, and `DialogContent` holding `DialogHeader` (`DialogTitle`, `DialogDescription`), the body, and `DialogFooter` with the actions (`DialogClose asChild` for the dismiss button). Content renders in a portal with its own overlay and close X.

**Lynx treatment** — `radius-2xl` shell on `background` at 90% with `backdrop-blur-xl`, a 50%-`border` hairline and `shadow-2xl`; the overlay is `text` at 30% (Latte) or `crust` at 70% (Mocha) with a light blur; titles drop to `text-base`; the close X is a quiet `rounded-lg` icon that tints `agent-soft` on hover and takes the 2px `focus-ring`. The footer uses a `gap-2` row.

- Do put one `default` Button in the footer and an `outline` dismiss beside it.
- Don't nest dialogs; open a Sheet or change the dialog's content instead.
