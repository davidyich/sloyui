# Capacities UI · 0.3

Лёгкий UI-kit для персональных проектов: **59 компонентов**, React 19+, TypeScript и обычный CSS. Две темы, локальные акцентные моды, собственные всплывающие поверхности. Runtime-зависимостей кроме React/React DOM нет.

## Каталог

```sh
npm ci
npm run dev
```

Открыть [каталог](http://127.0.0.1:4317/). У каждого из 59 компонентов отдельная страница с адресом `#ComponentName`: например, [Button](http://127.0.0.1:4317/#Button), [ScrollArea](http://127.0.0.1:4317/#ScrollArea) и [Popover](http://127.0.0.1:4317/#Popover). Боковая навигация группирует кнопки, поля, контент, навигацию, состояния и окна. Цвета, типографика, геометрия и правила поведения вынесены в отдельные страницы. `Cmd/Ctrl+K` открывает поиск. Данные примеров хранятся в памяти страницы.

## Подключение

```sh
npm run pack:kit
```

В своём проекте установите локальный `artifacts/personal-capacities-ui-0.3.0.tgz` командой `npm install /absolute/path/to/personal-capacities-ui-0.3.0.tgz`. Поддерживаемый способ установки — готовый `.tgz`: локально собранный или скачанный из [GitHub Release v0.3.0](https://github.com/davidyich/capacities-style/releases/tag/v0.3.0). `git install` не является установочным контрактом: `dist` не хранится в Git, а `prepare` отсутствует. Публикация в npm registry не требуется.

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

Задайте `data-theme="light"` или `data-theme="dark"` на `html`. По умолчанию — light. Переключение system theme и сохранение предпочтения принадлежат приложению. По умолчанию декоративные рамки выключены: `data-borders="off"`. Для альтернативного вида задайте `data-borders="on"` на `html` или локальном контейнере. Portal сохраняет ближайшие theme/accent/borders; всплывающая поверхность всегда получает собственный контекст `raised`.

Стили ограничены классами `cap-`; `body` и раскладка приложения не сбрасываются. Для оболочки используйте `--cap-surface-canvas`, `--cap-content-primary`, `--cap-font-sans`.

## Цвета и контекст поверхности

| Коллекция | Переменные | Моды |
| --- | ---: | --- |
| Neutral | 12 grayscale-ступеней | Base |
| Accent | 12 одинаковых имён `accent/1…12` | neutral + 17 цветов |
| Appearance | 24 роли фона, текста, границ и акцента | Light / Dark |

Это базовый граф Figma: **48 Variables**, без повторения имён ролей для каждого цвета. В нём Light/Dark ссылается на ступени Neutral и выбранного Accent. CSS дополняет граф контекстом реальной поверхности: заливки контролов, мягкие акценты и второстепенный текст вычисляются для `base`, `canvas` или `raised`. Эти runtime-правила не являются дополнительными Figma-модами. Цветовые компоненты `Tag`, `Badge`, `TypeLabel`, `IconBox` без `color` наследуют мод контейнера. `color="rose"` или вложенный `data-accent="rose"` задаёт локальное переопределение. `gray` оставлен как совместимый псевдоним neutral.

`styles.css` содержит готовые токены и стили. Отдельный `tokens.css` нужен только для использования переменных без компонентов. Основные роли: `--cap-surface-current`, `--cap-control-bg`, `--cap-control-hover`, `--cap-control-active`, `--cap-content-muted`, `--cap-panel-border`, `--cap-control-border`, `--cap-accent-soft`, `--cap-accent-ink`, `--cap-accent-solid`, `--cap-accent-on-solid`. Старые общие `--cap-bg-*`, `--cap-text-*`, `--cap-border-*` сохранены как алиасы. Старые роли каждого оттенка (`--cap-tag-bg-purple` и подобные) заменены общими accent-ролями.

Готовая модель Figma: [figma-modes.json](src/tokens/figma-modes.json). Импорт с реальными межколлекционными aliases: [инструкция](figma/README.md). CSS сохраняет исходные OKLCH акцентов, Figma получает sRGB. Neutral — чистый grayscale. В этой версии файлы модели и импортера подготовлены локально; реальный файл Figma не обновлялся.

| Runtime-атрибут | Значения | Назначение |
| --- | --- | --- |
| `data-theme` | `light` / `dark` | Светлое или тёмное оформление |
| `data-accent` | `neutral` + 17 цветов | Локальный цвет объектов и акцентных действий |
| `data-surface` | `base` / `canvas` / `raised` | Фактический фон контейнера и контраст его содержимого |
| `data-borders` | `off` / `on` | Прозрачные или видимые декоративные границы; другая плотность нейтральных заливок |

`data-surface` наследуется и не считывает фон из DOM. На собственном контейнере согласуйте атрибут и заливку, например `data-surface="canvas"` вместе с `background: var(--cap-surface-current)`. `Card`, `SidebarPanel` и всплывающие компоненты объявляют свою поверхность сами. На `raised` кнопки и метаданные получают подходящий контраст независимо от поверхности за панелью.

При `data-borders="off"` границы становятся прозрачными без изменения размеров; нейтральные контролы различаются по заливке. `on` возвращает границы и делает обычную заливку спокойнее. Контуры фокуса, ошибки и значимые состояния сохраняются в обоих режимах. Точный контракт: [surface-context](docs/surface-context.md). Копируемые композиции: [recipes](docs/recipes.md).

## Компоненты

| Группа | Состав |
| --- | --- |
| Действия | Button, IconButton, ButtonGroup, SplitButton, ActionBar, FloatingActionBar, Menu, Tooltip, Popover |
| Формы | Field, Input, FloatingField, Textarea, Select, Checkbox, Radio, Switch, Slider, SegmentedControl, DatePicker |
| Панели | Dialog, Drawer, CommandPalette, SidebarPanel, ScrollArea |
| Контент | Calendar, DailyHeader, MarkdownEditor, MarkdownPreview, ContentCard, TaskCard, KanbanBoard, KanbanColumn |
| Навигация | SidebarItem, Breadcrumbs, Tabs (line/pills), Accordion |
| Объекты | Card, ObjectCard, CollectionRow, PropertyRow, Badge, Tag, TypeLabel, IconBox, Avatar |
| Обратная связь | StatusBar, Alert, Toast, Callout, EmptyState, Progress, Spinner, Skeleton |
| Основа | Icon, Kbd, Separator, Table, CodeBlock |

Button: `primary/secondary/outline/ghost/danger/accent`, размеры 22/28/32/36 px. `ActionBar`, `ButtonGroup` и `SplitButton` принимают общий `size`; вложенная группа может переопределить его. `Popover.size` задаёт размер кнопки, содержимое popup сохраняет свой размер. Touch-контролы получают минимум 44 px. Радиусы 4.8/8/12/16 px. Inter 13.5 px для компактного UI, 15 px для основного текста; Overpass Mono для кода. Шрифты self-hosted и подключаются отдельно.

Диалоги, меню, Select и Popover имеют собственное оформление, отступ 12 px от viewport, клавиатуру, Escape и возврат фокуса. У Select нативный скрытый элемент сохраняет контракт HTML-формы; видимый список полностью custom. ScrollArea сохраняет браузерную прокрутку. `scrollbar="auto"` показывает тонкую полосу по правилам браузера; `hidden` скрывает её, сохраняя wheel/touch/keyboard. По умолчанию горизонтальная полоса скрыта, вертикальная и режим `both` используют auto. Краевые маски открывают фон контейнера только там, где остаётся скрытый контент; цветной подложки у них нет.

## Для агентов

Читайте [llms.txt](llms.txt), затем нужные записи [agent-manifest.json](agent-manifest.json). Примеры: [ProjectBoard](examples/ProjectBoard.tsx), [WorkspaceV2](examples/WorkspaceV2.tsx). [Content guide](docs/content-guide.md) описывает календарь, редактор и карточки. [Behavior](docs/behavior.md) закрепляет motion, состояния и адаптив. Размеры сборки измерены в [bundle-size.json](docs/bundle-size.json).

MarkdownEditor — редактор текста с безопасным preview документированного поднабора Markdown. Канбан использует доступное меню перемещения; drag-and-drop не реализован. Persistence, backend, загрузка вложений и полнофункциональный редактор Capacities остаются задачей приложения.

## Проверка и откат

```sh
npm run check
npm run pack:kit
npm run verify:package
```

`check` генерирует токены и manifest, проверяет типы, поведение, модель токенов, сборку библиотеки и каталога. Тот же путь используется в GitHub Actions. `verify:package` отдельно устанавливает архив в изолированный consumer, проверяет типы обоих примеров, SSR-импорт, шрифты и tree shaking. [Фактическая проверка](docs/verification.md).

**V0.2 сохранена** в [versions/v0.2.0](versions/v0.2.0/README.md): полный workspace и npm-пакет с `SHA256SUMS`. Восстановление выполняется в отдельную папку. **V1 сохранена без изменений** в [versions/v0.1.0](versions/v0.1.0/README.md): весь workspace и исходный npm-пакет, контрольные суммы и безопасная инструкция восстановления. Архивы не перезаписываются сборкой.

Современные браузеры с OKLCH, `color-mix()`, `light-dark()` и `inert`. Проверенные сценарии и версии перечислены в [verification](docs/verification.md). [Происхождение значений](docs/provenance.md), [лицензии](THIRD_PARTY_NOTICES.md).
