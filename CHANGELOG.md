# Changelog

## 0.17.0 — 2026-10-23

- Consolidated the latest catalogue, Palette Lab and native Figma controls work into one source tree.
- Restricted the default design system to neutral plus blue, green, orange, red, pink and purple. Legacy color names resolve to these families.
- Rebuilt the Figma V2 export around referenced RGBA colors, whole-number geometry and independent Theme, Surface and Accent modes.
- Documented Invert within Light, explicit custom-background generation, token pairs and component composition.


## 0.16.5 · 2026-10-22

- Zero tint selects exact black/white for Primary text; explicit tint and custom samples remain supported.
- Figma Surface keeps hues in flat semantic groups, with neutral colors first. Two shared Primary text roles replace 21 picker entries while compatibility aliases retain existing bindings.
- Designer guides describe the two foreground behaviors and the flat picker paths.

## 0.16.4 · 2026-10-22

- Palette Lab keeps one selected-color reset in the inspector footer and confirms reset of all colors from the left panel. Both support Undo.
- Sidebar and inspector share compact field insets and consistent card radii. Fill adaptation retains its switch and optional border on hover; color rows use one hover surface including their close action.
- Settings use clearer group names and trailing down/up chevrons. Accordion exposes `chevronPosition`, including its playground and documentation.

## 0.16.3 · 2026-10-22

- Glass preserves chroma while maintaining shared luminance and transparency.

## 0.16.2 · 2026-10-22

- ParameterSlider uses a quieter fill in Light with a distinct, gentle hover. Dark fill and single-row geometry remain unchanged.
- Palette Lab places its theme toggle at the far right of the floating environment controls on desktop and mobile.

## 0.16.1 · 2026-10-22

- Recommended fills adapt their luminance to the actual backing and preserve visible Normal/Active differences. Text contrast and fill/state separation are checked independently.
- Figma v2 uses the shared opaque palette and role-first groups with hue, state and internal context in the variable name. Existing specimen bindings are preserved.

## 0.16.0 · 2026-10-22

- Palette contains one theme-independent ramp per hue, with 41 steps by default. Semantic roles select existing pigments and numeric opacity; role-specific and theme-specific RGB groups are removed.
- Palette Lab shows one editable ramp per color. Saved projects migrate to v5 with a permanent neutral palette, theme bases and per-surface overrides while preserving prior authored points for recovery.
- Text contrast is measured after alpha composition on every supported backing. Surface colors select existing neutral steps rather than adding reference colors.
- Recommended Secondary/Tertiary select exact ramp steps and numeric alpha for shared final luminance on opaque surfaces and neutral layers of the same polarity. Glass uses both protected underlays with a 0.03 absolute luminance budget; diagnostics expose unreachable targets and state limits.
- Light/Dark neutral bases and individual surface overrides persist as ramp positions. Custom backgrounds select the nearest neutral step without adding raw palette colors. Confirmed recommendation resets preserve accent hue, seed, identity and step count.
- Manual edits use a whole-width step mosaic with the selected color editor below, inline original/draft swatches and explicit apply/cancel actions. The outer inspector is hidden while editing points.

## 0.15.6 · 2026-10-22

- Palette Lab keeps surface cards static; only accent samples react and copy their values without changing tabs. Context warnings open as anchored annotations.
- The environment island floats over the full scroll viewport with edge fades and measured clearance. Theme changes through one icon; color deletion stays in the sidebar.
- Accordion hover affects its header only. Disclosure chevrons morph rather than rotate. Tooltip adds `maxWidth` (288 px by default), wraps long content and replaces separate parameter help buttons.
- ParameterSlider keeps a shorter grip visible across labels and follows the global border setting, together with Slider2D. Resizable handles no longer add full-length dividers. Button line height preserves glyph descenders.

## 0.15.5 · 2026-10-22

- Palette contains only opaque colors. Nine unused legacy alpha variants are removed; semantic color and opacity aliases retain their exact resolved values. Generation and verification reject new alpha palette entries.
- Floating island highlights distinguish pointer hover from keyboard focus and preserve ownership while select menus open and close.

## 0.15.4 · 2026-10-21

- Secondary accents use surface-specific emphasis: softer on opaque contexts, with balanced hue strength after composition on Dark Glass. Canonical tokens and Palette Lab share the same solver.
- FloatingActionBar restores smooth hover movement across filled and ghost controls. Static control fills, the moving layer and foreground content keep separate paint planes, preserving adjacent backgrounds and rounded corners.
- ParameterSlider retains a single full-height filled row; its short semantic-gray grip stays at the boundary and responds gently to hover and drag.
- Icon-only buttons expose compact action tooltips automatically. Explicit tooltips take precedence; native button geometry, refs and disabled semantics remain intact.
- Palette hints separate pigment, background, resulting color and content roles into small swatch rows. Hover borders are subtle and follow each cell's real corners; redundant copy instructions are removed.
- The Materials view follows the selected surface, using static blur only for Glass. Contrast settings are two aligned footer rows and remain usable in mobile drawers.

## 0.15.3 · 2026-10-21

- Shared hover and selection highlights keep their corner geometry while moving between differently sized items, account for transformed containers and settle cleanly after interrupted transitions. Selecting a segment clears its former hover paint.
- Filled controls in action islands keep their own backgrounds and local hover transitions; the shared moving layer remains for transparent actions, navigation and choices.
- Glass examples in the catalogue and Palette Lab separate their static blur/protective fill from interactive content, avoiding repaint conflicts without changing opacity or color generation.

## 0.15.2 · 2026-10-21

- Restored ParameterSlider's original compact filled row, with its label and value inside the full-height fill. The optional thin grip follows the fill boundary without introducing a separate track or a second row.
- Pointer hover and drag preserve the unfilled background; only the filled portion changes subtly.

## 0.15.1 · 2026-10-21

- Palette Lab uses one Light/Dark theme and a catalogue-style environment island below the canvas. Sidebar footers retain contrast rules and quick actions.
- Overview cards remove duplicated labels, show a compact heading count and react through individual Active swatches. Palette cells expose their own contextual HEX/HSL/OKLCH tooltip and copy action.
- Secondary/Tertiary generation adapts to the actual backing, including Custom polarity and Invert, with bounded perceptual state changes.
- ParameterSlider grips follow the fill boundary in a separate track zone without crossing label/value text. Tooltip corners stay at 8 px with 12 px content clearance; square mode remains square.
- Slider and resizer grips are thin and use adaptive gray. Pointer interaction changes only the filled track, with no whole-row repaint or extra dark divider.
- Shared radii, segmented insets and narrow-screen environment controls follow the kit defaults.

## 0.15.0 · 2026-10-21

- Palette Lab keeps navigation pinned above its scrolling color list and global settings at the bottom. Resizable panels and mobile drawers preserve the editing workspace.
- Each accent has its own vividness and Dark chroma multiplier, with Dark defaulting to 90%. The canonical token graph and runtime use the same thematic ramps.
- Palette steps accept exact HEX/HSL edits as normalized authored anchors. Optional OKLab interpolation, individual anchor reset and full reset preserve the mathematical source; project and graph exports retain edits and modification metadata. Unreachable contrast remains visible.
- Standard and Dimmed now select complete reference surface contexts, including Shell, in both themes. Inverted remains a compatibility name for Dimmed.
- ParameterSlider, Slider2D and parameter Select share semantic hover, radius-aware keyboard focus and matching geometry at equal heights. Slider2D keeps exact lower fields optional. Transforming panels reuse shared motion and reduced-motion behavior.
- Updated component histories and canonical consumer instructions. This release targets Develop for review.

## 0.14.2 · 2026-10-21

- Mobile catalogue navigation now occupies a single reserved row; appearance settings open in a separate drawer.
- Overview filters share a row and thumbnails use a compact height. Mobile navigation and settings retain 44 px targets, with 16 px editable field text.
- Component history opens in a scrollable mobile drawer instead of splitting the short viewport; desktop history remains beside the document.

## 0.14.1 · 2026-10-21

- Fixed numeric inputs in the Palette Lab mobile inspector to retain 16 px text.
- Compact slider values now follow their configured precision; invalid color names explicitly state the 40-character limit.
- Completed browser verification of collection/detail navigation, complete ramps, Invert, copy/focus behavior, resizable panels and responsive drawers.

## 0.14.0 · 2026-10-21

- Palette Lab now separates whole-project overview, palette, surface and material pages from color detail tabs. Only a color detail opens its inspector; panel widths and view settings persist.
- Integrated all 20 accent families with three hue-preserving 25-step ramps, brighter default soft fills, per-hue on-primary content and numeric opacity aliases. Existing primitive names and legacy hue names remain compatible.
- Added Invert and Glass surface contexts. Invert provides the opposite polarity without nesting another theme; Glass combines a protected translucent backing with context-aware content. The existing Dark Inverted scheme remains independent.
- Added ParameterSlider and Slider2D, including optional value/unit/icon/handle, configurable axes, exact fields and keyboard interactions. Select supports a single-row parameter appearance; resizers have line and grip appearances.
- Updated the catalogue, playground controls, component histories and consumer instructions. This release targets Develop for review.

## 0.13.5 · 2026-10-11

- Restored the exterior Shell background; navigation stays Workspace and the document stays Content. Removed a later CSS rule that repainted Shell as Workspace.
- Matched nested menu and action-group corners through their real insets and structural borders. Tabs and segmented controls subtract the same inset from the outer radius. Square mode remains square.

## 0.13.4 · 2026-10-11

- Fixed the catalogue document to Content on every route. Global Surface changes only explicit previews; instructions, release history and API tables keep the document context.

## 0.13.3 · 2026-10-11

- Raised Dark Overlay secondary fills above both the region and its local block using existing Palette steps. Footer controls now inherit Overlay together with its painted background. Nested secondary actions reuse the tested hover/pressed pair without extra alpha brightening.
- SegmentedControl preserves the full control height inside its shell; padding and border no longer collapse the selected and hover layers to text height.
- Updated the Sloy favicon from the supplied artwork, including the Develop blueprint variant and the standalone token explorer.

## 0.13.2 · 2026-10-10

- Reduced Figma Palette from 1,485 to 426 colors: the original 417 opaque colors plus nine explicit alpha values. Contextual roles select existing steps; secondary states and neutral text levels remain distinct. Updated native Figma bindings, the guide, web graph and interactive explorer.

- Instructions and kit history keep a fixed Workspace canvas. The global Surface picker now changes only the document region and individual release cards, including their nested controls and content.
- Follow-up to GitHub issue #16; this release targets Develop.

## 0.13.1 · 2026-10-10

- PopupSelect search is opt-in, with inline or separate field styling; plain lists keep keyboard selection and typeahead. Popup group captions are quieter, and CommandPalette defaults to a compact search header with aligned result insets.
- Fixed competing pointer/focus highlights in shared navigation, segmented controls and action groups. ToastStack uses measured geometry, interruptible reflow and an integrated count instead of a detached chevron. FileTree guides end at the correct child; Breadcrumbs supports accessible collapsed ancestors.
- Rounded control corners now scale with visible size and remain distinct from explicit pill/circle shapes. Square catalogue headers and docks have no inter-action gaps.
- Unified component IDs and versions into one history action. Docs remain open above collapsible navigation. Instructions use paired guidance tables, history cards have real spacing, cards inherit the global surface and announcements use Overlay.
- Rebuilt Typography and the interactive geometry specimen. Main and Develop have distinct S favicons; Develop uses a blueprint grid. The full accent matrix renders one selected surface at a time, and a page error boundary preserves catalogue navigation.
- Tracked in GitHub issues #14–#17; this release targets Develop.

## 0.13.0 · 2026-10-10

- Applied the authoritative Figma v4 graph to web tokens. Theme exposes surface/bg, surface/block, primary/secondary fills, content, border and stable roles. Shell, Workspace, Content and Overlay select context; former surface names remain compatible.
- Kept Density, Radius, Borders, theme, accent and surface scheme independent, including nested overrides and portals. Density separates adaptive spacing and control geometry from fixed typography, icons, spacing and touch targets.
- Cards now retain their host surface and use its block fill. Fixed narrow DatePicker ranges, inside-label field geometry, preview radius None and settings overflow. Focus accepts the 90 canonical v4 roles and 20 legacy aliases.
- Added the interactive token graph, four-surface examples, stable color comparisons, geometry guides and 90 individual component instructions with specific Do / Do not blocks. Owner edits retain revision protection and persist across deployments.
- This release targets Develop. Main-site publication remains a separate owner action.

## 0.12.1 · 2026-10-09

- Added PopupSelect: a compact trigger with search and single-choice options inside an independent-width floating popup, with keyboard navigation, contextual portals and native form backing. Focus token selection shows only a dot and chevron; Surface, Accent, Density and Radius share the component.
- Made both Playground settings panels resizable with a keyboard-accessible separator. Field grids and the Focus group wrap within the selected width and stack on narrow screens.
- Added an isolated /develop catalogue and data store. Deployments target Develop by default. Owners can review the exact release and confirm atomic publication of its code and data; guests cannot publish. Publication rejects stale confirmations and backs up/restores production on failed health checks. Main-site settings link to Develop.

## 0.12.0 · 2026-10-09

- Added an independent Density collection with explicit Default/Compact spacing and control-size aliases between immutable Primitives and Semantic/Components. Runtime data-density and live portals inherit the nearest mode; typography and minimum touch targets remain unchanged.
- Added square 0 px corners with independent Borders, edge-attached catalogue settings, zero action gaps, larger content insets and full-row/cell hover. Default corners remain 8 px.
- Increased navigation header/footer clearance and action gaps at maximum 16 px. Filter/collapse actions now share correctly inset hover corners. FloatingActionBar keeps the same padding for all positive radii.
- Replaced mobile catalogue navigation with a bottom edge sheet, two snap points and a scrolling tree above its footer. Foundation dimensions reflect the selected density.

## 0.11.4 · 2026-10-09

- Catalogue announcement dismissal lasts only for the current page load. Reloading shows an enabled announcement again, including for visitors with an older stored dismissal.
- Replaced fractional radius contexts with whole-pixel bases: Small 4 px, Medium 8 px and Maximum 16 px. Foundation sources own context factors; generated runtime tokens and Figma exports use integer corner lengths. Derived component corners round down after all arithmetic, including fractional border subtraction.
- Rebuilt the radius picker as one row per option, with a name on the left and pixel value on the right; its closed trigger shows only the value. SelectOption.meta and triggerLabel expose the same composition to consumers and Playground.
- Made IconBox radius depend on its explicit size in every xs–xl variant; preserved explicit circles and pills.


## 0.11.3 · 2026-10-09

- Restored smooth CommandPalette result highlighting for pointer and keyboard navigation with one active-option layer. Hover no longer scrolls the list under the pointer; keyboard reveal, filtering, reduced motion and explicit touch activation remain supported.

- Restored the moving secondary hover fill in CodeBlock tabs, including compact unified headers. Playground supports arbitrary option labels/counts and command/stack/platform examples. Direct actions precede Copy; the multi-action menu follows Copy.

- Kept catalogue page content stable across theme changes, removed redundant Tag accent routing in the full color matrix and aligned compact search/close control heights. Build-time release validation rejects duplicate versions and invalid component/kit links.

- Preserved explicit corner-radius modes on the page root; the default applies only when the root has no radius context.

## 0.11.2 · 2026-10-09

- Unified CodeBlock density and header insets across all variants, aligned plain labels with code, and used secondary accent hover/pressed colors for header controls. The single wrap action is a tooltip icon button; additional actions use a menu. Playground supports editing source and individual stack commands directly in the preview.

## 0.11.1 · 2026-10-09

- Repaired production lazy-module imports that loaded a second React runtime and crashed icon-bearing catalogue pages; deployment now checks the reachable module graph.

- Styled instruction-language markers with the code font, the compact 10 px Counter size and caption color.

- Fixed TreeView hover layering over the selected row, including catalogue sidebar navigation; row content and keyboard focus stay above both highlights.

- Corrected global accent-picker checkmarks to white for every color in Light. Published plain instruction-language markers without a background or outline.

- Added CodeBlock unified headers and stack/command tabs with exact active-source copying, keyboard navigation and surface-aware secondary accents. Unified headers and command tabs use compact spacing; pointer hover has no extra moving layer, and keyboard focus stays inside tab bounds. Existing frame variants remain available.

## 0.11.0 · 2026-10-09

- Added component release histories linked to kit versions, a compact content-side history/instructions panel, owner release editing and revision-safe production document editing backed by SQLite.
- Moved catalogue notices to top-center with black/white contrast. ToastStack has an optional compact count hint and always hides scrollbar indicators while preserving scrolling.
- Added semantic focus color tokens and half-pixel widths to field playgrounds; the default focus offset is zero.
- Stopped closed overlay context observers and exit timers, reused active subscriptions and coalesced position updates. ScrollArea now shades edges with small surface gradients without per-scroll style reads.
- Deferred expensive color matrices and palettes until near the viewport, isolated their state and loaded catalogue pages/playgrounds on demand.
- Added a radius Select showing the current base radius (4.8, 8 or 14 px), an Inset page backdrop and border-controlled shell dividers. Aligned nested action corners and made compact search omit its visible heading.
- Updated installation commands to the current downloadable package hosted on sloyui.com.

- Added the plain Tag variant and applied it to instruction-language markers, keeping RU, EN and RU/EN visible without a background or outline.

- Replaced arithmetic surface routing with exact CSS fallback selection, inherited fixed hue roles at accent-only nodes and avoided catalogue navigation/static-page rerenders when changing global appearance.
- Added instruction language tags and hid editing actions from guests. Aligned administrator fields with inside labels, grouped Announcement Bar visibility with its editor and placed sign-out below all settings.

- Added an owner-only announcement editor with bracket highlights, a live preview, editable button label/link and revision-safe persistence across releases.

- Restored the direct surface select, moved the theme action to the dock's right edge and added an animated, dark-only surface inversion button beside it. Moved the administrator settings action next to the language switch on the footer's left side.

- Rebuilt the catalogue shell from Figma: compact sidebar actions, central blurred search, scroll fades, pinned footer and preview dock. Announcement actions use kit controls and inherit global context, with a raised announcement surface and consistent nested corners.
- Added five-second logo hold for Devos OIDC login, an owner admin mode, persistent component status menus and a global Announcement Bar switch. The catalogue API is deployed separately from the dependency-free component package.

- Added independent Standard/Inverted surface schemes with live portal inheritance and a persistent catalogue control; Inverted swaps Dark Inset/Panel pairs. Added a distinct content/tertiary role, bringing the public color API to 35 roles.

- Separated raw Palette and Primitives, reduced the public color API to 34 roles, introduced Page/Inset/Panel/Overlay and grouped Components aliases, and generated explicit CSS/Figma contracts while preserving all secondary colors and legacy runtime surface names. Existing Figma libraries require a controlled variable-ID migration; this change generates exports only.

## 0.10.0 · 2026-10-08

- Added a versioned ZIP of all Figma JSON at the bottom of Colors and synchronized the live Figma graph.
- Corrected fractional-border alignment and equal visible gaps in segmented controls.

- Softened dark secondary accents while keeping solid actions, light themes and surface-specific contrast intact.
- Aligned segmented controls, made tabs follow global corners and removed moving hover from line tabs.
- Simplified preview labels and page headings; component IDs now sit in the upper-right corner.
- Added semantic token previews, wrapping in both palette layouts and a horizontal four-surface comparison.
- Separated interface and prose typography; instruction selection uses soft accents and file selection stays neutral.
- Applied token-based scroll fades to the catalogue content while keeping floating controls outside the mask.
- Published a focused Sloy UI source tree with installable artifacts, public APIs and complete third-party licenses.

## 0.9.0 · 2026-10-08

- Introduced 417 authored palette colors, independent theme and surface contexts, and accessible semantic roles.
- Provided a bilingual component catalogue, editable agent instructions, API references and installation guidance.
