# AlertDialog

A modal confirmation that interrupts the user before an irreversible or costly action, like stopping or deleting an agent.

**Use** it only when the action cannot be undone or throws away work. It cannot be dismissed by clicking the overlay; the user must pick Cancel or the action.

**Consumer provides** `AlertDialog` (`open` / `onOpenChange`), an `AlertDialogTrigger`, and `AlertDialogContent` with `AlertDialogHeader` (`AlertDialogTitle` as a question, `AlertDialogDescription` naming the consequence) and `AlertDialogFooter` with `AlertDialogCancel` (outline) and `AlertDialogAction` (default; pass `className={buttonVariants({ variant: 'destructive' })}` for deletes and stops).

**Lynx treatment** — `radius-2xl` shell on `background` at 90% with `backdrop-blur-xl`, a 50%-`border` hairline and `shadow-2xl`; the overlay is `text` at 30% (Latte) or `crust` at 70% (Mocha) with a light blur; titles drop to `text-base`; Cancel and Action use Lynx's Button variants, so Cancel is the `lynx-halo-violet` outline and gets initial focus with the solid `focus-ring`.

- Do write the title as a question and the action as the verb ("Stop agent", not "OK").
- Don't use it for routine confirmations; prefer an undo toast.
