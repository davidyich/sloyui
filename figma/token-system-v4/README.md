# Sloy UI — единый граф цветов и геометрии

Канонический источник web runtime и двух Figma-представлений. Текущий [SloyUI v2](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp/SloyUI-v2) использует [компактный native export](../color-system-v2/README.md) с публичными Surface/Accent. Плотный runtime-граф и исторический v2 bridge не являются входом для этой native-библиотеки. Ранее созданный [Sloy UI в Figma](https://www.figma.com/design/xRYNECwkEL2UISeHASLa31/SloyUI?node-id=0-1) использует коллекции v4. [Гайд](guide.md) объясняет выбор роли, [интерактивная схема](explorer.html) показывает реальные aliases. Проверка живой библиотеки и публикации фиксируется отдельно в [verification](../../docs/verification.md).

## Источник и сборка

`source.json` хранит neutral-правила, поверхности, геометрию и `accentSystem`: общие правила + точечные overrides по имени акцента. Accent-математика едина с [Palette Lab](../color-system-v2/editor/README.md): `generatePalette` и `generateContext` в `editor/model.mjs`, преобразования OKLCH в `color-engine.mjs`.

```sh
npm run tokens
```

Сборка создаёт `graph.json`, `tokens.css`, автономный explorer, `src/tokens/runtime-v4.json`, runtime CSS и совместимые выгрузки. Проверка графа независимо считает контраст композиции, alias-типы, все оси и формулы размеров. Диагностика — в игнорируемом `artifacts/token-system-v4/`.

## Runtime-коллекции

Ниже описан вычислительный граф для web runtime. Native compiler создаёт отдельный `../color-system-v2/native-graph.json`: 972 переменные, 327 используемых красок Palette, публичные Surface/Accent и пять Surface-режимов без Glass. Native RGBA хранит alpha в самом COLOR и не создаёт Opacity или переменных процентов.

- **Palette**: 289 непрозрачных цветов: 6 именованных шкал × 41 ступень, 41 нейтральная ступень, black и white. Шкалы не зависят от темы или назначения; дополнительные исходные цвета для ролей запрещены.
- **Primitives**: исходные числа, проценты и параметры шрифтов.
- **Opacity**: числовые aliases процентов с областью `COLOR_OPACITY`. Применяются к цветовому alias.
- **Theme · Light / Dark**: публичные surface/content/border/stable роли.
- **Surface · Shell / Workspace / Content / Overlay / Invert / Glass**: полный локальный контекст.
- **SurfaceScheme · Standard / Dimmed**: полные контексты регионов по Figma-референсам в обеих темах. Inverted — совместимое имя Dimmed.
- **Density, Radius, Borders**: независимые оси геометрии.

В runtime оттенки являются именованными ролями, а не modes. Native Accent отдельно предоставляет Neutral и шесть режимов акцента для наследования компонентов. Все семантические значения — cross-collection aliases. В каноническом runtime Palette не создавайте копии оттенков с разной alpha: прозрачность принадлежит семантической роли. Native compiler материализует только используемые RGBA. Полупрозрачный цвет имеет форму `{color:{alias:"Palette/..."},opacity:{alias:"Opacity/..."}}`; числа хранятся только в Primitives. Figma и CSS используют те же пигменты и проценты.

## Роли

| Задача | Путь Theme |
| --- | --- |
| Фон области / локальный блок | `surface/bg`, `surface/block` |
| Основное действие | `surface/primary/<hue>-normal`, `-hover`, `-pressed` |
| Мягкие заливки | `surface/secondary/<hue>-*`, `surface/tertiary/<hue>-*` |
| Контент акцента | `content/<hue>`, `content/secondary/<hue>` |
| Контент на primary | `content/on-primary/<hue>`; neutral — `content/on-primary` |
| Нейтральный контент | `content/primary/secondary/tertiary/muted/caption/inverted` |
| Границы | `border/default/subtle/strong/focus`, `border/<hue>-*` |
| Постоянный цвет | `stable/neutral/*`, `stable/accent/*`, `stable/alpha/*` |
| Alpha по теме | `adaptive/alpha/base-*`, `adaptive/alpha/contrast-*` |

У акцентов два фактических состояния: normal и active. Совместимые имена hover/pressed используют active. Нейтральные контролы сохраняют три отдельных состояния. Контент Primary определяется политикой акцента, затем заливка адаптируется к контрасту минимум 4.5:1. Не выбирайте белый/чёрный по максимальному отношению без учёта этой политики.

Канонические оттенки — blue, green, orange, red, pink, purple; neutral хранится отдельно. Прежние названия разрешаются через `accentSystem.legacyAliases` в `source.json`, скрываются из новых меню и не создают дополнительных исходных шкал.

Для материала доступны 20 ступеней прозрачности 3–96%: 40 stable white/black и 40 adaptive base/contrast ролей. Adaptive меняет только пигмент по глобальной Theme: base white/black, contrast black/white в Light/Dark. Surface не влияет на эти шкалы. Runtime публикует `--cap-stable-alpha-white-<percent>` и `--cap-adaptive-alpha-base-<percent>` (и обратные пары). Для контрола Invert используйте его контекстные роли.

## Invert и Glass

`data-surface="invert"` создаёт чёрную область в Light и белую в Dark. Внутри согласованы контент, neutral, primary, secondary, tertiary и border. Theme не меняется. SurfaceScheme не меняет Invert; совместимое имя Inverted выбирает Dimmed.

Glass рисует белый 88% в Light и чёрный 80% в Dark. Контраст проверяется на крайних чёрной/белой подложках и на локальных neutral-слоях. Это позволяет использовать изображение или текстуру под областью без цвета-паразита в пигменте. При снижении opacity гарантии требуют нового расчёта. Размытие улучшает восприятие, но не гарантирует читаемость. Пример доступен на странице каталога «Поверхности и границы».

Portal сохраняет внешнюю Theme и другие оси, затем устанавливает Overlay. Локальное Invert не превращается во вложенную Dark тему.

## Геометрия

Density использует `round(k × u)`, u=4/3 px, только для adaptive. Fixed-отступы, типографика, иконки и 44 px touch-target сохраняются. Radius использует базы 0/4/8/16 и коэффициенты sm/md/lg/xl; Borders управляет только декоративной границей. Фокус и структурные разделители независимы.

Runtime-адаптер в `scripts/runtime-v4-model.mjs` / `runtime-v4-css.mjs` сохраняет `--cap-*` API и прежние названия четырёх поверхностей. Компоненты используют контекстные роли напрямую. Полный v2 compatibility bridge не должен перезаписывать компактную native-библиотеку: её importer использует `native-graph.json` с cross-collection aliases и RGBA Palette. Для отдельного проекта [Custom exporter](../color-system-v2/README.md#exact-custom-backgrounds) сохраняет точные Light/Dark RGB и пересчитывает согласованный scope. Ручная смена заливки фрейма не запускает solver.
