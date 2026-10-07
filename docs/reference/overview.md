# Capacities UI

Лёгкий React + TypeScript UI kit. Компоненты, API и статусы перечислены в корневом `agent-manifest.json`; канонический список исключает архивные совместимые экспорты. Число записей со временем меняется, поэтому не фиксируйте его в документации.

Подключите `@personal/capacities-ui/styles.css` один раз. Шрифты подключаются отдельно через `@personal/capacities-ui/fonts.css`.

## Что читать

- `llms.txt` — точки входа и карту файлов.
- `AGENTS.md` — контракт разработки и использования.
- `agent-manifest.json` — точные props, назначение, поведение и примеры компонента.
- `resizing.md` — изменение размеров панелей и карточек, геометрию стеков.
- `catalogue-reference.md` — генерацию API, инструкции, связанные компоненты и структуру каталога.
- `component-registry.md` — постоянные ID, статусы, несколько групп и архивные маршруты; источник — `source/component-registry.json`.
- `component-guidelines.md` — выбор и композицию компонентов.
- `anti-patterns.md` — частые ошибки интерфейса.
- `examples.md` и `recipes.md` — короткие примеры и готовые композиции.
- `behavior.md`, `surface-context.md`, `content-guide.md` — подробные контракты состояний, поверхностей и контента.

Контракты ревизии:

- [selection-revision.md](selection-revision.md) — Chip, MultiSelect, ColorPicker и Slider.
- [editor-revision.md](editor-revision.md) — Markdown-мост, RichTextEditor и CodeBlock.
- [navigation-motion-revision.md](navigation-motion-revision.md) — общий hover, раскрытие и Tabs.
- [content-revision.md](content-revision.md) — карточки, Kanban, ContentLayout и DataTable.
- [feedback-revision.md](feedback-revision.md) — статусы, стеки, AnnouncementBar и TextShimmer.
- [new-components-revision.md](new-components-revision.md) — BottomSheet, FileTree и PreviewRail.

Открывайте только релевантные документы и записи. Не загружайте каталоги токенов целиком без задачи на их аудит.

## Контекст интерфейса

`data-theme`, `data-accent`, `data-surface`, `data-borders` и `data-radius` задают независимые локальные оси оформления. Используйте семантические `--cap-*` роли. `data-surface` описывает роль поверхности, а не выводится из цвета DOM. Портальные поверхности наследуют ближайший локальный контекст и устанавливают `data-surface="floating"`.

В каталоге у каждого канонического компонента есть страница с примером и typed Playground. При изменении API обновляйте его записи и связанные примеры согласно `AGENTS.md`.

## Редактирование инструкций

Локальный каталог редактирует реальные файлы из `demo/document-files.ts` с проверкой ревизии. Rich edit включён по умолчанию, переключатель Markdown редактирует ту же исходную строку с сохранением неподдержанных конструкций. Изменения из другого процесса требуют сверки, а не перезаписи черновика. Агентам следует читать исходный файл проекта.
