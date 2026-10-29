// Lynx design system — component props (documentation; the runtime is window.Lynx).
import type * as React from 'react'

/** A navigation entry for MenuBar and GlowSidebar. */
export interface NavItem {
  /** 20px lucide icon element, e.g. <Home className="h-5 w-5" /> */
  icon: React.ReactNode
  label: string
  href: string
  /** CSS radial-gradient for the item's hover glow, in the item's hue. */
  gradient: string
  /** Hover icon class: 'group-hover:text-blue-500' | '…orange-500' | '…green-500' | '…red-500' | '…violet-500' | '…pink-500' | '…emerald-400' */
  iconColor: string
}
/** Horizontal frosted nav with 3D X-flip and hue bloom on hover. */
export interface MenuBarProps {
  /** Defaults: Home (blue), Notifications (orange), Settings (green), Profile (red). */
  items?: NavItem[]
}
/** Vertical 256px frosted nav card with 3D Y-flip and hue bloom on hover. */
export interface GlowSidebarProps {
  items?: NavItem[]
}
/** One outlined icon button: sun in the light theme, moon in the dark; click switches. Reads and writes the theme on <html>. No props. */
export interface ThemeToggleProps {}
/** Lynx's live avatar: slowly spinning blurred ring + glowing orb, breathing. */
export interface LiveAvatarProps {
  /** Diameter in px. Default 32 */
  size?: number
  /** Catppuccin accent for the ring and orb. Default "flamingo" */
  hue?: 'rosewater' | 'flamingo' | 'pink' | 'mauve' | 'red' | 'maroon' | 'peach' | 'yellow' | 'green' | 'teal' | 'sky' | 'sapphire' | 'blue' | 'lavender'
  /** Accessible name. Default "Lynx" */
  label?: string
  className?: string
}
export interface Citation {
  label: string
  type: 'Blog post' | 'GitHub repo' | 'Document'
  href: string
}
/** Numbered source marker with a hover/focus preview. */
export interface CitationPillProps {
  citation: Citation
  /** 0-based; shown as index + 1 */
  index: number
}
/** The push-control for commands. `buttonVariants({ variant, size })` gives the same classes for links. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** All variants are an outline + label, no fill; a glow in the variant's hue fills the button on hover, clipped to the outline. default: foreground outline, blue · outline: border outline, mauve · secondary · ghost: agent-soft hover · destructive: red halo · link: agent text */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** default h-9 · sm h-8 (radius-lg, text-xs) · lg h-10 · icon 36×36 */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Render the single child (e.g. an <a>) with button styling. */
  asChild?: boolean
}

/** Parts: ButtonGroup (root), ButtonGroupText (frosted prefix/suffix tile), ButtonGroupSeparator (divider between filled buttons). Also exports buttonGroupVariants. */
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lay children out in a row (shared vertical edges) or a column. */
  orientation?: 'horizontal' | 'vertical'
  /** Accessible name for the role="group" container. */
  'aria-label'?: string
  /** Buttons, Inputs, SelectTriggers, ButtonGroupText, ButtonGroupSeparator or nested ButtonGroups. */
  children?: React.ReactNode
}

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style: quiet (`default`) or with a frosted edge (`outline`). */
  variant?: 'default' | 'outline'
  /** h-9 default, h-8 rounded-lg text-xs `sm`, h-10 `lg`. */
  size?: 'default' | 'sm' | 'lg'
  /** Controlled on state. */
  pressed?: boolean
  /** Initial on state when uncontrolled. */
  defaultPressed?: boolean
  /** Called with the new on state. */
  onPressedChange?: (pressed: boolean) => void
  /** Disable interaction (renders at 30% opacity). */
  disabled?: boolean
  /** Merge the toggle behaviour into the child element. */
  asChild?: boolean
}

/** Parts: ToggleGroup (frosted tray root) and ToggleGroupItem (a Toggle with a `value`). */
export interface ToggleGroupProps {
  /** One item on at a time, or any number. */
  type: 'single' | 'multiple'
  /** Controlled value: a string for `single`, a string array for `multiple`. */
  value?: string | string[]
  /** Initial value when uncontrolled. */
  defaultValue?: string | string[]
  /** Called with the new value. */
  onValueChange?: (value: string | string[]) => void
  /** Variant applied to every item. */
  variant?: 'default' | 'outline'
  /** Size applied to every item. */
  size?: 'default' | 'sm' | 'lg'
  /** Disable every item. */
  disabled?: boolean
  /** Arrow-key direction. */
  orientation?: 'horizontal' | 'vertical'
  /** Accessible name for the group. */
  'aria-label'?: string
  className?: string
  children?: React.ReactNode
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Native input type (text, email, search, url, password, file …). */
  type?: string
  /** Example or hint text; never a substitute for a Label. */
  placeholder?: string
  /** Marks the value invalid: the edge turns destructive. Pair with aria-describedby. */
  'aria-invalid'?: boolean | 'true' | 'false'
  /** Disable the field (30% opacity, not-allowed cursor). */
  disabled?: boolean
  className?: string
}

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** id of the control this label names. */
  htmlFor?: string
  /** Label text, sentence case, no trailing colon. */
  children?: React.ReactNode
  /** Render the child element as the label. */
  asChild?: boolean
  className?: string
}

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Controlled state. */
  checked?: boolean | 'indeterminate'
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean | 'indeterminate'
  /** Called with the new state. */
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  /** Disable the checkbox (30% opacity). */
  disabled?: boolean
  /** Mark as required in a form. */
  required?: boolean
  /** Form field name and submitted value. */
  name?: string
  value?: string
  /** id for the associated Label's htmlFor. */
  id?: string
}

/** Parts: RadioGroup (root, a grid with gap-2) and RadioGroupItem (`value`, `id`, `disabled`). */
export interface RadioGroupProps {
  /** Controlled selected value. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void
  /** Disable every item. */
  disabled?: boolean
  /** Require a selection in a form. */
  required?: boolean
  /** Form field name. */
  name?: string
  /** Arrow-key direction. */
  orientation?: 'horizontal' | 'vertical'
  /** Accessible name for the group. */
  'aria-label'?: string
  className?: string
  children?: React.ReactNode
}

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Controlled on state. */
  checked?: boolean
  /** Initial on state when uncontrolled. */
  defaultChecked?: boolean
  /** Called with the new on state. */
  onCheckedChange?: (checked: boolean) => void
  /** Disable the switch (30% opacity). */
  disabled?: boolean
  /** Form field name and submitted value. */
  name?: string
  value?: string
  /** id for the associated Label's htmlFor. */
  id?: string
}

/** Parts: Select (root), SelectTrigger, SelectValue (`placeholder`), SelectContent (`position`: 'popper' | 'item-aligned'), SelectGroup, SelectLabel, SelectItem (`value`, `disabled`), SelectSeparator, SelectScrollUpButton, SelectScrollDownButton. */
export interface SelectProps {
  /** Controlled selected value. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void
  /** Controlled open state of the list. */
  open?: boolean
  /** Initial open state. */
  defaultOpen?: boolean
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Disable the trigger (30% opacity). */
  disabled?: boolean
  /** Form field name and required flag. */
  name?: string
  required?: boolean
  children?: React.ReactNode
}

/** Parts: InputGroup (root), InputGroupInput, InputGroupTextarea, InputGroupAddon (`align`), InputGroupText, InputGroupButton (`size`, `variant`). */
export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Set to "true" when the inner control is disabled so addons fade too. */
  'data-disabled'?: 'true' | 'false'
  /** One InputGroupInput or InputGroupTextarea plus any InputGroupAddons. */
  children?: React.ReactNode
}

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Where the addon sits relative to the control. */
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
}

export interface InputGroupButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Compact sizes that fit inside the field. */
  size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm'
  /** Any Button variant. */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

/** Parts: FieldSet, FieldLegend (`variant`), FieldGroup, Field, FieldContent, FieldLabel, FieldTitle, FieldDescription, FieldSeparator, FieldError (`errors`). Documented here: Field. */
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stack label above control, put them in a row, or row from the md breakpoint. */
  orientation?: 'vertical' | 'horizontal' | 'responsive'
  /** Set to "true" to tint the label and text destructive. */
  'data-invalid'?: 'true' | 'false'
  /** Set to "true" to fade labels to 50%. */
  'data-disabled'?: 'true' | 'false'
  children?: React.ReactNode
}

export interface FieldErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Validation errors; one message renders inline, several as a list. Ignored when children are given. */
  errors?: Array<{ message?: string } | undefined>
}

/** Wraps react-day-picker's DayPicker; every DayPicker prop passes through. Part: CalendarDayButton. */
export interface CalendarProps {
  /** Selection behaviour. */
  mode?: 'single' | 'multiple' | 'range'
  /** Selected date(s): a Date, Date[], or { from, to } for ranges. */
  selected?: Date | Date[] | { from?: Date; to?: Date }
  /** Called with the new selection. */
  onSelect?: (value: any) => void
  /** Month shown first. */
  defaultMonth?: Date
  /** Date treated as today (highlighted agent-soft). */
  today?: Date
  /** Show days from adjacent months (muted). */
  showOutsideDays?: boolean
  /** Month caption: plain label or month/year dropdowns. */
  captionLayout?: 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years'
  /** Button variant for the previous/next arrows. */
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** Matchers for unselectable days. */
  disabled?: any
  /** Number of months shown side by side. */
  numberOfMonths?: number
  className?: string
}

/**
 * Modal dialog. Parts: DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogOverlay, DialogPortal.
 */
export interface DialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes (overlay click, Esc, close X). */
  onOpenChange?: (open: boolean) => void
  /** Trap focus and block the page behind (default true). */
  modal?: boolean
  /** Trigger, DialogContent and its parts. */
  children?: React.ReactNode
}

/**
 * Blocking confirmation dialog. Parts: AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction.
 */
export interface AlertDialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Called when the dialog opens or closes (Cancel, Action, Esc). */
  onOpenChange?: (open: boolean) => void
  /** Trigger, AlertDialogContent and its parts. */
  children?: React.ReactNode
}

/**
 * Edge panel built on Dialog. Parts: SheetTrigger, SheetContent (side), SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose.
 */
export interface SheetProps {
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Called when the sheet opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Edge the panel slides from (set on SheetContent). */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Trigger, SheetContent and its parts. */
  children?: React.ReactNode
}

/**
 * Draggable bottom drawer (vaul). Parts: DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose.
 */
export interface DrawerProps {
  /** Controlled open state. */
  open?: boolean
  /** Called when the drawer opens or closes (drag, overlay, Esc). */
  onOpenChange?: (open: boolean) => void
  /** Scale the page behind while open (needs a [vaul-drawer-wrapper]); default true. */
  shouldScaleBackground?: boolean
  /** Trigger, DrawerContent and its parts. */
  children?: React.ReactNode
}

/**
 * Anchored floating panel. Parts: PopoverTrigger, PopoverContent (align, side, sideOffset).
 */
export interface PopoverProps {
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Alignment of content against the trigger (on PopoverContent). */
  align?: 'start' | 'center' | 'end'
  /** Preferred side (on PopoverContent). */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Trigger and PopoverContent. */
  children?: React.ReactNode
}

/**
 * Hover preview. Parts: HoverCardTrigger, HoverCardContent (align, side).
 */
export interface HoverCardProps {
  /** Controlled open state. */
  open?: boolean
  /** Called when the card opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Delay in ms before opening (default 700). */
  openDelay?: number
  /** Delay in ms before closing (default 300). */
  closeDelay?: number
  /** Trigger and HoverCardContent. */
  children?: React.ReactNode
}

/**
 * Hover/focus label. Parts: TooltipProvider (once per app), TooltipTrigger, TooltipContent (side, sideOffset).
 */
export interface TooltipProps {
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Called when the tooltip opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Override the provider's delay in ms. */
  delayDuration?: number
  /** Trigger and TooltipContent. */
  children?: React.ReactNode
}

/**
 * Button-anchored action menu. Parts: DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem (inset, disabled), DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent.
 */
export interface DropdownMenuProps {
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Block outside interaction while open (default true). */
  modal?: boolean
  /** Trigger and DropdownMenuContent. */
  children?: React.ReactNode
}

/**
 * Right-click menu. Parts: ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent.
 */
export interface ContextMenuProps {
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Block outside interaction while open (default true). */
  modal?: boolean
  /** ContextMenuTrigger (the target region) and ContextMenuContent. */
  children?: React.ReactNode
}

/**
 * shadcn Menubar (exported as AppMenubar and Menubar). Parts: MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarLabel, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubTrigger, MenubarSubContent.
 */
export interface AppMenubarProps {
  /** Controlled value of the open menu ('' when closed). */
  value?: string
  /** Uncontrolled initially open menu. */
  defaultValue?: string
  /** Called when the open menu changes. */
  onValueChange?: (value: string) => void
  /** Wrap keyboard focus from last to first trigger. */
  loop?: boolean
  /** MenubarMenu elements. */
  children?: React.ReactNode
}

/**
 * Searchable command list (cmdk). Parts: CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup (heading), CommandItem (onSelect, disabled), CommandShortcut, CommandSeparator.
 */
export interface CommandProps {
  /** Controlled search value. */
  value?: string
  /** Called when the selected item changes. */
  onValueChange?: (value: string) => void
  /** Custom filter; return a 0..1 rank. Default fuzzy match. */
  filter?: (value: string, search: string) => number
  /** Disable built-in filtering (for async results). */
  shouldFilter?: boolean
  /** Wrap arrow-key navigation. */
  loop?: boolean
  /** CommandInput, CommandList and parts. */
  children?: React.ReactNode
}

/**
 * Tabbed views. Parts: TabsList, TabsTrigger (value, disabled), TabsContent (value).
 */
export interface TabsProps {
  /** Controlled active tab. */
  value?: string
  /** Uncontrolled initial tab. */
  defaultValue?: string
  /** Called when the active tab changes. */
  onValueChange?: (value: string) => void
  /** Layout and arrow-key direction. */
  orientation?: 'horizontal' | 'vertical'
  /** 'automatic' activates on focus; 'manual' on Enter/Space. */
  activationMode?: 'automatic' | 'manual'
  /** TabsList and TabsContent elements. */
  children?: React.ReactNode
}

/**
 * Hierarchy trail. Parts: BreadcrumbList, BreadcrumbItem, BreadcrumbLink (asChild), BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis.
 */
export interface BreadcrumbProps {
  /** Custom separator node (pass to BreadcrumbSeparator children in practice). */
  separator?: React.ReactNode
  /** BreadcrumbList. */
  children?: React.ReactNode
}

/**
 * Page navigation. Parts: PaginationContent, PaginationItem, PaginationLink (isActive, size), PaginationPrevious, PaginationNext, PaginationEllipsis.
 */
export interface PaginationProps {
  /** Additional classes for the nav wrapper. */
  className?: string
  /** PaginationContent. */
  children?: React.ReactNode
  /** On PaginationLink: marks the current page. */
  isActive?: boolean
  /** On PaginationLink: Button size. */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Site navigation with panels. Parts: NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink, NavigationMenuViewport, NavigationMenuIndicator, navigationMenuTriggerStyle().
 */
export interface NavigationMenuProps {
  /** Controlled open item value. */
  value?: string
  /** Uncontrolled initially open item. */
  defaultValue?: string
  /** Called when the open item changes. */
  onValueChange?: (value: string) => void
  /** Delay in ms before a hovered trigger opens (default 200). */
  delayDuration?: number
  /** Layout direction. */
  orientation?: 'horizontal' | 'vertical'
  /** NavigationMenuList. */
  children?: React.ReactNode
}

/**
 * App-shell sidebar. Parts: SidebarProvider, SidebarInset, SidebarTrigger, SidebarRail, SidebarHeader, SidebarContent, SidebarFooter, SidebarSeparator, SidebarInput, SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton (isActive, variant, size, tooltip, hue: 'violet' | 'blue' | 'orange' | 'green' | 'red' | 'pink' — GlowSidebar-style flip and hue glow on hover), SidebarMenuAction, SidebarMenuBadge, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton; hook useSidebar().
 */
export interface SidebarProps {
  /** Visual style of the panel. */
  variant?: 'sidebar' | 'floating' | 'inset'
  /** How it collapses: slide away, shrink to icons, or never. */
  collapsible?: 'offcanvas' | 'icon' | 'none'
  /** Screen edge. */
  side?: 'left' | 'right'
  /** Header, content, footer and rail. */
  children?: React.ReactNode
}

/** Card shell. Parts: CardHeader, CardTitle, CardDescription, CardContent, CardFooter (all div props + className). */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Extra classes merged onto the shell (rounded-2xl, bg-card/75, backdrop-blur-xl, shadow-lg). */
  className?: string
  /** CardHeader / CardContent / CardFooter. */
  children?: React.ReactNode
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual emphasis. */
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

/** Avatar root. Parts: AvatarImage (src, alt, onLoadingStatusChange), AvatarFallback (delayMs). */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size and shape overrides; default is a 40px rounded-xl tile. */
  className?: string
  children?: React.ReactNode
}

/** Table. Parts: TableHeader, TableBody, TableFooter, TableRow (data-state="selected"), TableHead, TableCell, TableCaption. */
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Extra classes on the <table>; the shell wrapper is fixed. */
  className?: string
}

/** Accordion root. Parts: AccordionItem (value), AccordionTrigger, AccordionContent. */
export interface AccordionProps {
  /** One open item at a time, or many. */
  type: 'single' | 'multiple'
  /** (single) Allow closing the open item. */
  collapsible?: boolean
  /** Open item value (single) or values (multiple), uncontrolled. */
  defaultValue?: string | string[]
  /** Controlled open value(s). */
  value?: string | string[]
  /** Called when items open or close. */
  onValueChange?: (value: string | string[]) => void
  /** Disable every item. */
  disabled?: boolean
  className?: string
  children?: React.ReactNode
}

/** Disclosure root. Parts: CollapsibleTrigger (asChild), CollapsibleContent (forceMount). */
export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the trigger toggles. */
  onOpenChange?: (open: boolean) => void
  /** Prevents toggling. */
  disabled?: boolean
}

/** Chart wrapper. Parts: ChartTooltip, ChartTooltipContent (indicator, hideLabel, hideIndicator, nameKey, labelKey), ChartLegend, ChartLegendContent (hideIcon, nameKey), ChartStyle. */
export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Series keys mapped to a label and a colour (or per-theme colours). */
  config: Record<string, { label?: React.ReactNode; icon?: React.ComponentType; color?: string; theme?: { light: string; dark: string } }>
  /** One recharts chart element. */
  children: React.ReactElement
}

/** List row. Parts: ItemMedia (variant), ItemContent, ItemTitle, ItemDescription, ItemActions, ItemHeader, ItemFooter, ItemGroup, ItemSeparator. */
export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Surface treatment. */
  variant?: 'default' | 'outline' | 'muted'
  /** Padding density. */
  size?: 'default' | 'sm'
  /** Render the child element (e.g. an <a>) with item styling. */
  asChild?: boolean
}

/** Keycap. Part: KbdGroup (wraps several Kbd for a chord). */
export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Key label or a lucide icon. */
  children?: React.ReactNode
  className?: string
}

/** Empty state. Parts: EmptyHeader, EmptyMedia (variant 'default' | 'icon'), EmptyTitle, EmptyDescription, EmptyContent. */
export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add `border` here for the dashed outline. */
  className?: string
  children?: React.ReactNode
}

export interface SeparatorProps {
  /** Direction of the line. */
  orientation?: 'horizontal' | 'vertical'
  /** When true (default) the line is purely visual; false exposes role="separator". */
  decorative?: boolean
  /** Extra classes (spacing, length). */
  className?: string
}

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width divided by height, e.g. 16 / 9 or 1. Default 1. */
  ratio?: number
  /** One child that fills the frame. */
  children?: React.ReactNode
}

/** Scrollable region. Part: ScrollBar (orientation 'vertical' | 'horizontal'). */
export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When the scrollbar shows. */
  type?: 'auto' | 'always' | 'scroll' | 'hover'
  /** Milliseconds before a hover/scroll scrollbar hides. */
  scrollHideDelay?: number
  /** Text direction for scrollbar placement. */
  dir?: 'ltr' | 'rtl'
  /** Size the region here (height is required for scrolling). */
  className?: string
}

/** Split layout. Parts: ResizablePanel (defaultSize, minSize, maxSize, collapsible), ResizableHandle (withHandle?: boolean). */
export interface ResizablePanelGroupProps {
  /** Axis the panels are laid out on. */
  direction: 'horizontal' | 'vertical'
  /** Persist sizes under this key in localStorage. */
  autoSaveId?: string
  /** Called with the panel sizes (percent) after a resize. */
  onLayout?: (sizes: number[]) => void
  /** Extra classes; give the group a height. */
  className?: string
  children?: React.ReactNode
}

/** Alert panel. Parts: AlertTitle, AlertDescription. */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone. */
  variant?: 'default' | 'destructive'
}

/** Outlined pill whose agent-coloured fill grows from the left; no value = indeterminate sweep (2s). */
export interface ProgressProps {
  /** 0–100. Omit or null for indeterminate. */
  value?: number | null
  /** Default 100 */
  max?: number
  /** Sizing; default full width, 22px tall. */
  className?: string
  'aria-label'?: string
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size and shape of the placeholder. */
  className?: string
}

/** Dot loader (class `loader`): four large `agent` dots and four small `blue-500` dots turning against each other; label colours inside a button. `Spinner` is the same component. */
export interface LoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Size with size-* classes (default size-4 = 16px); every part scales with the box. */
  className?: string
  /** Default "Loading". */
  'aria-label'?: string
}

/** Fire with toast({ ... }) from hooks/use-toast; render <Toaster /> once. Parts: ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction (altText), ToastClose. */
export interface ToastProps {
  /** Tone of the toast. */
  variant?: 'default' | 'destructive'
  /** Bold first line. */
  title?: React.ReactNode
  /** Supporting line. */
  description?: React.ReactNode
  /** A <ToastAction altText="...">. */
  action?: React.ReactElement
  /** Auto-dismiss delay in ms. */
  duration?: number
  /** Controlled open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Sonner Toaster. Fire with sonnerToast(message, { description, action, cancel, duration }) or sonnerToast.success / .error. */
export interface SonnerToasterProps {
  /** Where the stack anchors. */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  /** Keep the stack expanded instead of collapsed. */
  expand?: boolean
  /** Show a close button on each toast. */
  closeButton?: boolean
  /** Max toasts visible. */
  visibleToasts?: number
  /** Default auto-dismiss delay in ms. */
  duration?: number
}
