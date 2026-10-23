# Sloy UI · Figma controls

The [current V2 controls showcase](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=162-468) contains the 21 component sets and 401 presentation variants rebuilt from the 2026-10-23 controls inventory. Text, slots, states and contexts remain editable. Native/visual acceptance and publication are recorded separately in [verification](../../docs/verification.md); historical receipts from the older file do not validate this rebuild.

## Required coverage

| Family | Component sets | Variant axes |
| --- | --- | --- |
| Button | Primary, Secondary, Outline, Ghost, Danger | Size sm/md/lg/xl; Default/Hover/Pressed/Focus/Disabled |
| IconButton | Primary, Secondary, Ghost | Same size/state axes |
| Input, Select, Textarea | Outside and Inside labels | Same size/state axes, plus Error |
| NumberField | NumberField | Same size/state axes, plus Error |
| ValueScrubber | ValueScrubber | Five states; md geometry |
| Switch, Radio | One set each | Off/On and five states; md geometry |
| Checkbox | Checkbox | Off/On/Mixed and five states; md geometry |
| Slider | Slider | Values 0/25/50/75/100 and five states; md geometry |
| PropertyRow | PropertyRow | Value/Input/Select/Number/Switch/Checkbox/Slider/Scrubber |

Preserve editable labels, values, icons and optional label/hint/icon properties. PropertyRow exposes nested control properties. Default size is md and Slider starts at 50. Slider thumb and track must remain aligned when instances resize. Layout/state variants do not imply configured Prototype click or drag behavior.

## Modes and web mapping

Set **V2 · Accent** on a containing frame: Neutral (default), Blue, Green, Orange, Red, Pink and Purple. Leave nested instances on Auto. Accent remains independent of Theme, Scheme, Surface, Density, Radius and Borders.

The native Accent adapter binds primary normal/hover/pressed, secondary normal/hover/pressed, border normal/hover/pressed, content and on-primary to Surface. Use the shared black/white on-primary policy; do not restore obsolete hue-specific foreground routes from the original scripts. Error and Danger remain Red independently of the selected Accent.

The Figma appearance and selected Accent together determine the web variant:

| Figma appearance | Accent mode | Web Button / IconButton variant |
| --- | --- | --- |
| Primary | Neutral | `primary` |
| Primary | Any of the six colors | `accent` with matching `data-accent` |
| Secondary | Neutral | `secondary` |
| Secondary | Any of the six colors | `accent-secondary` with matching `data-accent` |
| Outline | Any | `outline`; neutral paint independent of Accent |
| Ghost | Any | `ghost`; neutral paint independent of Accent |
| Danger | Any | `danger`; fixed Red status pair |

The same variant mapping applies to IconButton. The Figma State axis is a presentation sample; web hover/focus/disabled and form behavior follow the real API. Input/Select/Textarea Outside/Inside maps to `labelPlacement="outside"|"inside"`; Label/Value/Hint and boolean slots map to the corresponding content/optional props. Selection Value Off/On/Mixed maps to checked/unchecked/indeterminate intent, without implementing a native prototype. The web API remains the behavioral source of truth.

Native dimensions resolve to whole pixels. Paint alpha belongs to RGBA color, not whole-component opacity or fractional FLOAT primitives. Use current bindings from `../color-system-v2/native-graph.json`; original scripts require remapping to rebuilt variable IDs.

## Acceptance and source preservation

Verify inherited and nested Accent, both Theme modes, Standard/Dimmed, every native Surface including Light + Invert, Compact md height, Radius None, Borders Off, editable properties, narrow input and resized slider. Check text, fill/background, state distinction and focus after alpha compositing. Inspect native renders and alias resolution before adding current showcase links.

Historical construction scripts and receipts were preserved under ignored `artifacts/consolidation/figma-controls-source/` and `artifacts/consolidation/backups/397c-artifacts.tar.gz`. Source session: `01a16872-8149-7d53-a9e3-2764135e3a65`; six-accent user correction: `01a16877-05da-7ce2-a44f-ec8367a9dba6`. Recovery and source precedence are in [consolidation](../../docs/consolidation-20261023.md).

## Composition recipes

[Components](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=163-2) and [Layouts](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=164-2) reuse actual instances. Their small Figma property API describes a composition, not every web prop:

- Tag Soft/Plain maps to `variant="soft"|"plain"`; its editable Label maps to children. Soft inherits Accent. Plain uses the local neutral content role in the sample; web Plain inherits the consumer text color. State variants do not make a static label interactive.
- Card is a composed recipe with Title, Description, nested Tag and Meta. Render those as children of web Card; the web container has no Title/Description/Meta props. Default paints the parent block, Subtle paints bg, and the structural boundary remains visible.
- EmptyState is the centered `icon={false}` recipe with title/description. Its optional action slot is outside this minimal Figma inventory.
- NavItem is a Figma navigation recipe for the layouts, not an exported web component named NavItem.
- Alert uses a neutral shell and tone-colored status indicator; Title maps to title and Message to children. Disclosure, dismissal and handlers are not implied by a state sample.
