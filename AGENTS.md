# Sloy UI — project and consumer instructions

Speak Russian with the user. Write code, identifiers and all repository agent instructions in English, regardless of the source request's language. Preserve language-sensitive UI copy and localization examples.

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
- Put `data-theme="light"` or `"dark"` on `html`; custom portals also preserve the nearest local theme/accent/surface-scheme/borders and establish a floating surface.
- Canonical tokens are authored in `figma/token-system-v4/source.json` and generated into `graph.json`; regenerate graph, runtime and native exports together. The runtime palette contains one opaque ramp per hue, shared across themes and roles; the native exporter keeps only referenced RGBA colors with whole-percent alpha. Default scope is neutral plus blue, green, orange, red, pink and purple; other legacy names are compatibility inputs, not extra default ramps or picker choices. Never add solid/soft/muted, Dark, foreground or surface-reference subpalettes. See docs/surface-context.md for native export rules and Custom regeneration.
- Surface is the designer-facing color collection in Figma V2. Theme/Scheme and Palette are internal routing/source layers; do not expose them as competing color pickers. Keep semantic groups flat, neutral first, with Normal/Active adjacent. Primary text defaults to shared exact black/white `content/on-primary`; retain extra foreground roles only when required by supported fills. Accent modes are Neutral by default, Blue, Green, Orange, Red, Pink and Purple; children inherit Auto. No public component-token collection is needed.
- Fit alpha recipes jointly within the bounded family selected by `alphaRecipeFamily`: Light, Light/Neutral (muted light OKLab L < 0.985), Dark, Glass/Light or Glass/Dark. Do not force one paint across all ordinary surfaces or generate a separate fill for every nested layer. Preserve hue, chroma, lightness, text and Normal/Active distinction before reducing pigments. Custom regenerates from exact authored RGB with explicit limited diagnostics. Core graph raw values belong only to Palette and Primitives; other collections use cross-collection aliases. See docs/alpha-recipes.md.
- Native Figma FLOAT primitives contain only needed whole-number values; do not export fractional alpha, ratios or generated calculation intermediates as FLOAT variables. Keep opacity in COLOR values/aliases (native RGBA alpha uses whole percentages), never on a whole component layer. Native layout geometry resolves to whole pixels; Figma boundaries are literal 0.5 px, never a fractional FLOAT primitive. Empty border-only layers may bind opacity to the integer Borders 0/100 percent switch; component content stays at 100%. Internal runtime math and legacy compatibility exports are distinct from the native picker contract.
- Runtime axes inherit independently: data-theme, data-accent, data-surface, data-surface-scheme, data-density, data-radius and data-borders. Canonical surfaces are shell/workspace/content/overlay/invert/glass. Invert changes local polarity (black in Light, white in Dark) with its own content/controls/accents without a nested theme. Glass uses a protected white88%/black80% base; test both black/white underlays before changing opacity. Compatibility names page/base, inset/canvas, panel/raised and floating resolve to canonical contexts. Standard/Dimmed select full reference context pairs in both themes, including Shell; Inverted is a compatibility name for Dimmed. Portals preserve the nearest axes live and establish Overlay.
- Read `docs/surface-context.md` for the exact context contract. data-surface is inherited, never inferred from DOM background. Use `.cap-surface` with data-surface for a painted wrapper, or paint with --cap-surface-current. Only regions with a distinct purpose establish a surface; a local block preserves its parent context.
- Use --cap-control-bg/hover/active for neutral controls, --cap-panel-border and --cap-control-border for toggleable boundaries. Hover uses semantic paint without system black outlines; web keyboard focus retains a visible semantic indicator. Native Figma Focus changes semantic fill/handle ink without an extra outline; never add a black focus stroke. The generator selects per-hue semantic fill/content roles from the shared opaque ramps; consumers use shared CSS accent roles. Figma groups colors and states together under semantic paths such as surface/secondary; put hue, state and context in the leaf name.
- Use `--cap-content-muted` (or compatible `--cap-text-muted`) for supporting text; content/tertiary is a distinct intermediate text role.
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
- Read docs/component-guidelines.md for behavior, content and composition; llms.txt maps the canonical instruction files.
- RichTextEditor is canonical. For Markdown strings use the exported bridge helpers and retain block.markdown metadata; unsupported syntax stays editable source. MarkdownEditor is an archived compatibility export, with its route redirected to RichTextEditor. See docs/component-guidelines.md.
- Tooltip takes one focusable React element forwarding `aria-describedby`.
- Tabs require unique item values, a valid active value and an accessible group label.
- Radio inputs in one choice group share a `name`; separate groups use distinct names.
- ObjectCard and CollectionRow render buttons; do not nest buttons/links inside their content.
- Toast is a presentation component with `role="status"`; consumer controls placement, lifetime and dismissal. Do not auto-dismiss actionable content before it can be used. Toast/Alert/StatusBar share tone/color/appearance/contrast/surface; neutral shells color only the status icon. Inline feedback inherits surface, Toast defaults floating; stacks expose expansion direction and measured geometry. See docs/component-guidelines.md.
- Keep native keyboard behavior intact. Transforming panels reuse shared kit motion and reduced-motion handling; see docs/component-guidelines.md.

## Maintain concise instructions

- When a system change establishes a reusable rule, update its canonical document in the same task: `docs/component-guidelines.md` for component rules, `docs/surface-context.md` for paint/context, or `docs/recipes.md` for examples. Do not leave durable rules only in chat.
- Replace outdated guidance; avoid appending duplicates. Keep each rule short, actionable and linked to its source. `llms.txt` is a map, not copies of all rules. Read only relevant documents.
- Keep `demo/document-files.ts` aligned with user-editable instructions. The local catalogue editor writes those real files with revision checks; do not create a separate editable copy or silently overwrite concurrent changes.
- When a component changes, update its version and release entry in `source/component-history.json`, linked to the kit release, in the same task. Follow `docs/catalog-maintenance.md` for owner edits, persistent instructions, revision conflicts and deployment; do not invent undocumented historical entries.
- Figma V2 scope includes foundations, mode-bound controls, examples, layouts and practical guides. Preserve the 21-set controls coverage in figma/controls/README.md; web APIs remain the behavioral source of truth. Verify the V2 file key before native writes; new rebuild IDs replace historical links only after readback. Recovery and superseded decisions are in docs/consolidation-20261023.md.

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
- Palette Lab keeps pinned navigation, a scrolling color list and bottom global settings. Its per-accent parameters, authored anchors, HEX/HSL editing, interpolation, reset and export contract live in figma/color-system-v2/editor/README.md.
- Maintain one typed Playground entry per canonical component in `demo/Playground.tsx` or `demo/PlaygroundArc.tsx`. Expose meaningful public props and slot combinations; do not duplicate global context controls. Update it when APIs change. Keep settings on their own painted surface; use searchable visual IconPicker controls for icons, including aliases.
- Floating overlays establish Overlay (`data-surface="overlay"`; floating remains compatible). Card, ObjectCard, ContentCard and FileCard preserve the parent surface and paint `--cap-surface-block`; Card subtle uses bg. Small menu captions use `--cap-content-caption`; inline counts use the shared small Counter geometry.

- Radius context is independent: `data-radius="none|compact|default|rounded"` uses whole-pixel base radii 0/4/8/16 on a page or local frame, defaulting to 8 px; portals preserve the nearest value. None removes radius-only optical insets; borders remain independent. Square attached shells use zero outer/action gaps and larger content insets; FloatingActionBar positive-radius padding stays fixed. Explicit pill/circle geometry stays circular. Controls with the same appearance and visible height share radius and horizontal padding; see docs/component-guidelines.md.
- Visible fields and pickers use kit components: `DatePicker` for dates, `NumberField` for numbers, `ColorPicker` for colors and `Select`/`ComboBox` for choices. Keep native form semantics or hidden backing inputs, but do not use browser-picker input types (`date`, `time`, `month`, `week`, `color`) in finished UI or catalogue controls.

- `src/brand.json` is the identity source; import exported `SLOY_UI` for names, links and the logo. Keep `cap-*` CSS and `cp-*` component IDs as stable compatibility identifiers. Preserve upstream names only in attribution.

- Density uses the v4 adaptive/fixed groups. Adaptive spacing is round(k × u), with u=4 px in Default and 3 px in Compact; control height is line height plus two vertical insets. Typography, fixed spaces, icons and touch targets stay constant. `source/density.json` retains compatibility bindings; runtime dimensions resolve through the v4 adapter. Portals inherit density independently.

- Completed additional development is deployed to https://sloyui.com/develop/ by default: run npm run release:develop after the relevant checks. scripts/deploy-devos.sh defaults to develop; do not deploy ordinary changes to production. The owner promotes the reviewed Develop build and data through the confirmation dialog. bootstrap is only for publication-infrastructure maintenance. See docs/deployment.md.
