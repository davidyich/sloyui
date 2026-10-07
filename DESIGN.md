---
version: alpha
name: Capacities UI
description: Independent UI kit with explicit surface context, local accents and optional borders.
colors:
  bg-back: "#f1f0ef"
  bg-base: "#fbfaf9"
  bg-front: "#ffffff"
  bg-el: "#dcdbda"
  bg-el-subtle: "#ecebea"
  bg-button-primary: "#5c5959"
  text-primary: "#232326"
  text-secondary: "#454447"
  text-subtle: "#565354"
  text-button-primary: "#ffffff"
  border-base: "var(--cap-panel-border)"
  border-front: "var(--cap-overlay-border)"
typography:
  sans:
    fontFamily: Inter
  code:
    fontFamily: Overpass Mono
  xxs:
    fontFamily: Inter
    fontSize: ".6875rem"
    lineHeight: ".875rem"
  xs:
    fontFamily: Inter
    fontSize: ".75rem"
    lineHeight: "1rem"
  sm:
    fontFamily: Inter
    fontSize: ".84375rem"
    lineHeight: "1.2rem"
  base:
    fontFamily: Inter
    fontSize: ".9375rem"
    lineHeight: "1.325rem"
  lg:
    fontFamily: Inter
    fontSize: "1.125rem"
    lineHeight: "1.625rem"
  xl:
    fontFamily: Inter
    fontSize: "1.25rem"
    lineHeight: "1.75rem"
  2xl:
    fontFamily: Inter
    fontSize: "1.5rem"
    lineHeight: "2rem"
  3xl:
    fontFamily: Inter
    fontSize: "1.875rem"
    lineHeight: "2.25rem"
rounded:
  small: "0.3rem"
  base: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
spacing:
  base: "0.25rem"
components:
  button-primary:
    backgroundColor: "{colors.bg-button-primary}"
    textColor: "{colors.text-button-primary}"
    rounded: "{rounded.base}"
    typography: "{typography.sm}"
  panel:
    backgroundColor: "{colors.bg-base}"
    rounded: "{rounded.xl}"
---

## Overview

Реконструированный дизайн для интерфейсов с коллекциями объектов. Версия 0.3 использует спокойные заливки без декоративных рамок по умолчанию; границы доступны как отдельная настройка. Разделяйте боковую навигацию, основное содержимое и всплывающие панели поверхностями. Каталог содержит отдельную страницу каждого компонента: `#ComponentName`.

## Colors

Различайте фоновый слой, основную панель, приподнятую и плавающую поверхности с помощью `canvas`, `base`, `raised` и `floating`. `data-surface` явно описывает реальный фон; `--cap-surface-current` даёт его текущую заливку. Нейтральные контролы используют `--cap-control-bg/hover/active`, цветные подложки — общие accent-роли. Контраст не определяется чтением DOM или автоматическим анализом CSS-фона. Primary-кнопка использует нейтральную инверсию текста и фона. Цветовые семейства применяйте к типам объектов, тегам и содержимому информационных блоков.

## Themes

Тема, поверхность, акцент и границы независимы в CSS. В Figma: Primitives — значения; Theme — пары Light/Dark; Semantic — роли с Base/Canvas/Raised/Floating; Borders — Off/On. Semantic → Theme → Primitives; общие для поверхностей пары переиспользуются. Исходные палитры сохранены; нейтральные alpha-цвета служат реакциями внутри цветных элементов. Группы kit нет.

| Поверхность | Light | Dark |
| --- | --- | --- |
| canvas | gray/125 · #F1F0EF | gray/950 · #111114 |
| base | gray/50 · #FBFAF9 | gray/900 · #1A1A1D |
| raised | gray/0 · #FFFFFF | gray/850 · #232326 |

Для вторичных элементов используются роли normal/hover/pressed/text; для disabled — отдельные нейтральные background/text. Выбор учитывает относительную яркость Y исходных RGB, монотонную смену состояния и контраст текста не ниже 4.5:1. Это ближайшие реальные ступени, поэтому яркость разных акцентов не обязана совпадать абсолютно. Статусы имеют фиксированный смысл и не меняются вместе с акцентом объекта.

## Typography

Используйте sans для элементов интерфейса и code для фрагментов кода. Для обычных контролов применяйте шкалу sm, для основного текста — base. Заголовки отделяйте размером и весом; метаданные оформляйте меньшей шкалой.

## Layout

Стройте отступы от базового spacing. Располагайте действия строки справа, тип объекта — слева от названия. Длинные списки сохраняйте прокручиваемыми и доступными с клавиатуры. ActionBar, ButtonGroup и SplitButton разделяют шкалу size; размер задаёт внешнюю высоту группы, включая её внутренние отступы. Вложенная группа может выбрать другой размер, а содержимое popup его не наследует.

## Elevation & Depth

`data-borders="off"` — вид по умолчанию: декоративные границы прозрачны, панели и контролы отделяются заливкой. `on` возвращает границы. Геометрия контролов не меняется. Focus-visible и ошибки сохраняют собственные контуры независимо от режима.

Используйте `--cap-panel-border` для панелей и `--cap-control-border` для контролов. Добавляйте тень всплывающим меню и диалогам. Portal переносит theme/accent/borders, но выбирает собственную поверхность `raised`, чтобы контраст содержимого соответствовал фону окна. Статические `border/default` и `border/strong` остаются базовыми цветами графа, а не глобальным переключателем рамок.

## Shapes

Используйте small для тегов и компактных обозначений, base для кнопок и полей, xl для карточек и панелей. Иконки типов оформляйте через IconBox.

## Components

Стройте формы через Field или FloatingField и контролы набора. Select/Popover/Dialog/Drawer имеют собственные поверхности; hidden native Select сохраняет HTML-форму. Для операций над объектом используйте ObjectCard или CollectionRow; для неинтерактивных групп — Card. Поддерживайте состояния загрузки, недоступности, ошибки и пустого результата. Для мелких читаемых подписей используйте доступную роль text-muted набора.

## Motion and responsive behavior

Контекст поверхностей — `docs/surface-context.md`. Общий контракт поведения — `docs/behavior.md`: 120/180/260 ms, opacity/transform, reduced motion, 12 px viewport gutter, увеличенные основные touch-контролы. ScrollArea ограничивает scroll локальным контейнером. Краевые маски открывают существующий фон только со сторон реального overflow. `scrollbar="auto" | "hidden"` управляет видимостью полосы; wheel/touch/keyboard сохраняются.
