# Figma: Sloy UI V2

The current rebuild target is [SloyUI V2](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp). Verify this file key before every native write. Earlier files and node IDs are historical evidence; do not run their importers against V2. Rebuilding creates new IDs, so publish node links only after native readback.

## Source and exports

- `token-system-v4/source.json` and its generator own the shared calculation graph; `npm run tokens` regenerates runtime and compatibility exports.
- `color-system-v2/editor/model.mjs` supplies Palette Lab color/context calculations. Its opaque ramps are shared between themes and semantic roles.
- `color-system-v2/export-custom.mjs`, run from the repository with its imports and JSON inputs, generates a separate named project collection, CSS, import script and verification for exact Light/Dark RGB backgrounds. The downloaded generator source alone is not standalone. `guide/custom-example.json` is its generated guide sample; it does not change the core native preset.
- `color-system-v2/build-native.mjs` exports `color-system-v2/native-graph.json` for the compact native library. This is the native rebuild input; do not replace it with the dense runtime graph or historical v2 importer.
- [Surface contract](../docs/surface-context.md) defines paint, independent context axes, Invert, Custom and alpha. [Designer guide](color-system-v2/designer-guide.md) maps roles to recipes. [Controls](controls/README.md) records reusable coverage and migration status.

Default scope is neutral plus Blue, Green, Orange, Red, Pink and Purple. Runtime keeps one opaque ramp per hue. Native Palette keeps only referenced RGBA values, with alpha in whole percentages. Native FLOAT geometry uses integers; fractional alpha/ratios/calculation intermediates and a duplicate Opacity collection do not belong in native variables. Apply translucency to color paint, never an entire component layer.

## Designer contract

Use **V2 · Surface** for color picking. Internal Palette, Theme and Scheme route values; they are not alternative public pickers. Semantic groups are flat, neutral first, with Normal/Active adjacent. Shared `content/on-primary` resolves to exact black or white; avoid redundant per-hue foreground roles.

Theme has Light/Dark; Scheme has Standard/Dimmed; native Surface has Shell/Workspace/Content/Overlay/Invert. Invert establishes its complete opposite-polarity context without changing Theme. Glass remains a runtime material. Custom backgrounds require explicit generator recalculation and a coherent export; native variables do not sense arbitrary frame backgrounds.

Accent modes are Neutral (default), Blue, Green, Orange, Red, Pink and Purple. Set independent modes on the containing frame; leave instances on Auto. Density, Radius and Borders inherit independently. Use semantic bindings, editable text, Lucide vectors and Auto Layout in components and layouts. Explicit hue roles allow multiple colors in one composition.

## Verification and recovery

Generated JSON or local mock checks do not confirm live Figma. Record native collection/mode/alias/geometry checks and actual rendered controls separately in [verification](../docs/verification.md). Check Light + Invert while Theme remains Light, both schemes, all supported accents, nested blocks and floating overlays. Check alpha after compositing against the declared background.

The rebuilt V2 now contains the controls and editable guide pages:

- [Start · 0.17.0](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=164-498)
- [Colors and Invert](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=161-4037)
- [Controls showcase](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=162-468)
- [Composition components](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=163-2)
- [Project board and settings](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=164-2)
- [Exact Custom backgrounds](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=161-4299)

These links record created assets. The actual acceptance/deployment scope remains in verification. Layout state variants do not imply working drag/click prototypes. [Control-to-web mapping](controls/README.md) distinguishes Figma appearances from web variants; composition components are recipes, not a new web API.

[Consolidation record](../docs/consolidation-20261023.md) gives source precedence, session references, backup inventory and outstanding recovery checks. Historical v3/v4 guides and legacy importers remain reference/compatibility material; their counts, public Theme picker and old Inverted behavior are superseded for V2.
