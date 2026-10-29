// Storage schemas (PLAN 3.2). Pure transforms over these arrive with the publish API.

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
