# Focused Figma / web semantic QA — 2026-10-23

This review is limited to the newly authored composition primitives and the control mapping used by the guides. It does not claim exhaustive API or visual parity. Current asset links are in [Figma README](../README.md); execution and acceptance receipts belong in docs/verification.md.

## Material corrections prepared

- **Tag Plain:** web `src/styles/composition.css` makes Plain inherit ordinary text color. The first native master bound every Tag to Accent. `parity-components.js` changes Plain to local neutral content; Soft retains Accent. It also uses Medium weight for labels. Native cannot infer an arbitrary consumer text paint; the guide demonstrates the ordinary neutral context.
- **EmptyState:** web `src/styles/base.css` centers the empty-state stack and text. The first native recipe was left-aligned. The same targeted repair centers it and uses muted description ink. The recipe intentionally corresponds to `icon={false}`; action remains optional composition.
- **Card:** web `src/styles/base.css` uses the xl radius and the canonical surface contract preserves parent context with block paint. The repair uses the same xl corner. Its Title/Description/Meta are Figma recipe properties; they map to web Card children, not invented web props.
- **Outline/Ghost:** web `src/styles/states.css` uses transparent resting paint, neutral control state pairs and neutral text regardless of data-accent; Outline uses border-strong. The initial native control construction routed them through Accent. `parity-buttons.js` repairs Button/Outline, Button/Ghost and IconButton/Ghost; The 0.17.1 refinement replaces the native Focus outline with a semantic fill change and retains the explicit Disabled pair.
- **Layout bounds:** the initial shared horizontal frame helper used primary-axis Auto after an explicit width, so structural strokes expanded six screens by 2 px. `parity-layouts.js` fixes screen width at 1264 and makes main content Fill. The source helper now keeps fixed horizontal width and Layouts source uses filling main content.

The coordinator executes these three page-specific repairs and records their actual results. Prepared scripts are not proof that a live master has already changed.

## Intent mappings retained

Figma Primary + Neutral maps to web primary; chromatic Primary maps to accent. Secondary + Neutral maps to secondary; chromatic Secondary maps to accent-secondary. Danger remains Red. Outline and Ghost remain neutral after the targeted repair. IconButton follows the same mapping.

Tag exposes a useful Soft/Plain subset, not all solid/outline/count/action states. Card and Alert expose editable recipe text; Card accepts children in web and Alert Message maps to children. NavItem is a Figma layout primitive with no new web export. State axes are presentation samples; they do not claim click, focus, selection or drag prototypes.

The five component-set IDs read back from this rebuild are Tag 163:7, Card 163:14, EmptyState 163:26, NavItem 163:33 and Alert 163:43. Layouts uses actual instances of these sets and the native controls, preserving Theme/Surface/Accent inheritance. Invert examples set only Surface on their sidebar while Theme remains Light.
