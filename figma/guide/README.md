# Editable Figma guides

Offline construction scripts for the rebuilt V2 library. They use native variable names from `../color-system-v2/native-graph.json`, not old IDs or screenshots. Sources were prepared offline; the coordinator executed the current pages. Their live links are recorded in [Figma README](../README.md), while acceptance is recorded separately in verification.

Build the exact tool inputs after custom-example.json and the native controls are ready:

```sh
node figma/guide/build.mjs --primary-button '<Primary Button set ID>' --input '<Input/Outside set ID>' --switch '<Switch set ID>' --component-map '<components receipt JSON>'
```

This writes complete scripts to ignored `artifacts/consolidation/figma-guide/`:

- `colors.js` → existing page `01 · Colors`.
- `custom-backgrounds.js` → existing page `05 · Custom backgrounds`.
- `start.js` → existing page `00 · Start`.
- `components.js` → existing page `03 · Components`; creates real component sets and returns their map.
- `layouts.js` → existing page `04 · Layouts`; requires the returned component map and the three control IDs.

`build.mjs` combines common helpers with each page script, embeds only the required generated Custom roles, and supplies read-back component IDs for linked instances. Execute Components before Layouts; save its return as JSON, then rebuild with `--component-map`. This argument accepts the complete return object with `componentSets` or a direct name-to-ID map. The variant helper is adapted from the loaded figma-generate-library skill to use the caller’s existing single page switch. Without the Primary Button ID the Colors recipe remains a bound swatch; Layouts requires all its component/control IDs and fails on missing IDs rather than fabricating instances. Do not execute the source custom page without its generated sample prelude.

Regenerate the exact Custom source sample with:

```sh
node figma/color-system-v2/export-custom.mjs --light '#F1EEF8' --dark '#221D2C' --name 'Guide example' --out artifacts/custom-project --sample figma/guide/custom-example.json
```

The caller loads `figma-use` and `figma-generate-design` (plus `figma-generate-library` for Components), targets `E6Qw912qUU0h9JDplYzQsp` and executes each page sequentially with the rest of this task's shared-state work. Each assembled script sets current page exactly once, creates one Auto Layout root, binds native color/geometry/typography variables, and returns created IDs plus root bounds. It does not create variables or change control masters. Existing matching root names cause an error; inspect partial results before retrying instead of duplicating a board.

Colors includes seven neutral/accent families with Normal/Active, primary/secondary/tertiary recipes and Light/Dark × all five native Surface contexts. Invert examples override only Surface; Theme remains inherited. Custom includes actual generated examples on exact Light/Dark RGB backgrounds, explains explicit regeneration and paint alpha at layer opacity 100%, and distinguishes native presets, custom exports and runtime Glass.

Local syntax checks passed. Native execution, alias resolution and visual acceptance remain the caller's checks: verify wrapping, bounds, every paint binding, visible state differences, shared on-primary contrast, inherited modes and Light + Invert. The scripts return all created IDs so failed sections can be inspected precisely. Do not mark them live-verified merely because this source compiles.

Start is a short English usage map labelled 0.17.1 without release/QA claims. Components contains Tag, Card, EmptyState, NavItem and Alert masters with editable text properties; its compact Light/Dark showcase uses actual instances. Masters sit outside the showcase. Layouts builds Project board and Settings in Light, Dark and Light with a local Invert sidebar. Card/Tag/NavItem/Alert, Primary Button, Input and Switch remain linked instances; native variables are not created or changed.

Targeted parity repairs are built as `parity-components.js`, `parity-buttons.js` and `parity-layouts.js`. Each runs on exactly one page and changes only the read-back masters/layouts, not variables. Apply them only to this recorded rebuild: their root/component IDs are deliberately explicit. Source helpers already include the corresponding geometry and composition fixes for a fresh rebuild. [Focused semantic QA](semantic-qa.md) records the reason and web mapping.

## 0.17.1 additions

`app-icons.js` imports the exact SVGs in `app-icons.json` and reuses `.Icons/*` masters. Inner vector constraints scale with the instance. `popups.js` uses the `POPUP_MAP` prelude with the verified control/component/icon map; concatenate common.js and variant-helper.js before it. It creates one compact review and masters outside that review. Keep popup rows fixed-width with auto-height and vertical text Fill; nested components with editable properties are exposed. `neutral-guide.js` adds the focused neutral recipe to Colors.

`build-sloy.mjs` creates the Sloy component/layout tool inputs. Read [the build contract](sloy-build-contract.md); without `--sets` it emits only Components and leaves existing Layouts untouched. After the component call, supply its saved receipt with `--sets`. The builder checks the current layout's component/icon dependencies, syntax and size before writing any output; an incomplete map fails without overwriting assembled files. Only the coordinator writes the assembled tool inputs. `build-sloy-audit.mjs` creates separate read-only page audits. Construction sources and receipts are distinct from executed, visually checked assets.

`borders-delta.js` migrates existing container strokes to empty, absolute 0.5 px border shapes; supply one PAGE_ID per call. `borders-guide.js` adds linked On/Off examples. The single native `Borders/border/opacity` variable uses 100/0 percent (actual node opacity 1/0). It defaults to On and remains inherited by masters and instances.
