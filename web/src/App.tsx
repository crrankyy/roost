import * as React from 'react';
import {
  Button, type Crumb, Dialog, DialogBody, DialogFooter, Field, HubBar, KindChecklist, Root, SearchField, Select, Settings, Sheet, SheetBody, SheetFooter,
  Switch, ThemeSettings, Toast, ToggleGroup, type TriageEntry,
} from '@roost/ui';
import { byIdTitle } from './title';
import { n, projectName } from './data';
import { useRoute, type Route } from './router';
import { Home, Project, PROJECTS, ReportsList, Triage, useListRows, type Nav } from './screens';
import { filterCount, HubContext, NO_FILTERS, useHub, useHubState, type Filters } from './store';

/** True at phone width (under 760px, as the hub's CSS): the sheet comes from the bottom and the HubBar puts its breadcrumbs on a second row. */
export function useNarrow(): boolean {
  const q = '(max-width: 759px)';
  const [narrow, setNarrow] = React.useState(() => window.matchMedia?.(q).matches ?? false);
  React.useEffect(() => {
    const mq = window.matchMedia?.(q); if (!mq) return;
    const on = () => setNarrow(mq.matches); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

function Shell() {
  const { s, patch, decide, byId } = useHub();
  const [route, go] = useRoute();
  const [sheet, setSheet] = React.useState(false);
  const [settings, setSettings] = React.useState(false);
  const [publishing, setPublishing] = React.useState<TriageEntry | null>(null);
  const narrow = useNarrow();
  const navTo = React.useCallback((r: Route) => { setSheet(false); go(r); }, [go]);
  const nav: Nav = { go: navTo, openFilters: () => setSheet(true), askPublish: setPublishing };
  const { rows } = useListRows(route.name === 'reports' ? route.mode : 'all');
  const f = s.filters; const fc = filterCount(f);
  const setF = (p: Partial<Filters>) => patch((st) => ({ filters: { ...st.filters, ...p } }));
  // A URL that is a filter (/kind/<k>/, /p/<p>/stream/<s>/, /p/<p>/kind/<k>/, /reports?q=) sets it on arrival.
  React.useEffect(() => {
    if (route.name === 'reports' && route.preset) { const { query, ...f } = route.preset; patch((st) => ({ filters: { ...NO_FILTERS, ...f }, query: query ?? st.query })); }
    if (route.name === 'project' && route.kind) patch((st) => ({ filters: { ...st.filters, kinds: [route.kind!] } }));
  }, [route, patch]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector<HTMLInputElement>('.hub-search input')?.focus(); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  React.useEffect(() => { document.querySelectorAll('.roost-scroll').forEach((el) => { el.scrollTop = 0; }); }, [route]);

  // The one top bar, on every screen. Breadcrumbs (after the Roost brand) live here only.
  const renderBar = (crumbs: Crumb[], report?: { badge: React.ReactNode; menu: React.ReactNode }) => (
    <HubBar onHome={() => navTo({ name: 'home' })} crumbs={crumbs}>
      <div className="hub-desk" style={{ alignItems: 'center', gap: 8 }}>
        {report?.badge}
        <SearchField value={s.query} shortcut="⌘K" onChange={(v) => { patch({ query: v }); if (v && route.name !== 'reports') navTo({ name: 'reports', mode: 'all' }); }} />
      </div>
      <div className="hub-phone" style={{ alignItems: 'center', gap: 8 }}>
        <Button variant="outline" iconOnly icon="search" aria-label="Search reports" onClick={() => navTo({ name: 'reports', mode: 'all' })} />
      </div>
      {report?.menu}
      <Button variant="outline" iconOnly icon="settings" aria-label="Settings" onClick={() => setSettings(true)} />
    </HubBar>
  );
  const crumbs: Crumb[] = route.name === 'project' ? [{ label: projectName(route.id) }]
    : route.name === 'triage' ? [{ label: 'Triage' }]
    : route.name === 'reports' ? (route.mode === 'archive' ? [{ label: 'Archive' }] : route.mode === 'pinned' ? [{ label: 'Pinned' }] : s.query.trim() ? [{ label: 'Search' }]
      : f.stream ? [{ label: projectName(f.project), onClick: () => navTo({ name: 'project', id: f.project }) }, { label: f.stream }] : [{ label: 'All reports' }])
    : [];

  const overlays = (
    <>
      <Sheet open={sheet} side={narrow ? 'bottom' : 'right'} title="Filter reports" description={`${fc ? n(fc, 'filter') + ' on · ' : ''}${n(rows.length, 'report')} ${rows.length === 1 ? 'matches' : 'match'}`} onClose={() => setSheet(false)}>
        <SheetBody>
          <Field label="Project"><Select label="Project" width="100%" value={f.project} options={PROJECTS} onChange={(v) => setF({ project: v, stream: null })} /></Field>
          <Field label={`Kind · ${f.kinds.length || 'all'} of 8`}><KindChecklist value={f.kinds} onChange={(v) => setF({ kinds: v })} /></Field>
          <Field label="Date range"><ToggleGroup label="Date range" value={f.range} options={[{ value: 'any', label: 'Any' }, { value: '1', label: 'Today' }, { value: '7', label: '7 days' }, { value: '30', label: '30 days' }]}
            onChange={(v) => setF({ range: v as Filters['range'] })} /></Field>
          <Switch label="Include archived" checked={f.archived} onChange={(v) => setF({ archived: v })} />
        </SheetBody>
        <SheetFooter>
          <Button block onClick={() => setSheet(false)}>Show {n(rows.length, 'report')}</Button>
          <Button block variant="ghost" onClick={() => patch({ filters: NO_FILTERS })}>Reset filters</Button>
        </SheetFooter>
      </Sheet>
      <Dialog open={!!publishing} title={`Publish with ${n(publishing?.secrets?.length ?? 0, 'likely secret')}?`} description={publishing ? byIdTitle(publishing.reportId) : ''} onClose={() => setPublishing(null)}>
        <DialogBody><p>The report will be served at its link with both values exactly as found. Rotate the keys first if they are live.</p></DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setPublishing(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { if (publishing) decide(publishing, 'published', true); setPublishing(null); }}>Publish anyway</Button>
        </DialogFooter>
      </Dialog>
      <Settings open={settings} onClose={() => setSettings(false)} description="Appearance: light or dark, and the colour palette.">
        <ThemeSettings mode={s.mode} onMode={(m) => patch({ mode: m })} palette={s.palette} onPalette={(p) => patch({ palette: p })} />
      </Settings>
      <Toast open={!!s.toast} message={s.toast?.msg ?? ''} actionLabel={s.toast?.undo ? 'Undo' : undefined}
        onAction={() => { s.toast?.undo?.(); patch({ toast: null }); }} onClose={() => patch({ toast: null })} />
    </>
  );

  return (
    <Root app hub palette={s.palette} mode={s.mode}>
      <div className="roost-scroll">
        <div className="hub-page">
          {renderBar(crumbs)}
          {route.name === 'home' && <Home nav={nav} />}
          {route.name === 'reports' && <ReportsList mode={route.mode} nav={nav} />}
          {route.name === 'project' && <Project id={route.id} nav={nav} />}
          {route.name === 'triage' && <Triage id={route.id} nav={nav} />}
        </div>
      </div>
      {overlays}
    </Root>
  );
}

export function App() {
  const hub = useHubState();
  return <HubContext.Provider value={hub}><Shell /></HubContext.Provider>;
}
