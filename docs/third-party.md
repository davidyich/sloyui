# Third-party provenance and distribution

Reviewed 2026-10-08. This inventory records sources and unresolved scope; it does not guarantee legal clearance.

## Licensed material

- Lucide: complete installed license includes ISC and Feather-derived MIT icons with Cole Bemis attribution. Preserve both grants. [Official license](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
- Inter and Overpass Mono: bundled WOFF2 files retain OFL 1.1 and adjacent font notices. Fonts may be bundled with software but not sold alone. [Inter license](https://github.com/rsms/inter/blob/master/LICENSE.txt), [Overpass license](https://github.com/RedHatOfficial/Overpass/blob/master/OFL.txt).
- Arc Library: adaptations are mapped below. Revision `439ed0ddc86d39babcfe97738f633fb361a892a5` has MIT copyright 2026 Elia Kuratli, verified against its [revision license](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/LICENSE).
- React / React DOM: MIT peers external to the library bundle, bundled by the catalogue. Preserve their notices with the compiled catalogue. [Official license](https://github.com/facebook/react/blob/main/LICENSE).

Full local texts are in `licenses/`; resolved versions are in `package-lock.json`. Published packages must include `LICENSE`, `THIRD_PARTY_NOTICES.md` and `licenses/`.

## Reference-only material and demo assets

beUI informed locally implemented BottomSheet, FileTree, PreviewRail, selection, navigation and [CodeBlock](https://beui.dev/components/agents/code-block) composition. No license grant to beUI code is asserted.

shadcn/ui, shadcn.io and Kobra are reference directions for resizing, scroll fades and toast behavior. No associated registry/runtime dependencies are installed. Dependency absence alone does not prove code independence. [shadcn/ui MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) covers that repository only; future imports from another registry require the actual author's license. [Kobra Toast](https://kobra.systems/components/toast) is credited without asserting a code-license grant.

Simple avatar and landscape SVG fixtures are locally declared inline in `demo/stories-content.tsx` and `demo/FileCardExample.tsx`; they do not fetch third-party photos. Consumers must clear any logos/media they supply themselves.

## Capacities provenance and public cleanup

[Capacities terms, section 7](https://capacities.io/terms-and-conditions-en), reserve rights in software, designs, content and data compilations and provide no general open-source redistribution grant. Credit and renaming do not supply that grant.

Raw stylesheet snapshots, selector/context extracts and original frozen archives must be excluded from public distributions. The reviewed paths include `source/loaded-stylesheets.json`, `source/light-css.json`, `source/dark-css.json`, `source/token-rules.json` and historical `versions/*.tgz`. Removing files from a current checkout does not remove them from Git history.

The public foundation uses independently authored Sloy palette definitions generated from the project's own OKLCH configuration. The original complete Capacities color catalogs, copied token graph and raw palette export are excluded from the public distribution. This replaces the previously unresolved source dataset; the independent semantic/API implementation keeps its own context contract.

Historical Git commits and releases may still contain removed captures. Any existing public history/release cleanup requires its own explicit action; this current-tree review does not certify those historical artifacts.
Before publication verify the public tree and history, npm tarball and compiled catalogue. Packaging/type checks establish technical behavior, not permission to distribute upstream proprietary material.

## Arc adaptations

The following local components used the credited Arc revision as code or interaction references. APIs, rendering and dependencies differ; this table identifies provenance, not feature parity. The MIT notice covers adaptations and remains in redistributions.

| Sloy component | Arc reference |
| --- | --- |
| TreeView | [tree-view.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/tree-view/tree-view.tsx) |
| NavigationMenu | [hover-card.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/hover-card/hover-card.tsx) |
| HoverPanel | [hover-card.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/hover-card/hover-card.tsx) |
| ComboBox | [combobox.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/combobox/combobox.tsx) |
| MultiSelect | [multi-select.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/multi-select/multi-select.tsx) |
| TagInput | [tag-input.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/tag-input/tag-input.tsx) |
| RadioGroup | [radio-group.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/radio-group/radio-group.tsx), [radio-cards.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/radio-cards/radio-cards.tsx) |
| ColorPicker | [color-picker.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/color-picker/color-picker.tsx) |
| NumberField | [number-field.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/number-field/number-field.tsx) |
| ValueScrubber | [number-field.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/number-field/number-field.tsx), [slider.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/slider/slider.tsx) |
| RichTextEditor | [rich-text-editor.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/rich-text-editor/rich-text-editor.tsx) |
| DataTable | [sortable-data-table.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/sortable-data-table/sortable-data-table.tsx) |
| FilterToolbar | [filter-toolbar.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/filter-toolbar/filter-toolbar.tsx) |
| JsonViewer | [json-viewer.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/json-viewer/json-viewer.tsx) |
| ToastStack | [toast-stack.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/toast-stack/toast-stack.tsx) |
| AnnouncementBar | [announcement-bar.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/announcement-bar/announcement-bar.tsx) |
| CardStack | [card-stack.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/card-stack/card-stack.tsx) |
| TextShimmer | [text-shimmer.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/text-shimmer/text-shimmer.tsx) |
| CommentThread | [comment-thread.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/comment-thread/comment-thread.tsx) |
| InlineComments | [comment-thread.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/comment-thread/comment-thread.tsx) |
| LineChart | [line-chart.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/line-chart/line-chart.tsx) |
| BarChart | [bar-chart.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/bar-chart/bar-chart.tsx) |
| DonutChart | [donut-chart.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/donut-chart/donut-chart.tsx) |
| Streamgraph | [streamgraph.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/streamgraph/streamgraph.tsx) |
| BrushChart | [brush-chart.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/brush-chart/brush-chart.tsx) |
| WaffleChart | [waffle-chart.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/waffle-chart/waffle-chart.tsx) |
| SlopeChart | [slope-chart.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/slope-chart/slope-chart.tsx) |
| Sparkline | [sparkline.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/sparkline/sparkline.tsx) |
| Gauge | [gauge.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/gauge/gauge.tsx) |
| ActivityHeatmap | [activity-heatmap.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/activity-heatmap/activity-heatmap.tsx) |
| AnimatedCounter | [animated-counter.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/animated-counter/animated-counter.tsx) |
| Ridgeline | [ridgeline.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/ridgeline/ridgeline.tsx) |
| Treemap | [treemap.tsx](https://github.com/kuratlielia/arc-library/blob/439ed0ddc86d39babcfe97738f633fb361a892a5/registry/components/treemap/treemap.tsx) |
