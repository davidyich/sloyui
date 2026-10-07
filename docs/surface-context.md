# Поверхности, состояния и полные палитры

CSS и Figma строятся из одной модели. Источники: `source/colors-light.json`, `source/colors-dark.json`, `source/surface-rules.json`. Правила подбора пар: `scripts/color-model.mjs`. Не меняйте сгенерированные файлы вручную.

```html
<html data-theme="light" data-borders="off">
  <section data-surface="canvas" data-accent="purple"
           style="background:var(--cap-surface-current)">
    <!-- Компоненты наследуют три независимых оси контекста. -->
  </section>
</html>
```

`data-theme` выбирает light/dark, `data-accent` — neutral или один из 17 акцентов, `data-surface` — реальную поверхность canvas/base/raised/floating. Атрибут поверхности наследуется, но сам не рисует произвольный контейнер. Card задаёт raised, SidebarPanel — canvas, окна и FloatingActionBar — floating. Portal сохраняет локальные тему, акцент, границы, скругления и тени, включая изменение открытой панели; его содержимое рассчитывается относительно floating.

| Поверхность | Light | Dark |
| --- | --- | --- |
| canvas | palette/gray/125 · #F1F0EF | palette/gray/950 · #111114 |
| base | palette/gray/50 · #FBFAF9 | palette/gray/900 · #1A1A1D |
| raised | palette/gray/0 · #FFFFFF | palette/gray/850 · #232326 |
| floating | palette/gray/0 · #FFFFFF | palette/gray/800 · #2D2D31 |

Floating — отдельный контекст для Menu, Select popup, Tooltip, Popover, Dialog, Drawer, Toast и FloatingActionBar. Локальные popup без портала тоже объявляют `data-surface="floating"`; вложенное содержимое не должно возвращать Raised при Floating-фоне. В Dark он светлее Raised, в Light сохраняет белую поверхность. Тень в Dark использует 10%/14% для контактного и рассеянного слоёв. Вложенные контролы получают пары Floating.

Нейтральный ButtonGroup по умолчанию использует отдельные канонические `group/background`, `group/hover`, `group/selected`, `group/pressed`, `group/prefix` и `group/text` для текущей поверхности. Normal, hover и pressed последовательно различаются не менее чем на 1.12:1 относительно предыдущей заливки; selected совпадает с hover, prefix — с normal. Текст на каждой заливке сохраняет контраст не менее 4.5:1. `color="inherit"` берёт локальный акцент, а явный цвет задаёт свой; в обоих случаях группа использует вторичную accent-пару текущей поверхности. `content/caption` предназначен для маленьких заголовков групп на чистой поверхности (10 px, 400, uppercase); не применяйте его к тексту внутри залитого контрола.

Заливки вторичных элементов подбираются из исходных растяжек по относительной яркости Y и контрасту относительно поверхности. Normal → hover → pressed последовательно темнеют в Light и светлеют в Dark. Текст стабилен между этими состояниями; контраст во всех парах ≥4.5:1. Нейтральный Primary — исключение: максимальный контраст в normal ослабевает на hover/pressed. Цвета не интерполируются. Небольшие различия яркости между акцентами обусловлены дискретными исходными ступенями.

| Назначение | CSS роли |
| --- | --- |
| Нейтральный контрол | `--cap-control-normal/hover/pressed/text` |
| Цветной вторичный элемент | `--cap-accent-normal/hover/pressed/text` |
| Залитое цветное действие | `--cap-accent-solid-normal/hover/pressed/text` |
| Яркий акцент выбора (contrast=false) | `--cap-accent-vivid-normal/hover/pressed/text` |
| Нейтральное основное действие | `--cap-action-normal/hover/pressed/text` |
| Недоступное состояние | `--cap-disabled-background/text` |
| Основной и вспомогательный текст | `--cap-content-primary/secondary/muted` |

Disabled использует непрозрачную нейтральную пару с читаемым текстом. Нативный disabled блокирует действия; у Tag отключаются отдельные кнопки выбора и удаления. Универсальному Tag передайте `disabled`; у статического IconBox допустим `aria-disabled`. Статические подписи и разделители не получают искусственные hover/pressed.

`data-borders="off|on"` управляет только декоративными границами. Геометрия и пары состояний не меняются. Используйте `--cap-panel-border` и `--cap-control-border`, а для значимых границ и фокуса — `--cap-border-strong` и `--cap-focus-ring`. `--cap-control-bg/active`, `--cap-accent-soft/bg/block/ink` остаются совместимыми aliases.

Card всегда рисует структурный контур толщиной `--cap-border-width` цветом `--cap-border-subtle`; он остаётся видимым при `data-borders="off"`, в том числе если Card Raised вложен в Raised-контейнер. Для других дочерних поверхностей с намеренно совпадающей ролью используйте `.cap-surface-boundary`. Не пытайтесь определять совпадение по вычисленному DOM-цвету: `data-surface` задаётся контекстом композиции. Контур не меняет тень и `outline` фокуса. Не назначайте `.cap-surface-boundary` автоматически сообщениям, тостам и комментариям: их декоративные оболочки следуют Borders Off/On. Если вложенные панели намеренно имеют одинаковую поверхность, структурный контур задаёт композиция через `className`.

Figma: Primitives / Value содержит palette, number, font. Две прежние группы el-h/el-w объединены в number/control-size. Theme имеет Light/Dark, Semantic — независимые Base/Canvas/Raised/Floating, Borders — Off/On. Задавайте параметры на родительском фрейме. Semantic ссылается на Theme, Theme — на Primitives; общие пары переиспользуются. Группы element и action содержат пары для каждого акцента, а source сохраняет 366 исходных ролей для сверки и скрыт из публикации. В веб-компонентах применяйте общие CSS-роли и локальный data-accent, а не прямые цвета палитры.

## Реакции и границы

Вложенные действия на цветной подложке используют `--cap-reaction-hover/pressed`: чёрный 4%/8% в Light, белый 6%/10% в Dark. Opacity хранится в `number/opacity`, alpha-нейтрали — в `alpha/black` и `alpha/white`. CSS пересчитывает их из числовых примитивов. В Figma RGBA-alpha не поддерживает ссылку на FLOAT: для редактируемой реакции привяжите отдельный слой к `reaction/base`, opacity — к `reaction/hover-opacity` или `reaction/pressed-opacity`. Минимальный контраст текста с реакцией — 4.51:1.

Строки меню, дерева, таблицы и RadioGroup с вложенными иконками/метками используют лёгкую `--cap-reaction-hover`, для pressed/selected — `--cap-reaction-pressed`; непрозрачная `--cap-control-hover` предназначена для самостоятельного контрола. Когда вложенный Tag/IconBox визуально совпадает с реакцией строки, сохраняйте структурную границу через `--cap-border-subtle`, независимо от Borders Off. Не меняйте акцентную пару дочернего элемента ради hover родителя.

Общая декоративная толщина — `number/border/width = 0.5`. Степени `border/subtle`, `default`, `strong`, `emphasis` зависят от поверхности. Роли panel/overlay/control и accent-outline выбирают оттенок объекта и состояния. Значимый focus сохраняет ширину 2 px и контраст ≥3:1. Отключение рамок сохраняет фокус и тени floating/popover/modal.

Тени: `data-shadow="soft" | "compact"` наследуется и переносится в портал. Soft — широкий мягкий blur по умолчанию; compact использует те же цвета и 55% blur. У CodeBlock auto при Borders On заливка прозрачна, поэтому он сохраняет контекст окружающей поверхности.

`Button` и `IconButton` с `variant="primary"` всегда используют нейтральные `--cap-action-normal/hover/pressed/text`, независимо от `data-accent`; `secondary` использует нейтральную control-пару. `accent` выбирает `--cap-accent-solid-normal/hover/pressed/text`, `accent-secondary` — мягкую `--cap-accent-normal/hover/pressed/text`. Включённые Checkbox, Radio и Switch используют локальную solid accent-пару; `Switch variant="neutral"` выбирает нейтральные action-роли. `contrast={false}` явно выбирает vivid; Slider сохраняет vivid по умолчанию. Знак, текст и бегунок используют парную text-роль без условий по теме. Выключенный Switch использует `--cap-control-text` на нейтральном треке; disabled всегда использует `--cap-disabled-background/text`.

## Контекст каталога

Островки preview, примеры и блок «Использование в коде» следуют выбранной поверхности. Заголовок каталога и панель параметров остаются на своей постоянной поверхности, независимо от переключателя образца.

У обеих Primary-пар (solid и vivid) text определяется фактическим контрастом normal-заливки к `gray/0` и `gray/1000`, а не темой или флагом contrast. Hover и pressed сохраняют этот цвет текста и контраст не ниже 4.5:1. Vivid выбирает исходные оттенки по каждой палитре, сохраняя более яркую заливку относительно solid.

`data-color="inherit"` не останавливает поиск локального акцента для портала: overlay использует ближайший конкретный data-accent/data-color у предка. Tooltip inverse меняет пару text/surface, сохраняя сами оси контекста.

Самостоятельные структурные разделители используют `--cap-divider-subtle/default/strong` и `--cap-number-divider-width` (1 px). Они наследуют `data-surface`, остаются видимыми при Borders Off и имеют минимальный контраст к поверхности 1.5/1.8/2.4:1. `--cap-divider-control` предназначен для нейтральной заливки контрола. Внутренние швы составных контролов тише: joined SplitButton использует 0.5 px и 22% парного text на solid-заливке (muted на остальных); FloatingActionBar использует 0.5 px `--cap-divider-panel`. На стыке рисуется только одна линия.

Длинные внутренние линии таблиц, панелей и заголовка CodeBlock используют более тихую `--cap-divider-panel` и `--cap-border-width` (0.5 px). Роль наследует поверхность независимо от Borders и имеет минимальный контраст 1.15:1 в Light, 1.25:1 в Dark. Header CodeBlock рисует ровно одну такую линию; декоративные внешние рамки сохраняют прежние роли и толщину 0.5 px.
