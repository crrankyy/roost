import * as React from 'react';
import { cx } from './core';
import { Icon, type IconName } from './icons';
import { ToggleGroup } from './forms';
import { PALETTE_LABEL, type Mode, type Palette } from './types';

/* Settings, after Lynx's: a large dialog with a title, a line on what is in it, a row of tabs (when there is more
   than one), and a body that scrolls on its own. The Theme tab holds light/dark and the colour palette. */

export interface SettingsTab { value: string; label: string; icon?: IconName }
export interface SettingsProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  /** Tabs across the top; a single tab shows no tab row. */
  tabs?: SettingsTab[];
  tab?: string;
  onTab?: (v: string) => void;
  children?: React.ReactNode;
}
export function Settings({ open, onClose, title = 'Settings', description, tabs, tab, onTab, children }: SettingsProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open || !onClose) return;
    const doc = ref.current?.ownerDocument ?? document;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="roost-overlay center roost-settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="roost-settings" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="roost-settings-head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          {onClose && <button type="button" className="hub-btn sm icon ghost" aria-label="Close settings" onClick={onClose}><Icon name="x" /></button>}
        </div>
        {tabs && tabs.length > 1 && (
          <div className="hub-tabs" role="tablist" aria-label={title}>
            {tabs.map((t) => (
              <button key={t.value} type="button" role="tab" aria-selected={t.value === tab} onClick={() => onTab?.(t.value)}>
                {t.icon && <Icon name={t.icon} />}{t.label}
              </button>
            ))}
          </div>
        )}
        <div className="roost-settings-body" role={tabs && tabs.length > 1 ? 'tabpanel' : undefined}>{children}</div>
      </div>
    </div>
  );
}

/* ---------- Theme ---------- */
export interface PaletteInfo { id: Palette; group: 'expressive' | 'minimal'; light: string; dark: string; note: string }
/** The report-builder's six palettes, grouped as Lynx groups them, with each one's light and dark names. */
export const PALETTE_INFO: PaletteInfo[] = [
  { id: 'catppuccin', group: 'expressive', light: 'Latte', dark: 'Mocha', note: 'Soft pastels; Roost’s own.' },
  { id: 'rosepine', group: 'expressive', light: 'Dawn', dark: 'Main', note: 'Muted rose, gold and pine.' },
  { id: 'nord', group: 'expressive', light: 'Snow Storm', dark: 'Polar Night', note: 'Arctic frost blues, calm and cool.' },
  { id: 'dracula', group: 'expressive', light: 'Alucard', dark: 'Dracula', note: 'High-contrast vampire neon.' },
  { id: 'everforest', group: 'minimal', light: 'Light', dark: 'Dark', note: 'Warm greens, easy on the eyes.' },
  { id: 'github', group: 'minimal', light: 'Light', dark: 'Dark', note: 'Primer’s familiar neutrals.' },
];
const GROUPS: [PaletteInfo['group'], string, string][] = [
  ['expressive', 'Expressive', 'Rich, saturated themes from the editor world.'],
  ['minimal', 'Minimal', 'Quiet neutrals with restrained accents.'],
];

/** What "system" means right now on this device. */
export function useLook(mode: Mode, doc?: Document): 'light' | 'dark' {
  const win = (doc ?? (typeof document !== 'undefined' ? document : undefined))?.defaultView;
  const q = '(prefers-color-scheme: dark)';
  const [dark, setDark] = React.useState(() => !!win?.matchMedia?.(q).matches);
  React.useEffect(() => {
    const mq = win?.matchMedia?.(q); if (!mq) return;
    const on = () => setDark(mq.matches); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [win]);
  return mode === 'system' ? (dark ? 'dark' : 'light') : mode;
}

/** A tiny Roost home drawn in a palette's own colours: the bar, the triage panel's accent edge, rows, the kind dots. */
export function PaletteSwatch({ palette, look }: { palette: Palette; look: 'light' | 'dark' }) {
  return (
    <span className="roost-scope hub-swatch" data-palette={palette} data-theme={look} aria-hidden="true">
      <span className="sw-bar"><span className="sw-mark" /><span className="sw-line" /></span>
      <span className="sw-body">
        <span className="sw-main"><span className="sw-triage" /><span className="sw-row" /><span className="sw-row short" /></span>
        <span className="sw-side"><span className="sw-row" /><span className="sw-row short" /></span>
      </span>
      <span className="sw-dots">{[1, 2, 3, 4, 5, 6].map((k) => <span key={k} style={{ background: `var(--chart-${k})` }} />)}</span>
    </span>
  );
}

/** One palette as a radio card: name, its variant for the current look and a line about it, and the swatch. */
export function PaletteOption({ info, look, checked, onSelect }: { info: PaletteInfo; look: 'light' | 'dark'; checked: boolean; onSelect: () => void }) {
  return (
    <label className={cx('hub-palette-opt', checked && 'on')}>
      <input type="radio" className="hub-radio" name="roost-palette" checked={checked} onChange={onSelect} />
      <span className="hub-palette-text">
        <span className="hub-label">{PALETTE_LABEL[info.id]}</span>
        <span className="hub-caption">{look === 'dark' ? info.dark : info.light} · {info.note}</span>
        <PaletteSwatch palette={info.id} look={look} />
      </span>
    </label>
  );
}

/** Settings › Theme: light, dark or match the device, then the palette, in Lynx's Expressive and Minimal groups. */
export function ThemeSettings({ mode, onMode, palette, onPalette }: { mode: Mode; onMode: (m: Mode) => void; palette: Palette; onPalette: (p: Palette) => void }) {
  const look = useLook(mode);
  const pal = PALETTE_INFO.find((p) => p.id === palette) ?? PALETTE_INFO[0];
  return (
    <div className="hub-settings-stack">
      <div className="hub-field">
        <span className="hub-label">Theme</span>
        <ToggleGroup label="Theme" value={mode} onChange={(v) => onMode(v as Mode)}
          options={[{ value: 'light', label: 'Light', icon: 'sun' }, { value: 'dark', label: 'Dark', icon: 'moon' }, { value: 'system', label: 'Match system', icon: 'monitor' }]} />
        <span className="hub-caption">{mode === 'system' ? `Follows your device. Right now: ${look}.` : `${PALETTE_LABEL[pal.id]} ${look === 'dark' ? pal.dark : pal.light}. Applies to every screen on this device, reports included.`}</span>
      </div>
      <div className="hub-field">
        <div><span className="hub-label">Colour palette</span>
          <p className="hub-caption">Recolours Roost’s surfaces and accents. Each palette has its own light and dark version. A report keeps the palette it was built with.</p></div>
        {GROUPS.map(([g, title, sub]) => (
          <div key={g} className="hub-field" role="radiogroup" aria-label={title}>
            <span className="hub-eyebrow">{title} · {sub}</span>
            <div className="hub-palette-grid">
              {PALETTE_INFO.filter((p) => p.group === g).map((p) => <PaletteOption key={p.id} info={p} look={look} checked={palette === p.id} onSelect={() => onPalette(p.id)} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
