---
name: Sloy UI
version: 0.9
---

# Design language

Sloy UI is a compact interface system for content workspaces and tools. Identity comes from `src/brand.json`; palette and shared geometry come from `figma/token-system-v4/source.json`. Use these sources instead of duplicating brand text or hardcoded color samples.

## Surfaces and color

Use Shell for the app shell, Workspace for working lists/sidebars, Content for documents/editors and Overlay for floating UI. Invert establishes a complete opposite-polarity context without changing Theme; Glass is a protected translucent material. Custom backgrounds require explicit context regeneration. Choose by purpose, not nesting. Declare `data-surface` and paint region backgrounds with `--cap-surface-bg`; local cards use `--cap-surface-block` without changing context. Theme, surface, accent, scheme, density, borders, radius and shadow inherit independently.

The shared Figma/runtime v4 graph owns authored color ramps and exact theme/surface pairs. Default accents are blue, green, orange, red, pink and purple alongside neutral. Soft accent fills adapt to the declared surface. Primary buttons remain neutral; accent actions and selection controls inherit local color. Status colors express meaning and do not follow the selected accent. Disabled controls use their own neutral pair.

Decorative outlines are off by default. Structural separators, focus rings and required nested boundaries remain visible. Draw each seam once. See `docs/surface-context.md` for exact roles.

## Type and rhythm

Inter is the interface font; Overpass Mono is optional for code. Use existing size tokens and weights 400/500/600. Compact controls use the small scale; long-form prose uses a 1.8 line height and larger paragraph/list spacing. Headings retain a tighter line height. Do not enlarge table rows or button labels to mimic prose.

Native Figma geometry primitives and resolved sizes use whole pixels; alpha belongs to composed color paint, not fractional FLOAT primitives or whole-layer opacity. Adaptive spacing uses a 4 px unit in Default and 3 px in Compact, rounded per role; fixed spacing, typography and icons stay unchanged. Related actions share a common height through their containing group. Put breathing room between controls and adjacent content panels. Keep prose measure readable; allow code and tables to scroll inside their own region.

## Geometry and interaction

`data-radius` changes none/compact/default/rounded geometry (0/4/8/16 px, default 8 px); None removes radius-only optical insets. Explicit circles and pills remain circular. Hover is temporary, focus is visible, active state is stable. Only directional chevrons rotate; content icons keep their orientation. Keep native keyboard behavior and reduced motion.

Use an existing component and its typed variants before adding a new one. Composition rules and accessible interaction contracts live in `docs/component-guidelines.md`. Do not copy proprietary CSS, token catalogs or assets into the kit; preserve verified third-party license notices.
