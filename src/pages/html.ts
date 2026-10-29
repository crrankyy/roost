// Escaping-by-default HTML templates. Every ${} is escaped unless it is a Raw (from html``, raw() or fill()).

export class Raw {
  constructor(readonly s: string) {}
  toString() { return this.s; }
}

export const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const part = (v: unknown): string =>
  v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : v === null || v === undefined || v === false ? '' : esc(v);

export function html(strings: TemplateStringsArray, ...values: unknown[]): Raw {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new Raw(out);
}

/** Trusted markup only: generated Lynx templates and our own constants. */
export const raw = (s: string) => new Raw(s);

/** Fills @@SLOT@@ markers in a generated template; plain strings are escaped, Raw values are inserted as is. */
export function fill(template: string, slots: Record<string, unknown>): Raw {
  return new Raw(template.replace(/@@([A-Z]+)@@/g, (_, k) => (k in slots ? part(slots[k]) : '')));
}

/** JSON for a <script type="application/json"> or a data- attribute; safe against </script> and quote breaks. */
export const jsonAttr = (v: unknown) => esc(JSON.stringify(v));
export const jsonScript = (v: unknown) => raw(JSON.stringify(v).replace(/</g, '\\u003c'));
