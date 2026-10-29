// Storage schemas (PLAN 3.2) and the pure transforms the API applies to them inside casUpdate().
import { ApiError } from './store';

export const KINDS = [
  'investigation', 'incident', 'review', 'audit', 'architecture', 'plan', 'analysis',
  'benchmark', 'experiment', 'research', 'explainer', 'runbook', 'summary',
] as const;
export type Kind = (typeof KINDS)[number];

export interface Project {
  id: string; title: string; description: string;
  match: { remotes: string[]; paths: string[]; keywords: string[] };
  status: 'active' | 'archived';
}
export interface Registry { projects: Project[] }

export interface Stream {
  id: string; title: string; description: string;
  status: 'active' | 'done' | 'archived'; aliases: string[];
  started: string; last_report: string | null;
}

export interface Finding { file: string; line: number; kind: string; masked: string }

export interface VersionEntry {
  n: number;
  state: 'pending' | 'live' | 'quarantined' | 'rejected';
  upload: string;
  files: { path: string; size: number; sha256: string }[];
  published: string | null;
  change_note: string;
  findings: Finding[];
  allow_secrets: boolean;
  source: { branch?: string; commit?: string; session?: string; unattended: boolean };
  pending_meta?: PublishMeta; // classification to apply at commit; removed once committed
}

export interface ReportEntry {
  id: string; title: string; summary: string; kind: Kind; stream: string | null; tags: string[];
  status: 'draft' | 'final' | 'superseded';
  typed: Record<string, string | number | boolean>;
  archived: string | null;
  supersedes: string | null; superseded_by: string | null;
  created: string;
  latest: number | null; // latest live version
  classification: {
    by: 'claude' | 'user'; confirmed: boolean; triage: boolean; why: string;
    proposed_stream?: { id: string; title: string };
  };
  versions: VersionEntry[];
}

export interface Manifest { project: string; updated: string; streams: Stream[]; reports: ReportEntry[] }

export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const REPORT_ID_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const manifestKey = (project: string) => `p/${project}/manifest.json`;
export const versionKey = (project: string, id: string, n: number, path: string) => `p/${project}/r/${id}/v${n}/${path}`;

export const DAY_MS = 86_400_000;
export const ACTIVE_DAYS = 14;
export const RECENT_LIMIT = 100;

// ---------- publish ----------

export interface PublishMeta {
  title: string; summary: string; kind: Kind; stream: string | null; tags: string[];
  status: 'draft' | 'final'; typed: Record<string, string | number | boolean>;
  change_note: string; supersedes: string | null;
  classification: { why: string; triage: boolean; confirmed: boolean };
  proposed_stream?: { id: string; title: string };
  new_stream?: { id: string; title: string; description: string };
}

export interface BeginInput extends PublishMeta {
  id: string; upload: string;
  files: VersionEntry['files']; findings: Finding[]; allow_secrets: boolean;
  source: VersionEntry['source'];
}

export const emptyManifest = (project: string, now: string): Manifest => ({ project, updated: now, streams: [], reports: [] });

export function findStream(m: Manifest, id: string): Stream | undefined {
  return m.streams.find((s) => s.id === id) ?? m.streams.find((s) => s.aliases.includes(id));
}

export const isQuarantine = (v: VersionEntry) => v.source.unattended && v.findings.length > 0 && !v.allow_secrets;

/** Claims the next version number for a report (creating the report entry if new). Idempotent per upload. */
export function begin(cur: Manifest | null, project: string, input: BeginInput, now: string) {
  const m = cur ?? emptyManifest(project, now);
  const meta: PublishMeta = { ...pickMeta(input) };
  if (meta.new_stream) {
    if (findStream(m, meta.new_stream.id)) throw new ApiError(409, 'stream_exists', `Stream ${meta.new_stream.id} exists`, 'new_stream');
    meta.stream = null;
  } else if (meta.stream) {
    const s = findStream(m, meta.stream);
    if (!s) throw new ApiError(422, 'unknown_stream', `No stream ${meta.stream} in ${project}`, 'stream');
    meta.stream = s.id;
  }
  if (meta.supersedes && !m.reports.some((r) => r.id === meta.supersedes)) {
    throw new ApiError(422, 'unknown_report', `No report ${meta.supersedes} to supersede`, 'supersedes');
  }
  let entry = m.reports.find((r) => r.id === input.id);
  if (!entry) {
    entry = {
      id: input.id, title: meta.title, summary: meta.summary, kind: meta.kind, stream: meta.stream, tags: meta.tags,
      status: meta.status, typed: meta.typed, archived: null, supersedes: null, superseded_by: null, created: now, latest: null,
      classification: { by: 'claude', confirmed: false, triage: false, why: '' }, versions: [],
    };
    m.reports.push(entry);
  }
  const again = entry.versions.find((v) => v.upload === input.upload);
  if (again) return { doc: m, result: { n: again.n } };
  const n = Math.max(0, ...entry.versions.map((v) => v.n)) + 1;
  entry.versions.push({
    n, state: 'pending', upload: input.upload, files: input.files, published: null, change_note: input.change_note,
    findings: input.findings, allow_secrets: input.allow_secrets, source: input.source, pending_meta: meta,
  });
  m.updated = now;
  return { doc: m, result: { n } };
}

function pickMeta(i: PublishMeta): PublishMeta {
  const { title, summary, kind, stream, tags, status, typed, change_note, supersedes, classification, proposed_stream, new_stream } = i;
  return { title, summary, kind, stream, tags, status, typed, change_note, supersedes, classification, proposed_stream, new_stream };
}

/** Makes a pending version live (or quarantined) and applies its classification. Idempotent. */
export function commit(cur: Manifest | null, id: string, n: number, upload: string, now: string) {
  const m = cur;
  const entry = m?.reports.find((r) => r.id === id);
  const v = entry?.versions.find((x) => x.n === n);
  if (!m || !entry || !v || v.upload !== upload) throw new ApiError(404, 'unknown_upload');
  if (v.state !== 'pending') return { doc: m, result: { state: v.state, entry } };
  const meta = v.pending_meta!;
  delete v.pending_meta;
  const quarantined = isQuarantine(v);
  v.state = quarantined ? 'quarantined' : 'live';
  v.published = now;
  if (meta.new_stream && !findStream(m, meta.new_stream.id)) {
    m.streams.push({ ...meta.new_stream, status: 'active', aliases: [], started: now, last_report: null });
    meta.stream = meta.new_stream.id;
  }
  Object.assign(entry, {
    title: meta.title, summary: meta.summary, kind: meta.kind, stream: meta.stream, tags: meta.tags,
    status: entry.status === 'superseded' ? 'superseded' : meta.status, typed: meta.typed,
    supersedes: meta.supersedes ?? entry.supersedes,
    classification: {
      by: 'claude', confirmed: meta.classification.confirmed, why: meta.classification.why,
      triage: meta.classification.triage || quarantined,
      ...(meta.proposed_stream ? { proposed_stream: meta.proposed_stream } : {}),
    },
  });
  if (!quarantined) entry.latest = Math.max(entry.latest ?? 0, n);
  const stream = meta.stream ? m.streams.find((s) => s.id === meta.stream) : undefined;
  if (stream) stream.last_report = now;
  const target = meta.supersedes ? m.reports.find((r) => r.id === meta.supersedes) : undefined;
  if (target && target.id !== id) { target.status = 'superseded'; target.superseded_by = id; }
  m.updated = now;
  return { doc: m, result: { state: v.state, entry } };
}

/** The report.json written once per version at commit (SPEC 3.4). */
export function reportJson(project: string, e: ReportEntry, v: VersionEntry) {
  return {
    id: e.id, version: v.n, project, kind: e.kind, stream: e.stream, title: e.title, summary: e.summary,
    tags: e.tags, status: e.status, typed: e.typed, created: e.created, published: v.published,
    change_note: v.change_note, classification: e.classification,
    flags: { quarantined: v.state === 'quarantined', secret_findings: v.findings.length },
    source: v.source, supersedes: e.supersedes, archived: !!e.archived,
  };
}

// ---------- streams ----------

export type StreamOp =
  | { op: 'create'; title: string; description: string }
  | { op: 'rename'; to: string; title?: string }
  | { op: 'merge'; to: string }
  | { op: 'done' | 'archive' | 'unarchive' };

export function streamOp(cur: Manifest | null, project: string, id: string, o: StreamOp, now: string) {
  const m = cur ?? emptyManifest(project, now);
  const s = findStream(m, id);
  if (o.op === 'create') {
    if (s) throw new ApiError(409, 'stream_exists');
    const created: Stream = { id, title: o.title, description: o.description, status: 'active', aliases: [], started: now, last_report: null };
    m.streams.push(created);
    m.updated = now;
    return { doc: m, result: created };
  }
  if (!s) throw new ApiError(404, 'unknown_stream');
  if (o.op === 'rename') {
    if (o.to !== s.id && findStream(m, o.to)) throw new ApiError(409, 'stream_exists');
    if (o.to !== s.id) {
      s.aliases = [...new Set([...s.aliases, s.id])];
      for (const r of m.reports) if (r.stream === s.id) r.stream = o.to;
      s.id = o.to;
    }
    if (o.title) s.title = o.title;
  } else if (o.op === 'merge') {
    const t = findStream(m, o.to);
    if (!t || t === s) throw new ApiError(422, 'bad_merge_target');
    t.aliases = [...new Set([...t.aliases, s.id, ...s.aliases])];
    for (const r of m.reports) if (r.stream === s.id) r.stream = t.id;
    if ((s.last_report ?? '') > (t.last_report ?? '')) t.last_report = s.last_report;
    m.streams = m.streams.filter((x) => x !== s); // metadata only: its id lives on as an alias
    m.updated = now;
    return { doc: m, result: t };
  } else {
    s.status = o.op === 'unarchive' ? 'active' : o.op === 'done' ? 'done' : 'archived';
  }
  m.updated = now;
  return { doc: m, result: s };
}

// ---------- global index ----------

export interface RecentItem {
  project: string; project_title: string; id: string; title: string; summary: string; kind: Kind;
  stream: string | null; status: ReportEntry['status']; published: string; version: number; versions: number;
}
export interface TriageItem extends Omit<RecentItem, 'status' | 'versions'> {
  quarantined: boolean; findings: Finding[]; why: string; unattended: boolean;
  proposed_stream?: { id: string; title: string };
}
export interface ProjectSummary { id: string; title: string; reports: number; active_streams: number; last: string | null }
export interface StreamSummary {
  project: string; project_title: string; id: string; title: string; reports: number; last_report: string; spark: number[];
}
export interface RecentIndex {
  updated: string; reports: RecentItem[]; triage: TriageItem[]; projects: ProjectSummary[]; streams: StreamSummary[];
}

export const streamHidden = (m: Manifest, e: ReportEntry) =>
  !!e.stream && m.streams.find((s) => s.id === e.stream)?.status === 'archived';
export const visible = (m: Manifest, e: ReportEntry) => e.latest !== null && !e.archived && !streamHidden(m, e);

export function liveVersion(e: ReportEntry): VersionEntry | undefined {
  return e.versions.find((v) => v.n === e.latest);
}

export function triageItem(m: Manifest, e: ReportEntry, projectTitle: string): TriageItem | null {
  if (e.archived) return null;
  const q = [...e.versions].reverse().find((v) => v.state === 'quarantined');
  if (!q && !e.classification.triage) return null;
  const v = q ?? liveVersion(e);
  if (!v) return null;
  return {
    project: m.project, project_title: projectTitle, id: e.id, title: e.title, summary: e.summary, kind: e.kind,
    stream: e.stream, published: v.published ?? '', version: v.n, quarantined: !!q, findings: q?.findings ?? [],
    why: e.classification.why, unattended: v.source.unattended,
    ...(e.classification.proposed_stream ? { proposed_stream: e.classification.proposed_stream } : {}),
  };
}

/** Everything one project contributes to the index, derived from its manifest alone. */
export function projectSlice(m: Manifest, p: Project, now: string) {
  if (p.status === 'archived') return { reports: [], triage: [], project: null, streams: [] };
  const live = m.reports.filter((e) => visible(m, e));
  const reports: RecentItem[] = live.map((e) => ({
    project: m.project, project_title: p.title, id: e.id, title: e.title, summary: e.summary, kind: e.kind,
    stream: e.stream, status: e.status, published: liveVersion(e)!.published ?? '', version: e.latest!,
    versions: e.versions.filter((v) => v.state === 'live').length,
  }));
  const triage = m.reports.map((e) => triageItem(m, e, p.title)).filter((t): t is TriageItem => !!t);
  const cutoff = Date.parse(now) - ACTIVE_DAYS * DAY_MS;
  const streams: StreamSummary[] = m.streams
    .filter((s) => s.status === 'active' && s.last_report && Date.parse(s.last_report) >= cutoff)
    .map((s) => {
      const mine = live.filter((e) => e.stream === s.id);
      const spark = Array(10).fill(0);
      for (const e of mine) for (const v of e.versions) {
        if (v.state !== 'live' || !v.published) continue;
        const b = Math.floor(((Date.parse(v.published) - cutoff) / (ACTIVE_DAYS * DAY_MS)) * 10);
        if (b >= 0 && b < 10) spark[b]++;
      }
      return { project: m.project, project_title: p.title, id: s.id, title: s.title, reports: mine.length, last_report: s.last_report!, spark };
    });
  const last = reports.reduce<string | null>((a, r) => (!a || r.published > a ? r.published : a), null);
  return { reports, triage, project: { id: p.id, title: p.title, reports: reports.length, active_streams: streams.length, last }, streams };
}

/** Replaces one project's slice in the index. Recomputing (not patching) lets any later write heal a missed one. */
export function mergeSlice(cur: RecentIndex | null, projectId: string, slice: ReturnType<typeof projectSlice>, now: string): RecentIndex {
  const i = cur ?? { updated: now, reports: [], triage: [], projects: [], streams: [] };
  const other = <T extends { project: string }>(xs: T[]) => xs.filter((x) => x.project !== projectId);
  const byDate = (a: { published: string }, b: { published: string }) => b.published.localeCompare(a.published);
  return {
    updated: now,
    reports: [...other(i.reports), ...slice.reports].sort(byDate).slice(0, RECENT_LIMIT),
    triage: [...other(i.triage), ...slice.triage].sort(byDate),
    projects: [...i.projects.filter((p) => p.id !== projectId), ...(slice.project ? [slice.project] : [])]
      .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '')),
    streams: [...other(i.streams), ...slice.streams].sort((a, b) => b.last_report.localeCompare(a.last_report)),
  };
}
