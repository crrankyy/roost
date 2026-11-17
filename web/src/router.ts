// Path routes, the same URLs the Worker has always served: /, /p/<project>/, /p/<project>/stream/<s>/,
// /p/<project>/kind/<k>/, /kind/<k>/, /triage, plus /reports, /pinned, /archive and /triage/<id>.
// A report is not a screen here: it is its own page at /p/<project>/r/<slug>/, served by the Worker under the bar.
import * as React from 'react';
import { KINDS, type Kind } from '@roost/ui';
import type { Filters } from './store';

export type Route =
  | { name: 'home' }
  | { name: 'triage'; id?: string }
  | { name: 'reports'; mode: 'all' | 'pinned' | 'archive'; preset?: Partial<Filters> & { query?: string } }
  | { name: 'project'; id: string; kind?: Kind }
  | { name: 'report'; id: string; version?: number };

const isKind = (k: string | undefined): k is Kind => !!k && (KINDS as readonly string[]).includes(k);

export function parse(path: string, search = ''): Route {
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(search).get('q') ?? '';
  switch (parts[0]) {
    case 'triage': return { name: 'triage', id: parts[1] };
    case 'reports': return { name: 'reports', mode: 'all', ...(q ? { preset: { query: q } } : {}) };
    case 'pinned': return { name: 'reports', mode: 'pinned' };
    case 'archive': return { name: 'reports', mode: 'archive' };
    case 'kind': return isKind(parts[1]) ? { name: 'reports', mode: 'all', preset: { project: 'all', stream: null, kinds: [parts[1]] } } : { name: 'home' };
    case 'p':
      if (!parts[1]) return { name: 'home' };
      if (parts[2] === 'stream' && parts[3]) return { name: 'reports', mode: 'all', preset: { project: parts[1], stream: parts[3], kinds: [] } };
      return { name: 'project', id: parts[1], ...(parts[2] === 'kind' && isKind(parts[3]) ? { kind: parts[3] } : {}) };
    default: return { name: 'home' };
  }
}

/** A report's own page. Its id in the hub data is "<project>/<slug>". */
export const reportHref = (id: string, version?: number) => { const [p, slug] = id.split('/'); return `/p/${p}/r/${slug}/${version ? `v${version}/` : ''}`; };

export function href(r: Route): string {
  switch (r.name) {
    case 'home': return '/';
    case 'triage': return r.id ? `/triage/${encodeURIComponent(r.id)}` : '/triage';
    case 'reports': return r.mode === 'all' ? '/reports' : `/${r.mode}`;
    case 'project': return `/p/${r.id}/${r.kind ? `kind/${r.kind}/` : ''}`;
    case 'report': return reportHref(r.id, r.version);
  }
}

export function useRoute(): [Route, (r: Route) => void, () => void] {
  const [route, setRoute] = React.useState<Route>(() => parse(location.pathname, location.search));
  React.useEffect(() => {
    const on = () => setRoute(parse(location.pathname, location.search));
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  const go = React.useCallback((r: Route) => {
    if (r.name === 'report') { location.href = href(r); return; } // the Worker serves it, under the bar
    history.pushState(null, '', href(r));
    setRoute(r);
  }, []);
  const back = React.useCallback(() => { if (history.length > 1) history.back(); else go({ name: 'home' }); }, [go]);
  return [route, go, back];
}
