import * as React from 'react';
import { Badge, cx, KindBadge, Tile } from './core';
import { Icon } from './icons';
import type { Kind } from './types';

/** A panel holding rows; each row draws its own divider. */
export function RowList({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <div className={cx('hub-panel', 'hub-list', className)}>{children}</div>;
}

/* ---------- a report in a list ---------- */
export interface ReportItemProps {
  title: string;
  /** The report's headline, one line, cut with an ellipsis. */
  summary?: string;
  kind: Kind;
  project: string;
  stream?: string | null;
  /** "2h ago", "v2 · 17h ago" */
  when: string;
  /** Unread: the accent dot before the title. */
  isNew?: boolean;
  pinned?: boolean;
  archived?: boolean;
  /** A state that is not plain published (Waiting, Held back). */
  status?: { tone?: 'warning' | 'critical' | 'accent'; label: string };
  /** compact: no dot column (inside stream cards). */
  compact?: boolean;
  /** The first row in its list: no divider above it. */
  first?: boolean;
  onOpen?: () => void;
}
export function ReportItem(p: ReportItemProps) {
  return (
    <button type="button" className={cx('hub-row', p.compact && 'compact', p.first && 'first')} onClick={p.onOpen}>
      <span className="hub-row-top">
        {!p.compact && <span className="hub-dot" data-on={!!p.isNew} role="img" aria-label={p.isNew ? 'New' : undefined} />}
        <span className="hub-row-title">{p.title}</span>
        <span className="hub-time">{p.pinned && <Icon name="pin" label="Pinned" />}{p.when}</span>
      </span>
      <span className="hub-meta">
        <KindBadge kind={p.kind} />
        {!p.compact && <span className="hub-path">{p.project}{p.stream ? <> › <b>{p.stream}</b></> : null}</span>}
        {p.status && <Badge tone={p.status.tone}>{p.status.label}</Badge>}
        {p.archived && <Badge plain>Archived</Badge>}
      </span>
      {p.summary && <span className="hub-sum">{p.summary}</span>}
    </button>
  );
}

/** A small trend: values left to right, the last one marked. No axes, so always beside a count. */
export function Sparkline({ values, label }: { values: number[]; label?: string }) {
  const max = Math.max(1, ...values); const n = Math.max(2, values.length);
  const pts = values.map((v, i) => [Math.round((i / (n - 1)) * 116 + 2), Math.round(24 - (v / max) * 20)]);
  const last = pts[pts.length - 1] ?? [118, 24];
  return (
    <svg className="hub-spark" viewBox="0 0 120 28" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <polyline points={pts.map((q) => q.join(',')).join(' ')} />
      <circle cx={last[0]} cy={last[1]} r={3} />
    </svg>
  );
}

/* ---------- a stream in a list ---------- */
export interface StreamItemProps { name: string; caption: string; trend?: number[]; count: string; first?: boolean; onOpen?: () => void }
export function StreamItem({ name, caption, trend, count, first, onOpen }: StreamItemProps) {
  return (
    <button type="button" className={cx('hub-row', 'hub-row-h', first && 'first')} onClick={onOpen}>
      <Tile icon="branch" quiet />
      <span className="hub-row-main"><span className="hub-label">{name}</span><span className="hub-caption">{caption}</span></span>
      {trend && <Sparkline values={trend} />}
      <Badge plain>{count}</Badge>
    </button>
  );
}

/* ---------- a project in a list ---------- */
export interface ProjectItemProps { name: string; caption: string; when?: string; first?: boolean; onOpen?: () => void }
export function ProjectItem({ name, caption, when, first, onOpen }: ProjectItemProps) {
  return (
    <button type="button" className={cx('hub-row', 'hub-row-h', first && 'first')} onClick={onOpen}>
      <Tile icon="folder" large />
      <span className="hub-row-main"><span className="hub-label">{name}</span><span className="hub-caption">{caption}</span></span>
      {when && <span className="hub-time">{when}</span>}
      <span className="hub-chev"><Icon name="chevron-right" /></span>
    </button>
  );
}

/* ---------- pinned ---------- */
export interface Pin { id: string; title: string; kind: Kind; where: string; onOpen?: () => void }
/** Pinned reports as small panels in one row that scrolls sideways. On desktop the row stays in view (sticky dock under the
 * HubBar and any TriagePanel); put it in a `section.hub-sec.hub-pins-sec` after its SectionHead, which scrolls away. */
export function PinStrip({ items }: { items: Pin[] }) {
  return (
    <div className="hub-pins-dock">
    <div className="hub-pins">
      {items.map((p) => (
        <button key={p.id} type="button" className="hub-panel hub-pin" onClick={p.onOpen}>
          <Icon name="pin" />
          <span className="hub-pin-text">
            <span className="hub-pin-title">{p.title}</span>
            <span className="hub-meta"><KindBadge kind={p.kind} /><span style={{ whiteSpace: 'nowrap' }}>{p.where}</span></span>
          </span>
        </button>
      ))}
    </div>
    </div>
  );
}

/* ---------- a stream's card on a project page ---------- */
export interface StreamCardProps { name: string; caption: string; allLabel?: string; onAll?: () => void; children?: React.ReactNode; icon?: 'branch' | 'folder' }
/** A stream's latest reports in a panel: head (tile, name, counts, "All N"), then compact ReportItems. */
export function StreamCard({ name, caption, allLabel, onAll, children, icon = 'branch' }: StreamCardProps) {
  return (
    <div className="hub-panel">
      <div className="hub-card-head">
        <Tile icon={icon} quiet />
        <div><span className="hub-card-name">{name}</span><span className="hub-caption">{caption}</span></div>
        {allLabel && <button type="button" className="hub-link" onClick={onAll}>{allLabel}</button>}
      </div>
      <div className="hub-list">{children}</div>
    </div>
  );
}

/** A collapsed panel that opens in place (Done streams). */
export function Disclosure({ title, caption, open, onToggle, children }: { title: string; caption?: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="hub-panel">
      <button type="button" className="hub-disclosure" aria-expanded={open} onClick={onToggle}>
        <Icon name="chevron-right" /><span className="hub-label">{title}</span>{caption && <span className="hub-caption">{caption}</span>}
      </button>
      {open && <div className="hub-list" style={{ paddingTop: 0 }}>{children}</div>}
    </div>
  );
}
