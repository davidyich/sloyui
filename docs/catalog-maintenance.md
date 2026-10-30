# Catalogue maintenance

The component package has no runtime dependencies. The catalogue's separate Node service uses SQLite for component statuses, announcements, kit releases, component release notes and editable instructions. Persistent data lives outside the public `site/` root. Owner writes require the existing OIDC session, same-origin requests and the current record revision.

## Versions and component history

`source/component-registry.json` owns stable component IDs, identity, groups and memberships. `source/component-history.json` owns release seeds: kit releases and per-component entries keyed by those IDs. Each component entry has its own version, the corresponding `kitVersion`, a date and a concrete change summary. An unchanged component retains its previous version when the kit is released. Do not reconstruct old component histories from guesses; an empty history means no documented entry exists.

When component behavior, visual geometry or its public API changes, update that component's history in the same task. Update `CHANGELOG.md`, the package version and relevant canonical guidance, then regenerate the manifest. Component versions and kit versions are separate values; a component entry must reference an existing kit release. Describe the final behavior and why it changed, including validation when useful. Changes made only to the catalogue shell do not bump unrelated component versions.

Click the unified component-ID/version button to open its history and instructions. On desktop this is a non-modal panel inside the content region: it shifts that region, leaves the sidebar available and uses no backdrop. At 720 px and below it opens in a modal bottom drawer, preserving the document scroll and restoring focus to the version button on close. Owners can add release entries and edit that component's instruction file. Instruction guidance uses a two-column Do / Do not table and the panel uses segmented tabs. The site administrator page also provides the whole-kit release editor. Guests can read these records and have no editing actions.

## Instructions and concurrent edits

Instruction-language markers use plain Tag styling, `--cap-font-code`, the compact Counter dimensions (10 px text, 16 px height), and `--cap-content-caption`. Keep them quiet and visible without a background or outline.

The local instruction editor writes the actual repository files. Production stores durable document content and revision metadata through the catalogue API. The core instruction files are protected from deletion; custom and component-specific files use explicit paths. A save must include the revision that was loaded. On conflict, retain the draft and load the current saved copy before deciding how to reconcile it. Never replace a concurrent edit silently.

Catalogue announcement dismissal lasts only until page reload: omit AnnouncementBar.id so visitor closes are not persisted. The owner setting announcement.enabled controls global visibility.

Production edits survive deployments. To bring a production instruction or release note into the source repository, export/read the saved record deliberately, compare it with the local file and update the canonical source. A database record is not a Git commit. Status changes preserve registry IDs and memberships; announcement edits preserve the independent visibility setting.

## Catalogue geometry

Playground settings use compact parameter rows with a common height across controls; multiline editors open in an adjacent popover. Follow density and use a 44 px minimum on mobile. Numeric rows support label drag, Alt-drag on the value, variable speed, exact entry and Shift + arrows; do not impose preset bounds on freely editable range limits. Use kit pickers for special values. On desktop, the inspector scrolls independently with reset in a fixed footer; preserve resizing and the stacked narrow layout. Playground field previews stay centered with a compact maximum width; full-width data and layout examples keep their own geometry. Color controls use ColorPicker so the swatch, picker and exact input stay synchronized.

Colors and themes is the first navigation entry, with Roles, Tokens and Palettes tabs. The legacy `#tokens` route opens the Tokens tab; advanced collection routing and exports stay collapsed. New preview preferences default to Content; explicit saved preferences remain intact.

English component pages use manifest purpose, curated usage, behavior and examples when the owner instruction is Russian. Keep the complete editable original under a labelled source-language disclosure; never translate authored code, announcements or saved content automatically.

The exterior paints Shell, navigation paints Workspace, and the catalogue document always uses Content. Each region paints `--cap-surface-current` from its own context; do not override Shell with the absolute Workspace helper. The global Surface picker affects only explicit previews: playgrounds, story samples, overview thumbnails and foundation specimens. Instructions, release history, API tables, headings and navigation retain their own fixed context; document and release-card blocks use Content `--cap-surface-block`.

Desktop appearance starts with Theme, Accent and Surface; More smoothly reveals Density, Default/Rounded, Borders, a Standard/Dimmed icon toggle and a focus-outline icon toggle. Do not add an additional settings menu or expose Square/Smooth controls here. Mobile View exposes the same scheme icon and a direct focus switch. Publication belongs to owner site administration. Component focus geometry is collapsed in its inspector by default. Reduced motion disables the horizontal reveal. The reveal row adds no vertical padding of its own: all controls share one visible height, and the dock shell owns equal clearance on all four sides. Collapsing or expanding must not change dock height. A collapsed zero-width reveal reserves one inter-control gap; its private row shares the same gap and square-mode switch as the visible row.

Mobile catalogue chrome uses one 44 px action row in normal layout flow, outside `.catalog-main`. Open appearance controls in the View drawer instead of wrapping the desktop dock. Account for the bottom safe area once in that row; the document needs no floating-dock clearance on mobile. Keep overview filters in two columns below the search field, and mobile settings inputs at 16 px.

The main Radius button toggles Default (8 px) and Rounded (16 px), and remains usable for stored Square preferences. Square and Smooth are runtime compatibility settings without catalogue controls; saved Compact values migrate to Default in the catalogue, while the runtime keeps 4 px compatibility. Borders remains independent at 0 px. At 16 px the navigation header/footer increase both outer clearance and action gaps; the settings FloatingActionBar keeps its positive-radius inset. Square settings attach to the container edges with no action gaps and larger internal targets. Density is a separate persisted Default/Compact context; foundation labels show its actual resolved dimensions. Documentation entries stay above collapsible groups without their own group label. Adjacent collapsed component groups use the compact row rhythm; reserve section spacing for the end of expanded content. Header actions have zero inter-control gaps at None. Main and Develop share the S identity but use different icons; Develop uses a blue blueprint favicon selected by URL path. On small screens navigation uses an edge BottomSheet with two snap points, a scrolling tree and a separate footer; selecting a destination closes the sheet.

## Release and verification

Run `npm run check`, package the kit and verify the archive before deployment. The deploy script also verifies all reachable JavaScript imports and rejects multiple React runtimes. Preserve the entire module graph when changing asset URLs; publish new URLs for changed dependencies so cached modules cannot import an obsolete entry. `scripts/deploy-devos.sh` targets Develop by default and imports new source seeds while preserving owner edits, backs up persistent data and switches the release pointer atomically. Keep database backups outside the web root. Restore code and the corresponding data backup together when rolling back a schema change; preserve any later owner edits first.

The owner confirms publication in Develop site administration; it promotes the reviewed build and saved Develop data with backup, revision checks and rollback. Main-site administrator settings link to Develop. See docs/deployment.md.

Verify public history reads, guest write rejection, owner saves, stale-revision conflicts and persistence after restarting the service. In the browser, verify the compact panel, component/kit version links, document editing and guest visibility. Record the checked scope in `docs/verification.md`; do not claim Windows hardware validation from a macOS browser run.

## Индивидуальные инструкции компонентов

`docs/components/<cp-ID>.md` хранит один документ для каждого неархивного компонента. Используйте назначение, реальный API, состояния и конкретные блоки «Делать» / «Не делать». `ComponentUsage` и вкладка инструкции в истории читают тот же revision-safe API. Сборка включает документы в `documents.json`; общий список инструкций их не показывает. При выпуске SQLite обновляет только неотредактированный seed и сохраняет тексты владельца. Новые канонические компоненты должны получить документ до сборки каталога.
