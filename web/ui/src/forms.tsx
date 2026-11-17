import * as React from 'react';
import { cx, KindBadge } from './core';
import { Icon, type IconName } from './icons';
import { KINDS, type Kind } from './types';

export interface Option { value: string; label: string }

/** A native select in the hub's 36px frame. */
export function Select({ label, value, options, onChange, width }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; width?: number | string }) {
  return (
    <label className="hub-select" style={{ width }}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" />
    </label>
  );
}

/** A labelled field: label above, control, optional hint. */
export function Field({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="hub-field">
      <span className="hub-field-label">{label}</span>
      {children}
      {hint && <span className="hub-caption">{hint}</span>}
    </div>
  );
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="hub-switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
      {label}
    </label>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return <label className="hub-choice"><input type="checkbox" className="hub-check" checked={checked} onChange={(e) => onChange(e.target.checked)} />{children}</label>;
}

export interface RadioOption { value: string; label: string; hint?: string }
export function RadioGroup({ name, label, value, options, onChange }: { name: string; label: string; value: string; options: RadioOption[]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="hub-choice">
          <input type="radio" className="hub-radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>{o.hint && <span className="hub-caption">{o.hint}</span>}
        </label>
      ))}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <label className="hub-field" style={{ gap: 6 }}>
      <span className="hub-caption">{label}</span>
      <input className="hub-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hub-caption">{hint}</span>}
    </label>
  );
}

/** Two or three exclusive views: By stream / By kind. */
export function ToggleGroup({ label, value, options, onChange }: { label: string; value: string; options: (Option & { icon?: IconName })[]; onChange: (v: string) => void }) {
  return (
    <div className="hub-toggle" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.icon && <Icon name={o.icon} />}{o.label}</button>)}
    </div>
  );
}

/** "Kind" filter: a button that opens a checklist of the eight types; the count shows how many are on. */
export function KindMenu({ value, onChange, kinds = KINDS as unknown as Kind[], defaultOpen = false }: { value: Kind[]; onChange: (v: Kind[]) => void; kinds?: Kind[]; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  return (
    <div className="hub-menu" ref={ref}>
      <button type="button" className={cx('hub-btn', 'outline')} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        {value.length ? <>Kind <span className="hub-num">{value.length}</span></> : 'All kinds'}<Icon name="chevron-down" />
      </button>
      {open && (
        <div className="hub-menu-pop" role="menu">
          <span className="hub-eyebrow">Kind</span>
          {kinds.map((k) => {
            const on = value.includes(k);
            return (
              <button key={k} type="button" role="menuitemcheckbox" aria-checked={on} className="hub-menu-item" onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}>
                <span className="ck">{on && <Icon name="check" />}</span><KindBadge kind={k} />
              </button>
            );
          })}
          {value.length > 0 && <><span className="hub-menu-sep" /><button type="button" className="hub-menu-item" onClick={() => onChange([])}>Clear kinds</button></>}
        </div>
      )}
    </div>
  );
}

/** The eight types as a two-column checklist (filter sheet). */
export function KindChecklist({ value, onChange, kinds = KINDS as unknown as Kind[] }: { value: Kind[]; onChange: (v: Kind[]) => void; kinds?: Kind[] }) {
  return (
    <div className="hub-kinds">
      {kinds.map((k) => <Checkbox key={k} checked={value.includes(k)} onChange={(on) => onChange(on ? [...value, k] : value.filter((x) => x !== k))}><KindBadge kind={k} /></Checkbox>)}
    </div>
  );
}
