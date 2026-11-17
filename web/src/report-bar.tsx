// Roost's bar on a served report: the second build entry (_app/report-bar.js and .css), loaded by the Worker into a
// report-builder report's own page (src/chrome.ts, injectHost). The page already carries its palette, report.css and
// charts.css; this adds only Roost's layer, and renders the HubBar (breadcrumbs, kind, version menu, settings) into
// #roost-bar and any Banner into #roost-note, where the report's own top bar was. It replaces roost-web's
// ReportPage.tsx, which showed the report in a frame; served directly, anchors and full-screen charts just work.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import '../ui/src/roost.css';
import {
  Banner, Button, type Crumb, HubBar, KindBadge, type Kind, type Mode, type Palette, ReportMenu, RootContext, Settings, ThemeSettings, Toast, kindLabel,
} from '@roost/ui';
import { reportHref } from './router';
import { post, rememberMode } from './api';

interface Data {
  ref: string; version: number; project: { id: string; name: string }; prefs: { theme: Mode; palette: Palette };
  report: { id: string; slug: string; title: string; kind: Kind; stream: string | null; state: string; pinned: boolean; archived: boolean; versions: { n: number; at: string; note: string }[] };
}
const data: Data = JSON.parse(document.getElementById('roost-data')!.textContent!);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }; // as data.ts

function useNarrow() {
  const q = '(max-width: 759px)';
  const [narrow, setNarrow] = React.useState(() => matchMedia(q).matches);
  React.useEffect(() => { const mq = matchMedia(q); const on = () => setNarrow(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return narrow;
}

function Bar({ bar, note }: { bar: HTMLElement; note: HTMLElement }) {
  const x = data.report;
  const latest = x.versions[x.versions.length - 1];
  const v = x.versions.find((vv) => vv.n === data.version) ?? latest;
  const narrow = useNarrow();
  const [menu, setMenu] = React.useState(false);
  const [settings, setSettings] = React.useState(false);
  const [pinned, setPinned] = React.useState(x.pinned);
  const [archived, setArchived] = React.useState(x.archived);
  const [prefs, setPrefs] = React.useState(data.prefs);
  const [toast, setToast] = React.useState<{ msg: string; undo?: () => void } | null>(null);
  const say = (msg: string, undo?: () => void) => { setToast({ msg, undo }); window.setTimeout(() => setToast(null), 6000); };
  const project = `/p/${data.project.id}/`;
  const link = reportHref(x.id, v.n === latest.n ? undefined : v.n);

  const setMode = (theme: Mode) => {
    if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    rememberMode(theme);
    const next = { ...prefs, theme }; setPrefs(next); post('/api/prefs', next).catch(() => {});
  };
  const setPalette = (palette: Palette) => { const next = { ...prefs, palette }; setPrefs(next); post('/api/prefs', next).catch(() => {}); };
  const archive = (on: boolean) => {
    setArchived(on);
    post('/api/archive', { ref: data.ref, archived: on }).then(
      () => say(on ? 'Archived. Hidden from lists; the link still works.' : 'Unarchived. Back in lists.', on ? () => archive(false) : undefined),
      (e: Error) => { setArchived(!on); say(`Not saved: ${e.message}`); });
  };
  const pin = (on: boolean) => {
    setPinned(on);
    post('/api/pin', { ref: data.ref, pinned: on }).then(() => say(on ? 'Pinned to home.' : 'Unpinned.'), (e: Error) => { setPinned(!on); say(`Not saved: ${e.message}`); });
  };

  let banner: Parameters<typeof Banner>[0] | null = null;
  if (x.state === 'triage') banner = { tone: 'warning', label: 'Waiting', text: `Claude filed this as ${kindLabel(x.kind)} in ${data.project.name}${x.stream ? ' › ' + x.stream : ''}. It is in no list until you confirm.`, actionLabel: 'Review in triage', onAction: () => { location.href = `/triage/${encodeURIComponent(x.id)}`; } };
  else if (archived) banner = { label: 'Archived', text: 'Hidden from lists; this link keeps working.', actionLabel: 'Unarchive', onAction: () => archive(false) };
  else if (v.n !== latest.n) banner = { label: `v${v.n} of ${latest.n}`, text: `From ${day(v.at)}. The latest is v${latest.n}, ${day(latest.at)}${latest.note ? `: ${latest.note}` : ''}.`, actionLabel: 'Open the latest', onAction: () => { location.href = reportHref(x.id); } };

  const crumbs: Crumb[] = [
    { label: data.project.name, onClick: () => { location.href = project; } },
    ...(x.stream ? [{ label: x.stream, onClick: () => { location.href = `${project}stream/${x.stream}/`; } }] : []),
    { label: x.title },
  ];
  return (
    <RootContext.Provider value={{ palette: prefs.palette, mode: prefs.theme }}>
      {createPortal(<div className="hub-page">
        <HubBar onHome={() => { location.href = '/'; }} crumbs={crumbs}>
          <div className="hub-desk" style={{ alignItems: 'center', gap: 8 }}><KindBadge kind={x.kind} /></div>
          <Button variant="outline" iconOnly icon="search" aria-label="Search reports" onClick={() => { location.href = '/reports'; }} />
          <ReportMenu compact={narrow} versions={x.versions} current={v.n} formatDate={day} open={menu} onToggle={() => setMenu(!menu)}
            onSelectVersion={(k) => { setMenu(false); location.href = reportHref(x.id, k === latest.n ? undefined : k); }}
            pinned={pinned} onTogglePin={() => { setMenu(false); pin(!pinned); }}
            archived={archived} onToggleArchive={() => { setMenu(false); archive(!archived); }}
            onCopyLink={() => { setMenu(false); navigator.clipboard?.writeText(location.origin + link).catch(() => {}); say(`Copied ${link}`); }} />
          <Button variant="outline" iconOnly icon="settings" aria-label="Settings" onClick={() => setSettings(true)} />
        </HubBar>
      </div>, bar)}
      {banner && createPortal(<div className="hub-page"><Banner {...banner} /></div>, note)}
      {createPortal(<div className="hub">
        <Settings open={settings} onClose={() => setSettings(false)} description="Appearance: light or dark, and the hub's colour palette. A report keeps its own palette.">
          <ThemeSettings mode={prefs.theme} onMode={setMode} palette={prefs.palette} onPalette={setPalette} />
        </Settings>
        <Toast open={!!toast} message={toast?.msg ?? ''} actionLabel={toast?.undo ? 'Undo' : undefined} onAction={() => { toast?.undo?.(); setToast(null); }} onClose={() => setToast(null)} />
      </div>, document.body)}
    </RootContext.Provider>
  );
}

const bar = document.getElementById('roost-bar')!;
const note = document.getElementById('roost-note')!;
const host = document.createElement('div');
document.body.appendChild(host);
createRoot(host).render(<Bar bar={bar} note={note} />);
