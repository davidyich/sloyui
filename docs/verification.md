# Проверка V0.3 · 2026-10-04

## Сборка и пакет

`npm run check` проверяет генерацию токенов и manifest, TypeScript, 129 тестов в 8 файлах, ESM/CSS и production-каталог. Manifest совпадает с 59 экспортируемыми компонентами. Каталог содержит отдельный работающий пример для каждого экспорта и сохраняет старые hash-ссылки через aliases.

Размеры библиотеки без React, gzip: весь JS после minify — 18,296 B; стили вместе с токенами — 15,032 B; tokens отдельно — 4,977 B; потребитель только Button — 646 B JS. Шрифты и исторический source CSS подключаются отдельно. Измерения: `bundle-size.json`.

Проверка готового V0.3 tgz в изолированном consumer покрывает NodeNext declarations, оба композиционных примера, SSR import, девять локальных font assets и tree shaking. Результат: `package-validation.json`.

## Автоматические проверки

Сохранены поведенческие проверки V2 (сводка в `verification-v2.md`). Новое покрытие:

- `catalog.test.tsx`: первоначальный рендер всех 59 отдельных страниц, canonical/legacy маршруты, некорректные и унаследованные ключи в hash.
- `surfaces.test.ts`: вычисление сгенерированных CSS выражений `light-dark` и `color-mix`. Secondary/muted на поверхности и default/hover/active-заливках, в обеих темах и режимах границ. Все 18 акцентов на soft/bg/block для base/canvas/raised. Проверенные текстовые пары ≥4.5:1.
- `workbench.test.tsx`: размеры как наследуемый контракт, переключение scrollbar без потери ref/фокуса, отсутствие окрашенных overlay-слоёв, plain StatusBar, раскрытие/закрытие Alert.
- `overlays-v2.test.tsx`: theme/accent/borders в Menu, Select, Popover, Tooltip и Dialog; собственная raised-поверхность; обновление borders открытого popup. Предыдущие focus/inert/scroll-lock/keyboard проверки сохранены.

## Живой браузер

В Codex In-app Browser сохранены **57 итоговых axe-аудитов без нарушений** (`browser-a11y-v3.json`). В набор входят ключевые компоненты Light/Dark, borders on/off, дополнительные поверхности и открытый мобильный Dialog. Три первоначальные ошибки структуры заголовков/повторного имени календаря исправлены и перепроверены.

На desktop 1131×833 проверены ActionBar, Button, Input, Select, Alert, Toast, ScrollArea, SidebarPanel, Calendar, ContentCard, MarkdownEditor, Tabs и Dialog. Borders on дополнительно проверен на ActionBar, Button, Input, Alert и ScrollArea в обеих темах. Это целевая матрица, а не полный перебор всех сочетаний 59 компонентов.

На 390×844 проверены 8 страниц в каждой теме: ActionBar, Alert, ScrollArea, SidebarPanel, Calendar, MarkdownEditor, Tabs и Dialog. У всех 16 сценариев document width = main clientWidth = main scrollWidth = 390 px.

Дополнительно измерено и проверено:

- У mixed ActionBar внешняя высота ButtonGroup, Popover и SplitButton — ровно 32 px; смена borders не меняет геометрию.
- Dark hover группы изменяется с transparent на sRGB ~0.203; области наведения видны.
- У всех шести Alert шапка 48 px; заголовок и body начинаются на одной координате x=352 в измеренном desktop-виде.
- Horizontal ScrollArea: `scrollbar-width: none`, маска прозрачности вместо цветного слоя; ArrowRight меняет scrollLeft, фокус остаётся в viewport. Проверен вид на белой raised-поверхности.
- Вторичная нейтральная заливка в Dark изменяется с контекстом: base ~42/255, canvas ~28/255, raised ~62/255. Это измеренные browser computed styles.
- Popover у правого края сохраняет 12 px gutter. Mobile Drawer имеет 12 px с каждой стороны; mobile Dialog — 12 px слева/справа/снизу.
- Select внутри Dialog наследует тему и borders, использует raised; Escape закрывает вложенный слой, затем диалог, фокус возвращается к кнопке открытия.

Вид каталога: `previews/v3-actionbar-dark.png`. Полные архивы V0.1 и V0.2 прошли проверку SHA256SUMS.

## Границы проверки

Viewport 390 px проверяет узкую раскладку, но не эмулирует физический touch pointer. Coarse-pointer правила 44 px реализованы в CSS; аппаратный touch и все браузеры/скринридеры отдельно не проверялись. Figma importer проверен mock API; запись в реальный Figma-файл не выполнялась. Markdown и канбан имеют документированный объём возможностей. Данные демонстрационных историй не сохраняются после перезагрузки.
