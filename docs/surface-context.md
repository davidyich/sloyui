# Surfaces, states and full palettes

CSS and Figma are built from one model. Sources: `source/foundation.json`, `source/surface-rules.json`. Pair selection rules: `scripts/color-model.mjs`. Do not edit generated files by hand.

```html
<html data-theme="light" data-borders="off">
  <section data-surface="canvas" data-accent="purple"
           style="background:var(--cap-surface-current)">
    <!-- Components inherit independent context axes. -->
  </section>
</html>
```

`data-theme` selects light/dark, `data-accent` selects neutral or one of 17 accents, and `data-surface` declares the actual canvas/base/raised/floating surface. The surface attribute is inherited but does not paint custom containers. Card declares raised, SidebarPanel canvas, and windows and FloatingActionBar floating. Portal preserves local theme, accent, borders, radius and shadows, including changes while open; its content resolves against floating.

| Surface | Light | Dark |
| --- | --- | --- |
| canvas | palette/gray/50 | palette/gray/975 |
| base | palette/gray/25 | palette/gray/950 |
| raised | palette/gray/0 | palette/gray/925 |
| floating | palette/gray/0 | palette/gray/900 |

Floating is a separate context for Menu, Select popups, Tooltip, Popover, Dialog, Drawer, Toast and FloatingActionBar. Local popups without portals also declare `data-surface="floating"`; nested content must not revert to Raised on a Floating background. Dark Floating is lighter than Raised; Light retains a white surface. Dark shadows use 10%/14% for contact and ambient layers. Nested controls receive Floating pairs.

Neutral ButtonGroup defaults to dedicated canonical `group/background`, `group/hover`, `group/selected`, `group/pressed`, `group/prefix` and `group/text` roles for the current surface. Normal, hover and pressed each differ from the preceding fill by at least 1.12:1; selected matches hover and prefix matches normal. Text retains at least 4.5:1 contrast on each fill. `color="inherit"` uses the local accent; an explicit color sets its own. Both use the surface's secondary accent pair. `content/caption` is for small group headings on unfilled surfaces (10 px, 400, uppercase), not text inside filled controls.

Light secondary fills use independently authored Sloy palette steps. Dark chromatic secondary fills use `derived/secondary/dark/<surface>/<hue>/<state>`: the original OKLCH hue is preserved, chroma decreases to 32% along an analytical curve, and lightness is calculated for 1.35/1.70/2.15:1 contrast against the actual surface. Normal → hover → pressed darkens in Light and lightens in Dark; Dark reactions also strengthen color gradually. These opaque primitives are shared by CSS and Figma; the full 417-color palette remains unchanged. Text stays stable across states with at least 4.5:1 contrast against fill and nested reaction. Disabled uses a shared neutral pair. Neutral Primary is the exception: maximum normal contrast decreases on hover/pressed. Runtime selects prepared aliases without interpolating hues.

| Purpose | CSS roles |
| --- | --- |
| Neutral control | `--cap-control-normal/hover/pressed/text` |
| Chromatic secondary element | `--cap-accent-normal/hover/pressed/text` |
| Solid chromatic action | `--cap-accent-solid-normal/hover/pressed/text` |
| Vivid accent | `--cap-accent-vivid-normal/hover/pressed/text` |
| Neutral primary action | `--cap-action-normal/hover/pressed/text` |
| Disabled state | `--cap-disabled-background/text` |
| Primary and supporting text | `--cap-content-primary/secondary/muted` |

Disabled uses an opaque neutral pair with readable text. Native disabled blocks actions; Tag disables separate selection and removal buttons. Pass `disabled` to universal Tag; static IconBox may use `aria-disabled`. Static labels and separators do not receive artificial hover/pressed states.

`data-borders="off|on"` controls decorative boundaries only. Geometry and state pairs stay unchanged. Use `--cap-panel-border` and `--cap-control-border`; use `--cap-border-strong` and `--cap-focus-ring` for meaningful boundaries and focus. `--cap-control-bg/active` and `--cap-accent-soft/bg/block/ink` remain compatibility aliases.

Card always draws a structural outline using `--cap-border-width` and `--cap-border-subtle`; it stays visible with `data-borders="off"`, including a Raised Card inside a Raised container. Use `.cap-surface-boundary` for other child surfaces intentionally sharing their parent's role. Do not detect matching surfaces through computed DOM colors: composition declares `data-surface`. The boundary does not alter shadows or focus outlines. Do not automatically apply it to messages, toasts or comments: their decorative shells follow Borders Off/On. For intentionally matching nested panels, composition supplies the structural boundary through `className`.

Figma Primitives / Value contains palette, derived, alpha, number and font. The former el-h/el-w groups are combined into number/control-size. Theme has Light/Dark, Semantic has independent Base/Canvas/Raised/Floating, and Borders has Off/On. Set modes on the parent frame. Semantic references Theme, Theme references Primitives, and common pairs are reused. Element and action groups contain per-accent pairs. Historical source and source-literals groups are removed; the full graph is built from independently authored Sloy foundations. Web components use shared CSS roles and local data-accent instead of direct palette colors.

## Reactions and boundaries

Nested actions on chromatic fills use `--cap-reaction-hover/pressed`: black 4%/8% in Light, white 6%/10% in Dark. Opacity lives in `number/opacity`; alpha neutrals live in `alpha/black` and `alpha/white`. CSS derives them from numeric primitives. Figma RGBA alpha cannot reference FLOAT: for an editable reaction, bind a separate layer to `reaction/base` and its opacity to `reaction/hover-opacity` or `reaction/pressed-opacity`. Minimum text contrast against the reaction is 4.51:1.

Menu, tree, table and RadioGroup rows with nested icons/labels use subtle `--cap-reaction-hover` and `--cap-reaction-pressed` for pressed/selected states. Opaque `--cap-control-hover` is for standalone controls. If a nested Tag/IconBox visually matches its row reaction, retain its structural boundary through `--cap-border-subtle`, independently of Borders Off. Do not change a child's accent pair for its parent's hover.

The shared decorative width is `number/border/width = 0.5`. The `border/subtle`, `default`, `strong` and `emphasis` levels depend on surface. Panel/overlay/control and accent-outline roles select the object/state shade. Meaningful focus retains 2 px width and at least 3:1 contrast. Disabling borders preserves focus and floating/popover/modal shadows.

Shadows: `data-shadow="soft" | "compact"` is inherited and preserved by portals. Soft is the default wide blur; compact uses the same colors with 55% blur. Auto CodeBlock has transparent fill with Borders On, so it preserves the surrounding surface context.

`Button` and `IconButton` with `variant="primary"` always use neutral `--cap-action-normal/hover/pressed/text`, independently of `data-accent`; `secondary` uses the neutral control pair. `accent` uses `--cap-accent-solid-normal/hover/pressed/text`; `accent-secondary` uses soft `--cap-accent-normal/hover/pressed/text`. Checkbox, Radio, RadioGroup and Switch with `contrast={true}` use the local solid accent pair. `contrast={false}` selects the soft local accent pair; Slider uses it by default. `Switch variant="neutral"` selects action roles, or control roles in soft mode. Marks, text and thumbs use the paired text role without theme conditions. An off Switch uses `--cap-control-text` on a neutral track; disabled always uses `--cap-disabled-background/text`.

## Catalogue context

Preview regions, examples and the code usage block follow the selected surface. The catalogue header and settings panel remain on their own fixed surfaces, independently of the sample surface selector.

For chromatic action pairs (solid and vivid), text is determined by actual normal-fill contrast against `gray/0` and `gray/1000`, not theme or the contrast flag. Hover and pressed preserve that text color and at least 4.5:1 contrast. Vivid selects shades per palette, retaining brighter fills than solid.

`data-color="inherit"` does not stop portal accent lookup: overlays use the nearest explicit ancestor data-accent/data-color. Inverse Tooltip swaps its text/surface pair while preserving the context axes.

Standalone structural dividers use `--cap-divider-subtle/default/strong` and `--cap-number-divider-width` (1 px). They inherit `data-surface`, remain visible with Borders Off and have at least 1.5/1.8/2.4:1 surface contrast. `--cap-divider-control` is for neutral control fills. Internal composite-control seams are quieter: joined SplitButton uses 0.5 px and 22% paired text on solid fills (muted on other fills); FloatingActionBar uses 0.5 px `--cap-divider-panel`. Draw only one line at each joint.

Long internal table/panel lines and the CodeBlock header use quieter `--cap-divider-panel` and `--cap-border-width` (0.5 px). This role inherits surface independently of Borders and has at least 1.15:1 contrast in Light and 1.25:1 in Dark. CodeBlock's header draws exactly one such line; decorative outer boundaries retain their existing roles and 0.5 px widths.

Menu separators use the same quiet role and 0.5 px width. Side insets are symmetric and follow row padding, accounting for Radius. Do not combine width:100% with horizontal margins: the line would overflow. The general Separator is not used as an internal menu seam.
