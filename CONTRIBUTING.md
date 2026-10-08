# Contributing to Sloy UI

Open an issue for a bug or proposed change. Include the component, relevant props, theme/surface settings and a small reproduction. Screenshots help for visual defects; avoid uploading private project data.

For a pull request, fork the repository, create a focused branch and run `npm ci` followed by `npm run check`. For package/API changes also run `npm run pack:kit` and `npm run verify:package`. Keep generated tokens and the manifest aligned with their sources. Read `AGENTS.md` for the component contract.

Use existing components and semantic tokens. New components need a stable registry ID, Review status, one catalogue page and a meaningful playground. Do not add runtime dependencies for small interactions. Preserve keyboard, reduced-motion and local context behavior.

Only the owner can update `main`. Pull requests and passing `check` CI are required; force pushes and deletion of `main` are blocked. Opening a PR does not grant write or merge access. Workflow tokens are read-only and cannot approve PRs.

Submit only work you have the right to contribute under the project's MIT license. Preserve upstream licenses and copyright notices for permitted adaptations, and describe their source in the PR. Do not include captured proprietary CSS, palettes, screenshots, credentials or private instruction drafts. Report vulnerabilities privately as described in `SECURITY.md`.
