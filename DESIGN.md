---
name: Sloy UI
version: 0.9
---

# Design language

Sloy UI is a compact interface system for content workspaces and tools. Identity comes from `src/brand.json`; palette and dimensions come from `source/foundation.json`. Use these sources instead of duplicating brand text or hardcoded color samples.

## Surfaces and color

Use canvas for the surrounding workspace, base for primary content, raised for nested cards and floating for overlays. Declare `data-surface` and paint custom wrappers with `--cap-surface-current`. Theme, surface, accent, borders, radius and shadow inherit independently.

The palette is independently generated from authored OKLCH ramps and neutral luminance. Soft accent fills adapt to the surface. Primary buttons remain neutral; accent actions and selection controls inherit local color. Status colors express meaning and do not follow the selected accent. Disabled controls use their own neutral pair.

Decorative outlines are off by default. Structural separators, focus rings and required nested boundaries remain visible. Draw each seam once. See `docs/surface-context.md` for exact roles.

## Type and rhythm

Inter is the interface font; Overpass Mono is optional for code. Use existing size tokens and weights 400/500/600. Compact controls use the small scale; long-form prose uses a 1.8 line height and larger paragraph/list spacing. Headings retain a tighter line height. Do not enlarge table rows or button labels to mimic prose.

Spacing uses a 4 px rhythm. Related actions share a common height through their containing group. Put breathing room between controls and adjacent content panels. Keep prose measure readable; allow code and tables to scroll inside their own region.

## Geometry and interaction

`data-radius` changes compact/default/rounded geometry; explicit circles and pills remain circular. Hover is temporary, focus is visible, active state is stable. Only directional chevrons rotate; content icons keep their orientation. Keep native keyboard behavior and reduced motion.

Use an existing component and its typed variants before adding a new one. Composition rules and accessible interaction contracts live in `docs/component-guidelines.md`. Do not copy proprietary CSS, token catalogs or assets into the kit; preserve verified third-party license notices.
