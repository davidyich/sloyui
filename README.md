# Sloy UI

A lightweight React component library for tools, content workspaces and dashboards. Independent design tokens, light and dark themes, local accents, optional borders and shared corner geometry. React 19 and React DOM are the only runtime peers.

[Repository](https://github.com/davidyich/sloyui) · [Releases](https://github.com/davidyich/sloyui/releases) · [Changelog](CHANGELOG.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

Project domain: **sloyui.com**. Website deployment is separate from installing the library.

## Install

Use a built release archive. The package name is `sloyui`; it is not yet published to the npm registry.

```sh
npm install react@^19 react-dom@^19
npm install https://github.com/davidyich/sloyui/releases/download/v0.10.0/sloyui-0.10.0.tgz
```

You can also download the archive and its `SHA256SUMS.txt` from the release and install the local file:

```sh
npm install ./sloyui-0.10.0.tgz
```

Import the stylesheet once. Fonts are optional, self-hosted Inter and Overpass Mono.

```tsx
import { Button, Card, Input, LocaleProvider, Tag, SLOY_UI } from 'sloyui';
import 'sloyui/styles.css';
import 'sloyui/fonts.css'; // optional

export function App() {
  return (
    <LocaleProvider locale="en">
      <main data-accent="teal" data-surface="canvas"
        style={{ padding: 24, background: 'var(--cap-surface-current)',
          color: 'var(--cap-content-primary)', fontFamily: 'var(--cap-font-sans)' }}>
        <Card>
          <Tag>In progress</Tag>
          <h1>{SLOY_UI.name}</h1>
          <Input label="Project name" />
          <Button variant="accent" onClick={() => console.log('Save project')}>Save</Button>
        </Card>
      </main>
    </LocaleProvider>
  );
}
```

Set `data-theme="light"` or `"dark"` on `html`. Layout, application data and persistence remain yours; the kit does not reset `body` styles.

## Context and customization

| Attribute | Values | Purpose |
| --- | --- | --- |
| `data-theme` | `light`, `dark` | Appearance; set on `html` or override locally |
| `data-accent` | `neutral` and 17 hue families | Local accent inherited by colored controls |
| `data-surface` | `canvas`, `base`, `raised`, `floating` | Actual surface context; paint custom wrappers with `--cap-surface-current` |
| `data-borders` | `off`, `on` | Decorative outlines; focus and structural separators remain visible |
| `data-radius` | `compact`, `default`, `rounded` | Shared corner geometry |
| `data-shadow` | `soft`, `compact` | Floating shadow profile |

Contexts inherit independently. Cards establish raised surfaces; portals preserve local context and establish floating surfaces. Primary buttons stay neutral; accent buttons and selection controls use the local accent. Semantic status colors keep their meaning.

The color system contains **417 independently generated colors**: 17 hue ramps with 22 steps, a 41-step neutral ramp, black and white. The source is [foundation.json](source/foundation.json); semantic mappings live in [surface-rules.json](source/surface-rules.json). See the [surface contract](docs/surface-context.md).

`SLOY_UI` exposes the shared name, slug, domain, URL, repository, package name and logo path. Its source is [src/brand.json](src/brand.json). Existing `cap-*` CSS names and `cp-*` component IDs are stable compatibility identifiers.

## Components and documentation

The catalogue has 89 active component pages across Controls, Navigation, Content and data, Layout and overlays, and Feedback and motion. Twelve chart pages are archived and available through the Archive filter. `FloatingField` and `MarkdownEditor` remain compatibility exports; use `Input` and `RichTextEditor` for new work.

Each component page includes a live playground, usage, typed API reference, usage guidance and related components. New components carry a Review status. Use [agent-manifest.json](agent-manifest.json) for exact exports, properties, status and stable IDs.

Built-in component labels support Russian and English through `LocaleProvider`; supplied strings remain under consumer control. Modern browsers need `color-mix()`, `light-dark()`, OKLCH and `inert` support.

For AI-assisted work, start with [llms.txt](llms.txt), then read only the needed component records and [composition recipes](docs/recipes.md). Executable examples live in [examples/](examples/).

## Develop and verify

```sh
git clone https://github.com/davidyich/sloyui.git
cd sloyui
npm ci
npm run dev
```

The local catalogue runs at `http://127.0.0.1:4317`; Installation is under Docs. Its instruction editor writes actual project files with revision checks. Static builds expose read-only core instructions; local custom drafts are excluded.

```sh
npm run check          # tokens, manifest, types, tests, library and catalogue
npm run pack:kit       # artifacts/sloyui-0.10.0.tgz
npm run verify:package # isolated consumer: types, SSR, exports, fonts and package contents
```

Use Node.js 22 or newer and npm. Do not install directly from a Git URL: generated `dist` is not committed. The published archive includes runtime files, types, licenses, focused agent documentation and examples; development fixtures, private drafts and local artifacts are excluded.

## Contribute and license

Issues and pull requests are welcome. Only the repository owner can update `main`; changes require a pull request and passing CI. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Original Sloy UI code is [MIT licensed](LICENSE). Included icons, fonts and adapted code retain their upstream notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [licenses/](licenses/). Credits distinguish source adaptations from visual references. No affiliation or trademark rights are implied.
