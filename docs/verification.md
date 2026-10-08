# Verification — Sloy UI 0.9.0

Checked 2026-10-08. This record describes the checked release scope, not a guarantee for every component or downstream application.

## Automated checks

- `npm run check`: token/manifest generation, TypeScript, 656 tests in 56 files, library build and static catalogue build passed.
- After the final light-surface adjustment: token, surface and Figma suites passed (41 tests). The generated foundation has 417 colors, 576 secondary combinations and 1,947 Figma variables. Minimum text contrast is 4.583:1; minimum tested reaction contrast is 4.508:1.
- `npm run pack:kit` and `npm run verify:package`: the `sloyui@0.9.0` archive passed an isolated NodeNext consumer, four executable examples, SSR, font asset resolution, public export checks and package hygiene checks. React and React DOM are peers; runtime dependencies remain empty.
- Full upstream license texts are included in the archive and compiled catalogue. Captures, frozen archives and private instruction drafts are excluded. The document build test verifies that only six canonical files are exported while custom files remain editable locally.
- `git diff --check` passed. A current-tree scan found no credential patterns or absolute local user paths; this is not a Git-history scan.

## Independent browser review

- New Sloy logo, page title, version and RU/EN navigation appeared correctly.
- Changelog paragraph/list spacing reviewed in dark theme; palette and component previews reviewed in light theme after moving Canvas/Base to lighter independently generated neutral steps.
- Switch solid and soft accent fills were visibly different; global theme and decorative border controls remained functional.
- CodeBlock and API boundaries were quiet single lines in Light; structural table boundaries remained visible with decorative borders off.
- At 390 × 844, the component playground stacked its settings below the preview; document width remained 390 px with no horizontal overflow. Desktop reviewed at 1280 × 720.
- The Installation page displays the 0.9.0 archive and `sloyui` imports. Browser console review found no application errors.

Screenshots and generated reports stay in ignored local artifacts rather than public source or package files.

## Release boundaries

Repository collaborator and ruleset checks confirmed the owner as the sole collaborator, owner-only main updates, required pull request and passing `check`, and blocked deletion/force pushes. Secret scanning and push protection are enabled.

The current public tree is independent of removed source captures. Historical commits and pre-0.9 releases are a separate cleanup decision and are not certified by this record. No npm registry publication, domain deployment or live Figma import was performed. The catalogue retains review statuses; a passing build does not mark every component ready.
