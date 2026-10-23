# Alpha layers — proposal

Статус: исследование от 23.10.2026, **не внедрено**. Актуальный native остаётся на 974 переменных. Предлагается объединить мягкие заливки штатных поверхностей; произвольный Custom сохраняет отдельный расчёт из точного RGB. Этот документ не меняет действующий [контракт поверхностей](surface-context.md).

## Что уже есть

Native Palette содержит 328 используемых красок: 104 opaque и 224 RGBA. Все accent Secondary/Tertiary уже используют alpha; Primary, нейтральные поверхности, основной neutral content и границы непрозрачны. Значения alpha принадлежат COLOR и кратны 1%; opacity слоя — 100%. Дробных FLOAT primitives нет.

Большая матрица возникает из разных pigment/alpha и foreground, рассчитанных для разных подложек. Сам перевод opaque → alpha не гарантирует сокращения числа переменных.

## Предлагаемый контракт

- Сохранить opaque `surface/bg`, stable black/white и primary normal/active с согласованным on-primary. Overlay получает определённый фон или защищённый материал. Custom сохраняет точный authored RGB.
- Объединить accent secondary/tertiary normal/active в один набор на каждую из двух локальных полярностей. В перспективе neutral block/control/disabled тоже могут стать alpha layers, но их значения ещё не подобраны и не входят в расчёт 669.
- Сохранить content, border и focus отдельными ролями. Foreground проверяется на всех составленных подложках. Универсальный процент прозрачности текста для любого фона не предполагается.
- Invert меняет весь локальный набор: opaque bg и полярность layer/content/border. Полупрозрачный чёрный поверх светлого фона не заменяет точный чёрный Invert.
- Normal/Active остаются отдельными paints. Disabled имеет собственные fill/content, без снижения opacity всего компонента. Hover/pressed сохраняют действующее отображение на Active до отдельного решения.
- Custom остаётся отдельным project scope из 75 COLOR variables. После изменения фона solver пересчитывает его целиком; native core не увеличивается. Figma не вычисляет новый foreground при ручной смене заливки.

## Измеренный кандидат

В эксперименте 24 accent soft roles берутся из Content/Standard соответствующей полярности и повторно используются на остальных штатных поверхностях. Остальные роли сохраняются. Та же дедупликация даёт **669 вместо 974 переменных: −305, или −31,3%**. Это изменение внешнего вида, а не точное сжатие прежних значений.

Все 5760 изменяемых текстовых пар проходят 4,5:1; минимум — 4,6895:1. Однако при проверке Normal/Active на 1440 сочетаниях с нейтральными подложками ограничения delta/contrast нарушаются в 72 случаях, против 35 у текущего native. Кандидат не прошёл приёмку состояний.

Повторное использование этих paints на Custom даёт следующие минимумы текста:

| Фон | Текущий exact-RGB solver | Общие alpha |
|---|---:|---:|
| `#F1EEF8` / `#221D2C` | 4,6006:1 | 4,6006:1 |
| `#E53E3E` | 4,5920:1 | 3,5707:1 |
| `#7955F6` | 4,5808:1 | 3,6887:1 |
| `#777777` | 4,5874:1 | 3,4524:1 |

Один RGBA не заменяет произвольную Surface matrix: `result = alpha × pigment + (1 − alpha) × background`. Смена background меняет результат и его контраст.

Воспроизведение из корня: `node artifacts/figma-refinement/alpha-study/study.mjs`. Скрипт использует сохранённые исходники и входной граф с SHA-проверкой; результат — `artifacts/figma-refinement/alpha-study/result.json`. Эти локальные материалы находятся в ignored artifacts и не поставляются в пакете.

## Приёмка перед миграцией

1. Подобрать общие paints и измерить весь набор Theme × Scheme × Surface, локальные block/control backing и вложения. Исправить нарушения state delta/contrast; показать Normal/Active визуально в Light/Dark/Invert.
2. Подтвердить текст ≥ 4,5:1 на реальных составленных заливках, focus ≥ действующего порога и различимость семейств/состояний. Primary/on-primary, neutral content и disabled проверить отдельно.
3. Custom проверить точным solver на светлых, тёмных, насыщенных и средних фонах. Невыполнимые ограничения выводить явно; не переносить гарантию штатных фонов на любой HEX или изображение.
4. Согласовать изменение appearance, затем обновить общий solver, canonical/native/runtime/Custom exports вместе. Сохранить публичные IDs и role paths, независимые режимы и целые primitives; удалить только недостижимые internals после проверки ссылок. До этого live Figma не мигрировать.

## Основания

[Radix Color](https://www.radix-ui.com/themes/docs/theme/color) разделяет solid и alpha, Light и Dark; alpha рассчитана на page background. [Radix Custom palettes](https://www.radix-ui.com/colors/docs/overview/custom-palettes) генерирует палитру по заданным исходным цветам и фону, а не обещает универсальную читаемость любого HEX.

[Исторический Perplexity snapshot, 15.10.2026](https://github.com/davidyich/reverseui/blob/efc4c5d71dd1ef59f95656d77297270999bb3e3c/libraries/perplexity/snapshots/2026-10-15/index.html) показывает отдельные opaque base/raised/underlay и alpha-слои для текста и tonal-состояний. Это архивный разбор сохранённого CSS, не проверка текущего Perplexity и не доказательство пригодности его процентов для Sloy UI.
