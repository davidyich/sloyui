# Component composition

Read the selected `agent-manifest.json` record for exact props, defaults, keyboard behavior and related components. Reuse an exported component and typed variant; application layout, data, persistence and network operations belong to the consumer. Read `surface-context.md` for paint and context, `recipes.md` for compositions. Historical implementation notes in `docs/reference/` are optional audit evidence, not additional required instructions.

## Choose by intent

- Use `Tag` for chromatic labels, `Chip` for neutral choices, `Counter` for counts and `TextAction` for text actions. Badge/TypeLabel are compatibility wrappers; MarkdownEditor redirects to RichTextEditor. Keep one canonical page.
- Use Input/Textarea for text, DatePicker for dates, NumberField for numbers, ColorPicker for colors and Select/ComboBox for choices. No visible browser picker input types. MultiSelect uses neutral selected chips; TagInput handles free tags. Use one label source and preserve label/id/hint/error wiring.
- Use Tabs variant="workspace" for workspace sections with item icons and an optional trailing action. Use KanbanColumn variant="framed" with icon/action/footer slots for framed task groups; ButtonGroup appearance="framed" groups their actions.
- Use ButtonGroup for visual grouping, ActionBar for arrow-key navigation and FloatingActionBar for floating actions. A nested explicit size overrides group sizing. Popover size changes only its trigger.
- Use TreeView for hierarchy, FileTree for files and separate previews, PreviewRail for compact destinations with transient previews. Metadata inside row buttons must remain noninteractive; put actions outside them.
- Use controlled Dialog/Drawer/BottomSheet for modal flows. Reuse their portal, trap, inert background, scroll lock and focus restore. Only BottomSheet's handle starts dragging; keyboard snaps and pointer cancellation remain available.
- Use ContentCard for configurable content, ReorderableList for controlled vertical order, KanbanBoard for columns and menu-driven moves, DataTable for sortable/paginated data. Consumers persist changes and supply stable unique IDs. DataTable columns accept pin="left|right" and footer summaries; maxHeight/minWidth bound the scroll viewport, stickyHeader pins the header, pinnedRows uses row IDs for top/bottom rows and pinSelection controls the selection column. On narrow containers, excess pins release automatically to reserve a readable scroll lane. Structural grid boundaries stay visible with decorative borders off.
- Use charts for their data shape: Line/Sparkline/Brush for trends, Bar/Slope/Gauge for comparisons, Donut/Waffle/Treemap for proportions, Streamgraph/Ridgeline for distributions, ActivityHeatmap for daily activity. Keep the accessible data table available.

## Language and formatting

LocaleProvider requires locale="ru"|"en" and applies to its descendants; the default context without a provider is Russian. useLocale() returns the current language; useTranslate() returns t(ru, en) for consumer-owned interface strings. Built-in text and default Intl formatting follow the nearest provider. Explicit locale props or formatting callbacks override Intl where supported. Consumer labels, content, data, filenames and custom presets remain unchanged. LocaleProvider and its hooks are utilities without separate catalogue pages.

## Geometry and controls

Use Inter, semantic size tokens and weights 400/500/600. Control sizes xs/sm/md/lg/xl are 22/28/32/36/44 px. Dialog/Drawer size sets panel width. Component size never changes action meaning or color. On touch, choose accessible hit areas; compact tags and xs do not automatically grow.

`data-radius=compact|default|rounded` is independent of surface. Rounded adds optical text/menu insets through `--cap-radius-inset`; preserve centered icons and explicit circle/pill shapes. Inner radius follows outer radius minus inset. Leave equal code insets left/right/bottom and room for focus outlines; avoid clipping at narrow widths.

Neutral primary/secondary buttons preserve the local accent context. Accent variants use its paired solid/soft roles. Checkbox/Radio/Switch default to solid accent; contrast=false selects vivid, Slider defaults vivid. Marks/thumbs use matching text roles. Ghost fields react on hover/focus without losing semantics. Field focusRing overrides inherited width/offset; keyboard focus stays visible when borders are off.

Card always keeps its structural `.cap-surface-boundary` when decorative borders are off. Add that class to a custom nested surface intentionally sharing its parent’s surface role; paint it with the matching semantic role and declare context explicitly. Do not infer surface from background or add structural outlines to every control.

Tag.interactive=false disables every action slot. Share one action hover surface. Counter starts square and grows with content. Icon-only actions need an accessible label; use IconPicker's visual search for icon settings.

## Behavior and accessibility

Consumers handle empty/loading/disabled/error states and prevent repeated actions while busy. Error includes a text reason and aria-invalid; color alone is insufficient. EmptyState icons are optional, neutral and quieter than text. Do not nest buttons/links inside ObjectCard, CollectionRow or interactive titles.

Keep native keyboard and reduced-motion behavior. Tabs need unique values, a valid active value and group label. Radios in one group share a name. Tooltip accepts one focusable element forwarding aria-describedby; its content is noninteractive. Use Popover for actions. Select's hidden native input preserves form submission.

Use opacity/transform for finite motion, never transition:all or permanent will-change. Small disclosures animate both directions (180 ms), retain exiting content briefly, immediately remove it from input/focus, and restore focus to a visible ancestor. Each exit owns its deadline; reopening cancels removal. Reduced motion completes immediately.

ScrollArea owns bounded local scrolling; its ref targets the viewport. Horizontal scrollbar defaults hidden, vertical/both auto. fade accepts true/false, none, an axis, a physical edge or logical start/end (RTL-aware). Explicit fade overrides legacy shadows; fade=false disables it. fadeSize accepts px as a number or a CSS length, default min(12%, space-10). fadeReveal is the scroll distance in px for gradual reveal, default 2 × space-12; 0 reveals immediately. No overflow leaves content unfaded. Masks reveal the existing background and affect only the viewport. Place floating controls through ScrollArea.floating outside its mask, reserve clearance and preserve shadows. Never disable scrolling or add outer overflow:hidden to hide a defect.

## Content and editing

MarkdownEditorV2 controls a Markdown string through value/onValueChange and defaults to contextual editing; onCommentRequest delegates selected text to the consumer. RichTextEditor keeps its classic UI by default and offers uiVariant="context" for the same selection toolbar/block menus. Colors/highlights serialize as data-cap-color/data-cap-highlight spans, underline as HTML, tables as pipe Markdown, and toggles/callouts as supported extensions. Plain Markdown readers may not render those extensions. The archived MarkdownEditor compatibility route remains redirected to RichTextEditor.

RichTextEditor stores blocks with stable IDs. For Markdown strings use markdownToRichText/richTextToMarkdown and retain block.markdown metadata; unsupported syntax stays editable source. Drag uses the block handle only; preserve move-menu and keyboard alternatives, Escape/cancel and source text. Read-only/disabled hides editing handles. showToolbar=true opts into the top toolbar; it defaults false without disabling editing or selection tools. Native mouse/Shift selection can span text blocks; copy/cut and typed/pasted/deleted replacements preserve unselected blocks and their IDs. Keep Markdown source metadata when editing; do not silently rewrite unsupported syntax.

ContentCard accepts stable blocks/blockOrder/hiddenBlocks. Use slots and its dragHandle instead of forking. selectable=false suppresses checkbox and selected paint; omitted enables selection only with onSelectedChange. Mixed orientations must not stretch to the tallest neighbor. Leave 12 px around a protruding selection control. ReorderableList is controlled with grip-only drag plus keyboard/click alternatives.

Calendar uses local YYYY-MM-DD dates. Kanban tasks point to existing column IDs; onMove reports intent and does not mutate items. Rich text, table sorting/filtering and pagination remain consumer state. MarkdownPreview never renders arbitrary HTML.

CodeBlock copies unchanged source. Use filename (label is an alias), language/onLanguageChange or defaultLanguage, lineNumbers, contextActions and onWrapChange. Do not add a second wrap menu. variant=auto respects borders; surface/outline/filled-outline select explicit paint. editor replaces only the code body. In narrow API panels keep equal visible insets, no clipping and no document overflow.

ContentLayout controls width/height per orientation, with independent left/right panes and axis bounds. contentWidth is separate from pane size. divider controls decoration, not resize semantics. collapseAt uses container width; parent available space overrides minimums. Bound vertical height explicitly. Resizing supports arrows, Shift, Home/End, Escape and pointercancel; closed panes release capture. ResizableCard keeps desired size while fitting its parent, commits only completed changes and allows inner scrolling.

ResizablePanelGroup uses direct ResizablePanel → ResizableHandle → ResizablePanel children, horizontal by default. Nest a group inside a panel for another axis; bound vertical height. layout/defaultLayout and Panel defaultSize/minSize/maxSize are numeric percentages of usable space after handles; unspecified initial sizes share the remainder. Infeasible bounds adapt only enough to fill the parent. Controlled layout needs onLayoutChange; onLayoutCommit persists a completed change. Handle withHandle adds a grip; label names the separator, and disabled removes it from Tab while keeping pane content active. Arrows change step (default 1%), Shift multiplies by 10, Home/End respect adjacent-pair bounds and Escape cancels drag. Zero-size panes are inert. Panel surface defaults inherit; composition owns paint and structural boundaries. Use ContentLayout for pixel side panes and responsive stacking; use ResizableCard for one bounded card.

Toast/Alert/StatusBar share tone/color/appearance/contrast/surface; neutral shells color only the status icon. Inline feedback inherits surface, Toast defaults floating. Consumer controls lifetime/dismissal; keep actionable content until explicit dismissal. ToastStack uses position=top-center|bottom-center for centered placement; scope=viewport portals to the overlay layer, scope=container requires a positioned parent with a bounded height. shape=pill opts into capsule geometry; rounded follows radius context. Unread rear notices and loading states pause expiry; actions require explicit dismissal. Stacks use measured item geometry and expandDirection=up|down|left|right; reserve shadow clearance and permit internal scrolling. AnnouncementBar rotation pauses with focus/hover/pause; TextShimmer pauses offscreen/hidden and remains readable with reduced motion/forced colors.

## Catalogue and instruction maintenance

source/component-registry.json owns permanent IDs, status, primaryGroup and every membership. Renaming/reordering never changes IDs. New components remain needs-review until reviewed; archives stay exported but leave canonical counts and route to replacements. Regenerate the manifest and keep one typed Playground per canonical component. Expose meaningful public props/slots; do not repeat global context controls.

API rows derive from exported TypeScript signatures and JSDoc through scripts/build-reference.mjs; do not infer defaults from Playground state or maintain a duplicate props table. Usage/agentNotes/related belong to the manifest generator. Preserve canonical case-sensitive #ComponentName routes and Canvas sidebar/Base content paint. Catalogue scrolling belongs to .catalog-main.

The six core instruction files are listed in demo/document-files.ts and protected from deletion. Dev-only editor creates custom Markdown files under docs/instructions/, lists them dynamically and checks revisions for save/delete. Drafts survive conflicts; never silently overwrite them. Custom filenames use letters/numbers/hyphens/underscores and .md. Built catalogue is read-only. Reusable rules belong here, in surface-context.md, recipes.md or AGENTS.md; replace obsolete text rather than duplicating rules across revision notes.

FileCard represents a file attachment with an optional thumbnail and inferred MIME/extension kind. Pass a display-ready sizeLabel; the consumer owns URLs and open/download/remove operations. Actions are siblings, filenames retain their full accessible text, failed previews use the format tile. Use FileTree for hierarchy.
