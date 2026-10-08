# Sloy UI provenance

The current color foundation is independently authored in `source/foundation.json`. Its analytic OKLCH scales use gamut mapping to generate 17 hue families with 22 steps, a 41-step neutral scale and black/white. `source/surface-rules.json` maps surfaces to these palettes. `scripts/color-model.mjs` derives accessible semantic pairs; CSS and Figma exports share this source.

The `cap-*` CSS namespace and component APIs remain for compatibility. They do not imply affiliation with Capacities. Original captured stylesheets, palette exports and frozen pre-Sloy archives are not inputs or deliverables of version 0.9. Historical Git/release artifacts require separate cleanup and are not certified by the current-tree audit.

Original Sloy code and its vector logo are MIT licensed. Fonts, icons and adapted Arc material retain their own notices; see [third-party inventory](third-party.md) and [full notices](../THIRD_PARTY_NOTICES.md). Simple catalogue SVG fixtures are local examples. No external photographs are bundled.

The Figma importer is generated and tested with a mock API. A passing export test does not demonstrate a live Figma write. The configured `sloyui.com` identity does not demonstrate domain deployment. Technical verification is recorded in [verification.md](verification.md).
