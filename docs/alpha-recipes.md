# Shared alpha recipes

`figma/color-system-v2/editor/alpha-recipes.mjs` supplies the canonical v4 generator, Palette Lab and exact-RGB Custom scopes. [Surface context](surface-context.md) defines semantic roles and independent axes; the [designer guide](../figma/color-system-v2/designer-guide.md) maps them to Figma.

## Semantic hierarchy

Primary is the strong, opaque emphasis. Secondary is a quiet tinted surface, and Tertiary is the faintest interactive tint. Judge the composited result against its actual backing, not the pigment or its alpha alone. Secondary must have an upper prominence bound as well as a lower visibility bound. A dense old sample is not an appearance anchor that overrides owner review.

Normal and Active are fitted jointly. Active increases emphasis gently and replaces Normal; never paint it on top. Text must remain at least 4.5:1 after composition. Fill prominence and state distinction are project appearance criteria, separate from WCAG text contrast. Lower tint chroma is expected when reducing fill prominence; preserve hue identity instead of forcing the previous dense chroma/lightness pair.

Default fill appearance bounds are measured against every declared backing:

| Role | Target contrast | Allowed contrast |
| --- | --- | --- |
| Tertiary Normal | 1.06 | 1.035–1.16 |
| Tertiary Active | 1.13 | 1.10–1.25 |
| Secondary Normal | 1.22 | 1.12–1.35 |
| Secondary Active | 1.34 | 1.20–1.50 |

The upper values are safety limits, not targets. Normal/Active retain at least 1.06 contrast and an OKLab distance of 0.015–0.05. Authored strength scales prominence bounds; incompatible authored settings remain explicit diagnostics. Neutral paints use their separate quiet policy.

## Bounded backing families

Region backgrounds remain defined colors. Neutral block/control/disabled and accent Secondary/Tertiary use alpha paints. A recipe is shared across a declared family of backgrounds and supported neutral nesting; it is not universal for arbitrary RGB or unlimited nesting. Public semantic roles retain their meaning even when internal paints are deduplicated.

`alphaRecipeFamily(localTheme, surface, base)` selects five internal families:

| Family | Declared region background |
| --- | --- |
| `Light` | Ordinary light background with OKLab L ≥ 0.985 |
| `Light/Neutral` | Muted light background with OKLab L < 0.985 |
| `Dark` | Ordinary background with dark local polarity |
| `Glass/Light` | Protected Glass with light local polarity |
| `Glass/Dark` | Protected Glass with dark local polarity |

The declared region background and local polarity select the family, including Invert. A nested block inherits the family. These are solver groups, not additional public Surface modes. Custom is regenerated separately from exact authored RGB.

Invert changes the local background, neutral layers, text, boundaries and accents without changing the outer Theme. The canonical and automatic project backgrounds are exact black in Light and exact white in Dark. Authored Palette Lab overrides are preserved and rechecked. Glass uses its protected base and is checked over both black and white underlays.

## Calculation

1. Collect the family's composed sRGB backgrounds: the region base, block, neutral controls and supported nesting. Compose protected Glass over both extreme underlays first.
2. Search existing opaque pigments at whole-percent alpha. Do not create intermediate RGB primitives or fractional FLOAT variables.
3. Fit Tertiary/Secondary Normal/Active jointly against every backing. Check lower visibility, upper prominence, hue identity, hierarchy and gentle state distinction.
4. Select primary and secondary content across the complete set of rendered backgrounds, including the content's own alpha. Preserve at least 4.5:1 text contrast. Primary/on-primary remains a separate opaque pair.
5. Remove exact internal paint and routing duplicates. The native exporter chooses the smaller equivalent Theme/Scheme order while preserving public paths, independent modes and geometry.

Composition is in sRGB: `result = alpha × pigment + (1 − alpha) × backing`. WCAG luminance is evaluated afterward. Equal alpha does not mean equal visual strength on different backgrounds. Alpha belongs to COLOR; text and component layer opacity remain 100%.

## Use

Set Surface on a region and paint `surface/bg`. A local card inherits its context and paints `surface/block`. Use paired content of the same hue on Secondary/Tertiary. Disabled has its own fill and content; never fade the whole component. Theme, Scheme, Surface, Accent and Borders inherit independently.

A recipe has a finite verified domain. Arbitrarily stacked chromatic paints or images require a new calculation. Establish a Surface for a distinct region; use protected Glass or a defined Overlay background for image-backed content. Never infer context by sampling DOM colors.

## Custom backgrounds

Preserve the exact authored HEX and recalculate a coherent project scope. When readability, tint strength or state separation cannot be satisfied together, report the measured limitation. Arbitrary authored ramp points and higher contrast settings do not imply universal feasibility.

A fixed opaque Primary can have less backing contrast than Secondary on an arbitrary authored background, even when its paired text is readable. Soft-fill acceptance does not prove universal Primary prominence or a distinct secondary text level on every RGB. Keep those diagnostics visible.

Changing HEX requires regenerating the complete export. Editing a frame background in Figma does not run the generator. Keep project-specific colors out of the core native library.

## Verification

`npm run check` verifies the graph, Custom exports, components and builds. `node scripts/verify-alpha-recipes.mjs --help` describes independent numerical acceptance and frozen comparisons. Before/after appearance comparisons with different policy bounds must be labelled as such. A numeric pass does not replace inspection of Primary/Secondary/Tertiary together on Light, Dark, Invert and nested backgrounds.

`node figma/color-system-v2/verify-native.mjs --compare-routing` checks equivalent routing orders. Record actual native readback, rendered screenshots and deployment evidence in [verification.md](verification.md).
