import * as React from 'react';
import { Icon, type IconName } from './icons';
import { kindLabel, type Kind, type Mode, type Palette } from './types';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

/* ---------- Root: a palette and a mode for everything inside ---------- */
export interface RootContextValue { palette: Palette; mode: Mode }
export const RootContext = React.createContext<RootContextValue>({ palette: 'catppuccin', mode: 'system' });
export const useRoost = () => React.useContext(RootContext);

export interface RootProps {
  /** One of the report-builder palettes. Default catppuccin. */
  palette?: Palette;
  /** system follows the operating system. */
  mode?: Mode;
  /** app: a full-height frame; put one div.roost-scroll inside it. */
  app?: boolean;
  /** hub: the hub screens' look (page fill, 14px type). Leave off around a report. */
  hub?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
/** Sets a palette and light/dark on its subtree; every Roost part reads its colours from here. */
export function Root({ palette = 'catppuccin', mode = 'system', app, hub, className, style, children }: RootProps) {
  const value = React.useMemo(() => ({ palette, mode }), [palette, mode]);
  return (
    <RootContext.Provider value={value}>
      <div className={cx('roost-scope', app && 'roost-app', hub && 'hub', className)} data-palette={palette} data-theme={mode === 'system' ? undefined : mode} style={style}>
        {children}
      </div>
    </RootContext.Provider>
  );
}

/* ---------- Button ---------- */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** default: a strong outline. outline: a hairline. ghost: no frame. destructive: red outline. primary: accent fill (rare). */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'primary';
  size?: 'md' | 'sm';
  icon?: IconName;
  /** Icon after the label ("Open report →"). */
  iconAfter?: IconName;
  /** Square, icon only: give aria-label. */
  iconOnly?: boolean;
  block?: boolean;
  pressed?: boolean;
  children?: React.ReactNode;
}
export function Button({ variant = 'default', size = 'md', icon, iconAfter, iconOnly, block, pressed, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx('hub-btn', variant !== 'default' && variant, size === 'sm' && 'sm', iconOnly && 'icon', block && 'block', className)}
      aria-pressed={pressed === undefined ? undefined : pressed} {...rest}>
      {icon && <Icon name={icon} />}
      {!iconOnly && children}
      {iconAfter && <Icon name={iconAfter} />}
    </button>
  );
}

/* ---------- badges ---------- */
export type BadgeTone = 'accent' | 'good' | 'warning' | 'serious' | 'critical';
/** A pill with a dot. A tone colours dot, tint and edge; the words stay in the text colour. plain: no dot. */
export function Badge({ tone, plain, children }: { tone?: BadgeTone; plain?: boolean; children?: React.ReactNode }) {
  return <span className={cx('hub-badge', plain && 'plain')} data-tone={tone}>{children}</span>;
}
/** A report's type as a badge, in the colour that type keeps everywhere. */
export function KindBadge({ kind }: { kind: Kind }) {
  return <span className="hub-badge" data-kind={kind}>{kindLabel(kind)}</span>;
}

/** A square icon well: accent (sections, projects) or quiet (streams). */
export function Tile({ icon, quiet, large }: { icon: IconName; quiet?: boolean; large?: boolean }) {
  return <span className={cx('hub-tile', quiet && 'quiet', large && 'lg')} aria-hidden="true"><Icon name={icon} /></span>;
}

export { Icon };
