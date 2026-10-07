# BottomSheet, FileTree and PreviewRail

These three components extend the existing kit. Their reference concepts were inspected at [beUI Bottom Sheet](https://beui.dev/components/motion/bottom-sheet), [beUI File Tree](https://beui.dev/components/motion/file-tree), and [beUI Preview Rail](https://beui.dev/components/motion/preview-rail). Implementation uses React, scoped CSS and finite native transforms; no animation runtime was added. Catalogue status remains `needs-review` until the user reviews the new canonical components.

## BottomSheet

Controlled `open/onOpenChange` and a required `title` reuse Drawer. Its existing portal is the only focus trap, inert-background owner, scroll lock, dismissal layer and theme/accent/borders/radius carrier. Do not wrap BottomSheet in another modal or implement a second trap.

`variant="inset"` keeps `edgeGap` around the sheet; `edge` attaches it to the bottom with safe-area padding. `snapPoints` are viewport-height fractions, normalized to ascending unique 0.1–0.95 values. `defaultSnap` supplies the uncontrolled initial index; `snap/onSnapChange` control it. `size`, `description`, `footer`, `closeLabel` and `dismissOnOutside` preserve Drawer semantics.

Only the handle starts a drag. Upward motion has small resistance and selects the next height on release; downward motion selects the smaller height or dismisses beyond `dismissThreshold`. Content scrolling, text selection and inner control gestures stay native. The keyboard handle supports Up/Down and Home/End; Escape and the header close action dismiss the sheet. Pointer cancellation restores the resting transform. Snap changes perform one height write followed by a finite transform settle, rather than continuously animating layout. Reduced motion removes the settle.

## FileTree

Use stable unique `nodes` IDs. A FileTreeNode has `name`, `type="file"|"folder"`, optional `children`, static `meta`, `description`, `preview`, `icon`, `disabled` and `actions`. The kit infers common file icons and extension tags; it does not load files or parse source.

TreeView owns expanded rows, guides, roving focus, Arrow/Home/End/typeahead and disclosure presence. Selection may be controlled with `selectedId/onSelect` or initialized with `defaultSelectedId`; expansion follows the same `expandedIds/defaultExpandedIds/onExpandedChange` contract. Actions receive the selected node and render outside the tree buttons. Never put an interactive button or link in row metadata or children. A preview may contain interactive code or content controls because it is a separate surface.

Empty arrays show `emptyLabel`. Empty folders remain visible. `showPreview=false` hides the preview, while selected-file actions remain available. The consumer owns file loading, action side effects and persistence.

## PreviewRail

The defining interaction is a compact tick rail with a hover pyramid: the destination tick expands, the next two neighbors progressively taper, and the remaining ticks stay short. Width/height stay fixed; only tick transforms and opacity move. The floating destination card follows mouse hover, visible keyboard focus or pinned touch and stays outside the rail's scrolling viewport.

`items` have stable IDs, labels and optional descriptions/previews, destinations (`href`) and disabled state. `value/defaultValue/onValueChange` own committed selection separately from transient preview. `highlightActive=false` is the default: selected state alone does not keep a card or pyramid open. `highlightActive=true` keeps the selected tick highlighted after hover ends. Preview content remains transient in both modes.

`orientation` selects vertical or horizontal navigation; `previewSide` selects the side of the floating card. Its position is measured on destination change and after resize settles, then clamped within the reserved frame. Arrow keys skip disabled destinations, respect horizontal RTL and commit selection; Home/End select the first/last enabled destination. Escape dismisses the transient preview. Focus/selection reveal scrolls only the local rail.

For links, a first touch/pen tap pins the card without navigating. A second tap on the same destination follows its link. Outside pointer input clears pinned state while allowing the underlying action; blur clears it when focus leaves. Mouse or keyboard activation follows a link directly. `showPreview=false` keeps tick navigation, `renderPreview` supplies custom content, and empty/unavailable items retain an explicit state.

## Examples and verification

`demo/stories-revision.tsx` exports BottomSheetStory, FileTreeStory and PreviewRailStory. `revisionFiles` and `revisionRailItems` are shared typed catalogue/Playground fixtures, avoiding divergent datasets. Examples use controlled state and meaningful actions.

`tests/new-components-revision.test.tsx` verifies inherited modal focus/inert/scroll-lock and restoration, keyboard snaps, handle-only drag/cancel/dismiss, local portal modes, file selection/actions outside buttons, empty data, hover pyramid without selection changes, disabled navigation, touch preview-before-link and outside dismissal. Browser geometry, responsive layout and visual review are recorded in the overall verification report, not inferred from jsdom.
