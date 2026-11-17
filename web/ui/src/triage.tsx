import * as React from 'react';
import { Badge, Button, cx, KindBadge, Tile } from './core';
import { Icon } from './icons';
import type { Kind } from './types';

/* ---------- the triage panel on home and project pages ---------- */
export interface TriagePanelItem {
  id: string; title: string; where: string; kind: Kind; when: string;
  /** Likely secrets: shows the finding badge and Review instead of Confirm. */
  findings?: string;
  onOpen?: () => void; onConfirm?: () => void; onReview?: () => void; onReclassify?: () => void;
}
/** Reports waiting for a person, in one accent-edged panel: a head, then one column per report (stacked on phones).
 * On desktop it stays in view under the HubBar while it is on the page (sticky dock). */
export function TriagePanel({ title, caption, items, onReviewAll, reviewAllLabel = 'Review all' }: { title: string; caption?: string; items: TriagePanelItem[]; onReviewAll?: () => void; reviewAllLabel?: string }) {
  // The docks below it (pinned reports) stick under it, so the page learns its height: --hub-triage-h on .hub-page.
  const dock = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = dock.current; const page = el?.closest<HTMLElement>('.hub-page');
    if (!el || !page) return;
    const set = () => page.style.setProperty('--hub-triage-h', `${el.offsetHeight}px`);
    set();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
    ro?.observe(el);
    return () => { ro?.disconnect(); page.style.removeProperty('--hub-triage-h'); };
  }, []);
  return (
    <div className="hub-triage-dock" ref={dock}>
    <section className="hub-panel hub-triage" aria-label={title}>
      <div className="hub-triage-head">
        <Tile icon="inbox" />
        <div><h2 className="hub-label">{title}</h2>{caption && <p className="hub-caption">{caption}</p>}</div>
        {onReviewAll && <button type="button" className="hub-link" onClick={onReviewAll}>{reviewAllLabel}</button>}
      </div>
      <div className="hub-triage-items" style={{ ['--cols' as string]: String(Math.min(3, Math.max(1, items.length))) }}>
        {items.map((t, i) => (
          <div key={t.id} className={cx('hub-titem', i === 0 && 'first')}>
            <button type="button" className="hub-titem-title" onClick={t.onOpen}>{t.title}</button>
            <div className="hub-proposal"><span>{t.where}</span><span>as</span><KindBadge kind={t.kind} /></div>
            <div className="hub-titem-foot">
              {t.findings
                ? <><Badge tone="critical">{t.findings}</Badge><Button variant="outline" size="sm" onClick={t.onReview}>Review</Button></>
                : <><span className="hub-micro">{t.when}</span><span className="hub-actions">{t.onReclassify && <Button variant="ghost" size="sm" onClick={t.onReclassify}>Reclassify</Button>}<Button variant="outline" size="sm" icon="check" onClick={t.onConfirm}>Confirm</Button></span></>}
            </div>
          </div>
        ))}
      </div>
    </section>
    </div>
  );
}

/* ---------- triage page ---------- */
export interface InboxItemProps { title: string; when: string; where: string; kind: Kind; findings?: string; selected?: boolean; first?: boolean; onSelect?: () => void }
/** One waiting report in the triage inbox; the selected one is tinted. */
export function InboxItem(p: InboxItemProps) {
  return (
    <button type="button" className={cx('hub-row', p.first && 'first')} data-selected={!!p.selected} aria-pressed={!!p.selected} onClick={p.onSelect}>
      <span className="hub-row-top"><span className="hub-row-title">{p.title}</span><span className="hub-time">{p.when}</span></span>
      <span className="hub-proposal"><span>{p.where}</span><span>as</span><KindBadge kind={p.kind} /></span>
      {p.findings && <span><Badge tone="critical">{p.findings}</Badge></span>}
    </button>
  );
}

/** Phones: back home, "Triage · 1 of 3", previous and next. */
export function TriagePager({ position, total, onHome, onPrev, onNext }: { position: number; total: number; onHome?: () => void; onPrev?: () => void; onNext?: () => void }) {
  return (
    <nav className="hub-pager hub-narrow" aria-label="Triage">
      {onHome && <button type="button" className="hub-back" onClick={onHome}><Icon name="arrow-left" />Home</button>}
      <span className="hub-caption" style={onHome ? undefined : { textAlign: 'left' }}>Report {position} of {total}</span>
      <Button variant="outline" iconOnly icon="chevron-left" aria-label="Previous report" onClick={onPrev} disabled={position <= 1} />
      <Button variant="outline" iconOnly icon="chevron-right" aria-label="Next report" onClick={onNext} disabled={position >= total} />
    </nav>
  );
}

/** The detail's head: status badge and how it arrived, the title, the headline, and Open report. */
export function DetailHead({ status, tone, line, title, lead, openLabel = 'Open report', onOpen }: { status: string; tone: 'warning' | 'critical' | 'good'; line: string; title: string; lead?: string; openLabel?: string; onOpen?: () => void }) {
  return (
    <div className="hub-detail-head">
      <div className="hub-statusline"><Badge tone={tone}>{status}</Badge><span>{line}</span></div>
      <h2 className="hub-detail-title">{title}</h2>
      {lead && <p className="hub-lead">{lead}</p>}
      {onOpen && <Button variant="outline" size="sm" iconAfter="arrow-right" onClick={onOpen}>{openLabel}</Button>}
    </div>
  );
}

/** Claude's proposed filing: project › stream as type, and why. */
export function ProposedBox({ label = 'Claude’s proposed classification', project, stream, kind, why }: { label?: string; project: string; stream?: string | null; kind: Kind; why?: string }) {
  return (
    <section className="hub-inset" aria-label={label}>
      <span className="hub-eyebrow">{label}</span>
      <div className="hub-proposed-line">
        <span className="seg"><Icon name="folder" />{project}</span>
        <span className="sep">›</span>
        <span className="seg"><Icon name="branch" />{stream || 'no stream'}</span>
        <span className="sep">as</span>
        <KindBadge kind={kind} />
      </div>
      {why && <p className="hub-caption" style={{ fontSize: 13, lineHeight: '20px' }}>{why}</p>}
    </section>
  );
}

export interface SecretFinding { file: string; line: number; kind: string; masked: string }
/** The secret scan's findings, numbered, with masked values. */
export function SecretList({ items, label = 'Secret scan findings' }: { items: SecretFinding[]; label?: string }) {
  return (
    <section className="hub-secrets" aria-label={label}>
      <span className="hub-eyebrow">{label}</span>
      {items.map((s, i) => (
        <div key={i} className={cx('hub-secret', i === 0 && 'first')}>
          <span className="hub-n">{i + 1}</span>
          <div>
            <span className="hub-label">{s.file}, line {s.line}</span>
            <span className="hub-caption">{s.kind}</span>
            <code aria-label={`Value masked, ends in ${s.masked.slice(-4)}`}>{s.masked}</code>
          </div>
        </div>
      ))}
    </section>
  );
}

/** A bordered message: critical (held back) or good (filed). */
export function Alert({ tone = 'critical', title, children }: { tone?: 'critical' | 'good'; title: string; children?: React.ReactNode }) {
  return (
    <div className={cx('hub-alert', tone === 'good' && 'good')} role={tone === 'critical' ? 'alert' : 'status'}>
      <Icon name={tone === 'good' ? 'check-circle' : 'shield-alert'} />
      <span className="hub-alert-title">{title}</span>
      {children && <span className="hub-alert-text">{children}</span>}
    </div>
  );
}
