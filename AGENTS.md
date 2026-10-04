# Capacities UI — project and consumer instructions

Пишите пользователю по-русски. Код и идентификаторы — на английском.

## Read narrowly

1. Read `llms.txt` for entry points.
2. Read only the relevant records in `agent-manifest.json`.
3. Use `docs/recipes.md` or `examples/ProjectBoard.tsx` for composition.
4. Open `src/components/<group>.tsx` only when changing behavior.
5. Do not load `source/loaded-stylesheets.json` or entire token catalogs into agent context unless auditing provenance.

## Design contract

- Reuse exported components and their typed variants before creating a new component.
- Import `styles.css` once; it includes runtime tokens. Fonts and full source tokens are opt-in.
- Use `--cap-*` semantic roles. Do not scatter literal brand colors into consumer pages.
- Put `data-theme="light"` or `"dark"` on `html`; custom portals also preserve the nearest local theme/accent/borders and establish a raised surface.
- Light/Dark use normalized grayscale surfaces. Original observations remain in source/ and the V1 archive.
- Base Figma graph: 12 neutral steps, 12 shared accent steps, 24 Light/Dark roles. Keep this graph distinct from runtime surface/border context; do not claim a real Figma document was updated without a confirmed write.
- Runtime context: data-theme selects appearance, data-accent selects local color, data-surface describes base/canvas/raised, data-borders selects off/on. Decorative borders default off; on also quiets neutral control fills. Keep focus/error indicators visible.
- Read `docs/surface-context.md` for the exact context contract. data-surface is inherited, never inferred from DOM background. Paint custom wrappers with --cap-surface-current or the matching surface role. Built-in panels declare their own surface.
- Use --cap-control-bg/hover/active for neutral controls, --cap-panel-border and --cap-control-border for toggleable boundaries. No per-hue semantic role proliferation.
- Use `--cap-content-muted` (or compatible `--cap-text-muted`) for supporting text.
- Tag/Badge/TypeLabel/IconBox inherit the local accent when color is omitted; gray is a legacy alias for neutral.
- Use Inter, existing size tokens, and weight 400/500/600 for normal interfaces.
- Use real data/state and meaningful actions. Keep empty, loading, disabled and error states in scope.
- CSS classes are prefixed `cap-`; layout and application-specific state belong to the consumer.

## Interaction contract

- Icon-only actions require a label. Fields use `Field` render props or equivalent label/id/description wiring.
- Dialog and CommandPalette are controlled with `open` and `onOpenChange`.
- Modal content is portaled with focus trapping, inert background, scroll lock and restore. Do not add a second focus trap.
- Select is custom visually; its hidden native select preserves form submission.
- ActionBar/ButtonGroup/SplitButton accept size; a nested group can override it. Popover.size affects only its trigger.
- ScrollArea has scrollbar=auto|hidden; horizontal defaults hidden, vertical/both auto. Its ref targets the scrolling viewport; edge fades reveal the existing background.
- Read docs/behavior.md for motion/state/responsive rules; docs/content-guide.md for calendar/editor/cards.
- Tooltip takes one focusable React element forwarding `aria-describedby`.
- Tabs require unique item values, a valid active value and an accessible group label.
- Radio inputs in one choice group share a `name`; separate groups use distinct names.
- ObjectCard and CollectionRow render buttons; do not nest buttons/links inside their content.
- Toast is a presentation component with `role="status"`; consumer controls placement, lifetime and dismissal. Do not auto-dismiss actionable content before it can be used.
- Keep reduced motion and native keyboard behavior intact.

## Development

`npm run dev` starts the catalogue at `http://127.0.0.1:4317`. Each of 59 components has a grouped navigation entry and canonical case-sensitive `#ComponentName` page; keep manifest, exports and catalogue coverage aligned.
`npm run check` validates types, interactions, tokens, package and demo build.
Generated `src/styles/tokens.css`, `source-tokens.css`, and `src/tokens/*` are built by `scripts/build-tokens.mjs` from source files, including the explicit runtime contexts in `source/surface-rules.json`. Change the generator/source, then regenerate; do not hand-edit outputs.
Keep runtime dependencies empty. React/React DOM are peer dependencies. Avoid a CSS framework, icon package, router or animation runtime for small additions.
Before delivery run `git diff --check`, and verify changed interactions in the browser. `docs/verification.md` records the checked scope, not hypothetical guarantees.

Frozen rollback snapshots live in `versions/v0.2.0` and `versions/v0.1.0`; do not overwrite their archives during a build.

Global user rules still apply. This file governs only this UI-kit and its intentional use.
