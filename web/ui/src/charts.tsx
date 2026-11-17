import * as React from 'react';
import { useRoost } from './core';

// Charts are drawn by the report-builder's charts.js (window.ReportCharts), which bundle.js carries.
// These components hand it a spec and redraw on resize, palette and light/dark changes.
type RC = { render: (fig: HTMLElement) => void; renderAll: (root?: ParentNode) => void };
const charts = (): RC | undefined => (window as unknown as { ReportCharts?: RC }).ReportCharts;

/** A chart from a report-builder spec: {"type": "column", "labels": [...], "series": [...], ...}. */
export function Chart({ spec }: { spec: Record<string, unknown> }) {
  const ref = React.useRef<HTMLElement>(null);
  const { palette, mode } = useRoost();
  const json = JSON.stringify(spec);
  const [ready, setReady] = React.useState(() => !!charts());
  React.useEffect(() => {
    if (ready) return;
    const on = () => setReady(true);
    if (charts()) on(); else window.addEventListener('load', on, { once: true });
    return () => window.removeEventListener('load', on);
  }, [ready]);
  React.useEffect(() => {
    const fig = ref.current; const rc = charts();
    if (!fig || !rc) return;
    rc.render(fig);
    let w = fig.clientWidth;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (Math.abs(fig.clientWidth - w) > 1) { w = fig.clientWidth; rc.render(fig); } }) : null;
    ro?.observe(fig);
    return () => ro?.disconnect();
  }, [json, palette, mode, ready]);
  // The spec sits in the figure exactly as in a report, so charts.js finds it whenever it draws.
  return <figure className="chart" ref={ref}><script type="application/json" dangerouslySetInnerHTML={{ __html: json.replace(/</g, '\\u003c') }} /></figure>;
}

/** An inline sparkline: always beside a number that states the value. */
export function Spark({ values, label }: { values: string | number[]; label?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const { palette, mode } = useRoost();
  const v = Array.isArray(values) ? values.join(',') : values;
  React.useEffect(() => {
    const draw = () => { const el = ref.current; if (el) charts()?.renderAll(el); };
    if (charts()) draw(); else { window.addEventListener('load', draw, { once: true }); return () => window.removeEventListener('load', draw); }
  }, [v, palette, mode]);
  return <span ref={ref}><span className="spark" data-values={v} aria-label={label} /></span>;
}
