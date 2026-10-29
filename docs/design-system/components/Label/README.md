# Label

The accessible name for a form control, rendered as text-sm medium text above or beside it.

**Use** for every Input, Select, Checkbox, RadioGroupItem and Switch. Inside Field layouts prefer `FieldLabel`, which is this Label with layout extras.

**Consumer provides** the text (sentence case, no trailing colon) and `htmlFor` pointing at the control's `id`.

**Lynx treatment** — text-sm, medium weight, inherits `foreground` so an invalid Field can tint it; when its peer control is disabled it fades to 50% and shows a not-allowed cursor.

- Do place the Label after the control for checkboxes and radios so `peer-disabled` styling works.
- Don't use placeholder text in place of a Label.
