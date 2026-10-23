# Sloy UI — Figma token system v3

> Исторический контракт, заменённый [системой v4](../token-system-v4/README.md). Описание и результаты ниже относятся к прежней версии. Для новых макетов и экспорта используйте v4.

This is the standalone source for the redesigned Figma library. It does not overwrite the current web kit tokens or change a published site. `source.json` is authored; `build.mjs` generates `graph.json` and `tokens.css` here. Local diagnostics are written to the ignored `artifacts/token-system-v3/audit.json` and `artifacts/token-system-v3/secondary-audit.json` paths at the repository root. `verify.mjs` independently checks the exported graph against that audit.

```sh
node figma/token-system-v3/build.mjs
node figma/token-system-v3/verify.mjs
```

`graph.json` is the native importer contract: collections contain `key`, `name`, ordered `modes` and `variables`; each variable has `name`, `type`, per-mode `values`, `scopes`, `css` and `description`. An alias is `{ "alias": "CollectionKey/token/name" }`. A raw color is `{ "r": 0, "g": 0, "b": 0, "a": 1 }` in sRGB. `hidden` identifies internal collections whose variables have empty picker scopes; it does not require hiding alias dependencies from publication.

## Consumer model

| Bind from | Purpose | Example |
| --- | --- | --- |
| Semantic | Universal colors selected for the painted surface | `secondary/sky-normal`, `secondary/sky-content` |
| Density | Adaptive spacing and control dimensions | `space/inset-md`, `size/control-md` |
| Radius | Corners selected independently of density | `radius/md` |
| Primitives | Fixed spacing, sizes and typography | `space/fixed-16`, `font/family/base`, `size/touch` |
| Borders | Optional decorative boundary width | `border/width` |

Palette, Theme and SurfaceScheme provide the internal routing. There is no Components collection. Hue and state are in the secondary token's leaf name: `secondary/sky-normal`, `secondary/sky-hover`, `secondary/sky-pressed`, `secondary/sky-content`, and `secondary/sky-border-normal`. Disabled controls share `disabled/bg` and `disabled/content` across hues. Primary action and status pairs are also semantic. Token names and CSS identifiers consistently use `bg`, including `surface/bg` and `status/danger-bg`.

Palette contains exactly the original 417 authored colors. Context-dependent computed colors live directly in Theme Light/Dark as exact RGBA; a value is a Palette alias only when it matches an authored palette value exactly. This preserves surface contrast without adding contextual colors to the palette or approximating them with transparency. Semantic and SurfaceScheme remain aliases only.

Theme organizes variables by purpose under five roots: `primary`, `secondary`, `border`, `content` and `surface`. SurfaceScheme uses the same grouping where a role actually changes with the scheme. Hues stay in leaf names, never separate groups.

| Theme purpose | Examples |
| --- | --- |
| Primary fill and content | `primary/bg/sky-normal`, `primary/content/sky` |
| Secondary fill, content and border | `secondary/bg/sky-workspace-normal`, `secondary/content/sky`, `secondary/border/sky-workspace-normal` |
| Surface and static block | `surface/bg/workspace`, `surface/block/workspace` |
| General content and boundaries | `content/primary`, `border/default-workspace`, `border/workspace-focus` |
| Shared special roles | `secondary/bg/disabled-workspace`, `content/disabled`, `surface/bg/scrim` |

Every hue retains its primary and secondary variables, even when different hues currently have equal content colors. Only the same semantic role may share a Theme variable across surfaces, and only when its entire Light/Dark pair is identical on all four surfaces. Otherwise the surface remains in the leaf name. Status roles route to the corresponding red, green, amber or blue secondary roles and add no Theme group.

Inverted routing uses a `-inverted` suffix in the same purpose group. Its Light value aliases the standard Theme variable for the current surface; its Dark value aliases the standard variable for the swapped Workspace or Content surface. It introduces no duplicate raw computed colors. Figma resolves these aliases using the independently inherited mode of each collection.

## Surfaces and blocks

| Mode | Meaning | Light background / block | Dark background / block |
| --- | --- | --- | --- |
| Shell | App frame and global navigation | `#F3F3F3` / `#E7E8E8` | `#282828` / `#3A3A3A` |
| Workspace | Secondary work area, list or inspector | `#FBFBFB` / `#EEEFEF` | `#1E1E1E` / `#303030` |
| Content | Main document or editor canvas | `#FFFFFF` / `#F7F6F6` | `#181818` / `#282727` |
| Overlay | Temporary floating menu, popover or dialog | `#FFFFFF` / `#F3F3F3` | `#303030` / `#404040` |

These names describe composition, not an implied universal elevation order. Set the Semantic mode on each intentionally painted surface and bind its fill to `surface/bg`. A card or local group may use `surface/block` while retaining its parent context; it does not automatically become another surface. A popup explicitly becomes Overlay. All four surfaces must be visible in examples, including the outer Shell.

Standard follows the reference values above. Inverted swaps the complete Workspace and Content pairs only in Dark, including background, block, secondary fills, borders and contents. Light, Shell and Overlay remain unchanged. Select Theme and SurfaceScheme on a parent; select the appropriate Semantic surface on each painted child; leave other axes on Auto.

## Geometry and typography

Density uses an integer unit of 4 px in Default and 3 px in Compact. Adaptive spacing is `round(unit × coefficient)`. The same coefficient controls the corresponding outer spacing or inner inset, so layout reflows coherently. A medium control uses the fixed 20 px body line height plus twice the adaptive vertical inset: Default `20 + 2 × 6 = 32`; Compact `20 + 2 × 5 = 30`. Bind auto-layout padding and gap to Density; use content sizing where appropriate instead of forcing an unrelated frame height. Fixed whitespace, typography and the 44 px touch target remain unchanged.

Radius uses independent bases 0 / 4 / 8 / 16 for None / Compact / Default / Rounded, with sm / md / lg / xl ratios 0.5 / 1 / 1.5 / 2. The generator resolves the multiplication to whole-pixel aliases because Figma variable aliases do not execute arithmetic. `Primitives/radius/pill` and `Primitives/radius/none` remain fixed. For concentric nested shapes, calculate `max(0, outer radius − actual inset)` in the composition; a proportional corner is not automatically a concentric corner when density changes.

All typography lives under `Primitives/font`: family, size, line-height, weight and tracking. Tracking roles `font/tracking/normal` and `font/tracking/tight` provide fixed 0 px and −0.2 px letter spacing. Family names express purpose: base = Inter, code = Overpass Mono, heading = Georgia, pair = Courier New. Replacing a font changes the value, never the role name. The exact font values are retained even when a specific font is not installed on the Figma host; render specimens only with available fonts or clearly identify a temporary preview fallback.

## Verification boundary

The original 417-color palette remains intact: 17 hues × 22 steps, 41 gray steps, black and white. The build derives opaque secondary values for all 18 colors × 4 surfaces × 2 themes × 3 active states and a shared disabled pair. Active fills are monotonically distinct; every paired text color passes 4.5:1 in every active state and on its surface's block. Dark chromatic secondary contents are brighter than the previous palette ink selected around luminance 0.72. The verifier additionally tests both surface schemes, typography invariance, control arithmetic, the fixed touch target, all aliases, default modes and CSS declarations.

The focus ring is calculated from the worst local background and has at least 3.1:1 against its surface, `surface/block` and every neutral or chromatic secondary state. A block keeps its parent's context, so its focus indicator remains valid without changing surface mode. Decorative border colors do not substitute for a focus indicator or an always-visible structural separator. Geometry uses fixed `Primitives/stroke/focus` and `Primitives/stroke/structural` where those meanings apply.

`tokens.css` is scoped to `.sloy-v3`. Its six independent attributes are `data-theme`, `data-surface-scheme`, `data-surface`, `data-density`, `data-radius` and `data-borders`; values are lowercase mode names. The alias graph is rebound at every context attribute so nested overrides preserve the other inherited axes. Import this file only for the new Figma model or an intentional v3 preview. Existing `--cap-*` tokens retain their current runtime contract.

Generated audits establish file-level correctness. Live Figma readback, native bindings, mode switching, visual inspection and publication are separate evidence and must be recorded by the applying task.

For a local migration, an optional `artifacts/token-system-v3/refinement/graph-before.json` snapshot enables exact baseline comparison. The build writes `migration-map.json` beside it, mapping each new Theme and SurfaceScheme variable to previous paths through its semantic role, surface, theme and scheme usage, plus the six Semantic `background` → `bg` renames. The verifier compares every Semantic value and all geometry across 256 combinations of the six axes, and checks all 417 authored palette colors. Ordinary build and verification also work without the ignored snapshot. Old paths are migration candidates, not a one-to-one map: the preceding graph merged different roles by equal RGB, so each old native ID can be reused at most once.

## Current Figma receipt — purpose-first refinement, 2026-10-10

The refinement is applied to the same [Figma token guide](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=24-3000), [color matrices](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=24-3129) and [playground](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=26-723).

Native readback confirms 1,769 variables: Palette 417, Primitives 68, Theme 787, SurfaceScheme 230, Semantic 224, Density 37, Radius 5 and Borders 1. Removed all 1,061 Palette/derived entries after rewiring their consumers. All 224 Semantic IDs and all 1,216 existing Theme/SurfaceScheme/Semantic IDs were preserved; 25 separate role variables were added. No missing aliases or bindings remain across the 13,682 canvas bindings. Native metadata comparison treats variable scopes as an unordered set, matching Figma's canonical ordering.

All names and WEB code syntax use `bg`; guide and example labels were updated. Native resolution across Light/Dark, Standard/Inverted and all four surfaces retains minimum secondary text contrast 7.022:1 and focus contrast 3.200:1 (864 text pairs and 896 focus checks). Theme has exactly the five documented roots, with every primary/secondary hue represented.

The final export verifier passes 6,233 checks. Exact baseline comparison covers 57,344 Semantic values, 28,416 geometry values and all 417 palette colors across 256 combinations: every value is unchanged. A targeted Chrome run passes 26,768 comparisons of computed colors, geometry and typography, including nested overrides and live Theme changes. Receipts and the ID migration map are in ignored `artifacts/token-system-v3/refinement/`. The web runtime remains outside this Figma-only refinement.

## Historical Figma receipt — before purpose-first refinement, 2026-10-10

The following receipt records the preceding 2,805-variable graph. Current state and native verification are recorded above.

The preceding graph was applied to the existing file `xRYNECwkEL2UISeHASLa31`:

- [01 · Token system](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=24-3000): architecture, concrete alias logic, surface/background/block table, naming, geometry and typography rules.
- [02 · Colors](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=24-3129): eight editable matrices, Light/Dark × four surfaces, each with all 18 colors and three active states.
- [03 · Playground](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=26-723): reusable auto-layout components, independent mode controls, density/radius specimens and three complete composition presets. Open Present for the prototype controls, or select the live instance and set collection modes in Design.
- 04 · References retains the user's original screenshots and sampled surface swatches.

Native readback confirms 8 collections, 2,805 variables, 2,976 alias values, 224 Semantic colors, no Components collection and no raw colors outside Palette. The original 417 palette values remain unchanged. After removing superseded v2 definitions, all 13,682 bindings in the three new pages resolve; no missing variable or mode references were found. Seven variable-bound text styles cover Base and Code roles.

Actual Figma consumer resolution checked 864 active secondary pairs (minimum 7.022:1) and 896 focus backgrounds (minimum 3.200:1). All 17 dark accent contents are brighter than their actual preceding live Figma values; for example, sky content changed from `#BDE9FF` to `#DAF3FF`. A bound geometry instance changes medium control height 32 → 30 px, card inset 16 → 12 px and gap 8 → 6 px in Compact, while text remains 14/20 and independent radius modes produce 0/4/8/16 px control corners.

The final graph passes 7,269 export checks. An independent Chrome check of the same CSS routing implementation covered 256 combinations of all six axes and 170,496 computed-value comparisons without errors; the later targeted change adjusted focus colors and added two fixed tracking tokens, which passed the final graph checks. Native canvas screenshots were inspected for the guide, Light/Dark matrices and complete compositions. The 12 prototype mode actions are present and valid in the native API; a browser click-through could not be verified because that browser was signed out of Figma.

Inter and Overpass Mono specimens render with the available fonts. The Figma tool host cannot load Georgia or Courier New, so their exact role values are saved but their guide specimens are explicitly labeled previews using Inter. This update changes the Figma file, not the published library or existing web runtime. Native receipts, binding checks and screenshots remain in ignored `artifacts/token-system-v3/`.

## Sources

- [Adobe Spectrum — Design tokens](https://spectrum.adobe.com/foundations/design-data/design-tokens): primitive values and semantic aliases keep reusable intent separate from raw values.
- [IBM Carbon — Color guidelines](https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines): contextual layer tokens let the same role adapt to its container; background, field and border roles form coordinated pairs.
- [Design Tokens Community Group — Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/): token types, groups and references provide the interoperable model. The native Figma graph in this folder is an importer contract, not a claim of DTCG serialization conformance.
- [Figma — Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/): collections, inherited modes, aliases and property bindings are the native mechanisms used by the importer.
