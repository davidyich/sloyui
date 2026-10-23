# Verification record

Date: 2026-10-14. Scope: the independent V2 color system, native Figma color specimens and reference prototypes, and the optional reaction probe.

| Check | Observed result |
| --- | --- |
| Reference review | 22 local PNGs and 24 Figma image nodes reviewed, with overlap; native Standard/Dimmed example inspected |
| Generated graph | 8 collections; 1,836 variables; 20 Theme × Scheme × Surface contexts |
| Alias and mode integrity | No missing targets, cycles, missing modes or raw semantic values |
| Neutral ladder | Five distinct useful text levels in every context |
| Fill states | Every required neutral and accent normal/active pair differs |
| Soft accent hierarchy | 120 checks: tertiary normal < tertiary active < secondary normal < secondary active by contrast against the actual backing |
| Alpha invariants | Adaptive follows Theme only; stable ignores all axes |
| Contrast | 2,200 pairs; text minimum 4.540270101325251; tested accent boundary minimum 3.451056240349142 |
| Glass contrast | Base and tinted/neutral overlays over pure black and pure white |
| Live variables | All eight collection fingerprints match source, using Figma float32 representation |
| Native context resolution | 16,600 Surface/Accent resolutions across 100 contexts; zero errors |
| Atlas | 20 reusable surface instances, complete alpha board, usage guide with two reaction instances; zero visible unbound paints or overflowing text |
| Reference prototypes | Seven editable instances, 407 text nodes; zero visible unbound solid paints, unbound blur/shadow effects or overflowing text |
| Figma reactions | Off resolves false and hides circle; On resolves true and shows circle |
| Browser reaction | Default Off, pointer origin, 5% opacity, farthest-corner coverage, completion cleanup, keyboard center, immediate Off cleanup, reduced motion, all five surfaces |
| Browser contexts | Theme, Scheme and Accent update live colors independently in the probe |
| Responsive probe | No horizontal document overflow at 1280 and 390 px; visual desktop/mobile inspection |
| Browser errors | None |
| Original Figma work | All 20 original Refs page roots remain; no original reference node was mutated |
| Local change check | git diff --check passes |

Visual review covered the four full contextual atlas boards, the alpha board, all seven reference compositions, the usage guide, and the browser probe. Glass was re-reviewed after restoring background blur alongside shadow and strengthening its protective base. Construction components are on their own page, outside the final review boards.

Machine-readable local evidence is in ignored `artifacts/color-system-v2/`: `live-audit.json`, `atlas-audit.json`, `browser-verification.json`, final screenshots and `state.json`. Recompute mathematical checks with `verify.mjs`; generated results are in `verification.json`.

The contrast matrix tests the documented foreground/background pairings, not arbitrary combinations of tokens or arbitrary lower-opacity Glass. Disabled text and decorative borders are not asserted to meet the essential-content threshold. Figma examples are editable visual compositions; browser behavior is verified only in the reaction probe. No runtime migration or website deployment is claimed.

## Accent revision 0.2

The owner requested calmer Secondary/Tertiary colors and additional surface-specific shades. Added 240 palette primitives (200 opaque, 40 translucent) and updated 222 internal Theme variables in place. The public Surface and Accent IDs, primary fills and neutral roles are preserved. The revision uses low-chroma OKLCH steps relative to each neutral backing instead of choosing saturated solid-action ramp steps. Glass uses its own low-chroma translucent pigments.

Rechecked all four native atlas boards, the Dark Dimmed Workspace and Dark Glass composition. All 2,200 contrast pairs and 120 accent-hierarchy checks pass; all 16,600 live Figma resolutions match the regenerated graph. Before/after inputs, screenshots, the visual comparison and live audit are saved under `artifacts/color-system-v2/accent-revision/`. The prior browser interaction record remains applicable to unchanged reaction behavior; this revision changed colors only.

## Nested accents and Figma grouping 0.3 — 2026-10-16

Changed 200 existing palette values to translucent pigments. Their composite on the original base equals the 0.2 appearance; they now blend with actual neutral Secondary/Tertiary backings. Glass pigment values are unchanged. Updated 67 Theme routes to retain text contrast on the expanded backing matrix. Renamed 62 public Surface variables in place, grouping by role then hue/state. Variable count and all existing IDs remain unchanged. Logical keys and CSS syntax remain stable; the graph records Figma display names separately.

| Check | Result |
| --- | --- |
| Source | 11,800 contrast checks; minimum tested text contrast 4.504549617269486:1; accent boundary minimum 3.451056240349142:1 |
| Nested hierarchy | 600 checks; ordered tertiary normal → tertiary active → secondary normal → secondary active, with no reversed light/dark direction |
| Regression comparison | The identical nested matrix reports 264 hierarchy failures and 295 direction failures before the revision; zero of either after |
| Backings | bg; neutral tertiary normal/active; neutral secondary normal/active; Glass over pure black and white |
| Text on nested accents | Colored primary/secondary and neutral primary/secondary, all five hues and all four soft fill states |
| Figma graph | All eight collection fingerprints match; 16,600 live resolutions in 100 contexts; zero errors |
| New native specimens | Component 60:2; four boards 60:3783, 60:5234, 60:6685, 60:8136; 20 linked instances |
| New board geometry | Each board: 613 editable text nodes, 1,138 bound solid fills, five instances; no unbound solid fills or text outside parent bounds |
| Updated guide | 37:4334; new public paths and alpha instructions; no text overflow |
| Visual review | Native Light Standard and Dark Dimmed nested boards; Light Standard and Dark Dimmed Workspace; Dark Glass; updated guide |
| Browser color comparison | Before/after nested Light/Dark Content rendered in Chrome and visually reviewed |

Only the fill is translucent; text/node opacity stays unchanged. Fill/background contrast is intentionally subtle and is not claimed to meet the 3:1 requirement for essential control boundaries. Use a semantic border where needed. The contrast guarantee covers the documented neutral backings, not arbitrary chromatic stacking. CSS export retains fractional RGB precision to avoid whole-channel rounding eroding near-threshold text contrast.

Evidence and rollback inputs: `artifacts/color-system-v2/nested-revision/`. The existing reaction behavior was not changed or re-tested in this revision. No v4 runtime migration or deployment occurred.

## Content, saturation and composed opacity 0.4 — 2026-10-16

Public `surface/primary` now groups bg, invert-normal and invert-active with primary pairs. `Content` replaces TEXT & ICONS in the native master; its neutral specimens show primary, secondary, tertiary, muted, disabled and inverted. The old strong ID remains only as hidden `compat/content-strong`. These changes propagate to all 20 surface instances.

Light Primary uses explicitly authored saturated colors paired with white foreground on blue/green/red and black on yellow/orange. Both accent Content levels retain contrast while differing in chroma by more than 1.5×. Glass soft pigments are more saturated, with Secondary 16/24% and Tertiary 7/11% opacity.

All 340 translucent colors now store Figma composed color values: a pigment variable alias plus an opacity variable alias. Twenty-five public COLOR_OPACITY number variables alias percent values in Primitives. No raw color contains baked alpha. The API support was verified with a temporary probe, removed after use.

Migrated 61 paint bindings to named Surface colors and cleared 15 explicit Accent modes. Checked all four pages, including original Refs (no mutations there), and all variable aliases before removing the obsolete Accent collection and its ten variables. Five hue families are simultaneously available; extending the hue list does not introduce modes.

| Check | Result |
| --- | --- |
| Graph | Eight collections, 2,216 variables; opaque raw colors only; no Accent axis |
| Contrast | 11,720 pairs; minimum tested text 4.545620477156425:1 |
| Primary foreground | Both states, both themes, every context; minimum accent Primary 4.660:1 |
| Nested hierarchy | 600 checks on bg and four neutral backings, including Glass extremes |
| Content saturation | Two distinct chroma levels for each hue in all 20 contexts |
| Live Figma | All eight fingerprints match names, modes, types, scopes, values and WEB syntax; 3,620 Surface/Opacity resolutions; zero mismatches |
| Native atlas | 4,364 text nodes, 7,746 solid paints; no unbound paints, text overflow or stale Accent mode overrides |
| Updated guide | Five text nodes updated in place; same 2,352 × 993 frame; no overflow |
| Visual review | Fresh native Light/Dark Standard atlas, Dark Dimmed nested atlas and Dark Glass prototype; local before/after Content and Glass comparison |
| Browser | Twelve checks pass, including direct named-hue selection, theme/scheme changes, pointer/keyboard reaction, reduced motion and 390px width; no exceptions |
| Local changes | git diff --check passes |

Evidence and rollback inputs: `artifacts/color-system-v2/content-revision/` and `artifacts/color-system-v2/alias-opacity-revision/`, plus the current `browser-verification.json`. The live audit probe was removed. This revision changes only the isolated Figma exploration and its preview; no v4 runtime migration or deployment.

## Palette Lab editor — 2026-10-16

Added a portable offline HTML editor with named color projects, Light/Dark comparison, Standard/Dimmed and five system surfaces plus Custom. Controls use the existing kit. Both the V2 builder and editor now import the same pure color engine; the existing V2 graph remains byte-for-byte unchanged. No live Figma variables were changed by this editor task.

TypeScript passes. Eighteen hues across 432 contexts pass 26,568 contrast checks. All 400 soft-fill pigments and 200 Content values match V2 with original parameters. Checked 2,592 exported fills and idempotent import of 9,528 variables against a mock Figma API. Sixteen browser scenarios pass, including HEX/RGB entry, custom background, layer density, undo, downloads, import/reload, invalid input preservation and offline file:// use. Axe reports no WCAG 2 A/AA violations in the tested view; no document overflow at 320, 390, 760, 1280 or 1440 px. Reviewed desktop, matrix, mobile and picker screenshots.

Delivery and evidence: `artifacts/color-system-v2/palette-editor/`; reproducible commands and limits: `editor/README.md`. The optional Figma JavaScript export was not executed against a live file.

## Palette Lab redesign and foreground policies — 2026-10-18

Rebuilt the editor into three independently scrolling panes: global navigation/environment on the left, samples and complete contextual palettes in the center, selected-color parameters on the right. Existing kit controls share a 44 px height. Added filled sliders, draggable numeric prefixes, a keyboard-operable two-axis fill character pad, 20 editable presets and 120 role specimens across 12 theme/surface contexts. Mobile navigation and properties use the kit Drawer with Escape and focus restoration. The interface theme is applied before first paint and remains independent of preview themes.

The shared WCAG calculation was retained. New editor policies select light/dark/tinted/custom foregrounds, then solve Primary lightness against both Normal and Active states. Defaults increase chroma, preserve soft-fill order and test content/borders against the actual backing, including both protected Glass extremes. The green seed `#00995B` yields Light Primary `#00874F` / `#007947` with white text: displayed contrast 4.61:1 / 5.48:1. Extreme custom combinations remain explicitly reported when a target cannot be met. Project v1 imports migrate to v2; exported pigment aliases and numeric opacity variables remain separate. This does not change the published V2 graph, v4 runtime color policy or live Figma variables.

| Check | Result |
| --- | --- |
| Types and full repository checks | Editor typecheck, `npm run check` and `npm run release:develop` passed; 858 tests in 78 files, package verification and the 108-module single-React check |
| Color model | 18 hues, 432 contexts, 26,568 contrast checks, 400 original V2 pigment parity checks; zero errors |
| New policies | 320 Primary policy checks and 480 preset contexts; zero errors |
| Exports | 2,592 fill checks, 9,554 variables, 1,728 composed resolutions; project round-trip and repeated mocked Figma import passed |
| Browser runner | Nine flows: paired previews, consistent heights, keyboard hue/undo, two-axis control/undo, all role specimens, surface matrix, responsive scrolling, mobile parameters and navigation |
| Responsive geometry | 320×568, 390×844, 760×600, 1100×700, 1440×900 and 720×450; no document overflow, panel scrolling retained |
| Additional interaction checks | Pointer drag on numeric prefixes and the two-axis pad; custom foregrounds; interface theme persistence; project replacement confirmation; invalid import preservation; JSON download |
| Published browser | Catalogue navigation opens `/develop/palette-lab/`; samples and palettes work; Primary computed colors match the model; no console errors or document overflow at 1440×1000 |

Viewport sizes were emulated; 720×450 is a 200%-equivalent reflow check, not an actual browser zoom measurement. No physical-device test or new axe audit is claimed. The updated standalone artifact was browser-tested over local HTTP; its file protocol was not tested in this revision. Figma JavaScript remains tested against a mock API, not a live file.

Published to [Develop Palette Lab](https://sloyui.com/develop/palette-lab/) as release `20261018T165841Z-97ee3445729a`. The standalone HTML, generated public file, site output and downloaded HTTPS response match SHA-256 `875baf4255101986f79f600d321748227a38be3c61bf1c0925ef354407a115c7`. Develop API health returned `ok`. Evidence: `artifacts/color-system-v2/palette-redesign/`, including model/browser reports, release log and screenshots of the published editor. The main production channel was not promoted.

## Complete hue ramps and compact resizable workspace — 2026-10-18

Replaced the editor's inverse soft-pigment composition with opaque, constant-hue ramps. Inverse subtraction of a tinted Custom backing could previously produce a green pigment for a violet accent. Every semantic fill now selects an exact primitive, with opacity applied separately. Each accent supports 21, 25, 33 or 49 steps in solid, soft and muted scales. Primary, Content and Border also select existing steps; custom foreground colors remain explicit separate values. The existing shared V2 engine and published graph remain unchanged. Projects migrate from v1/v2 to v3 with 25 steps, retaining old storage keys.

The screenshot regression seed `#9147FF` has hue 295.995876°. On the default Custom backings its Light soft pigment is `violet/soft/14` (`#8056D0`), Dark is `violet/soft/12` (`#9672E5`); both retain that hue within 0.000004°. Normal/Active states apply separate numeric opacity to these references. Evidence: `custom-violet.json`.

The kit's ResizablePanelGroup now controls both sidebar widths, with persistence, keyboard limits and pointer drag. Desktop controls use 36 px; mobile keeps 44 px and 16 px input text. Removed the brand block, increased radii, aligned select values/arrows to the right edge and removed ColorPicker's local 280 px width cap. One Light/Dark selector updates shell, preview and applicable parameters; Both shows comparison. Tooltip provides contextual information on hover/focus; click copies HEX or alpha CSS without a modal. Warnings are attached to their actual theme/surface and relevant token. Export-wide warnings include the accent name.

| Check | Result |
| --- | --- |
| Color and export model | 26,568 contrast checks; 320 Primary policies; 480 preset contexts; 2,592 exported fill checks; 1,728 composed resolutions; zero errors |
| Complete ramps | 7,680 steps across 20 presets and four lengths: monotonic lightness, hue preserved within 0.01° |
| Semantic reuse | 11,520 fill-to-primitive comparisons; exact RGB matches; 4,824 variables in the 18-hue fixture; repeated mock import passes |
| Existing V2 boundary | 400 original pigment parity checks pass in the unchanged shared engine |
| Browser | Eleven flows: aligned compact controls; 25/33-step ramps; copy action without modal; focus tooltip; resize limits/persistence; unified theme; contextual warnings; 120 surface roles; responsive panels; mobile focus restoration |
| Geometry | Document and each panel have no horizontal overflow at 320×568, 390×844, 760×600, 1100×700, 1440×900 and 720×450, including sidebar width extremes |
| Manual interaction | Both splitters dragged to 224/288 px; hover entered violet/soft/02 without clicking/focusing and opened its tooltip; no copy fired; mobile ColorPicker and section widths both 346 px |
| Release | Editor typecheck, full repository/package/module checks pass; 858 tests in 78 files |

The copy action's success status and absence of a modal were verified. The browser tool's separate virtual clipboard did not expose the page clipboard, so an OS clipboard read is not claimed. Mobile sizes and 200%-equivalent reflow were emulated. No physical-device, actual browser-zoom, new axe or live Figma import check is claimed.

Final Develop release: `20261018T200114Z-97ee3445729a`. Standalone/public/site/deployed HTML all match SHA-256 `2f6072c292e9b5e6a1f83f397fdabef72bc09eddfd81adcfaf35b7577ec5c7b3`. API health returned `ok`; the published browser shows all 75 default primitives and two splitters with no console errors. Reports, rollback sources, release logs and published screenshots: `artifacts/color-system-v2/palette-ramps/`.


## Project navigation and canonical token integration — 2026-10-21

The editor now has separate collection pages and a selected-color workspace with tabs. The right inspector appears only for a selected color. New projects include 20 presets; existing projects are preserved. Parameter controls now use the public kit components, and Invert parameters edit the effective opposite-polarity scale without changing the outer theme. Exporting a project explicitly audits and labels the whole project.

The shared engine now drives canonical v4 as well: Invert and protected Glass are available in the runtime, with named pigment aliases and numeric opacity aliases. Static verification passed 504 contexts, 30,384 contrast checks, 320 Primary policy checks, 560 preset contexts, 80 Invert comparisons, 7,680 ramp checks, 13,440 exact semantic alias checks and 3,024 exported fill checks. Project round-trip and repeated mocked Figma import pass. Editor TypeScript passes.

The new browser runner covers collection-to-detail navigation, tab switching, Invert, controls, copying, resizing, materials and responsive drawers. After explicit user permission it passed all 12 flows. The mobile numeric-field font override was corrected to 16 px. Additional checks cover 20 presets, the 128-color limit, long names, exact project export, pointer resizing and Slider2D drag/Undo. The original project was restored exactly through UI import. Current evidence: artifacts/token-integration-20261021/editor-browser-verification.json; complete scope is recorded in docs/verification.md under Palette Lab browser completion.

Develop release `20261021T092424Z-a96565fb5c74` (0.14.0) completed successfully. Full release checks passed 875 tests in 79 files, TypeScript, library/catalogue builds, isolated package verification and the 110-module single-React check. HTTPS responses for the catalogue, Palette Lab and package match their local SHA-256 hashes; both Develop and main API health return `ok`. Editor HTML SHA-256: `c7879a84a9f80a9a4ccab1443688be61d17f26e9fc2cbca6a4b1f13f46e8ea4f`. Main production was not promoted. Receipt: `artifacts/token-integration-20261021/live-release.json`.

Published browser completion patch 0.14.1 to Develop as `20261021T110952Z-ace2c924bc06`. All 875 tests, builds, package and 110-module checks pass. Public catalogue, Palette Lab and package hashes match local outputs; both API health checks return `ok`. The existing Develop tab reloaded into the new navigation while retaining its three saved colors. Its mobile inspector at actual 351×760 CSS px has 44 px inputs with 16 px text and no horizontal overflow; console errors are empty. Viewport overrides were reset, the local QA tab/server closed and the published tab retained. Receipts: `live-release-0.14.1.json`, `editor-published-browser.json`, `editor-develop-final.png` under `artifacts/token-integration-20261021/`.
