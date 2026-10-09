# Verification — Sloy UI 0.10.0

Checked 2026-10-08. This record describes the checked scope; it does not certify every component or downstream application.

## GitHub task workflow — checked 2026-10-09

- Repository language follow-up: all canonical instruction prose and task/PR templates were checked for English. Recipe code blocks are byte-for-byte unchanged, preserving Russian UI copy and bilingual examples. The 21 document/registry tests and static catalogue build passed; `git diff --check` passed.

- `npm run check` passed: types, all 670 tests in 57 files, token/manifest generation and both builds. Issue form YAML and required schema fields were validated; `git diff --check` passed.
- The local `#agents` catalogue lists `github-tasks.md`; selecting it in Orca's browser loads the real document and its GitHub/Orca instructions. The registered set now contains seven files; private custom drafts remain excluded from the static catalogue.
- GitHub Issue #3 was created and the current SSH workspace's `linkedIssue: 3` was confirmed. Template availability on GitHub requires the configuration PR to merge into `main`; this check does not claim automatic GitHub/Orca status synchronization.

## Automated checks

- `npm run check`: token and manifest generation, TypeScript, 670 tests in 57 files, library and static catalogue builds passed.
- The graph contains 417 authored palette colors, 408 derived dark secondary primitives and 2,381 Figma variables. Light secondary and all solid-action roles remain unchanged. The 576 secondary pairs have minimum text contrast 4.583:1; minimum reaction contrast is 4.508:1. Active dark pairs are at least 5.811:1.
- Targeted tests cover palette wrapping across both orientations, semantic-token copying, Floating as the fourth surface, Interface/Prose switching, locale preservation and local hover for line tabs. Source and generated CSS/Figma aliases agree across all surface/theme contexts.
- The package is checked with an isolated NodeNext consumer, executable examples, SSR, exports, bundled fonts and license inventory. React and React DOM remain peer dependencies; runtime dependencies are empty.
- Public source excludes private drafts and local audit artifacts. Document build tests preserve six core instructions and local revision checks. `git diff --check` passes.

## Independent browser review

- Reviewed the catalogue at 1280 × 800 and 390 × 844, with Russian labels and light/dark themes. No document-level horizontal overflow on the mobile Colors page.
- ComboBox keeps its accessible name while the default visible label/hint are hidden. Component IDs appear at the top-right. Overview samples stay centered without form captions.
- Palette controls are aligned, both segments have equal width and no box shadow, and wrapping stays enabled when changing orientation. Secondary accent previews are visibly distinct from solid actions. All four surfaces stay in a horizontal lane.
- SegmentedControl has equal 3.5 px top/bottom painted insets with fractional 0.5 px borders, including xs and md sizes. Default outer/inner radii are 12/9 px; rounded mode produces full capsules. Tabs default to segment; line tabs contain no moving hover layer. Overflow tabs become full capsules in rounded mode, and End selects/reveals the last tab within the local viewport. The global accent picker retains its six-column grid and fits the mobile viewport.
- Interface and Prose share font sizes with different line-height tokens. Prose body samples render at 14/24 and 16/28 px.
- The main scroll viewport uses token-based edge fades. The settings dock remains outside the mask; the document itself does not scroll.

Local screenshots and release receipts remain outside public source. Figma was read as a visual reference; no live Figma write, npm registry publication or domain deployment is claimed.
