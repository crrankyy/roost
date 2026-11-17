// What the reader changed this page load (triage decisions and filings, read marks), filters, the palette and mode,
// and the toast. Everything else is derived from /api/hub in useHub(). Decisions, palette and mode are saved to the
// Worker (POST /api/triage/…, /api/prefs) as they are made; a failed save is undone and says so.
import * as React from 'react';
import type { Kind, Mode, Palette, TriageEntry } from '@roost/ui';
import { post, rememberMode } from './api';
import { ageDays, data, kindLabel, projectName, slugify, triageByReport, type SampleReport } from './data';

/** Saves a triage decision: reclassify when the filing changed, then confirm, publish anyway or reject. */
async function save(t: TriageEntry & { newStream?: boolean }, how: Decision['how'], f: Filing, held: boolean) {
  const [project, id] = t.reportId.split('/');
  const path = `/api/triage/${project}/${id}`;
  const p = t.proposed;
  const changed = f.project !== p.project || f.kind !== p.kind || f.stream !== (p.stream ?? null) || (t.newStream && f.stream === p.stream);
  if (how === 'rejected') return post(path, { action: 'reject' });
  if (changed) {
    const streamNew = f.isNew || (t.newStream && f.stream === p.stream);
    await post(path, { action: 'reclassify', kind: f.kind, ...(f.project !== project ? { project: f.project } : {}),
      ...(streamNew && f.stream ? { new_stream: { id: f.stream, title: f.stream } } : { stream: f.stream }) });
  }
  const at = changed && f.project !== project ? `/api/triage/${f.project}/${id}` : path;
  if (held) return post(at, { action: 'publish' });
  if (!changed) return post(at, { action: 'confirm' });
}

export interface Filters { project: string; stream: string | null; range: 'any' | '1' | '7' | '30'; kinds: Kind[]; archived: boolean }
export const NO_FILTERS: Filters = { project: 'all', stream: null, range: 'any', kinds: [], archived: false };
/** Where a report ends up. */
export interface Filing { project: string; stream: string | null; kind: Kind; isNew?: boolean }
/** The reclassify form: an existing stream id, '__none', or '__new' with a name. */
export interface Form { project: string; choice: string; newName: string; kind: Kind }
export interface Decision { how: 'published' | 'rejected'; filing: Filing }
export interface Toast { msg: string; undo?: () => void }

export interface State {
  palette: Palette; mode: Mode;
  decided: Record<string, Decision>;
  forms: Record<string, Form>;
  formOpen: Record<string, boolean>;
  pins: Record<string, boolean>; archived: Record<string, boolean>; read: Record<string, boolean>;
  filters: Filters; query: string; toast: Toast | null;
  groupBy: 'stream' | 'kind'; doneOpen: boolean;
}


export function useHubState() {
  const [s, setS] = React.useState<State>(() => ({
    palette: data.prefs.palette, mode: data.prefs.theme,
    decided: {}, forms: {}, formOpen: {}, pins: {}, archived: {}, read: {}, filters: NO_FILTERS, query: '', toast: null, groupBy: 'stream', doneOpen: false,
  }));
  const first = React.useRef(true);
  React.useEffect(() => {
    rememberMode(s.mode);
    if (first.current) { first.current = false; return; }
    post('/api/prefs', { theme: s.mode, palette: s.palette }).catch(() => { /* kept for this page load; the next load reads the server */ });
  }, [s.palette, s.mode]);
  const timer = React.useRef<number>();
  const patch = React.useCallback((p: Partial<State> | ((s: State) => Partial<State>)) => setS((st) => ({ ...st, ...(typeof p === 'function' ? p(st) : p) })), []);
  const toast = React.useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(timer.current);
    patch({ toast: { msg, undo } });
    timer.current = window.setTimeout(() => patch({ toast: null }), 6000);
  }, [patch]);
  return { s, patch, toast };
}
export type Hub = ReturnType<typeof useHubState>;
export const HubContext = React.createContext<Hub | null>(null);

/** A report as the hub sees it now: sample data plus this session's pins, archives and triage decisions. */
export interface Live extends SampleReport { triage?: TriageEntry; latest: SampleReport['versions'][number] }

export const formFor = (t: TriageEntry, forms: Record<string, Form>): Form =>
  forms[t.id] ?? { project: t.proposed.project, choice: t.proposed.stream ?? '__none', newName: '', kind: t.proposed.kind };
export const filingOf = (f: Form): Filing => ({
  project: f.project, kind: f.kind, isNew: f.choice === '__new',
  stream: f.choice === '__none' ? null : f.choice === '__new' ? (slugify(f.newName) || null) : f.choice,
});

export function useHub() {
  const hub = React.useContext(HubContext)!;
  const { s, patch, toast } = hub;
  const all: Live[] = React.useMemo(() => data.reports.map((r) => {
    const t = triageByReport[r.id]; const dec = t && s.decided[t.id];
    let { state, project, stream, kind } = r;
    if (dec?.how === 'published') { state = 'published'; project = dec.filing.project; stream = dec.filing.stream; kind = dec.filing.kind; }
    if (dec?.how === 'rejected') state = 'rejected';
    return { ...r, state, project, stream, kind, triage: t, latest: r.versions[r.versions.length - 1],
      pinned: s.pins[r.id] ?? r.pinned, archived: state === 'rejected' || (s.archived[r.id] ?? r.archived), unread: r.unread && !s.read[r.id] };
  }), [s.decided, s.pins, s.archived, s.read]);
  const byId = Object.fromEntries(all.map((x) => [x.id, x])) as Record<string, Live>;
  const byLatest = (a: Live, b: Live) => b.latest.at.localeCompare(a.latest.at);
  const published = all.filter((x) => x.state === 'published').sort(byLatest);
  const live = published.filter((x) => !x.archived);
  const archivedList = all.filter((x) => x.archived).sort(byLatest);
  const pending = data.triage.filter((t) => !s.decided[t.id]);
  /** Confirm (with the form's filing if it was changed) or reject, with Undo in a toast. */
  const decide = (t: TriageEntry, how: Decision['how'], quiet = false) => {
    const filing = filingOf(formFor(t, s.forms)); const x = byId[t.reportId];
    const held = x.state === 'quarantined';
    const forget = () => patch((st) => { const d = { ...st.decided }; delete d[t.id]; return { decided: d }; });
    patch((st) => ({ decided: { ...st.decided, [t.id]: { how, filing } }, formOpen: { ...st.formOpen, [t.id]: false } }));
    save(t, how, filing, held).then(() => {
      // Only a plain confirm can be taken back; publishing a held report and rejecting one are final in the Worker.
      if (!quiet) toast(how === 'published' ? `Filed ${x.title} under ${projectName(filing.project)}${filing.stream ? ' › ' + filing.stream : ''} as ${kindLabel(filing.kind)}.` : `Rejected ${x.title}.`,
        how === 'published' && !held ? () => undo(t) : undefined);
    }, (e: Error) => { forget(); toast(`Not saved: ${e.message}`); });
  };
  const undo = (t: TriageEntry) => {
    const dec = s.decided[t.id];
    if (dec?.how !== 'published' || byId[t.reportId]?.state === 'quarantined') { toast('Publishing a held report and rejecting one are final.'); return; }
    patch((st) => { const d = { ...st.decided }; delete d[t.id]; return { decided: d }; });
    const [project, id] = t.reportId.split('/');
    post(`/api/triage/${dec?.filing.project ?? project}/${id}`, { action: 'undo' }).catch((e: Error) => toast(`Undo not saved: ${e.message}`));
  };
  return { ...hub, all, byId, byLatest, published, live, archivedList, pending, decide, undo };
}

export function matches(x: Live, f: Filters, q: string, ignoreProject = false) {
  if (!ignoreProject && f.project !== 'all' && x.project !== f.project) return false;
  if (f.stream && x.stream !== f.stream) return false;
  if (f.kinds.length && !f.kinds.includes(x.kind)) return false;
  if (f.range !== 'any' && ageDays(x.latest.at) > Number(f.range)) return false;
  if (q) { const hay = [x.title, x.claim, x.lead, x.project, projectName(x.project), x.stream ?? '', kindLabel(x.kind)].join(' ').toLowerCase(); if (!hay.includes(q.toLowerCase())) return false; }
  return true;
}
export const filterCount = (f: Filters) => (f.project !== 'all' ? 1 : 0) + (f.range !== 'any' ? 1 : 0) + (f.kinds.length ? 1 : 0) + (f.archived ? 1 : 0) + (f.stream ? 1 : 0);
