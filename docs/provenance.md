# Sloy UI provenance

The current color contract is authored in `figma/token-system-v4/source.json`, with shared OKLCH/gamut-mapping calculations in `figma/color-system-v2/editor/model.mjs` and `color-engine.mjs`. Runtime Palette contains six 41-step hue ramps, a 41-step neutral scale and black/white: 289 opaque colors. Compact native Figma Palette retains 328 referenced paints, including integer-percent RGBA colors, without an Opacity-number collection. `source/foundation.json` and `source/surface-rules.json` retain web compatibility inputs; CSS and native exports derive from the shared model.

Custom project backgrounds preserve exact requested RGB and require explicit generation through `figma/color-system-v2/export-custom.mjs`. Run this script from the repository with its imports and JSON inputs: a downloaded source `.mjs` alone is not standalone. See the [color export instructions](../figma/color-system-v2/README.md).

The `cap-*` CSS namespace and `cp-*` component IDs are stable public API identifiers. The palette model, semantic roles and vector logo are authored for Sloy UI.

Original Sloy code and its vector logo are MIT licensed. Fonts, icons and adapted Arc material retain their own notices; see [third-party inventory](third-party.md) and [full notices](../THIRD_PARTY_NOTICES.md). Simple catalogue SVG fixtures are local examples. No external photographs are bundled.

The Figma importer is generated and tested with a mock API. A passing export test does not demonstrate a live Figma write. The configured `sloyui.com` identity does not demonstrate domain deployment. Technical verification is recorded in [verification.md](verification.md).
