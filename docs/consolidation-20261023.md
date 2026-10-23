# Консолидация Sloy UI — 23 октября 2026

Этот документ сохраняет принятые решения и путь восстановления работы. Исторические отчёты подтверждают ход разработки, а не текущее состояние Figma или сервера. Фактически выполненные проверки и выпуск фиксируются отдельно в [verification.md](verification.md).

## Актуальное решение

Источник общей реализации — полная версия 0.16.5 из `828b`, перенесённая в рабочее дерево текущего чата `8b2b`. Добавлена уникальная документация контролов из `397c`; генератор, runtime, native export и документация обновляются согласованно. Число Git-коммитов не отражало объём работы: основные изменения находились в modified/untracked файлах при общем исходном HEAD. Поэтому простое слияние старых веток не заменяет перенос проверенного исходного набора.

Текущий файл — [SloyUI V2](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=164-498). Он полностью пересоздан после внешнего backup; старые ID заменены. Проверенные ссылки на шесть новых страниц находятся в [Figma README](../figma/README.md). Develop публикуется через `npm run release:develop`; production владелец продвигает отдельно.

Принятые правила:

- По умолчанию остаются neutral и шесть акцентов: Blue, Green, Orange, Red, Pink, Purple. Компонентный Accent имеет Neutral по умолчанию и шесть цветных modes. Наследование — через режим внешнего фрейма и Auto у экземпляров.
- Surface остаётся основным цветовым picker. Palette/Theme/Scheme — внутренние источники и маршруты. Семантические группы плоские, neutral первый, Normal/Active рядом. `content/on-primary` общий, точно чёрный/белый; одинаковые foreground не размножаются по hue.
- Runtime использует одну непрозрачную растяжку на hue. Native exporter сохраняет только используемые RGBA Palette-цвета с alpha в целых процентах, целочисленные FLOAT размеры и нужные aliases. Не экспортируются дробные alpha/ratio/intermediate FLOAT и дублирующая Opacity-коллекция.
- Alpha применяется к цветовой краске, а не ко всему компоненту. Контраст, цветность и различимость состояний проверяются после смешивания с объявленной подложкой.
- Invert — полный противоположный локальный контекст при неизменной Theme. Standard/Dimmed — отдельная ось схемы. Native Surface содержит Shell/Workspace/Content/Overlay/Invert; Glass сохраняется как runtime-материал.
- Custom требует явного выбора подложки, пересчёта генератором и согласованного экспорта. `figma/color-system-v2/export-custom.mjs` создаёт отдельную project-коллекцию/CSS для точных RGB Light/Dark; основной native preset не меняется. Произвольный фон DOM/Figma не распознаётся автоматически.
- Сохраняется покрытие 21 набора контролов из последней сессии, редактируемые экземпляры, примеры, layouts и практические рецепты. Наличие вариантов состояния не доказывает работу Prototype.

Точные рабочие правила находятся в [surface-context.md](surface-context.md), [component-guidelines.md](component-guidelines.md) и [Figma README](../figma/README.md). Native вход создаётся `figma/color-system-v2/build-native.mjs` в `native-graph.json`; dense runtime graph не применяется как native rebuild напрямую.

## Источники решений и что заменено

| Источник | Что сохраняем |
| --- | --- |
| Чат `01a168a4-3aee-7dd0-beec-ca0e6cf59d3d`, сообщение `01a168a4-457d-7703-a814-c00a851743ba` | Текущая консолидация, пересборка V2, шесть акцентов, Invert, целые примитивы, Develop и cleanup после сохранения итогов |
| Чат `01a16872-8149-7d53-a9e3-2764135e3a65`, сообщение `01a16877-05da-7ce2-a44f-ec8367a9dba6` | Контролы для макетов и шесть Accent modes, Neutral по умолчанию |
| Чат `01a162aa-83e9-76c3-a43f-de79c4cc4b54`, сообщения `01a164b7-76da-7e03-9087-92649801f83e`, `01a16561-6cb8-7531-8400-fcc8836838d0` | Surface как рабочая коллекция, flat picker, общий B/W foreground |
| Тот же чат, итог `msg_0796e44da7bba4da016ada3a0c70e881918dca453e472f8c20` | Оптимизация 7388 → 3816 была локальным прототипом, не выполненной миграцией |
| Чат `01a139b3-b024-7a22-871a-80e5711e46ea`, сообщения `01a162bf-bb42-7172-b6ff-be3ad25b18be`, `01a1641a-b22b-7371-aca7-2fe44f5abea9` | Свои подложки, адаптация neutral/secondary, общая светимость вместе с различимостью; отдельная проверка Glass/Invert |
| Чат `01a12514-c87a-7eb1-bab2-ea5da60178b1`, сообщение `01a127ae-5041-7ec1-98ec-d50e37249d56` | Surface меняет превью каталога; основной контент, история и инструкции остаются Content |

Заменены прежние 20 акцентов, запрет Accent modes, per-hue подпапки picker, Theme как основная дизайнерская коллекция, дробные native opacity primitives и старый Dark-only Inverted swap. Исторический файл `xRYNECwkEL2UISeHASLa31` и его Controls не являются текущим V2. Ранее сохранённые compatibility aliases не нужно переносить в пустой rebuild ради прежних привязок.

Develop до пересборки проверен координатором: 0.16.5, release `20261022T210536Z-c87c00b7f7f5`. Это baseline, а не результат этой консолидации. Новые counts, версии, ссылки и статус live указываются только по фактическим receipts.

## Восстановление и cleanup

Рабочий checkout этой задачи: `/Users/davidov/.codex/worktrees/8b2b/capacities-style`. Подробная локальная инвентаризация находится в ignored `artifacts/consolidation/`:

- `worktree-audit.md`, `worktree-inventory.json`, `branches.txt` — исходные деревья и Git-состояние.
- `source-deltas-828b-vs-8b2b.json`, `imported-files.json` — перенос новой реализации и удаление заменённых экспортов.
- `history-decisions.md` — расширенная история с thread/message IDs и указателями на evidence.
- `ignored-preserve-inventory.json`, `ignored-*.json` — исходные артефакты с путями и hashes.
- `backups/manifest.json` — source/artifact архивы, исходные пути и SHA-256; архивы `primary`, `397c`, `712e`, `828b`, `8b2b`, `d57a` хранят срез до консолидации.
- `backups/sloyui-v2-before-20261023.fig` — нативный Figma snapshot до очистки; координатор подтвердил целостность ZIP. SHA-256: `05bf9e37a1df9b99e6792a75a976720dbbf8cc7cc68c0c742db8b8cbd25490b8`.
- `figma-controls-source/` — исходные скрипты и receipts последнего набора контролов; `backups/397c-artifacts.tar.gz` — сохранённый оригинал.

Recovery-набор перенесён в `/Users/davidov/Backups/sloyui/20261023-consolidation`. SHA-256 всех 14 исходных архивов/манифестов (546 437 159 bytes) совпали. `all-refs.bundle` и отдельный `public-repository-refs.bundle` сохраняют обе Git-истории; `interface-refs.tar.gz` сохраняет уникальные референсы публичного checkout.

Перед удалением повторно сравнены текущие исходники с архивами: 397c — 542 файла, 712e — 541, 828b — 614, d57a — 541; новых или изменённых файлов не обнаружено. Ignored evidence также сверены по hash. Worktrees `397c`, `712e`, `828b`, `d57a` удалены. Primary checkout и активный `8b2b` сохранены; они нужны для основной рабочей копии и этого чата. Подтверждения — `pre-cleanup-source-check.json`, `pre-cleanup-evidence-check.json` и `backup-copy-receipt.json`.

## Объединение Git-истории

Публичный `origin/main` (`343db47`) оказался новой независимой историей с корнем `cb7f761`, тогда как старые worktrees основаны на `4540dbe`. Уникальные изменения публичной истории проверены отдельно: сохранены GitHub Issue/PR templates, `docs/github-tasks.md`, английские инструкции для агентов и default `Tabs.variant="segment"` с regression test. Старое исправление геометрии сегментов заменено более полной текущей реализацией v4; его код не накладывается повторно.

После ручного объединения исходников merge сохраняет обе ancestry без переписывания опубликованной истории. Ветки `codex/sloy-public-release` и `codex/segment-geometry` содержат эквивалентные деревья уже принятых squash-коммитов; их ancestry также сохраняется. Ветки с общим старым HEAD не содержали уникальных коммитов, но их незакоммиченные исходники и evidence сохранены архивами. Итоговый commit и live release записываются в verification/локальных receipts.

## Проверенный результат и дальнейшее обслуживание

- Native readback: 972 variables, девять коллекций, без лишних variables, дробных FLOAT и Opacity-коллекции; точный состав и SHA записаны в verification.
- Шесть страниц Figma, 26 component sets / 417 variants, 12 icons, семь text styles; проверены bindings, bounds и visual renders. Узкие Input/Select/Slider/NumberField/PropertyRow сохраняют редактируемые props без overflow. Prototype-поведение не выдаётся за проверенное.
- Light + Invert наследует Theme; независимые Accent, Density и nested Theme проверены в Figma/CSS. Custom использует точные Light/Dark RGB и отдельный проверяемый export.
- При следующем изменении generator запускайте canonical/native/custom verification, пересобирайте runtime/export вместе и сверяйте Figma readback. Не добавляйте новые hues или numeric primitives без отдельной потребности.
- Публикацию и browser acceptance фиксируйте в [verification.md](verification.md). Исторические counts ниже предыдущих выпусков не являются текущим контрактом.
