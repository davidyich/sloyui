# Component identity and review

`source/component-registry.json` owns permanent IDs, review statuses and multiple group memberships. `npm run manifest` copies this metadata into `agent-manifest.json`; the catalogue reads the generated metadata. Never regenerate IDs from names or list position. Renames keep the same ID; retired entries remain `archived` with a replacement when available.

- `not-ready`: a known issue remains under correction.
- `needs-review`: implementation is available, awaiting design review. This is mandatory for newly introduced components.
- `ready`: recorded review confirms the intended behavior and appearance.
- `archived`: excluded from navigation; existing routes resolve to the replacement.

Keep one canonical page and one typed playground per public component. `primaryGroup` determines its default navigation location; `groups` includes every relevant use. A group filter searches all memberships. Search accepts names, descriptions and IDs. Status filters do not alter component routes.

Tag remains the canonical accented label family with Badge and TypeLabel compatibility aliases. Chip is the neutral removable choice family. RichTextEditor is the current editing entry; MarkdownEditor is an archived compatibility export. Adapted overflow tabs and bouncy disclosures stay variants of Tabs and Accordion rather than duplicate pages.

Execution tracking and independent verification for the current revision live in `docs/revision-2026-10-07.md`. Passing tests is evidence, not a substitute for visual approval.
