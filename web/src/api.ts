// Calls to the Worker's viewer API, shared by the hub app and the report bar (which must not load the hub data).
import type { Mode } from '@roost/ui';

/** A same-origin POST to the Worker's viewer API; throws with the server's message. */
export async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? `HTTP ${res.status}`);
  return res.json();
}
/** report.js reads this key, so a report opened on its own follows the hub's light/dark choice. */
export function rememberMode(mode: Mode) { try { if (mode === 'system') localStorage.removeItem('report-theme'); else localStorage.setItem('report-theme', mode); } catch { /* storage off */ } }
