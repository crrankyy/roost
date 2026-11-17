// Shared vocabulary: report kinds, palettes, and the shapes of Roost's data.

/** The report-builder skill's eight report types; Roost files every report as one of them. */
export const KINDS = ['investigation', 'architecture', 'audit', 'benchmark', 'decision', 'postmortem', 'status', 'changelog'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  investigation: 'Investigation', architecture: 'Architecture', audit: 'Audit', benchmark: 'Benchmark',
  decision: 'Decision', postmortem: 'Postmortem', status: 'Status', changelog: 'Changelog',
};
/** Chart slot (1–8) per kind: a kind keeps its colour everywhere, as the skill's kind tags do. */
export const KIND_SLOT: Record<Kind, number> = {
  investigation: 1, architecture: 2, audit: 3, benchmark: 4, decision: 5, postmortem: 6, status: 7, changelog: 8,
};
export const kindLabel = (k: Kind) => KIND_LABEL[k] ?? k;

/** The report-builder's six palettes; each carries light and dark. */
export const PALETTES = ['catppuccin', 'everforest', 'github', 'rosepine', 'dracula', 'nord'] as const;
export type Palette = (typeof PALETTES)[number];
export const PALETTE_LABEL: Record<Palette, string> = {
  catppuccin: 'Catppuccin', everforest: 'Everforest', github: 'GitHub', rosepine: 'Rosé Pine', dracula: 'Dracula', nord: 'Nord',
};

/** System follows the operating system; the button cycles System → Light → Dark, as reports do. */
export type Mode = 'system' | 'light' | 'dark';

export type Tone = 'good' | 'warning' | 'serious' | 'critical';

export interface Version { n: number; at: string; note: string; file: string }

export interface Report {
  id: string;
  title: string;
  lead: string;
  kind: Kind;
  project: string;
  stream?: string | null;
  palette: Palette;
  slug: string;
  versions: Version[];
  state: 'published' | 'triage' | 'quarantined' | 'rejected';
  pinned?: boolean;
  archived?: boolean;
  unread?: boolean;
  by: string;
  board?: string;
}

export interface Project { id: string; name: string; remote: string; headline: string; description: string; streams: { id: string; about: string }[] }

export interface Secret { file: string; line: number; kind: string; masked: string }

export interface TriageEntry {
  id: string;
  reportId: string;
  run: string;
  at: string;
  matchedBy: string;
  proposed: { project: string; stream?: string | null; kind: Kind };
  /** Why Claude filed it there, in one sentence. */
  why?: string;
  secrets?: Secret[];
}

export interface HubData { now: string; projects: Project[]; reports: Report[]; triage: TriageEntry[] }
