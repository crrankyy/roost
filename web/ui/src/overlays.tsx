import * as React from 'react';
import { cx } from './core';
import { Icon } from './icons';

function useEscape(open: boolean, onClose?: () => void) {
  React.useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
}

/* ---------- sheet ---------- */
export interface SheetProps { open: boolean; side?: 'right' | 'bottom'; title: string; description?: string; onClose?: () => void; children?: React.ReactNode }
/** A panel from the right (desktop) or the bottom (phone), over a dimmed page. Place it inside a Root app. */
export function Sheet({ open, side = 'right', title, description, onClose, children }: SheetProps) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className={cx('roost-overlay', side)} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="roost-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="roost-sheet-head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          {onClose && side === 'right' && <button type="button" className="hub-btn sm icon ghost" aria-label="Close" onClick={onClose}><Icon name="x" /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}
export const SheetBody = ({ children }: { children?: React.ReactNode }) => <div className="roost-sheet-body">{children}</div>;
export const SheetFooter = ({ children }: { children?: React.ReactNode }) => <div className="roost-sheet-foot">{children}</div>;

/* ---------- dialog ---------- */
export interface DialogProps { open: boolean; title: string; description?: string; onClose?: () => void; children?: React.ReactNode }
export function Dialog({ open, title, description, onClose, children }: DialogProps) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="roost-overlay center" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="roost-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="roost-dialog-head"><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>
        {children}
      </div>
    </div>
  );
}
export const DialogBody = ({ children }: { children?: React.ReactNode }) => <div className="roost-dialog-body">{children}</div>;
export const DialogFooter = ({ children }: { children?: React.ReactNode }) => <div className="roost-dialog-foot">{children}</div>;

/* ---------- toast ---------- */
export function Toast({ open, message, actionLabel, onAction, onClose }: { open: boolean; message: string; actionLabel?: string; onAction?: () => void; onClose?: () => void }) {
  if (!open) return null;
  return (
    <div className="roost-toast" role="status">
      <span>{message}</span>
      {actionLabel && <button type="button" onClick={onAction}>{actionLabel}</button>}
      {onClose && <button type="button" className="x" aria-label="Dismiss" onClick={onClose}><Icon name="x" /></button>}
    </div>
  );
}

/* ---------- report menu ---------- */
export interface MenuVersion { n: number; at: string; note: string }
export interface ReportMenuProps {
  versions: MenuVersion[];
  current: number;
  formatDate?: (iso: string) => string;
  open?: boolean;
  onToggle?: () => void;
  onSelectVersion?: (n: number) => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  archived?: boolean;
  onToggleArchive?: () => void;
  onCopyLink?: () => void;
  /** Phones: the button reads "v2" instead of "v2 of 2". */
  compact?: boolean;
}
/** In the HubBar on a report: the version button. Its menu lists every version, then Pin, Archive and Copy link. */
export function ReportMenu(p: ReportMenuProps) {
  const fmt = p.formatDate ?? ((s: string) => s.slice(0, 10));
  const latest = p.versions[p.versions.length - 1]?.n ?? 1;
  const ref = React.useRef<HTMLDivElement>(null);
  // Listen on the menu's own document: on a served report the bar lives inside the report's page (an iframe in the app).
  React.useEffect(() => {
    const doc = ref.current?.ownerDocument;
    if (!p.open || !p.onToggle || !doc) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) p.onToggle?.(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') p.onToggle?.(); };
    doc.addEventListener('mousedown', onDown); doc.addEventListener('keydown', onKey);
    return () => { doc.removeEventListener('mousedown', onDown); doc.removeEventListener('keydown', onKey); };
  }, [p.open, p.onToggle]);
  return (
    <div className="hub-menu hub-report-menu" ref={ref}>
      <button type="button" className="hub-btn outline" aria-expanded={!!p.open} aria-haspopup="menu" onClick={p.onToggle}
        aria-label={`Version ${p.current} of ${latest}. Versions and actions`}>
        <Icon name="history" />{p.compact ? `v${p.current}` : `v${p.current} of ${latest}`}<Icon name="chevron-down" />
      </button>
      {p.open && (
        <div className="hub-menu-pop end" role="menu">
          <span className="hub-eyebrow">Versions · every publish is kept</span>
          {[...p.versions].reverse().map((v) => (
            <button key={v.n} type="button" role="menuitemradio" aria-checked={v.n === p.current} className="hub-menu-item hub-ver" onClick={() => p.onSelectVersion?.(v.n)}>
              <span className="hub-ver-n">v{v.n}</span>
              <span className="hub-ver-d">{fmt(v.at)}{v.n === latest ? ' · latest' : ''}</span>
              <span className="hub-ver-note">{v.note}</span>
              {v.n === p.current && <span className="ck"><Icon name="check" /></span>}
            </button>
          ))}
          <div className="hub-menu-sep" />
          {p.onTogglePin && <button type="button" role="menuitemcheckbox" aria-checked={!!p.pinned} className="hub-menu-item" onClick={p.onTogglePin}><Icon name="pin" />{p.pinned ? 'Unpin from home' : 'Pin to home'}</button>}
          {p.onToggleArchive && <button type="button" role="menuitem" className="hub-menu-item" onClick={p.onToggleArchive}><Icon name="archive" />{p.archived ? 'Unarchive' : 'Archive'}</button>}
          {p.onCopyLink && <button type="button" role="menuitem" className="hub-menu-item" onClick={p.onCopyLink}><Icon name="link" />Copy link</button>}
        </div>
      )}
    </div>
  );
}
