// The hub's data: GET /api/hub (src/hub.ts in the Worker), loaded once per page load, before any screen renders.
import type { HubData, Kind, Mode, Palette, Project, Report, TriageEntry } from '@roost/ui';
import { KINDS, kindLabel } from '@roost/ui';

/** The API adds a few fields to the design system's Report: the report's h1 (claim) and each version's URL (file). */
export interface SampleReport extends Omit<Report, 'versions'> { claim: string; versions: { n: number; at: string; note: string; file: string }[]; legacy?: boolean }
export interface Sample extends Omit<HubData, 'reports'> { reports: SampleReport[]; prefs: { theme: Mode; palette: Palette } }

async function load(): Promise<Sample> {
  const res = await fetch('/api/hub', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`/api/hub answered ${res.status}`);
  return res.json();
}
export const data = await load();
export const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? id;
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const n = (k: number, one: string, many = one + 's') => `${k} ${k === 1 ? one : many}`;
export const projectById: Record<string, Project> = Object.fromEntries(data.projects.map((p) => [p.id, p]));
export const triageByReport: Record<string, TriageEntry> = Object.fromEntries(data.triage.map((t) => [t.reportId, t]));

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const word = (n: number) => WORDS[n] ?? String(n);
export const Word = (n: number) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');
export const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const short = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
export const longDay = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const hm = (iso: string) => { const d = new Date(iso); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);

/** Relative to the server's time when the data was read. */
export function ago(iso: string) {
  const m = Math.round((new Date(data.now).getTime() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)}h ago`;
  const days = Math.round(m / 1440);
  return days === 1 ? 'Yesterday' : days < 14 ? `${days} days ago` : day(iso);
}
export const ageDays = (iso: string) => (new Date(data.now).getTime() - new Date(iso).getTime()) / 86400000;

export { KINDS, kindLabel };
export type { Kind, Mode, Palette };
