# Borders, radius and shared hover · 0.4.1

## Checked scope

The coordinator ran the fixtures in Chromium against the combined checkout after the source changes. Raw evidence is local and ignored under `artifacts/context-modes-2026-10-07/`.

| Fixture | Executed scope | Result |
| --- | --- | --- |
| `tests/browser/context-modes.html` | 98 canonical stories × Light/Dark × Base/Canvas/Raised/Floating × Compact/Default/Rounded × Borders Off/On: 4704 configurations | No unexplained fixed rectangular corners in any of the eight surface/theme contexts. Remaining persistent borders classified below. |
| `tests/browser/overlay-context.html` | 17 open-overlay scenarios × 12 live theme/radius/borders combinations: 204 configurations | All scope, decorative-border, radius and theme assertions passed. Public Escape cleanup passed between families. |
| `tests/browser/shared-hover.html` | 14 real-browser motion assertions | All passed; interruption displacement 0 px, exit displacement below 0.01 px. |
| `tests/browser/field-context.html` | Nine native-field families × 12 live modes; direct props compared with an equivalent enclosing context | 252 visible-paint comparisons and 10 error-contour checks passed. Empty decorative layers do not compare unused inherited text colors. |

The story matrix inspects rendered HTML and SVG rectangles. `Icon` has no rectangular frame, so it has no measurable radius/border nodes. It is included in catalogue coverage, not counted as a geometry assertion. Hidden native backing fields can appear in raw samples and are excluded from visual defect classification. The matrix covers the variants present in each canonical story; it is not an exhaustive permutation of every public prop.

## Persistent boundaries

- Explicit Button `outline`, solid `primary`/`accent` edges and explicit CodeBlock `outline`/`filled-outline` preserve their appearance contract.
- Checkbox/radio/task check marks, slider thumbs, comment pins and spinner strokes remain legible independently of decorative borders.
- Invalid fields keep their error contour; focus remains visible with Borders Off.
- Card, ContentCard and ContentLayout panes keep the documented `cap-surface-boundary`. Toast, Alert, StatusBar, AnnouncementBar and CommentThread no longer receive that class automatically.
- Circle/pill geometry and joined zero-radius corners deliberately remain fixed. Rectangular IconBox and SVG chart cells use radius primitives.

## Hover behavior

The checked sequence crosses child text/icon nodes, gaps, selected rows, interrupted travel, true exit, local radius changes, scrolling, keyboard focus and nested NavigationMenu/FloatingActionBar scopes. It confirms that repeated events on one row do not restart the animation, gaps do not hide the layer, interrupted travel starts at the painted position, exit only fades, and active navigation markers do not travel. Compact/Default/Rounded target radii matched 4.8/8/14 px.

## Catalogue and package

Search, filter opening/Escape, component navigation, compact/default/rounded controls and borders were exercised in the catalogue. ColorPicker was checked open on desktop (1087×833, Dark/Rounded/Off) and mobile (390×844, Light/Rounded/Off); both remain inside the viewport. The mobile Drawer and its nested filter were exercised, including Enter navigation to Button.

Four catalogue axe/layout runs were clean: Colors, the desktop filter, desktop ColorPicker and mobile ColorPicker. The mobile Drawer/filter run had no layout failures; axe's `skip-link` heuristic classified the offscreen hash-route tree links as skip links because the audited modal contains only same-document routes. Those are page-navigation links, not skip controls; the result is retained rather than counted as a clean axe run. Desktop console errors were empty.

`npm run check` passed: 528 tests in 40 files, TypeScript, token/manifest generation and both builds. The 0.4.1 archive passed isolated NodeNext consumption, four packaged examples, SSR of 29 exports, the Markdown bridge and nine font assets. The consumer also checks `Popover.triggerIcon` and direct field context props. Button-only import is 1627 B gzip; runtime dependencies remain empty.

Firefox/WebKit, physical touch, every overlay placement/size, nested ColorPicker format/calendar schedule menus and live Figma writes were not repeated in this audit. Component review statuses are unchanged; this focused audit does not promote every component to ready.

## Reproduce

Start `npm run dev`, then open each fixture URL on port 4317 and use its Run button. Read the JSON from the collapsed report. Run token generation/builds before a long browser matrix: development reloads can reset an in-progress run. The hover fixture deliberately uses finite browser events and real WAAPI; geometry fixtures do not substitute for motion verification.
