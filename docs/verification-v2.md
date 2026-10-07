# Проверка V2 · 2026-10-04

## Сборка и пакет

`npm run check` прошёл: генерация токенов/importer, TypeScript, **48 тестов в 6 файлах**, сборка ESM/CSS и production-каталога. `scripts/build-manifest.mjs` проверяет точное совпадение manifest с 59 public component exports.

Проверка реального `personal-capacities-ui-0.2.0.tgz` в изолированном consumer прошла: NodeNext declarations, оба примера (`ProjectBoard`, `WorkspaceV2`), SSR import, девять локальных font assets и tree shaking. Результат: `package-validation.json`.

Размеры без React, gzip: весь JS после minify — 18,171 B; стили с токенами — 14,062 B; tokens отдельно — 4,394 B; потребитель только Button — 646 B JS. Шрифты и полный исторический source CSS подключаются отдельно. Измерения: `bundle-size.json`.

## Поведенческие тесты

- `interaction.test.tsx`: loading, связь field/error, checkbox/switch, tabs/segments, menu, dialog, command palette, базовая axe-семантика.
- `overlays-v2.test.tsx`: custom Select, disabled/typeahead/form reset, portal theme/accent, focus trap/restore, nested dialogs/popovers/menu, mobile positioning, быстрый reopen, inert/scroll lock.
- `workbench.test.tsx`: overflow/shadows/resize/ref, split action/menu/disabled/loading, roving toolbar, floating field semantics, expandable/dismissible alerts.
- `content.test.tsx`: даты и ограничения календаря, клавиатура и кастомный `DatePicker` без браузерного date picker, безопасный Markdown, редактирование выделения, карточки и управляемый канбан.
- `tokens.test.ts`: идентичные 12 путей Accent, 18 modes, 24 appearance роли, все aliases в 36 сочетаниях темы/акцента, grayscale и контраст основных текстовых пар ≥4.5:1.
- `figma.test.ts`: 48 Variables/3 collections, scopes/code syntax, межколлекционные aliases, запрет дубликата, полный rollback при лимите modes.

## Живой Chrome

Проверены 14 разделов на desktop 1699×823 в Light и Dark: 28 axe-аудитов без нарушений. На 390×844 проверены Цвета, Календарь/канбан, Панели/скролл, Окна и меню, Формы в обеих темах: ещё 10 аудитов без нарушений. У всех 10 mobile-сценариев document width = 390 px, main scrollWidth = main clientWidth = 376 px. Сохранено в `browser-a11y-v2.json`.

Дополнительно открыты кастомный Select внутри Dialog, вложенный Drawer, Escape и возврат фокуса. Выбор меняет значение; скрытые native selects не имеют видимой поверхности. Mobile Drawer имеет 12 px до всех четырёх сторон, внутренний контент не шире панели. Аудит открытого Drawer также без нарушений. Прокрутка живого ScrollArea через клавиатуру меняет scrollTop и включает верхнюю внутреннюю тень. Проверены screenshot-виды календаря/дня, палитры и mobile overlay.

Контраст muted в Light был исправлен по реальному browser-аудиту: neutral/7 = #666666, чтобы подписи были читаемы и на серой подложке. После изменения desktop/mobile матрицы перепроверены.

## Границы доказательств

Figma importer проверен через mock Plugin API, но в реальном Figma-файле ещё не запускался: целевой файл/проект не выбран. Не проверены все браузеры и скринридеры. Markdown — ограниченный документированный parser, канбан — перемещение меню, без drag-and-drop. Данные демо не переживают перезагрузку.

Предыдущие `browser-a11y.json`, `responsive-validation.json` и старые preview-файлы относятся к V1 и сохранены как история; для V2 используйте отчёт с суффиксом `-v2` и изображения `v2-*`. Архив V1 дополнительно защищён SHA256SUMS в `versions/v0.1.0`.
