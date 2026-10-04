---
version: alpha
name: Capacities UI
description: Independent UI kit with explicit surface context, local accents and optional borders.
colors:
  bg-back: "#f0f0f0"
  bg-base: "#fafafa"
  bg-front: "#ffffff"
  bg-el: "#d7d7d7"
  bg-el-subtle: "#e9e9e9"
  bg-button-primary: "#343434"
  text-primary: "#242424"
  text-secondary: "#525252"
  text-subtle: "#606060"
  text-button-primary: "#ffffff"
  border-base: "#e5e5e5"
  border-front: "#e5e5e5"
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

Реконструированный дизайн для интерфейсов с коллекциями объектов. Версия 0.3 использует спокойные заливки без декоративных рамок по умолчанию; границы доступны как отдельная настройка. Разделяйте боковую навигацию, основное содержимое и всплывающие панели поверхностями. Каталог содержит отдельную страницу каждого из 59 компонентов: `#ComponentName`.

## Colors

Различайте фоновый слой, основную панель и всплывающую поверхность с помощью `canvas`, `base` и `raised`. `data-surface` явно описывает реальный фон; `--cap-surface-current` даёт его текущую заливку. Нейтральные контролы используют `--cap-control-bg/hover/active`, цветные подложки — общие accent-роли. Контраст не определяется чтением DOM или автоматическим анализом CSS-фона. Primary-кнопка использует нейтральную инверсию текста и фона. Цветовые семейства применяйте к типам объектов, тегам и содержимому информационных блоков.

## Themes

Light/Dark и локальный Accent независимы. Базовый граф Figma хранит 12 фиксированных ступеней Neutral, 12 общих Accent Variables в 18 модах и 24 роли Appearance в Light/Dark: всего 48 Variables. Runtime дополнительно учитывает `data-surface` и `data-borders`, пересчитывая нейтральные заливки, мягкие акценты и второстепенный текст. Эти правила описаны в `source/surface-rules.json` и не входят в базовый граф Figma. Для 0.3 подготовлены локальные файлы; реальный документ Figma не обновлялся.

Ниже — основные поверхности и роли в контексте `base`. YAML выше показывает нейтральный Light/base с `data-borders="off"`; значения смешанных заливок округлены до sRGB HEX. Это не замена runtime-переменных.

| Role | Light | Dark |
| --- | --- | --- |
| surface-canvas | #f0f0f0 | #101010 |
| surface-base | #fafafa | #181818 |
| surface-raised | #ffffff | #242424 |
| content-primary | #242424 | #fafafa |
| content-muted (base) | #606060 | #ababab |
| border-default | #e5e5e5 | #343434 |
| action-solid | #343434 | #e5e5e5 |

Акцентные роли text/ink/solid/solid-hover/on-solid ссылаются на выбранную шкалу. Мягкие soft/bg/block смешиваются с текущей поверхностью, а border учитывает выбранный режим границ. Не создавайте отдельный semantic token для каждого оттенка. Статусы success/warning/danger/info имеют фиксированный смысл и не меняются вместе с цветом объекта.

## Typography

Используйте sans для элементов интерфейса и code для фрагментов кода. Для обычных контролов применяйте шкалу sm, для основного текста — base. Заголовки отделяйте размером и весом; метаданные оформляйте меньшей шкалой.

## Layout

Стройте отступы от базового spacing. Располагайте действия строки справа, тип объекта — слева от названия. Длинные списки сохраняйте прокручиваемыми и доступными с клавиатуры. ActionBar, ButtonGroup и SplitButton разделяют шкалу size; размер задаёт внешнюю высоту группы, включая её внутренние отступы. Вложенная группа может выбрать другой размер, а содержимое popup его не наследует.

## Elevation & Depth

`data-borders="off"` — вид по умолчанию: декоративные границы прозрачны, панели и контролы отделяются заливкой. `on` возвращает границы и уменьшает плотность нейтральных заливок. Геометрия контролов не меняется. Focus-visible и ошибки сохраняют собственные контуры независимо от режима.

Используйте `--cap-panel-border` для панелей и `--cap-control-border` для контролов. Добавляйте тень всплывающим меню и диалогам. Portal переносит theme/accent/borders, но выбирает собственную поверхность `raised`, чтобы контраст содержимого соответствовал фону окна. Статические `border/default` и `border/strong` остаются базовыми цветами графа, а не глобальным переключателем рамок.

## Shapes

Используйте small для тегов и компактных обозначений, base для кнопок и полей, xl для карточек и панелей. Иконки типов оформляйте через IconBox.

## Components

Стройте формы через Field или FloatingField и контролы набора. Select/Popover/Dialog/Drawer имеют собственные поверхности; hidden native Select сохраняет HTML-форму. Для операций над объектом используйте ObjectCard или CollectionRow; для неинтерактивных групп — Card. Поддерживайте состояния загрузки, недоступности, ошибки и пустого результата. Для мелких читаемых подписей используйте доступную роль text-muted набора.

## Motion and responsive behavior

Контекст поверхностей — `docs/surface-context.md`. Общий контракт поведения — `docs/behavior.md`: 120/180/260 ms, opacity/transform, reduced motion, 12 px viewport gutter, 44 px touch targets. ScrollArea ограничивает scroll локальным контейнером. Краевые маски открывают существующий фон только со сторон реального overflow. `scrollbar="auto" | "hidden"` управляет видимостью полосы; wheel/touch/keyboard сохраняются.
