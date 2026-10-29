# Field

Layout parts that pair a control with its label, description and error, and stack fields into fieldsets and choice cards.

**Use** to build any settings or creation form: `FieldSet` > `FieldLegend` + `FieldDescription` > `FieldGroup` > `Field`s. Wrap a horizontal `Field` in `FieldLabel` to make a selectable choice card for a RadioGroupItem or Checkbox.

**Consumer provides** the parts: `Field` (with `orientation`, and `data-invalid="true"` when invalid), `FieldLabel`/`FieldTitle`, `FieldContent`, `FieldDescription`, `FieldError` (children or `errors`), `FieldSeparator`, plus the control itself.

| prop | values | default |
| --- | --- | --- |
| `Field orientation` | `vertical` · `horizontal` · `responsive` (row from `md`) | `vertical` |
| `FieldLegend variant` | `legend` · `label` | `legend` |

**Lynx treatment** — descriptions are `muted-foreground`, links in them are `agent`. Invalid fields and `FieldError` use `destructive-text` (Catppuccin red: 4.8:1 Latte, 7.6:1 Mocha). Choice cards are radius-xl frosted tiles (`bg-background/75`, `border`); checked cards fill `agent-soft` with an `agent-border` edge and `shadow-glow-agent`. Separators are `border/60`.

- Do put one FieldError under the control it describes, phrased as the fix.
- Don't nest choice cards inside other cards.
