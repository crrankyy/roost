// Triage inbox and review (SPEC 6.3, TriageReview card): an inbox column from 1000px, one item at a time on phones.
import { cls, icons, tpl } from '../generated/lynx';
import { filesProject, manifestKey, versionKey, type Manifest, type TriageItem } from '../model';
import { ago, everything, index, kindLabel, plural, viewer, type ViewEnv } from './data';
import { fill, html, raw } from './html';
import { page } from './layout';
import { button, icon, island, kindBadge, linkButton, reportUrl, selectTrigger, svg } from './parts';

const shield = raw('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>');
const chevLeft = raw('<path d="m15 18-6-6 6-6"></path>');
const ref = (t: TriageItem) => `${t.project}/${t.id}`;
export const previewUrl = (t: { project: string; id: string; version: number }) => `/triage/preview/${t.project}/${t.id}/v${t.version}/`;
const SECRET_LABELS: Record<string, string> = {
  'aws-access-key': 'AWS access key', 'aws-secret': 'AWS secret key', 'github-token': 'GitHub token', 'slack-token': 'Slack token',
  'stripe-key': 'Stripe key', 'anthropic-key': 'Anthropic API key', 'openai-key': 'OpenAI API key', 'cloudflare-token': 'Cloudflare API token',
  'private-key': 'Private key block', 'dotenv-secret': '.env secret', 'high-entropy': 'High-entropy string', email: 'Email address', 'home-path': 'Home-directory path',
};

export async function triagePage(req: Request, env: ViewEnv): Promise<Response> {
  const url = new URL(req.url);
  const [v, idx] = await Promise.all([viewer(env), index(env)]);
  const items = idx.triage;
  if (!items.length) {
    const body = html`<div style="display: flex; flex-direction: column; gap: 12px; padding: 0 4px">${fill(tpl.breadcrumb, { HREF: '/', LINK: 'Home', PAGE: 'Triage' })}<h1 class="hub-h1">Nothing needs you</h1>
<p class="hub-caption">Reports from unattended runs land here until you confirm where Claude filed them.</p></div>`;
    return page({ title: 'Triage · Roost', prefs: v.prefs, body });
  }
  const sel = Math.max(0, items.findIndex((t) => ref(t) === url.searchParams.get('r')));
  const cur = items[sel];
  const at = (i: number) => `/triage?r=${encodeURIComponent(ref(items[(i + items.length) % items.length]))}`;
  const title = `${plural(items.length, 'report')} ${items.length === 1 ? 'needs' : 'need'} confirming`;

  const inbox = html`<div class="hub-wide lr-panel hub-list" style="flex-direction: column">${items.map((t, i) => html`<button type="button" class="hub-row hub-inbox-item" data-href="${at(i)}" data-selected="${i === sel ? 'true' : 'false'}" aria-pressed="${i === sel ? 'true' : 'false'}">
<span class="hub-row-top"><span class="hub-row-title">${t.title}</span><span class="hub-time">${ago(t.published)}</span></span>
<span class="hub-proposal"><span>${t.project_title}${t.stream ? ` › ${t.stream}` : ', no stream'}</span><span>as</span>${kindBadge(t.kind)}</span>
${t.quarantined ? html`<span><span class="lr-badge" data-tone="red">${plural(t.findings.length, 'secret finding')} · not published</span></span>` : ''}</button>`)}</div>`;

  // Reclassify needs every project's streams.
  const all = await everything(env, false);
  const projects = all.map(({ p, m }) => ({ id: p.id, title: p.title, streams: m.streams.filter((s) => s.status !== 'archived').map((s) => ({ id: s.id, title: s.title, last: s.last_report })) }));
  const q = cur.quarantined;
  const detail = html`<article class="lr-panel hub-detail" aria-labelledby="tri-title">
${q ? fill(tpl.alertDestructive, { ICON: shield, TITLE: `Not published: ${plural(cur.findings.length, 'likely secret')} found`, BODY: 'The secret scan held this report back, so no link serves it yet. Publish it as it is, or reject it.' }) : ''}
<header class="lr-header" style="gap: 12px">
<div class="lr-eyebrow"><span class="lr-badge" data-tone="${q ? 'red' : 'peach'}">${q ? 'Quarantined' : 'Needs confirming'}</span><span>${cur.unattended ? 'Published unattended' : 'Published'} · ${ago(cur.published)}${q ? ' · not served' : ''}</span></div>
<h2 id="tri-title" class="lr-title">${cur.title}</h2>
${cur.summary ? html`<p class="lr-lead">${cur.summary}</p>` : ''}
<div>${linkButton(cls.btnOutlineSm, q ? previewUrl(cur) : reportUrl(cur.project, cur.id), html`${q ? 'Preview report' : 'Open report'}${raw(icons.ArrowRight)}`)}</div>
</header>
<section class="lr-inset hub-proposed" aria-label="Proposed classification">
<span class="lr-label" style="margin: 0">Claude’s proposed classification</span>
<div class="hub-proposed-line">
<span style="display: inline-flex; align-items: center; gap: 6px"><span style="display: flex; color: var(--muted-foreground)">${raw(icons.Folder)}</span>${cur.project_title}</span>
<span class="sep">›</span>
<span style="display: inline-flex; align-items: center; gap: 6px">${icon(svg.stream, 'i', 'style="color: var(--muted-foreground)" aria-hidden="true"')}${cur.stream ?? 'No stream'}</span>
<span class="sep">as</span>${kindBadge(cur.kind)}</div>
${cur.proposed_stream ? html`<p class="hub-caption">Claude proposed a new stream, ${cur.proposed_stream.id}; it was not created. Reclassify to create it.</p>` : ''}
${cur.why ? html`<p class="hub-caption">Why: ${cur.why}</p>` : ''}
</section>
${q ? html`<section style="display: flex; flex-direction: column" aria-labelledby="secrets-h"><span id="secrets-h" class="lr-label">Secret scan findings</span>
${cur.findings.map((f, i) => html`<div class="hub-secret"><span class="lr-num">${i + 1}</span><div style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
<span class="hub-label">${f.file || 'report'}${f.line ? `, line ${f.line}` : ''}</span><span class="hub-caption">${SECRET_LABELS[f.kind] ?? f.kind}</span>
<code aria-label="Value masked, ends in ${f.masked.slice(-4)}">${f.masked}</code></div></div>`)}</section>
<div style="display: flex; flex-direction: column; gap: 8px"><div class="hub-actions">
${button(cls.btnDefault, 'Reject', `data-triage="reject" data-ref="${ref(cur)}"`)}${button(cls.btnDestructiveSm.replace(/h-8 rounded-lg px-3 text-xs/, 'h-9 px-4 py-2'), 'Publish anyway', `data-triage="publish" data-ref="${ref(cur)}"`)}</div>
<p class="hub-caption">Rejected reports stay in the archive, unpublished. Publishing serves the values exactly as found.</p></div>`
    : island('reclassify', { target: ref(cur), project: cur.project, kind: cur.kind, stream: cur.stream, proposed: cur.proposed_stream ?? null, projects, next: items.length > 1 ? at(sel + 1) : '/' },
      html`<div style="display: flex; flex-direction: column; gap: 8px"><div class="hub-actions">${button(cls.btnDefault, html`${raw(icons.Check)}Confirm`)}${button(cls.btnOutline, 'Reclassify')}</div>
<p class="hub-caption">Classification is metadata, so the report’s link stays the same either way.</p></div>`)}
</article>`;

  const body = html`<nav class="hub-onlynarrow" aria-label="Triage" style="align-items: center; gap: 8px; padding: 0 4px">
<a href="/" style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; line-height: 20px; padding: 8px 4px; color: var(--muted-foreground)">${icon(svg.back)}Home</a>
<span class="hub-caption" style="flex: 1; text-align: center">Triage · ${sel + 1} of ${items.length}</span>
${linkButton(cls.btnOutlineIcon, at(sel - 1), icon(chevLeft), 'aria-label="Previous report"')}${linkButton(cls.btnOutlineIcon, at(sel + 1), raw(icons.ChevronRight), 'aria-label="Next report"')}
</nav>
<div class="hub-wide" style="flex-direction: column; gap: 12px; padding: 0 4px">${fill(tpl.breadcrumb, { HREF: '/', LINK: 'Home', PAGE: 'Triage' })}<h1 class="hub-h1">${title}</h1></div>
<div class="hub-split">${inbox}${detail}</div>`;
  return page({ title: 'Triage · Roost', prefs: v.prefs, body, data: { page: 'triage', kinds: undefined } });
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

export { kindLabel };
