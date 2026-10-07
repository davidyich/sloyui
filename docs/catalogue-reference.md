# Catalogue and API reference

Every canonical component has one page with a typed Playground, variants, an immediately visible code example, API Reference, short usage guidance, agent contract and related cards. Overview and Changelog precede foundations. Ready components have no sidebar marker; new components remain `needs-review`. IDs use `cp-001` and retain their numeric identity through renames.

`npm run manifest` derives `api` rows from exported TypeScript signatures using `scripts/build-reference.mjs`. This includes inherited kit props, selected useful native props and a final native-attributes row. Types, optionality, JSDoc and explicit destructuring defaults come from source. A dash means no explicit signature default; do not invent defaults from playground state. Complex aliases remain the public type name. Update JSDoc on the owning prop to document component-specific behavior.

The same manifest records own `usage`, `agentNotes` and `related`. Concise guidance and preferred relationships are curated in `scripts/build-reference.mjs`; group guidance and shared memberships provide deterministic fallback. The catalogue reads these records, never a separate manual props table. Related cards exclude self and archives. Copy contract exports exactly the selected component record.

`ControlList` keeps size first in both Playground registries and places field focus width/offset together at the end. Do not duplicate global appearance/accent/surface/border/radius controls in a component's settings.

The catalogue sidebar paints Canvas, content paints Base. Preview context is independent. Use the full-width Playground layout for ContentLayout so resize handles have room; keep demonstration controls separated from their panels by a real gap. Overview thumbnails are noninteractive, lazy rendered previews, while component pages remain interactive.

The palette viewer uses the standard surface SegmentedControl on its own responsive controls row. “Переносить по ширине” defaults on: row mode wraps shade cells; column mode wraps complete palettes. Turning it off preserves a continuous horizontal strip with edge fades and a hidden scrollbar. Switching layout resets only that scroll viewport, keeping the selected shade.
