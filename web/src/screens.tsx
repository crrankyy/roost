// The hub's screens, in Report Hub's layout: header bar, triage panel, pinned, recent beside streams and
// projects; project pages with stream cards; triage with an inbox, a detail and the reclassify form.
import * as React from 'react';
import {
  Alert, Button, Columns, DetailHead, Disclosure, EmptyState, Field, InboxItem, KindMenu, KINDS, PageTitle, PinStrip, ProjectItem, ProposedBox,
  RadioGroup, ReportItem, RowList, SearchField, SecretList, SectionHead, Select, StreamCard, StreamItem, Switch, TextField, ToggleGroup,
  TriagePager, TriagePanel, kindLabel, type Kind, type ReportItemProps, type TriageEntry, type TriagePanelItem,
} from '@roost/ui';
import { ago, data, n, projectName, slugify } from './data';
import type { Route } from './router';
import { filterCount, formFor, matches, NO_FILTERS, useHub, type Filters, type Live } from './store';

export interface Nav { go: (r: Route) => void; openFilters: () => void; askPublish: (t: TriageEntry) => void }

export const RANGE = [{ value: 'any', label: 'Any time' }, { value: '1', label: 'Today' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }];
export const PROJECTS = [{ value: 'all', label: 'All projects' }, ...data.projects.map((p) => ({ value: p.id, label: p.name }))];
const KIND_OPTIONS = KINDS.map((k) => ({ value: k, label: kindLabel(k) }));

/* ---------- shared ---------- */
function useItem(go: Nav['go']) {
  const { patch } = useHub();
  return (x: Live, i: number): ReportItemProps & { key: string } => ({
    key: x.id, first: i === 0, title: x.title, summary: x.claim, kind: x.kind, project: projectName(x.project), stream: x.stream,
    when: (x.versions.length > 1 ? `v${x.latest.n} · ` : '') + ago(x.latest.at), isNew: !!x.unread, pinned: !!x.pinned, archived: !!x.archived,
    status: x.state === 'triage' ? { tone: 'warning', label: 'Waiting' } : x.state === 'quarantined' ? { tone: 'critical', label: 'Held back' } : undefined,
    onOpen: () => { patch((s) => ({ read: { ...s.read, [x.id]: true } })); go({ name: 'report', id: x.id }); },
  });
}
function useTriageItems(go: Nav['go']) {
  const { byId, decide, patch } = useHub();
  return (t: TriageEntry): TriagePanelItem => {
    const x = byId[t.reportId];
    return { id: t.id, title: x.title, kind: t.proposed.kind, when: `Unattended · ${ago(t.at)}`,
      where: `${projectName(t.proposed.project)}${t.proposed.stream ? ' › ' + t.proposed.stream : ', no stream'}`,
      findings: t.secrets?.length ? `${n(t.secrets.length, 'secret finding')} · not published` : undefined,
      onOpen: () => go({ name: 'triage', id: t.id }), onReview: () => go({ name: 'triage', id: t.id }), onConfirm: () => decide(t, 'published'),
      onReclassify: () => { patch((s) => ({ formOpen: { ...s.formOpen, [t.id]: true } })); go({ name: 'triage', id: t.id }); } };
  };
}
function useFilters() {
  const { s, patch } = useHub();
  return { f: s.filters, setF: (p: Partial<Filters>) => patch((st) => ({ filters: { ...st.filters, ...p } })) };
}
function trend(list: Live[]) {
  const now = new Date(data.now).getTime(); const days = new Array(14).fill(0) as number[];
  list.forEach((x) => x.versions.forEach((v) => { const k = 13 - Math.floor((now - new Date(v.at).getTime()) / 86400000); if (k >= 0 && k < 14) days[k] += 1; }));
  return days;
}

/* ---------- home ---------- */
export function Home({ nav }: { nav: Nav }) {
  const { live, published, pending, all, byLatest, archivedList, patch } = useHub();
  const item = useItem(nav.go); const tItem = useTriageItems(nav.go); const { f, setF } = useFilters();
  const pool = f.archived ? published : live;
  const recent = pool.filter((x) => matches(x, f, '')).slice(0, 15);
  const fc = filterCount(f);
  const streams = data.projects.flatMap((p) => p.streams.map((st) => ({ p, st, mine: all.filter((x) => x.project === p.id && x.stream === st.id && x.state === 'published' && !x.archived).sort(byLatest) })))
    .filter((z) => z.mine.length).sort((a, b) => byLatest(a.mine[0], b.mine[0]));
  return (
    <>
      {pending.length > 0 && <TriagePanel title={`${n(pending.length, 'report')} ${pending.length === 1 ? 'needs' : 'need'} confirming`} caption="Published by unattended runs. Check where Claude filed them."
        items={pending.map(tItem)} onReviewAll={() => nav.go({ name: 'triage' })} />}
      {live.some((x) => x.pinned) && (
        <section className="hub-sec hub-pins-sec" aria-label="Pinned">
          <SectionHead title="Pinned" />
          <PinStrip items={live.filter((x) => x.pinned).map((x) => ({ id: x.id, title: x.title, kind: x.kind, where: `${projectName(x.project)}${x.stream ? ' › ' + x.stream : ''}`,
            onOpen: () => { patch((s) => ({ read: { ...s.read, [x.id]: true } })); nav.go({ name: 'report', id: x.id }); } }))} />
        </section>
      )}
      <Columns>
        <div className="hub-col">
          <section className="hub-sec" aria-label="Recent">
            <SectionHead title="Recent" count={fc ? `${recent.length} of ${pool.length} match` : `Last ${Math.min(15, pool.length)} across all projects`}>
              <div className="hub-phone"><Button variant="outline" size="sm" icon="filter" onClick={nav.openFilters}>{fc ? `Filter · ${fc}` : 'Filter'}</Button></div>
            </SectionHead>
            <div className="hub-filters hub-desk" role="group" aria-label="Filter recent reports">
              <Select label="Project" value={f.project} options={PROJECTS} onChange={(v) => setF({ project: v, stream: null })} width={168} />
              <KindMenu value={f.kinds} onChange={(v) => setF({ kinds: v })} />
              <Select label="Date range" value={f.range} options={RANGE} onChange={(v) => setF({ range: v as Filters['range'] })} width={156} />
              <Switch label="Include archived" checked={f.archived} onChange={(v) => setF({ archived: v })} />
              {fc > 0 && <><span className="hub-spacer" /><Button variant="ghost" size="sm" icon="undo" onClick={() => setF(NO_FILTERS)}>Reset</Button></>}
            </div>
            <RowList>
              {recent.map((x, i) => <ReportItem {...item(x, i)} />)}
              {!recent.length && <EmptyState title="No reports match">Clear a filter to see more.</EmptyState>}
              <div className="hub-showmore">
                <Button variant="ghost" size="sm" onClick={() => nav.go({ name: 'reports', mode: 'all' })}>All {live.length} reports</Button>
                <Button variant="ghost" size="sm" icon="archive" onClick={() => nav.go({ name: 'reports', mode: 'archive' })}>{archivedList.length ? `Archive · ${archivedList.length}` : 'Archive'}</Button>
              </div>
            </RowList>
          </section>
        </div>
        <div className="hub-col">
          <section className="hub-sec" aria-label="Active streams">
            <SectionHead title="Active streams" count="Reports in the last 14 days" />
            <RowList>{streams.map(({ p, st, mine }, i) => <StreamItem key={p.id + st.id} first={i === 0} name={st.id} caption={`${p.name} · latest ${ago(mine[0].latest.at)}`}
              trend={trend(mine)} count={n(mine.length, 'report')} onOpen={() => nav.go({ name: 'project', id: p.id })} />)}</RowList>
          </section>
          <section className="hub-sec" aria-label="Projects">
            <SectionHead title="Projects" />
            <RowList>{data.projects.map((p, i) => { const mine = live.filter((x) => x.project === p.id);
              return <ProjectItem key={p.id} first={i === 0} name={p.name} caption={`${n(mine.length, 'report')} · ${n(new Set(mine.map((x) => x.stream).filter(Boolean)).size, 'active stream')}`}
                when={mine[0] ? ago(mine[0].latest.at) : undefined} onOpen={() => nav.go({ name: 'project', id: p.id })} />; })}</RowList>
          </section>
        </div>
      </Columns>
    </>
  );
}

/* ---------- reports, search, archive ---------- */
export function useListRows(mode: 'all' | 'pinned' | 'archive') {
  const { s, live, published, archivedList } = useHub();
  const f = s.filters, q = s.query.trim();
  const pool = mode === 'archive' ? archivedList : mode === 'pinned' ? live.filter((x) => x.pinned) : f.archived ? published : live;
  return { rows: pool.filter((x) => matches(x, f, q)), q };
}

export function ReportsList({ mode, nav }: { mode: 'all' | 'pinned' | 'archive'; nav: Nav }) {
  const { s, patch, archivedList } = useHub();
  const item = useItem(nav.go); const { rows, q } = useListRows(mode); const { f, setF } = useFilters();
  const fc = filterCount(f);
  return (
    <>
      <PageTitle
        title={q ? `${n(rows.length, 'report')} ${rows.length === 1 ? 'matches' : 'match'} “${q}”` : mode === 'archive' ? 'Archive' : f.stream ? `${projectName(f.project)} › ${f.stream}` : 'All reports'}
        caption={mode === 'archive' ? 'Hidden from lists. Nothing is deleted, so every link still opens.' : `${n(rows.length, 'report')}${fc ? ` · ${n(fc, 'filter')} on` : ''} · newest first`} />
      <div className="hub-phone" style={{ flexDirection: 'column', gap: 8 }}>
        <SearchField value={s.query} onChange={(v) => patch({ query: v })} />
        <div className="hub-filters"><Button variant="outline" size="sm" icon="filter" onClick={nav.openFilters}>{fc ? `Filter · ${fc}` : 'Filter'}</Button></div>
      </div>
      <div className="hub-filters hub-desk" role="group" aria-label="Filter reports">
        <Select label="Project" value={f.project} options={PROJECTS} onChange={(v) => setF({ project: v, stream: null })} width={168} />
        <KindMenu value={f.kinds} onChange={(v) => setF({ kinds: v })} />
        <Select label="Date range" value={f.range} options={RANGE} onChange={(v) => setF({ range: v as Filters['range'] })} width={156} />
        {mode !== 'archive' && <Switch label="Include archived" checked={f.archived} onChange={(v) => setF({ archived: v })} />}
        <span className="hub-spacer" />
        {fc > 0 && <Button variant="ghost" size="sm" icon="undo" onClick={() => setF(NO_FILTERS)}>Reset</Button>}
      </div>
      <RowList>
        {rows.map((x, i) => <ReportItem {...item(x, i)} />)}
        {!rows.length && (mode === 'archive' && !archivedList.length
          ? <EmptyState title="Nothing is archived">Archive a report from its version menu to hide it from lists; its link keeps working.</EmptyState>
          : <EmptyState title="No reports match">Clear a filter or search for something else.</EmptyState>)}
      </RowList>
    </>
  );
}

/* ---------- a project ---------- */
export function Project({ id, nav }: { id: string; nav: Nav }) {
  const { all, byLatest, pending, s, patch } = useHub();
  const item = useItem(nav.go); const tItem = useTriageItems(nav.go); const { f, setF } = useFilters();
  const p = data.projects.find((x) => x.id === id) ?? data.projects[0];
  const mine = all.filter((x) => x.project === p.id && (f.archived || !x.archived) && x.state !== 'rejected').sort(byLatest);
  const shown = mine.filter((x) => (!f.kinds.length || f.kinds.includes(x.kind)) && (f.range === 'any' || (new Date(data.now).getTime() - new Date(x.latest.at).getTime()) / 86400000 <= Number(f.range)));
  const now = new Date(data.now).getTime();
  const active = p.streams.filter((st) => mine.some((x) => x.stream === st.id && now - new Date(x.latest.at).getTime() < 14 * 86400000));
  const done = p.streams.filter((st) => !active.includes(st));
  const general = shown.filter((x) => !x.stream);
  const kinds = [...new Set(mine.map((x) => x.kind))];
  const pPending = pending.filter((t) => t.proposed.project === p.id);
  return (
    <>
      <PageTitle title={p.name} icon="folder"
        caption={`${n(mine.length, 'report')} · ${n(active.length, 'active stream')} · last activity ${mine[0] ? ago(mine[0].latest.at) : '–'}`} />
      {pPending.length > 0 && <TriagePanel title={`${n(pPending.length, 'report')} ${pPending.length === 1 ? 'needs' : 'need'} confirming`} caption="Filed here by an unattended run"
        items={pPending.map(tItem)} onReviewAll={() => nav.go({ name: 'triage' })} reviewAllLabel="Open triage" />}
      <div className="hub-filters" role="group" aria-label="Filter this project">
        <KindMenu value={f.kinds} kinds={kinds} onChange={(v) => setF({ kinds: v })} />
        <div className="hub-desk"><Select label="Date range" value={f.range} options={RANGE} onChange={(v) => setF({ range: v as Filters['range'] })} width={156} /></div>
        <div className="hub-desk"><Switch label="Include archived" checked={f.archived} onChange={(v) => setF({ archived: v })} /></div>
        <span className="hub-spacer" />
        <ToggleGroup label="Group reports" value={s.groupBy} options={[{ value: 'stream', label: 'By stream' }, { value: 'kind', label: 'By kind' }]} onChange={(v) => patch({ groupBy: v as 'stream' | 'kind' })} />
      </div>
      {s.groupBy === 'stream' ? (
        <>
          <section className="hub-sec" aria-label="Active streams">
            <SectionHead title="Active streams" count="Latest 3 reports each" />
            <div className={`hub-streams cols-${Math.min(3, Math.max(1, active.length))}`}>
              {active.map((st) => { const sr = shown.filter((x) => x.stream === st.id); const allN = mine.filter((x) => x.stream === st.id).length; return (
                <StreamCard key={st.id} name={st.id} caption={`${n(allN, 'report')} · latest ${sr[0] ? ago(sr[0].latest.at) : '–'}`} allLabel={`All ${allN}`}
                  onAll={() => { setF({ project: p.id, stream: st.id, kinds: [] }); nav.go({ name: 'reports', mode: 'all' }); }}>
                  {sr.slice(0, 3).map((x, i) => <ReportItem {...item(x, i)} compact summary={undefined} />)}
                </StreamCard>); })}
            </div>
          </section>
          {general.length > 0 && (
            <section className="hub-sec" aria-label="General">
              <SectionHead title="General" count="Reports without a stream" />
              <RowList>{general.map((x, i) => <ReportItem {...item(x, i)} compact />)}</RowList>
            </section>
          )}
          {done.length > 0 && (
            <Disclosure title="Done streams" caption={`${n(done.length, 'stream')} · ${n(mine.filter((x) => done.some((st) => st.id === x.stream)).length, 'report')}`}
              open={s.doneOpen} onToggle={() => patch({ doneOpen: !s.doneOpen })}>
              {done.map((st, i) => <StreamItem key={st.id} first={i === 0} name={st.id} caption={st.about} count={n(mine.filter((x) => x.stream === st.id).length, 'report')}
                onOpen={() => { setF({ project: p.id, stream: st.id }); nav.go({ name: 'reports', mode: 'all' }); }} />)}
            </Disclosure>
          )}
        </>
      ) : (
        <section className="hub-sec" aria-label="By kind">
          <SectionHead title="By kind" count={n(kinds.length, 'kind')} />
          <div className="hub-streams cols-2">
            {KINDS.filter((k) => shown.some((x) => x.kind === k)).map((k) => { const kr = shown.filter((x) => x.kind === k); return (
              <StreamCard key={k} icon="folder" name={kindLabel(k)} caption={`${n(kr.length, 'report')} · latest ${ago(kr[0].latest.at)}`}>
                {kr.map((x, i) => <ReportItem {...item(x, i)} compact />)}
              </StreamCard>); })}
          </div>
        </section>
      )}
    </>
  );
}

/* ---------- triage, reclassify, quarantine ---------- */
export function Triage({ id, nav }: { id?: string; nav: Nav }) {
  const { pending, byId, s, patch, decide, undo } = useHub();
  const shownT = data.triage.filter((t) => !s.decided[t.id] || t.id === id);
  const sel = shownT.find((t) => t.id === id) ?? shownT[0];
  const idx = sel ? shownT.indexOf(sel) : 0;
  const pick = (t: TriageEntry) => nav.go({ name: 'triage', id: t.id });
  const title = pending.length ? `${n(pending.length, 'report')} ${pending.length === 1 ? 'needs' : 'need'} confirming` : 'Nothing needs confirming';
  const head = (
    <>
      <TriagePager position={idx + 1} total={Math.max(1, shownT.length)}
        onPrev={() => idx > 0 && pick(shownT[idx - 1])} onNext={() => idx < shownT.length - 1 && pick(shownT[idx + 1])} />
      <div className="hub-wide" style={{ flexDirection: 'column' }}><PageTitle title={title} /></div>
    </>
  );
  if (!sel) return <>{head}<div className="hub-panel"><EmptyState title="Nothing needs confirming">Every unattended publish has been confirmed or rejected.</EmptyState></div></>;

  const x = byId[sel.reportId];
  const held = !!sel.secrets?.length;
  const dec = s.decided[sel.id];
  const fm = formFor(sel, s.forms);
  const formOpen = !dec && !held && !!s.formOpen[sel.id];
  const setFm = (p: Partial<typeof fm>) => patch((st) => ({ forms: { ...st.forms, [sel.id]: { ...fm, ...p } } }));
  const pr = data.projects.find((p) => p.id === fm.project);
  const streamOptions = [
    ...(pr?.streams ?? []).map((st) => ({ value: st.id, label: st.id, hint: fm.project === sel.proposed.project && st.id === sel.proposed.stream ? 'proposed' : undefined }))
      .sort((a, b) => (b.hint ? 1 : 0) - (a.hint ? 1 : 0)),
    { value: '__none', label: 'No stream', hint: 'files under General' },
    { value: '__new', label: 'Propose a new stream' },
  ];
  const nextT = pending.find((t) => t.id !== sel.id);
  const fil = dec?.filing;
  return (
    <>
      {head}
      <div className="hub-split">
        <RowList className="hub-wide">
          {shownT.map((t, i) => { const tx = byId[t.reportId]; return (
            <InboxItem key={t.id} first={i === 0} selected={t.id === sel.id} onSelect={() => pick(t)} title={tx.title} when={ago(t.at)} kind={t.proposed.kind}
              where={`${projectName(t.proposed.project)}${t.proposed.stream ? ' › ' + t.proposed.stream : ', no stream'}`}
              findings={t.secrets?.length ? `${n(t.secrets.length, 'secret finding')} · not published` : undefined} />); })}
        </RowList>
        <article className="hub-panel hub-detail" aria-label={x.title}>
          {held && !dec && <Alert title={`Not published: ${n(sel.secrets!.length, 'likely secret')} found`}>The secret scan held this report back, so no link serves it yet. Publish it as it is, or reject it.</Alert>}
          <DetailHead status={dec ? (dec.how === 'published' ? 'Filed' : 'Rejected') : held ? 'Quarantined' : 'Needs confirming'}
            tone={dec ? (dec.how === 'published' ? 'good' : 'warning') : held ? 'critical' : 'warning'}
            line={held ? `Written by an unattended run · ${ago(sel.at)} · not served` : `Published unattended · ${ago(sel.at)} · scheduled run ${sel.run}`}
            title={x.title} lead={x.claim} openLabel={held ? 'Preview report' : 'Open report'} onOpen={() => nav.go({ name: 'report', id: x.id })} />
          <ProposedBox project={projectName(sel.proposed.project)} stream={sel.proposed.stream} kind={sel.proposed.kind} why={sel.why ? `Why: ${sel.why}` : undefined} />

          {held && !dec && <>
            <SecretList items={sel.secrets!} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="hub-actions"><Button onClick={() => decide(sel, 'rejected', true)}>Reject</Button><Button variant="destructive" onClick={() => nav.askPublish(sel)}>Publish anyway</Button></div>
              <p className="hub-caption">Rejected reports stay in the archive, unpublished. Publishing serves the values exactly as found.</p>
            </div>
          </>}

          {!held && !dec && !formOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="hub-actions">
                <Button icon="check" onClick={() => decide(sel, 'published', true)}>Confirm</Button>
                <Button variant="outline" onClick={() => patch((st) => ({ formOpen: { ...st.formOpen, [sel.id]: true } }))}>Reclassify</Button>
              </div>
              <p className="hub-caption">Classification is metadata, so the report’s link stays the same either way.</p>
            </div>
          )}

          {formOpen && (
            <section className="hub-inset hub-form" aria-label="Reclassify">
              <h3 className="hub-label">Reclassify</h3>
              <Field label="Project"><Select label="Project" width="100%" value={fm.project} options={data.projects.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(v) => { const np = data.projects.find((p) => p.id === v); setFm({ project: v, choice: np?.streams[0]?.id ?? '__none' }); }} /></Field>
              <Field label="Stream">
                <RadioGroup name="stream" label="Stream" value={fm.choice} options={streamOptions}
                  onChange={(v) => setFm({ choice: v, newName: v === '__new' && !fm.newName ? slugify(x.title).slice(0, 32) : fm.newName })} />
                {fm.choice === '__new' && <div className="hub-newstream"><TextField label="New stream name" value={fm.newName} onChange={(v) => setFm({ newName: v })} hint="Created when you save. Lowercase words joined by hyphens." /></div>}
              </Field>
              <Field label="Kind"><Select label="Kind" width="100%" value={fm.kind} options={KIND_OPTIONS} onChange={(v) => setFm({ kind: v as Kind })} /></Field>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="hub-actions">
                  <Button onClick={() => decide(sel, 'published', true)}>Save and confirm</Button>
                  <Button variant="ghost" onClick={() => patch((st) => { const fo = { ...st.forms }; delete fo[sel.id]; return { formOpen: { ...st.formOpen, [sel.id]: false }, forms: fo }; })}>Cancel</Button>
                </div>
                <p className="hub-caption">The link stays the same: project, stream and kind are metadata.</p>
              </div>
            </section>
          )}

          {dec && fil && <>
            <Alert tone="good" title={dec.how === 'published' ? `Filed under ${projectName(fil.project)}${fil.stream ? ' › ' + fil.stream : ''} as ${kindLabel(fil.kind)}` : 'Rejected. It stays in the archive, unpublished.'}>
              {dec.how === 'published' ? `${fil.isNew ? `The stream ${fil.stream} was created. ` : ''}The report’s link did not change.` : 'Nothing was published.'}
            </Alert>
            <div className="hub-actions">
              <Button variant="outline" iconAfter="arrow-right" onClick={() => nextT ? pick(nextT) : nav.go({ name: 'home' })}>{nextT ? `Next: ${byId[nextT.reportId].title}` : 'Back home'}</Button>
              <Button variant="ghost" icon="undo" onClick={() => undo(sel)}>Undo</Button>
            </div>
          </>}
        </article>
      </div>
    </>
  );
}
