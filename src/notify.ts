// ntfy pushes (SPEC 5.6): title, project, kind and URL only, never report content.
export interface NotifyEnv { NTFY_TOPIC?: string; NTFY_SERVER?: string }

export async function notify(env: NotifyEnv, n: { title: string; project: string; kind: string; url: string; needsYou: boolean }) {
  if (!env.NTFY_TOPIC) return;
  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  // Header values must be Latin-1; ntfy reads RFC 2047 encoded words for anything else.
  const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`);
  try {
    await fetch(`${server}/${env.NTFY_TOPIC}`, {
      method: 'POST',
      body: `${n.project} · ${n.kind}${n.needsYou ? ' · needs you' : ''}`,
      headers: { Title: header(n.title), Tags: n.needsYou ? 'needs-you' : 'published', Click: n.url, Priority: n.needsYou ? '4' : '3' },
    });
  } catch (e) {
    console.error('ntfy failed', e);
  }
}
