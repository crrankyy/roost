import * as React from 'react';
import { Button, cx, Tile } from './core';
import { Icon, Mark, type IconName } from './icons';
import type { Tone } from './types';

/** The panel every block sits on: card fill, hairline edge, 16px corners. */
export function Panel({ as = 'div', className, children, style }: { as?: 'div' | 'section' | 'article' | 'header'; className?: string; children?: React.ReactNode; style?: React.CSSProperties }) {
  const T = as;
  return <T className={cx('hub-panel', className)} style={style}>{children}</T>;
}

/* ---------- the home page's two columns ---------- */
/** Two columns (Recent | Active streams and Projects); their first heads share a line. On desktop they are panes: the
 * page scrolls until their tops reach the docked bar, triage panel and pinned reports, and from there each column
 * scrolls on its own. Scrolling back up past a column's top hands the scroll back to the page. Children: div.hub-col. */
export function Columns({ children, panes = true, className }: { children?: React.ReactNode; panes?: boolean; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el || !panes) return;
    const doc = el.ownerDocument; const win = doc.defaultView; if (!win) return;
    const scroller = el.closest<HTMLElement>('.roost-scroll') ?? (doc.scrollingElement as HTMLElement);
    const isDoc = scroller === doc.scrollingElement;
    const page = el.closest<HTMLElement>('.hub-page');
    const mq = win.matchMedia('(min-width: 760px)');
    const cols = () => Array.from(el.children).filter((c): c is HTMLElement => c.classList.contains('hub-col'));
    const state = () => {
      const on = el.classList.contains('panes');
      const stuck = on && scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1;
      el.toggleAttribute('data-stuck', stuck);
      for (const c of cols()) { c.classList.toggle('scrolls', on && (stuck || c.scrollTop > 0)); c.classList.toggle('scrolled', on && c.scrollTop > 0); c.classList.toggle('more', on && c.scrollTop < c.scrollHeight - c.clientHeight - 1); }
    };
    const layout = () => {
      const h = (sel: string) => page?.querySelector<HTMLElement>(sel)?.offsetHeight ?? 0;
      const ceiling = h('.hub-bar-dock') + h('.hub-triage-dock') + h('.hub-pins-dock') + 20;
      const top = el.getBoundingClientRect().top + (isDoc ? win.scrollY : scroller.scrollTop - scroller.getBoundingClientRect().top);
      const below = scroller.scrollHeight - (top + el.offsetHeight);
      const avail = Math.floor(scroller.clientHeight - below - ceiling);
      const natural = Math.max(0, ...cols().map((c) => c.scrollHeight));
      const want = mq.matches && avail >= 240 && natural > avail;
      el.classList.toggle('panes', want);
      const next = want ? `${avail}px` : '';
      if (el.style.height !== next) el.style.height = next;
      state();
    };
    let raf = 0;
    const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
    layout();
    const ro = new ResizeObserver(soon);
    [scroller, el, ...(page ? [page] : []), ...cols(), ...cols().flatMap((c) => Array.from(c.children))].forEach((n) => ro.observe(n));
    const target: EventTarget = isDoc ? win : scroller;
    target.addEventListener('scroll', state, { passive: true });
    const colList = cols(); colList.forEach((c) => c.addEventListener('scroll', state, { passive: true }));
    mq.addEventListener('change', soon);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); target.removeEventListener('scroll', state); colList.forEach((c) => c.removeEventListener('scroll', state)); mq.removeEventListener('change', soon); el.style.height = ''; el.classList.remove('panes'); };
  }, [panes]);
  return <div ref={ref} className={cx('hub-cols', className)}>{children}</div>;
}

/* ---------- header bar ---------- */
export interface HubBarProps {
  name?: string;
  onHome?: () => void;
  /** Where the page sits, after Roost: [ZenithMD › releases › ZenithMD changelog]. The last is the current page. Home passes none. */
  crumbs?: Crumb[];
  children?: React.ReactNode;
}
/** The hub's header, on every screen including reports: the mark and name (home), the breadcrumbs, then the page's controls
 * (search, and a Settings button that opens Settings, where the palette and light/dark live).
 * It never scrolls away: its dock sticks to the top of the page, and the page fades out under it.
 * On phones the breadcrumbs take a second row inside the bar. */
export function HubBar({ name = 'Roost', onHome, crumbs, children }: HubBarProps) {
  const has = !!crumbs && crumbs.length > 0;
  return (
    <div className="hub-bar-dock">
      <header className={cx('hub-panel hub-bar', has && 'has-crumbs')}>
        <button type="button" className="hub-brand" onClick={onHome} aria-label={has ? `${name} home` : undefined}><span className="hub-mark"><Mark /></span>{name}</button>
        {has && <Breadcrumbs items={crumbs!} lead />}
        <div className="hub-bar-end">{children}</div>
      </header>
    </div>
  );
}

export function SearchField({ value, onChange, placeholder = 'Search reports', shortcut }: { value: string; onChange: (v: string) => void; placeholder?: string; shortcut?: string }) {
  return (
    <label className="hub-search">
      <Icon name="search" />
      <input type="search" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
      {shortcut && !value && <kbd>{shortcut}</kbd>}
    </label>
  );
}

/* ---------- headings ---------- */
export interface Crumb { label: string; onClick?: () => void }
/** Breadcrumbs live in the HubBar only. lead: a chevron before the first item, after the brand. */
export function Breadcrumbs({ items, lead }: { items: Crumb[]; lead?: boolean }) {
  return (
    <nav className="hub-crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <React.Fragment key={i}>
          {(i > 0 || lead) && <Icon name="chevron-right" className={cx('roost-icon', i === 0 && 'lead')} />}
          {c.onClick && i < items.length - 1 ? <button type="button" onClick={c.onClick}>{c.label}</button> : <span aria-current="page" title={c.label}>{c.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** A 24px title with an optional tile and a caption line under it. Breadcrumbs go in the HubBar, not here. */
export function PageTitle({ title, caption, icon }: { title: React.ReactNode; caption?: React.ReactNode; icon?: IconName }) {
  return (
    <div className="hub-head">
      <div className="hub-title">
        {icon && <Tile icon={icon} large />}
        <div><h1 className="hub-h1">{title}</h1>{caption && <span className="hub-caption">{caption}</span>}</div>
      </div>
    </div>
  );
}

/** A section's head: a 14px title, a quiet count beside it, actions at the end. */
export function SectionHead({ title, count, children, id }: { title: React.ReactNode; count?: React.ReactNode; children?: React.ReactNode; id?: string }) {
  return (
    <div className="hub-sec-head">
      <h2 className="hub-sec-title" id={id}>{title}{count != null && <span className="hub-count">{count}</span>}</h2>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="hub-empty"><span className="hub-label">{title}</span>{children && <span className="hub-caption">{children}</span>}</div>;
}

/** A strip under the HubBar on a report, saying why it is not an ordinary published report: waiting, held back, archived, an older version. */
export function Banner({ tone, label, text, actionLabel, onAction }: { tone?: Tone; label: string; text?: React.ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className={cx('roost-banner', tone)}>
      <div className="wrap">
        <span className={cx('status', tone)}>{label}</span>
        <p>{text}</p>
        {actionLabel && <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>}
      </div>
    </div>
  );
}
