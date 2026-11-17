// What the hub app (web/) reads: GET /api/hub, in roost-web's HubData shape (web/ui/src/types.ts), and the
// sandboxed triage preview of a version that is not served.

import { KINDS, PALETTES, filesProject, manifestKey, streamHidden, versionKey, type Manifest, type ReportEntry } from './model';
import { everything, isNew, viewer, type ViewEnv } from './pages/data';

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' } });

const reportUrl = (project: string, id: string) => `/p/${project}/r/${id}/`;
export const previewUrl = (project: string, id: string, n: number) => `/triage/preview/${project}/${id}/v${n}/`;

export function reportView(m: Manifest, e: ReportEntry, pins: string[], unread: (ref: string, at: string) => boolean) {
  const ref = `${m.project}/${e.id}`;
  const q = e.versions.filter((v) => v.state === 'quarantined');
  const shown = e.versions.filter((v) => v.state === 'live' || v.state === 'quarantined' || (e.latest === null && v.state === 'rejected'));
  const state = q.length ? 'quarantined' : e.classification.triage ? 'triage' : e.latest === null ? 'rejected' : 'published';
  const versions = shown.map((v) => ({
    n: v.n, at: v.published ?? e.created, note: v.change_note,
    file: v.state === 'live' ? `${reportUrl(m.project, e.id)}${v.n === e.latest ? '' : `v${v.n}/`}` : previewUrl(m.project, e.id, v.n),
  }));
  const latest = versions.at(-1);
  return {
    id: ref, slug: e.id, title: e.title, claim: e.claim ?? '', lead: e.summary,
    // A kind outside the eight only exists until the 2026-11 refile; show it as an investigation rather than break the app.
    kind: (KINDS as readonly string[]).includes(e.kind) ? e.kind : 'investigation',
    project: m.project, stream: e.stream, palette: (PALETTES as readonly string[]).includes(e.palette ?? '') ? e.palette : 'catppuccin',
    versions, state, pinned: pins.includes(ref), archived: !!e.archived || streamHidden(m, e) || state === 'rejected',
    unread: !!latest && state === 'published' && unread(ref, latest.at),
    by: `Claude Code · ${(e.versions.find((v) => v.n === e.latest) ?? e.versions.at(-1))?.source.unattended ? 'unattended run' : 'attended session'}`,
    legacy: !e.versions.find((v) => v.n === e.latest)?.format,
  };
}

/** GET /api/hub. ponytail: reads every manifest on each call; fine for tens of projects, use index/recent.json past that. */
export async function hub(env: ViewEnv, ctx: ExecutionContext) {
  const [all, v] = await Promise.all([everything(env, false), viewer(env)]);
  const now = new Date().toISOString();
  const projects = [], reports = [], triage = [];
  for (const { p, m } of all) {
    const mine = m.reports.filter((e) => !e.moved_to && e.versions.some((x) => x.state !== 'pending'))
      .map((e) => ({ e, r: reportView(m, e, v.pins, (ref, at) => isNew(v, ref, at)) }));
    const newest = mine.filter((x) => x.r.state === 'published').sort((a, b) => b.r.versions.at(-1)!.at.localeCompare(a.r.versions.at(-1)!.at))[0];
    projects.push({
      id: p.id, name: p.title, remote: p.match.remotes[0] ?? '', description: p.description,
      headline: newest ? newest.r.claim || newest.r.title : p.description,
      streams: m.streams.filter((s) => s.status !== 'archived').map((s) => ({ id: s.id, about: s.description || s.title, done: s.status === 'done' })),
    });
    for (const { e, r } of mine) {
      reports.push(r);
      if (r.state !== 'triage' && r.state !== 'quarantined') continue;
      const ver = [...e.versions].reverse().find((x) => x.state === "quarantined") ?? e.versions.find((x) => x.n === e.latest)!;
      triage.push({
        id: r.id, reportId: r.id, run: ver.source.session ?? '', at: ver.published ?? e.created, matchedBy: e.classification.why,
        proposed: { project: m.project, stream: e.classification.proposed_stream?.id ?? e.stream, kind: r.kind },
        ...(e.classification.proposed_stream ? { newStream: true } : {}),
        why: e.classification.why, secrets: ver.findings,
      });
    }
  }
  // SPEC 6.5: opening the hub moves "last visit" on; what was new before stays marked for this load.
  ctx.waitUntil(env.STATE.put('seen', JSON.stringify({ last_visit: now, opened: [] })));
  return json({ now, projects, reports, triage, prefs: v.prefs });
}

/** A quarantined (or rejected) version, for review only: sandboxed so its scripts never run on Roost's origin. */
export async function triagePreview(env: ViewEnv, project: string, id: string, n: number, rest: string): Promise<Response | null> {
  const obj = await env.REPORTS.get(manifestKey(project));
  const m = obj ? ((await obj.json()) as Manifest) : null;
  const e = m?.reports.find((r) => r.id === id);
  const v = e?.versions.find((x) => x.n === n);
  if (!m || !e || !v || v.state === 'pending') return null;
  const file = await env.REPORTS.get(versionKey(filesProject(m, e), id, n, rest || 'index.html'));
  if (!file) return null;
  return new Response(file.body, {
    headers: {
      'content-type': file.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': 'private, no-store',
      'content-security-policy': 'sandbox', 'x-robots-tag': 'noindex',
    },
  });
}

