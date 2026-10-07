# Selection controls

`Chip` is a neutral selection token for tag clouds and selected choices. Use `selected` with `onClick` for toggles; `onRemove` or `action` creates a separate sibling action. `interactive={false}` makes every slot static. It inherits surface, borders and radius; it does not inherit a chromatic accent.

`MultiSelect` uses neutral Chip values. Add `group`, `description`, `icon` or optional semantic `color` to individual options. A color renders an 8px decorative dot. The legacy component `color` prop remains accepted but no longer colors chips. Disabled options remain selected and cannot be removed via Backspace or bulk clear. Unique option values are required. `maxVisible` limits rendered chips, while every selected value remains in native form data.

`ColorPicker` has no preset palette by default. Pass `palette` only for an intentional finite choice set. `showRecent` enables deduplicated recent choices, saved when the panel closes, bounded by `maxSwatches`. `swatches`, `defaultSwatches` and `onSwatchesChange` retain the explicit saved-palette API. The format selector and editable value share one row; alpha has a quiet percentage readout. Color text uses Inter.

`Slider` preserves its native range input, form/reset behavior and `onChange`. `onValueChange` receives a number; `onValueCommit` runs on pointer release or range keyboard-key release. `formatValue` sets both the visual output and `aria-valuetext`. The decorative rail/thumb are hidden from assistive technology; focus is drawn around the thumb. `focusRing` uses the field-family width/offset contract.

Color palette catalogue selection and keyboard focus outline only the painted swatch. Keep shade/value labels outside the outline. Inside Textarea labels must let pointer events pass through and match the textarea's actual paint state.

Reference direction: [Arc color picker](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/color-picker/color-picker.tsx) and [beUI multi-select](https://beui.dev/components/motion/multi-select). Implementations use this kit's components and native semantics without Motion or shadcn runtime dependencies.
