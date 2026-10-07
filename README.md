# Capacities UI · 0.6

Лёгкий UI-kit для персональных проектов: React 19+, TypeScript и обычный CSS. Две темы, локальные акцентные моды, собственные всплывающие поверхности. Runtime-зависимостей кроме React/React DOM нет.

## Каталог

```sh
npm ci
npm run dev
```

Открыть [обзор компонентов](http://127.0.0.1:4317/#overview) или [changelog](http://127.0.0.1:4317/#changelog). У каждого компонента отдельная страница с адресом `#ComponentName`: например, [Button](http://127.0.0.1:4317/#Button), [ScrollArea](http://127.0.0.1:4317/#ScrollArea) и [Popover](http://127.0.0.1:4317/#Popover). Боковая навигация группирует кнопки, поля, контент, навигацию, состояния и окна. Цвета, типографика, геометрия и правила поведения вынесены в отдельные страницы. `Cmd/Ctrl+K` открывает поиск. Данные примеров хранятся в памяти страницы. Каждая страница содержит API Reference из TypeScript, пример кода, инструкции для человека и агента и связанные компоненты.

## Подключение

```sh
npm run pack:kit
```

В своём проекте установите локальный `artifacts/personal-capacities-ui-0.8.0.tgz` командой `npm install /absolute/path/to/personal-capacities-ui-0.8.0.tgz`. Поддерживаемый способ установки — готовый `.tgz`: локально собранный или скачанный из [GitHub Release v0.8.0](https://github.com/davidyich/capacities-style/releases/tag/v0.8.0). `git install` не является установочным контрактом: `dist` не хранится в Git, а `prepare` отсутствует. Публикация в npm registry не требуется.

```tsx
import { Button, Tag, FloatingField, ScrollArea } from '@personal/capacities-ui';
import '@personal/capacities-ui/styles.css';
import '@personal/capacities-ui/fonts.css'; // optional local Inter + Overpass Mono

export function Project() {
  return <section data-accent="teal">
    <Tag>В работе</Tag>
    <FloatingField label="Название проекта" />
    <Button variant="accent">Сохранить</Button>
    <ScrollArea label="Заметки" style={{ height: 240 }}>…</ScrollArea>
  </section>;
}
```

Задайте `data-theme="light"` или `data-theme="dark"` на `html`. По умолчанию — light. Переключение system theme и сохранение предпочтения принадлежат приложению. По умолчанию декоративные рамки выключены: `data-borders="off"`. Для альтернативного вида задайте `data-borders="on"` на `html` или локальном контейнере. Portal сохраняет ближайшие theme/accent/borders; всплывающая поверхность всегда получает собственный контекст `floating`.

Стили ограничены классами `cap-`; `body` и раскладка приложения не сбрасываются. Для оболочки используйте `--cap-surface-canvas`, `--cap-content-primary`, `--cap-font-sans`.

## Язык интерфейса

`LocaleProvider locale="ru" | "en"` меняет встроенные подписи, календарь и форматирование чисел. По умолчанию — русский. Пользовательские строки и явно переданные locale/formatters сохраняются. Порталы наследуют язык. В каталоге RU/EN находится справа внизу бокового меню; выбор сохраняется локально.

```tsx
import { LocaleProvider, DatePicker } from '@personal/capacities-ui';

<LocaleProvider locale="en">
  <DatePicker label="Due date" />
</LocaleProvider>
```

## Цвета и контекст поверхности

| Коллекция | Переменные | Режимы |
| --- | ---: | --- |
| Primitives | 417 цветов, alpha, числа, шрифты и исходные literal-значения | Value |
| Theme | 1349: пары тем, общие и зависящие от поверхности | Light / Dark |
| Semantic | 731: рабочие роли и 366 исходных ролей в source | Base / Canvas / Raised / Floating |
| Borders | 1: ширина через числовой primitive | Off / On |

Все 417 цветов полной палитры сохранены. Каждый из 17 акцентов содержит 22 ступени, gray — 41, отдельно black и white. Рабочие пары используют реальные шаги растяжек. Генератор подбирает близкую относительную яркость заливок, различимые normal/hover/pressed и читаемый текст. Disabled использует непрозрачную нейтральную пару и блокирует действия. Для Tag это относится и к выбору, и к удалению.

`data-theme` задаёт тему, `data-accent` — локальный цвет, `data-surface` — canvas/base/raised/floating. Произвольному контейнеру также задайте `background: var(--cap-surface-current)`. Цветовые компоненты без `color` наследуют акцент. `gray` совместим с `neutral`. `data-borders="on"` возвращает декоративные обводки без изменения заливок и геометрии.

CSS и Figma используют [единую модель](src/tokens/figma-modes.json). Дубликаты el-h/el-w заменены `number/control-size`; шрифты разделены на family/size/line-height/weight. [Контекст и состояния](docs/surface-context.md), [импорт Figma](figma/README.md). Экспорт модели не означает автоматического обновления документа Figma.

## Компоненты

98 активных страниц и один архивный совместимый экспорт. Постоянные ID, статусы и все членства в группах хранятся в [реестре](source/component-registry.json). Каталог фильтруется по статусу, группе и ID. Новые Chip, BottomSheet, FileTree и PreviewRail помечены «Требует проверки»; готовность остальных описана в [отчёте ревизии](docs/revision-2026-10-07.md).

Ниже — основные семейства; полный индекс и точные API находятся в `agent-manifest.json`.


| Группа | Состав |
| --- | --- |
| Действия | Button, IconButton, ButtonGroup, SplitButton, ActionBar, FloatingActionBar, Menu, Tooltip, Popover |
| Формы и выбор | Input, Textarea, Select, ComboBox, MultiSelect, TagInput, Chip, ColorPicker, NumberField, Slider, RadioGroup, DatePicker |
| Панели | Dialog, Drawer, BottomSheet, CommandPalette, SidebarPanel, ContentLayout, ScrollArea |
| Контент | Calendar, DailyHeader, RichTextEditor, MarkdownPreview, ContentCard, TaskCard, KanbanBoard, KanbanColumn |
| Навигация | SidebarItem, NavigationMenu, TreeView, FileTree, PreviewRail, Breadcrumbs, Tabs, Accordion |
| Объекты | Card, ObjectCard, CollectionRow, PropertyRow, Tag, Counter, IconBox, Avatar |
| Файлы | FileCard, FileTree |
| Обратная связь | StatusBar, Alert, Toast, ToastStack, AnnouncementBar, TextShimmer, Callout, EmptyState, Progress |
| Данные | DataTable, JsonViewer, графики и таблицы данных |
| Основа | Icon, Kbd, Separator, Table, CodeBlock |

Button: `primary/secondary/outline/ghost/danger/accent`, размеры 22/28/32/36/44 px. `ActionBar`, `ButtonGroup` и `SplitButton` принимают общий `size`; вложенная группа может переопределить его. `Popover.size` задаёт размер кнопки, содержимое popup сохраняет свой размер. Основные touch-контролы увеличиваются до 44 px; исключения компактных размеров описаны в `docs/behavior.md`. Радиусы 4.8/8/12/16 px. Inter 13.5 px для компактного UI, 15 px для основного текста; Overpass Mono для кода. Шрифты self-hosted и подключаются отдельно.

Диалоги, меню, Select и Popover имеют собственное оформление, отступ 12 px от viewport, клавиатуру, Escape и возврат фокуса. У Select нативный скрытый элемент сохраняет контракт HTML-формы; видимый список полностью custom. ScrollArea сохраняет браузерную прокрутку. `scrollbar="auto"` показывает тонкую полосу по правилам браузера; `hidden` скрывает её, сохраняя wheel/touch/keyboard. По умолчанию горизонтальная полоса скрыта, вертикальная и режим `both` используют auto. Краевые маски открывают фон контейнера только там, где остаётся скрытый контент; цветной подложки у них нет.

## Для агентов

Читайте [llms.txt](llms.txt), затем нужные записи [agent-manifest.json](agent-manifest.json). Примеры: [ProjectBoard](examples/ProjectBoard.tsx), [WorkspaceV2](examples/WorkspaceV2.tsx). [Content guide](docs/content-guide.md) описывает календарь, редактор и карточки. [Behavior](docs/behavior.md) закрепляет motion, состояния и адаптив. Размеры сборки измерены в [bundle-size.json](docs/bundle-size.json).

RichTextEditor редактирует блоки и код; Markdown-мост сохраняет исходник нетронутых блоков. MarkdownEditor архивирован и оставлен только как совместимый экспорт. См. docs/editor-revision.md. Канбан использует доступное меню перемещения; drag-and-drop не реализован. Persistence, backend, загрузка вложений и полнофункциональный редактор Capacities остаются задачей приложения.

## Проверка и откат

```sh
npm run check
npm run pack:kit
npm run verify:package
```

`check` генерирует токены и manifest, проверяет типы, поведение, модель токенов, сборку библиотеки и каталога. Тот же путь используется в GitHub Actions. `verify:package` отдельно устанавливает архив в изолированный consumer, проверяет типы обоих примеров, SSR-импорт, шрифты и tree shaking. [Фактическая проверка](docs/verification.md).

**V0.2 сохранена** в [versions/v0.2.0](versions/v0.2.0/README.md): полный workspace и npm-пакет с `SHA256SUMS`. Восстановление выполняется в отдельную папку. **V1 сохранена без изменений** в [versions/v0.1.0](versions/v0.1.0/README.md): весь workspace и исходный npm-пакет, контрольные суммы и безопасная инструкция восстановления. Архивы не перезаписываются сборкой.

Современные браузеры с OKLCH, `color-mix()`, `light-dark()` и `inert`. Проверенные сценарии и версии перечислены в [verification](docs/verification.md). [Происхождение значений](docs/provenance.md), [лицензии](THIRD_PARTY_NOTICES.md).

## Инструкции в каталоге

Раздел `#agents` показывает реальные Markdown/TXT-файлы. Редактирование и сохранение доступны в `npm run dev`; статическая сборка содержит снимок документов только для чтения. Редактор проверяет версию файла и сохраняет черновик при конфликте. Карта правил: `docs/overview.md`.
