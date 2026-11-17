// Roost components: types as documentation. The global is window.Roost; every export below is a member of it.
import * as React from 'react';

// ---------- types ----------
/** The report-builder skill's eight report types; Roost files every report as one of them. */
export declare const KINDS: readonly ["investigation", "architecture", "audit", "benchmark", "decision", "postmortem", "status", "changelog"];
export type Kind = (typeof KINDS)[number];
export declare const KIND_LABEL: Record<Kind, string>;
/** Chart slot (1–8) per kind: a kind keeps its colour everywhere, as the skill's kind tags do. */
export declare const KIND_SLOT: Record<Kind, number>;
export declare const kindLabel: (k: Kind) => string;
/** The report-builder's six palettes; each carries light and dark. */
export declare const PALETTES: readonly ["catppuccin", "everforest", "github", "rosepine", "dracula", "nord"];
export type Palette = (typeof PALETTES)[number];
export declare const PALETTE_LABEL: Record<Palette, string>;
/** System follows the operating system; the button cycles System → Light → Dark, as reports do. */
export type Mode = 'system' | 'light' | 'dark';
export type Tone = 'good' | 'warning' | 'serious' | 'critical';
export interface Version {
    n: number;
    at: string;
    note: string;
    file: string;
}
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
export interface Project {
    id: string;
    name: string;
    remote: string;
    headline: string;
    description: string;
    streams: {
        id: string;
        about: string;
    }[];
}
export interface Secret {
    file: string;
    line: number;
    kind: string;
    masked: string;
}
export interface TriageEntry {
    id: string;
    reportId: string;
    run: string;
    at: string;
    matchedBy: string;
    proposed: {
        project: string;
        stream?: string | null;
        kind: Kind;
    };
    /** Why Claude filed it there, in one sentence. */
    why?: string;
    secrets?: Secret[];
}
export interface HubData {
    now: string;
    projects: Project[];
    reports: Report[];
    triage: TriageEntry[];
}

// ---------- icons ----------
declare const P: Record<string, string>;
export type IconName = keyof typeof P | string;
export declare const ICON_NAMES: string[];
export declare function Icon({ name, className, label }: {
    name: IconName;
    className?: string;
    label?: string;
}): React.JSX.Element;
/** The Roost mark: a bird on a perch, in the accent colour. */
export declare function Mark({ className }: {
    className?: string;
}): React.JSX.Element;
export {};

// ---------- core ----------
export declare const cx: (...xs: (string | false | null | undefined)[]) => string;
export interface RootContextValue {
    palette: Palette;
    mode: Mode;
}
export declare const RootContext: React.Context<RootContextValue>;
export declare const useRoost: () => RootContextValue;
export interface RootProps {
    /** One of the report-builder palettes. Default catppuccin. */
    palette?: Palette;
    /** system follows the operating system. */
    mode?: Mode;
    /** app: a full-height frame; put one div.roost-scroll inside it. */
    app?: boolean;
    /** hub: the hub screens' look (page fill, 14px type). Leave off around a report. */
    hub?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}
/** Sets a palette and light/dark on its subtree; every Roost part reads its colours from here. */
export declare function Root({ palette, mode, app, hub, className, style, children }: RootProps): React.JSX.Element;
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** default: a strong outline. outline: a hairline. ghost: no frame. destructive: red outline. primary: accent fill (rare). */
    variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'primary';
    size?: 'md' | 'sm';
    icon?: IconName;
    /** Icon after the label ("Open report →"). */
    iconAfter?: IconName;
    /** Square, icon only: give aria-label. */
    iconOnly?: boolean;
    block?: boolean;
    pressed?: boolean;
    children?: React.ReactNode;
}
export declare function Button({ variant, size, icon, iconAfter, iconOnly, block, pressed, className, children, type, ...rest }: ButtonProps): React.JSX.Element;
export type BadgeTone = 'accent' | 'good' | 'warning' | 'serious' | 'critical';
/** A pill with a dot. A tone colours dot, tint and edge; the words stay in the text colour. plain: no dot. */
export declare function Badge({ tone, plain, children }: {
    tone?: BadgeTone;
    plain?: boolean;
    children?: React.ReactNode;
}): React.JSX.Element;
/** A report's type as a badge, in the colour that type keeps everywhere. */
export declare function KindBadge({ kind }: {
    kind: Kind;
}): React.JSX.Element;
/** A square icon well: accent (sections, projects) or quiet (streams). */
export declare function Tile({ icon, quiet, large }: {
    icon: IconName;
    quiet?: boolean;
    large?: boolean;
}): React.JSX.Element;
export { Icon };

// ---------- shell ----------
/** The panel every block sits on: card fill, hairline edge, 16px corners. */
export declare function Panel({ as, className, children, style }: {
    as?: 'div' | 'section' | 'article' | 'header';
    className?: string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
}): React.JSX.Element;
/** Two columns (Recent | Active streams and Projects); their first heads share a line. On desktop they are panes: the
 * page scrolls until their tops reach the docked bar, triage panel and pinned reports, and from there each column
 * scrolls on its own. Scrolling back up past a column's top hands the scroll back to the page. Children: div.hub-col. */
export declare function Columns({ children, panes, className }: {
    children?: React.ReactNode;
    panes?: boolean;
    className?: string;
}): React.JSX.Element;
export interface HubBarProps {
    name?: string;
    onHome?: () => void;
    /** Where the page sits, after Roost: [ZenithMD › releases › ZenithMD changelog]. The last is the current page. Home passes none. */
    crumbs?: Crumb[];
    children?: React.ReactNode;
}
/** The hub's header, on every screen including reports: the mark and name (home), the breadcrumbs, then the page's controls
 * (search, and a Settings button that opens Settings, where the palette and light/dark live).
 * It never scrolls away: its dock sticks to the top of the page, and the page fades out under it.
 * On phones the breadcrumbs take a second row inside the bar. */
export declare function HubBar({ name, onHome, crumbs, children }: HubBarProps): React.JSX.Element;
export declare function SearchField({ value, onChange, placeholder, shortcut }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    shortcut?: string;
}): React.JSX.Element;
export interface Crumb {
    label: string;
    onClick?: () => void;
}
/** Breadcrumbs live in the HubBar only. lead: a chevron before the first item, after the brand. */
export declare function Breadcrumbs({ items, lead }: {
    items: Crumb[];
    lead?: boolean;
}): React.JSX.Element;
/** A 24px title with an optional tile and a caption line under it. Breadcrumbs go in the HubBar, not here. */
export declare function PageTitle({ title, caption, icon }: {
    title: React.ReactNode;
    caption?: React.ReactNode;
    icon?: IconName;
}): React.JSX.Element;
/** A section's head: a 14px title, a quiet count beside it, actions at the end. */
export declare function SectionHead({ title, count, children, id }: {
    title: React.ReactNode;
    count?: React.ReactNode;
    children?: React.ReactNode;
    id?: string;
}): React.JSX.Element;
export declare function EmptyState({ title, children }: {
    title: string;
    children?: React.ReactNode;
}): React.JSX.Element;
/** A strip under the HubBar on a report, saying why it is not an ordinary published report: waiting, held back, archived, an older version. */
export declare function Banner({ tone, label, text, actionLabel, onAction }: {
    tone?: Tone;
    label: string;
    text?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}): React.JSX.Element;

// ---------- lists ----------
/** A panel holding rows; each row draws its own divider. */
export declare function RowList({ children, className }: {
    children?: React.ReactNode;
    className?: string;
}): React.JSX.Element;
export interface ReportItemProps {
    title: string;
    /** The report's headline, one line, cut with an ellipsis. */
    summary?: string;
    kind: Kind;
    project: string;
    stream?: string | null;
    /** "2h ago", "v2 · 17h ago" */
    when: string;
    /** Unread: the accent dot before the title. */
    isNew?: boolean;
    pinned?: boolean;
    archived?: boolean;
    /** A state that is not plain published (Waiting, Held back). */
    status?: {
        tone?: 'warning' | 'critical' | 'accent';
        label: string;
    };
    /** compact: no dot column (inside stream cards). */
    compact?: boolean;
    /** The first row in its list: no divider above it. */
    first?: boolean;
    onOpen?: () => void;
}
export declare function ReportItem(p: ReportItemProps): React.JSX.Element;
/** A small trend: values left to right, the last one marked. No axes, so always beside a count. */
export declare function Sparkline({ values, label }: {
    values: number[];
    label?: string;
}): React.JSX.Element;
export interface StreamItemProps {
    name: string;
    caption: string;
    trend?: number[];
    count: string;
    first?: boolean;
    onOpen?: () => void;
}
export declare function StreamItem({ name, caption, trend, count, first, onOpen }: StreamItemProps): React.JSX.Element;
export interface ProjectItemProps {
    name: string;
    caption: string;
    when?: string;
    first?: boolean;
    onOpen?: () => void;
}
export declare function ProjectItem({ name, caption, when, first, onOpen }: ProjectItemProps): React.JSX.Element;
export interface Pin {
    id: string;
    title: string;
    kind: Kind;
    where: string;
    onOpen?: () => void;
}
/** Pinned reports as small panels in one row that scrolls sideways. On desktop the row stays in view (sticky dock under the
 * HubBar and any TriagePanel); put it in a `section.hub-sec.hub-pins-sec` after its SectionHead, which scrolls away. */
export declare function PinStrip({ items }: {
    items: Pin[];
}): React.JSX.Element;
export interface StreamCardProps {
    name: string;
    caption: string;
    allLabel?: string;
    onAll?: () => void;
    children?: React.ReactNode;
    icon?: 'branch' | 'folder';
}
/** A stream's latest reports in a panel: head (tile, name, counts, "All N"), then compact ReportItems. */
export declare function StreamCard({ name, caption, allLabel, onAll, children, icon }: StreamCardProps): React.JSX.Element;
/** A collapsed panel that opens in place (Done streams). */
export declare function Disclosure({ title, caption, open, onToggle, children }: {
    title: string;
    caption?: string;
    open: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
}): React.JSX.Element;

// ---------- triage ----------
export interface TriagePanelItem {
    id: string;
    title: string;
    where: string;
    kind: Kind;
    when: string;
    /** Likely secrets: shows the finding badge and Review instead of Confirm. */
    findings?: string;
    onOpen?: () => void;
    onConfirm?: () => void;
    onReview?: () => void;
    onReclassify?: () => void;
}
/** Reports waiting for a person, in one accent-edged panel: a head, then one column per report (stacked on phones).
 * On desktop it stays in view under the HubBar while it is on the page (sticky dock). */
export declare function TriagePanel({ title, caption, items, onReviewAll, reviewAllLabel }: {
    title: string;
    caption?: string;
    items: TriagePanelItem[];
    onReviewAll?: () => void;
    reviewAllLabel?: string;
}): React.JSX.Element;
export interface InboxItemProps {
    title: string;
    when: string;
    where: string;
    kind: Kind;
    findings?: string;
    selected?: boolean;
    first?: boolean;
    onSelect?: () => void;
}
/** One waiting report in the triage inbox; the selected one is tinted. */
export declare function InboxItem(p: InboxItemProps): React.JSX.Element;
/** Phones: back home, "Triage · 1 of 3", previous and next. */
export declare function TriagePager({ position, total, onHome, onPrev, onNext }: {
    position: number;
    total: number;
    onHome?: () => void;
    onPrev?: () => void;
    onNext?: () => void;
}): React.JSX.Element;
/** The detail's head: status badge and how it arrived, the title, the headline, and Open report. */
export declare function DetailHead({ status, tone, line, title, lead, openLabel, onOpen }: {
    status: string;
    tone: 'warning' | 'critical' | 'good';
    line: string;
    title: string;
    lead?: string;
    openLabel?: string;
    onOpen?: () => void;
}): React.JSX.Element;
/** Claude's proposed filing: project › stream as type, and why. */
export declare function ProposedBox({ label, project, stream, kind, why }: {
    label?: string;
    project: string;
    stream?: string | null;
    kind: Kind;
    why?: string;
}): React.JSX.Element;
export interface SecretFinding {
    file: string;
    line: number;
    kind: string;
    masked: string;
}
/** The secret scan's findings, numbered, with masked values. */
export declare function SecretList({ items, label }: {
    items: SecretFinding[];
    label?: string;
}): React.JSX.Element;
/** A bordered message: critical (held back) or good (filed). */
export declare function Alert({ tone, title, children }: {
    tone?: 'critical' | 'good';
    title: string;
    children?: React.ReactNode;
}): React.JSX.Element;

// ---------- forms ----------
export interface Option {
    value: string;
    label: string;
}
/** A native select in the hub's 36px frame. */
export declare function Select({ label, value, options, onChange, width }: {
    label: string;
    value: string;
    options: Option[];
    onChange: (v: string) => void;
    width?: number | string;
}): React.JSX.Element;
/** A labelled field: label above, control, optional hint. */
export declare function Field({ label, hint, children }: {
    label: string;
    hint?: string;
    children?: React.ReactNode;
}): React.JSX.Element;
export declare function Switch({ label, checked, onChange }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}): React.JSX.Element;
export declare function Checkbox({ checked, onChange, children }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    children?: React.ReactNode;
}): React.JSX.Element;
export interface RadioOption {
    value: string;
    label: string;
    hint?: string;
}
export declare function RadioGroup({ name, label, value, options, onChange }: {
    name: string;
    label: string;
    value: string;
    options: RadioOption[];
    onChange: (v: string) => void;
}): React.JSX.Element;
export declare function TextField({ label, value, onChange, hint, placeholder }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    hint?: string;
    placeholder?: string;
}): React.JSX.Element;
/** Two or three exclusive views: By stream / By kind. */
export declare function ToggleGroup({ label, value, options, onChange }: {
    label: string;
    value: string;
    options: (Option & {
        icon?: IconName;
    })[];
    onChange: (v: string) => void;
}): React.JSX.Element;
/** "Kind" filter: a button that opens a checklist of the eight types; the count shows how many are on. */
export declare function KindMenu({ value, onChange, kinds, defaultOpen }: {
    value: Kind[];
    onChange: (v: Kind[]) => void;
    kinds?: Kind[];
    defaultOpen?: boolean;
}): React.JSX.Element;
/** The eight types as a two-column checklist (filter sheet). */
export declare function KindChecklist({ value, onChange, kinds }: {
    value: Kind[];
    onChange: (v: Kind[]) => void;
    kinds?: Kind[];
}): React.JSX.Element;

// ---------- overlays ----------
export interface SheetProps {
    open: boolean;
    side?: 'right' | 'bottom';
    title: string;
    description?: string;
    onClose?: () => void;
    children?: React.ReactNode;
}
/** A panel from the right (desktop) or the bottom (phone), over a dimmed page. Place it inside a Root app. */
export declare function Sheet({ open, side, title, description, onClose, children }: SheetProps): React.JSX.Element | null;
export declare const SheetBody: ({ children }: {
    children?: React.ReactNode;
}) => React.JSX.Element;
export declare const SheetFooter: ({ children }: {
    children?: React.ReactNode;
}) => React.JSX.Element;
export interface DialogProps {
    open: boolean;
    title: string;
    description?: string;
    onClose?: () => void;
    children?: React.ReactNode;
}
export declare function Dialog({ open, title, description, onClose, children }: DialogProps): React.JSX.Element | null;
export declare const DialogBody: ({ children }: {
    children?: React.ReactNode;
}) => React.JSX.Element;
export declare const DialogFooter: ({ children }: {
    children?: React.ReactNode;
}) => React.JSX.Element;
export declare function Toast({ open, message, actionLabel, onAction, onClose }: {
    open: boolean;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    onClose?: () => void;
}): React.JSX.Element | null;
export interface MenuVersion {
    n: number;
    at: string;
    note: string;
}
export interface ReportMenuProps {
    versions: MenuVersion[];
    current: number;
    formatDate?: (iso: string) => string;
    open?: boolean;
    onToggle?: () => void;
    onSelectVersion?: (n: number) => void;
    pinned?: boolean;
    onTogglePin?: () => void;
    archived?: boolean;
    onToggleArchive?: () => void;
    onCopyLink?: () => void;
    /** Phones: the button reads "v2" instead of "v2 of 2". */
    compact?: boolean;
}
/** In the HubBar on a report: the version button. Its menu lists every version, then Pin, Archive and Copy link. */
export declare function ReportMenu(p: ReportMenuProps): React.JSX.Element;

// ---------- charts ----------
/** A chart from a report-builder spec: {"type": "column", "labels": [...], "series": [...], ...}. */
export declare function Chart({ spec }: {
    spec: Record<string, unknown>;
}): React.JSX.Element;
/** An inline sparkline: always beside a number that states the value. */
export declare function Spark({ values, label }: {
    values: string | number[];
    label?: string;
}): React.JSX.Element;
