# Sloy native composition build

Offline sources only. They append to the existing pages and do not create/update variables or replace earlier guides. Load figma-use + figma-generate-design + figma-generate-library for Components; use figma-use + figma-generate-design for Layouts.

```sh
node figma/guide/build-sloy.mjs --ids artifacts/figma-refinement/app-map.json --date 2026-10-23
```

Execute the assembled `artifacts/figma-refinement/sloy/sloy-components.js` on V2. Save its return JSON containing `sloySets`, then:

```sh
node figma/guide/build-sloy.mjs --ids artifacts/figma-refinement/app-map.json --sets '<Sloy Components return JSON>' --date 2026-10-23
```

Execute assembled `sloy-layouts.js` only after the new component IDs were supplied. The source layout cannot fabricate missing masters. Each call selects its target page once and returns created IDs. Each assembled script is below 50 KB. Common helpers are read at build time, so coordinator changes to typography/styles are included automatically.

Without `--sets`, the builder emits only Components and sample data; it leaves any existing Layouts file untouched. With `--sets`, it checks every component and icon named by the current layout source, including the icon-button helper dependency, before writing any output. An incomplete map fails the build and preserves existing assembled files. Syntax and size checks also complete before output is written. IDs are checked for presence locally; their live validity still requires Figma readback.

`app-map.json` contains `controls` (primaryButton, secondaryButton, input, checkbox, iconButtonGhost, textarea), `components` (Tag), and Lucide `icons` by exact name. New `sloySets` IDs resolve RailItem/Tabs/Segmented/TaskRow/ContentCard/WeekStrip/AgendaItem/NoteCard/ReaderPanel dependencies. Icon slots are real component instances; text-bearing components load their current fonts before creation/property edits. Heart must be a real Heart asset, not an alias to Star.

The generated sample-data.json contains real documentation excerpts and explicitly illustrative acceptance-plan tasks. Screens preserve Russian product navigation and labels; raw document text retains its original language. Do not report examples as live data or provider connectivity. Renderer acceptance includes wrapping, local scroll bounds, independent control actions, mode inheritance and selected/unselected/disabled states. These are editable visual examples; application or Prototype behavior is not implied.
