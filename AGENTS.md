# Sloy UI — project and consumer instructions

Пишите пользователю по-русски. Код и идентификаторы — на английском.

## Read narrowly

1. Read `llms.txt` for entry points.
2. Read only the relevant records in `agent-manifest.json`.
3. Use `docs/recipes.md` or `examples/ProjectBoard.tsx` for composition.
4. Open `src/components/<group>.tsx` only when changing behavior.
5. Read `src/brand.json` for identity and `source/foundation.json` only when changing foundation generation.

## Design contract

- Reuse exported components and their typed variants before creating a new component.
- Import `styles.css` once; it includes runtime tokens. Fonts are opt-in.
- Use `--cap-*` semantic roles. Do not scatter literal brand colors into consumer pages.
- Put `data-theme="light"` or `"dark"` on `html`; custom portals also preserve the nearest local theme/accent/borders and establish a floating surface.
- Light/Dark surfaces and runtime colors alias independently authored Sloy palettes from `source/foundation.json`. Keep authored sources and generated outputs in sync.
- Canonical graph: Primitives (palette, alpha, number, font), Theme (Light/Dark), Semantic (Base/Canvas/Raised/Floating), Borders (Off/On). All mode axes inherit independently. CSS and Figma share palette aliases and derived alpha reactions. Preserve the 417-color, 22-step hue and 41-step neutral structure. Confirm Figma writes before reporting them.
- Runtime context: data-theme selects appearance, data-accent selects local color, data-surface describes base/canvas/raised/floating, data-borders selects off/on. Decorative borders default off; on restores decorative outlines. Keep focus/error indicators visible.
- Read `docs/surface-context.md` for the exact context contract. data-surface is inherited, never inferred from DOM background. Paint custom wrappers with --cap-surface-current or the matching surface role. Built-in panels declare their own surface.
- Use --cap-control-bg/hover/active for neutral controls, --cap-panel-border and --cap-control-border for toggleable boundaries. The generator owns per-hue Figma element/action pairs; consumers use shared CSS accent roles.
- Use `--cap-content-muted` (or compatible `--cap-text-muted`) for supporting text.
- Card always draws `.cap-surface-boundary`; add the same class to other nested surfaces that intentionally match their parent. It remains visible with `data-borders="off"`.
- Set surface context from composition; never infer matching surfaces by sampling DOM colors.
- Tag/IconBox inherit the local accent when color is omitted; gray is a legacy alias for neutral. Chip and selected MultiSelect chips stay neutral; use Tag for chromatic labels. See docs/component-guidelines.md.
- Use Inter, existing size tokens, and weight 400/500/600 for normal interfaces.
- Use real data/state and meaningful actions. Keep empty, loading, disabled and error states in scope.
- CSS classes are prefixed `cap-`; layout and application-specific state belong to the consumer.

- Tag.interactive=false is static, including action slots. Tag actions share one hover surface; Counter grows from a square minimum. Tag is the canonical label family; Badge and TypeLabel remain compatibility wrappers. Catalogue aliases resolve to #Tag; do not add duplicate pages or separate styling.
- Read docs/component-guidelines.md for TextAction, Counter, ContentLayout, Drawer variants, CodeBlock, icon selection and nested-radius rules.

## Interaction contract

- Input, Select and Textarea share `label`, `labelPlacement="outside" | "inside"`, `hint`, `error` and `size`. FloatingField is an archived compatibility wrapper; use Input with labelPlacement="inside". Its catalogue route redirects to Input. Use one label source; do not repeat it with Field.
- ContentCard uses stable block IDs, `blocks`, `blockOrder` and `hiddenBlocks`; extend slots rather than fork the component. Mixed card orientations must not stretch to the tallest neighbor.
- ReorderableList is controlled. Stable unique IDs, grip-only pointer drag, keyboard and click alternatives are required; the consumer persists order. Put its handle inside a card through `dragHandle` when needed.
- EmptyState icons are optional, decorative, neutral and quieter than the text; do not inherit the accent. Use `icon={false}` to omit one.
- Catalogue scroll belongs to `.catalog-main`, not the document. Hidden accessibility helpers must not enlarge scroll bounds. Verify open API panels: CodeBlock has equal visible side/bottom insets, no clipping and no document overflow at narrow widths.


- Icon-only actions require a label. Fields use `Field` render props or equivalent label/id/description wiring.
- Dialog and CommandPalette are controlled with `open` and `onOpenChange`.
- Modal content is portaled with focus trapping, inert background, scroll lock and restore. Do not add a second focus trap.
- Select is custom visually; its hidden native select preserves form submission.
- ActionBar/ButtonGroup/SplitButton accept size; a nested group can override it. Popover.size affects only its trigger.
- ScrollArea has scrollbar=auto|hidden; horizontal defaults hidden, vertical/both auto. Its ref targets the scrolling viewport; edge fades reveal the existing background.
- Read docs/component-guidelines.md for behavior, content and composition; llms.txt maps the seven canonical instruction files.
- RichTextEditor is canonical. For Markdown strings use the exported bridge helpers and retain block.markdown metadata; unsupported syntax stays editable source. MarkdownEditor is an archived compatibility export, with its route redirected to RichTextEditor. See docs/component-guidelines.md.
- Tooltip takes one focusable React element forwarding `aria-describedby`.
- Tabs require unique item values, a valid active value and an accessible group label.
- Radio inputs in one choice group share a `name`; separate groups use distinct names.
- ObjectCard and CollectionRow render buttons; do not nest buttons/links inside their content.
- Toast is a presentation component with `role="status"`; consumer controls placement, lifetime and dismissal. Do not auto-dismiss actionable content before it can be used. Toast/Alert/StatusBar share tone/color/appearance/contrast/surface; neutral shells color only the status icon. Inline feedback inherits surface, Toast defaults floating; stacks expose expansion direction and measured geometry. See docs/component-guidelines.md.
- Keep reduced motion and native keyboard behavior intact.

## Maintain concise instructions

- When a system change establishes a reusable rule, update its canonical document in the same task: `docs/component-guidelines.md` for component rules, `docs/surface-context.md` for paint/context, or `docs/recipes.md` for examples. Do not leave durable rules only in chat.
- Replace outdated guidance; avoid appending duplicates. Keep each rule short, actionable and linked to its source. `llms.txt` is a map, not copies of all rules. Read only relevant documents.
- Keep `demo/document-files.ts` aligned with user-editable instructions. The local catalogue editor writes those real files with revision checks; do not create a separate editable copy or silently overwrite concurrent changes.
- Figma scope is foundations/styles, universal secondary tags and empty surface compositions. Other components remain in the web kit until explicitly requested for Figma.

## Development commands

For implementation tasks in `davidyich/sloyui`, follow `docs/github-tasks.md`: by default, decompose large multi-component or multi-area requests into self-contained English GitHub Issues before implementation, with dependencies and handoff context. This task publication is pre-authorized; keep user conversation in Russian. Use the installed `orca-cli` skill for verified workspace links/status. Keep Issues open until delivery or PR merge; do not start other agents or merge without user authorization.

`npm run dev` starts the catalogue at `http://127.0.0.1:4317`. Each canonical component has a grouped navigation entry and canonical case-sensitive `#ComponentName` page; keep manifest, exports and catalogue coverage aligned.
`npm run check` validates types, interactions, tokens, package and demo build.
Generated `src/styles/tokens.css` and `src/tokens/*` are built by `scripts/build-tokens.mjs` from source files, including the explicit runtime contexts in `source/surface-rules.json`. Change the generator/source, then regenerate; do not hand-edit outputs.
Keep runtime dependencies empty. React/React DOM are peer dependencies. Lucide icons are bundled from the development dependency; the complete visual gallery is lazy-loaded only by the catalogue. Avoid adding a CSS framework, router or animation runtime for small additions.
Before delivery run `git diff --check`, and verify changed interactions in the browser. `docs/verification.md` records the checked scope, not hypothetical guarantees.

Local audit/rollback files belong in ignored `artifacts/`. Never include local drafts, credentials or obsolete package archives in Git or package distributions.

Global user rules still apply. This file governs only this UI-kit and its intentional use.

- Keep floating shadows outside clipped/masked scroll viewports: use `ScrollArea.floating`, reserve content clearance, and verify small screens. Do not disable scrolling to hide clipping. See `docs/component-guidelines.md`.
- Keep identity, status, group order and all memberships in source/component-registry.json; IDs never change on rename/reorder. Archived records remain exported but leave canonical groups/count; new components stay needs-review until reviewed. Regenerate the manifest after changes and keep one canonical page. See docs/component-guidelines.md.
- Maintain one typed Playground entry per canonical component in `demo/Playground.tsx` or `demo/PlaygroundArc.tsx`. Expose meaningful public props and slot combinations; do not duplicate global context controls. Update it when APIs change. Keep settings on their own painted surface; use searchable visual IconPicker controls for icons, including aliases.
- Floating overlays establish `data-surface="floating"`; static cards remain raised. Small menu captions use `--cap-content-caption`, inline Tag counts use `number/inline-counter-size`.

- Radius context is independent: `data-radius="compact|default|rounded"` changes primitives on a page or local frame; portals preserve the nearest value. Explicit pill/circle geometry stays circular.
- Visible fields and pickers use kit components: `DatePicker` for dates, `NumberField` for numbers, `ColorPicker` for colors and `Select`/`ComboBox` for choices. Keep native form semantics or hidden backing inputs, but do not use browser-picker input types (`date`, `time`, `month`, `week`, `color`) in finished UI or catalogue controls.

- `src/brand.json` is the identity source; import exported `SLOY_UI` for names, links and the logo. Keep `cap-*` CSS and `cp-*` component IDs as stable compatibility identifiers. Preserve upstream names only in attribution.
