import * as React from 'react';

// 24px stroke icons drawn in currentColor. Roost uses few: the reports themselves use none.
const P: Record<string, string> = {
  search: 'M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM16 16l5 5',
  pin: 'M9 4h6M10 4v6l-3 4h10l-3-4V4M12 14v6',
  archive: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4',
  inbox: 'M4 13l2.5-8h11L20 13M4 13v6h16v-6M4 13h4.5l1 2h5l1-2H20',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM12 9v4M12 16h.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  history: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4l3 2',
  link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  folder: 'M3 6h6l2 2h10v11H3z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  'chevron-left': 'M15 6l-6 6 6 6',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  branch: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
  palette: 'M12 3a9 9 0 0 0 0 18c1 0 1.6-.8 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6h2A4.6 4.6 0 0 0 21 11c0-4.4-4-8-9-8ZM7.5 12.5h.01M9.5 8h.01M14.5 8h.01M17 11.5h.01',
  'shield-alert': 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM12 8v5M12 16h.01',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.7 2.7L16 9.5',
};

export type IconName = keyof typeof P | string;
export const ICON_NAMES = Object.keys(P);

export function Icon({ name, className, label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg className={className ?? 'roost-icon'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={P[name] ?? ''} />
    </svg>
  );
}

/** The Roost mark: a bird on a perch, in the accent colour. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M14.5 5.5a3 3 0 0 1 3 3v.5l2.5 1-2.6.9A6 6 0 0 1 11.5 16H9l-2 3H5.5l1.6-3.1A5 5 0 0 1 4 11.5c2 .8 4 .9 6 .2a4.5 4.5 0 0 0 1.5-3.2 3 3 0 0 1 3-3Z" />
      <rect x="3" y="20" width="18" height="1.6" rx=".8" />
    </svg>
  );
}
