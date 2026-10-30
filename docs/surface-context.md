# Токены, поверхности и состояния

Используйте компоненты кита и семантические роли. Один генератор задаёт Figma и web runtime: `figma/token-system-v4/source.json` → `graph.json` → runtime и native export. После изменения источника выполните `npm run tokens`; сгенерированные CSS и JSON вручную не меняйте. Карта native-экспорта и состояние пересборки — в [Figma README](../figma/README.md).

В Figma V2 основной цветовой picker — **Surface**. Theme, Scheme и Palette служат маршрутизации и не конкурируют с ним в обычном выборе цвета. Внутри `surface/primary`, `surface/secondary` и `surface/tertiary` лежит плоский список: neutral первым, затем blue, green, orange, red, pink и purple; Normal/Active соседствуют. Другие семейства не входят в текущую поставку по умолчанию. Старые имена могут сохраняться только как совместимые входы web API.

## Выберите слой

| Слой | Назначение |
| --- | --- |
| Palette | Runtime: общие непрозрачные растяжки. Native: только реально используемые RGBA-цвета с alpha в целых процентах |
| Primitives | Только нужные исходные размеры и параметры шрифтов; native FLOAT — целые числа |
| Theme · Light / Dark | Внешняя тема; не переключается ради локальной тёмной области |
| Scheme · Standard / Dimmed | Схема полных контекстов областей |
| Surface | Публичные семантические цвета, контекст области и состояния |
| Accent | Neutral по умолчанию; Blue, Green, Yellow, Orange, Red, Pink, Purple для наследуемых контролов |
| Density · Default / Compact | Адаптивные и постоянные размеры |
| Radius · None / Compact / Default / Rounded | Независимые скругления 0 / 4 / 8 / 16 px |
| Borders · Off / On | Независимая декоративная граница |

`figma/color-system-v2/build-native.mjs` создаёт `native-graph.json`. Native Surface имеет режимы Shell, Workspace, Content, Overlay и Invert; Glass остаётся runtime-материалом и отдельно проверяется в Palette Lab. Custom применяется через явный пересчёт, не дополнительный постоянно включённый mode.

Точное разделение внутренних маршрутов native-графа определяет exporter; не добавляйте новые коллекции ради повторяющихся aliases. Сырые значения core-графа принадлежат только Palette и Primitives: пигменты — Palette, геометрия и шрифты — Primitives. Остальные core-коллекции используют ссылки между коллекциями; runtime-композиция также ссылается на пигмент и числовую alpha. Общие конечные роли сохраняют назначение даже при совпадающих значениях. Отдельных публичных Semantic и Components нет.

Runtime-граф может хранить точные промежуточные числа и совместимые opacity aliases для вычислений. **Native Figma не экспортирует дробные FLOAT-примитивы alpha, ratios или промежуточных формул.** Прозрачность native хранится в RGBA COLOR со значением alpha в целых процентах; runtime сохраняет точные composed COLOR aliases. Не заменяйте её opacity целого слоя: это изменяет также текст, иконки и фокус. Проверяйте итог после смешивания с реальной подложкой.

`src/tokens/runtime-v4.json` содержит runtime-граф, а `src/tokens/token-contract.json` — CSS-соответствия и совместимость. Native rebuilt IDs не обязаны совпадать с историческими. Старые импортеры не применяются к актуальной библиотеке. [Отчёт проверки](verification.md) отдельно фиксирует генерацию, native readback, браузер и выпуск; одно не подтверждает другое.

## Задайте назначение области

Поверхность описывает назначение, а не глубину вложенности. Локальный блок не создаёт новую поверхность.

| Surface | Назначение | CSS | Совместимые значения |
| --- | --- | --- | --- |
| Shell | Оболочка приложения, общая навигация | `shell` | `page`, `base` |
| Workspace | Список, боковая панель, рабочая область | `workspace` | `inset`, `canvas` |
| Content | Документ, редактор, основной контент | `content` | `panel`, `raised` |
| Overlay | Меню, popover, диалог | `overlay` | `floating` |
| Invert | Контрастная область: чёрная в Light, белая в Dark | `invert` | — |
| Glass | Защищённая полупрозрачная область над текстурой | `glass` | — |

Задайте `data-surface` на области. Класс `.cap-surface` рисует её фон. `--cap-surface-bg` и совместимый `--cap-surface-current` выбирают `Theme/surface/bg`. Для блока внутри области используйте `--cap-surface-block`. Сохраните Surface родителя, чтобы вложенные secondary-объекты получили пары этой области.

```html
<div class="cap-surface" data-surface="shell">
  <aside class="cap-surface" data-surface="workspace">…</aside>
  <main class="cap-surface" data-surface="content">
    <section style="background:var(--cap-surface-block)">…</section>
  </main>
</div>
```

Card, ObjectCard, ContentCard и FileCard сохраняют Surface родителя и рисуют block. Card subtle рисует bg; elevated добавляет тень. Явное `data-surface` допустимо, если карточка создаёт область с другим назначением. Card сохраняет структурную `.cap-surface-boundary` при Borders Off. Не определяйте контекст по цвету DOM и не добавляйте структурную границу каждому контролу.

`data-surface-scheme="standard|dimmed"` выбирает полные контексты областей: bg, block, secondary, content и border. Standard в Dark строит Shell → Workspace → Content от тёмного к светлому; Dimmed делает Shell светлее Workspace, а Content темнее. Overlay имеет собственный фон в каждой схеме. В Light меняется Workspace; Shell и белые Content/Overlay сохраняются. `inverted` — совместимое имя Dimmed. Invert и Glass от этой оси не зависят.

Схемы воспроизводят согласованные Standard и Dimmed. Целевые значения фоновых областей хранятся в `figma/token-system-v4/source.json` → `surfaceSchemes`. Генератор выбирает существующие нейтральные ступени совместно, сохраняя различимость и контраст; дополнительные цвета поверхностей в Palette не создаются. Не реализуйте схему перестановкой Workspace/Content или сменой одного фона без остальных ролей.

## Выберите цвет объекта

Таблица ниже показывает runtime-имена Theme. Native picker использует соответствующие роли Surface с плоскими именами из native export; не ищите runtime hue-path как отдельную публичную коллекцию.

| Задача | Runtime Theme | CSS совместимых компонентов |
| --- | --- | --- |
| Нейтральное основное действие | `surface/primary/neutral-*` | `--cap-action-normal/hover/pressed/text` |
| Акцентное основное действие | `surface/primary/<hue>-*` | `--cap-accent-solid-normal/hover/pressed/text` |
| Нейтральный secondary | `surface/secondary/neutral-*` | `--cap-control-normal/hover/pressed/text` |
| Акцентный secondary | `surface/secondary/<hue>-*` | `--cap-accent-normal/hover/pressed/text` |
| Контент оттенка | `content/<hue>` | `--cap-accent-text` |
| Контент на primary | Neutral: `content/on-primary`; акцент: `content/on-primary-<hue>` | Парная text-роль действия |
| Текст и иконки | `content/primary/secondary/tertiary/muted/caption` | `--cap-content-*` |
| Граница оттенка | `border/<hue>-normal/hover/pressed` | Контекстные hue-роли |
| Постоянный цвет | `stable/neutral/*`, `stable/accent/*`, `stable/alpha/*` | `--cap-stable-*` |
| Alpha по теме | `adaptive/alpha/base-*`, `contrast-*` | `--cap-adaptive-alpha-*` |

`*` у заливок означает normal, hover или pressed. В одной группе лежат neutral и семь поддерживаемых акцентов. Secondary — группа заливок в surface; content и border стоят отдельно. Сочетайте заливку, текст и границу одного оттенка. Primary остаётся непрозрачным. Secondary и Tertiary используют пигмент и alpha составного цвета; native export не создаёт для каждого процента FLOAT-переменную. Контраст проверяется после композиции поверх bg, block и нейтральных состояний; сравнение текста с RGB пигмента без alpha неверно. Accent hover и pressed выбирают один active-токен, neutral сохраняет три состояния. Общий подбор Secondary/Tertiary учитывает ограниченную группу подложек, выбранную по локальной полярности, светлоте и материалу; яркие и приглушённые светлые основы не обязаны использовать одну краску. Glass рассчитывается тем же алгоритмом в своей защищённой группе на обеих крайних подложках. Насыщенность, порядок и расстояние состояний оцениваются после смешивания с фактическими нейтральными слоями; alpha хранится отдельно от пигмента. После выбора заливок генератор подбирает существующую нейтральную ступень focus с контрастом не менее 3.2:1 — не обесцвечивайте заливки ради прежнего focus-токена.

`data-accent` выбирает локальный оттенок и наследуется отдельно от поверхности. У Tag и IconBox отсутствие color наследует акцент. gray — совместимое имя neutral. Chip и выбранные значения MultiSelect остаются нейтральными. Button primary/secondary всегда нейтральны; accent/accent-secondary используют локальную пару. Смена темы не должна менять назначение действия.

Вложенные действия на secondary-контейнере используют готовые состояния той же пары. Не осветляйте pressed дополнительным alpha-слоем: это снижает контраст текста.

Проверяйте secondary на реальном фоне области и на block. Нейтральные content-роли применяйте на нейтральных подложках; на цветной secondary-заливке используйте парный content/<hue>.

Для подписи используйте content/muted. tertiary — отдельный промежуточный уровень. caption предназначен для маленьких заголовков групп на фоне области, а не текста на залитом контроле. Disabled использует нейтральную пару и блокирует действие; цвет не заменяет disabled, aria-disabled и описание ошибки.

Две alpha-шкалы используют проценты 3, 5, 8, 10, 12, 15, 16, 20, 24, 30, 32, 40, 48, 60, 64, 72, 80, 88, 92 и 96. `stable/alpha/white-*` и `black-*` сохраняют пигмент и процент; `adaptive/alpha/base-*` использует white в Light и black в Dark, `contrast-*` — обратную пару. Adaptive зависит только от Theme и не меняется от Surface, включая Invert. Для локальных контролов Invert используйте его контекстные surface/content роли, а не глобальную alpha-шкалу. Пример CSS: `var(--cap-adaptive-alpha-base-88)`. Runtime alpha-роли соединяют непрозрачный пигмент с точной прозрачностью. Native exporter оставляет только используемые RGBA COLOR с alpha в целых процентах, без дробных FLOAT-примитивов и отдельной дублирующей коллекции Opacity. Дополнительных alpha-растяжек в Palette не создавайте.

Stable сохраняет RGBA при смене темы. Примеры: `--cap-stable-neutral-white`, `--cap-stable-accent-blue`. Полупрозрачный stable-цвет выглядит по-разному на разных фонах. Проверяйте контраст в месте применения; постоянство цвета его не гарантирует.

## Разделите масштабируемое и постоянное

Density меняет только adaptive. Базовая единица u равна 4 px в Default и 3 px в Compact. Генератор вычисляет `round(k × u)` в целых пикселях. Высота контрола равна фиксированной высоте строки плюс двум вертикальным отступам. В Figma режим выбирает ссылку на готовый числовой примитив; переменные не исполняют формулу.

| Задача | Роль | Default → Compact |
| --- | --- | --- |
| Внутренний отступ | `--cap-padding-md` | 12 → 9 px |
| Промежуток в строке | `--cap-gap-inline-md` | 8 → 6 px |
| Промежуток между группами | `--cap-gap-stack-md` | 16 → 12 px |
| Высота контрола md | `--cap-control-height-md` | 32 → 30 px |
| Постоянный отступ | `--cap-fixed-space-8` | 8 → 8 px |
| Иконка md | `--cap-icon-size-md` | 20 → 20 px |

Для padding берите adaptive/padding, для gap — adaptive/gap, для контролов — adaptive/control. Fixed содержит постоянные отступы, размеры иконок и область нажатия 44 px. Шрифт и высота строки не уменьшаются вместе с плотностью. Внутренние и внешние отступы выбирайте по назначению; не умножайте весь компонент через transform:scale.

Существующие `--cap-space-*` и компонентные CSS-роли остаются совместимыми ссылками. В новой композиции предпочитайте понятные роли padding/gap/fixed. Параметр size выбирает размер компонента внутри текущей Density. Локальная CodeBlock.density описывает вариант компоновки и не заменяет глобальный контекст.

```html
<div data-density="compact" data-radius="rounded">
  <section style="padding:var(--cap-padding-lg);gap:var(--cap-gap-stack-md)">…</section>
  <section data-density="default">…</section>
</div>
```

## Настройте скругления и границы

Radius независим от Density. База None / Compact / Default / Rounded равна 0 / 4 / 8 / 16 px. Роли sm / md / lg / xl используют коэффициенты 0.5 / 1 / 1.5 / 2. Для вложенных контролов сначала задаётся внутренний радиус; радиус оболочки прибавляет фактический отступ и границу. `data-corner-shape="round|squircle"` наследуется независимо, включая порталы. Squircle использует native `corner-shape` там, где он доступен; иначе остаётся обычное скругление. Множитель отступа 1.84 для squircle — приближение из tailwindcss-concentric; для круглого угла он равен 1. Все производные длины округляются до целых пикселей. Явные circle и pill сохраняют форму.

В None убирайте добавки, которые нужны только из-за угла. Умножайте такие добавки на `--cap-radius-enabled`. Не убирайте содержательные отступы, фокус или область нажатия. FloatingActionBar сохраняет одинаковый внутренний отступ во всех положительных режимах Radius; Density меняет его независимо. Прямые присоединённые группы используют нулевые внешние промежутки и полную область реакции действия.

Borders Off скрывает декоративную обводку; web Borders On рисует нейтральные контуры с 55% непрозрачности, акцентные Secondary — с 25%. Структурные границы и focus не зависят от этого коэффициента. Используйте `--cap-panel-border` и `--cap-control-border` для её цвета. Структурные разделители остаются видимыми. Контур фокуса включён по умолчанию; `data-focus-ring="off"` явно скрывает его, `data-focus-ring="on"` включает внутри вложенной области. Всплывающие окна наследуют ближайший режим. При Off клавиатурный фокус остаётся функциональным, но его контур не виден. Для фокуса используйте `--cap-focus-ring` и отдельную толщину 2 px; ошибка также имеет текст и aria-invalid. Не заменяйте смысловую границу настройкой Borders.

Реакции строк и вложенных действий могут использовать отдельные reaction-роли. Они не заменяют контекстные secondary-пары. Тени `data-shadow="soft|compact"` остаются независимым совместимым параметром; не обрезайте их границей scroll viewport.

## Сохраните контекст

Theme, Accent, Surface, SurfaceScheme, Density, Radius и Borders наследуются независимо. Задавайте только ось, которую нужно переопределить. В Figma оставляйте остальные режимы дочернего фрейма на Auto. В HTML не копируйте все атрибуты на каждого ребёнка.

Порталы читают ближайшие настройки и отслеживают их изменение. Меню, Select popup, Tooltip, Popover, Dialog, Drawer и Toast устанавливают Overlay; остальные оси сохраняются. `data-color="inherit"` не останавливает поиск акцента. Не возвращайте внутренний контент всплывающего окна к Content без отдельной причины.

В каталоге переключатель Surface управляет только областями превью: песочницей, образцами компонентов и основ. Основная область всех страниц всегда Content. История, инструкции и API-таблицы наследуют Content и не получают выбранную поверхность. Навигация остаётся Workspace, панель параметров — Overlay. Тема, плотность, скругления и границы изменяют каталог целиком. Проверяйте открытый popup после смены режима, а не только его триггер.

## Выберите шрифт по роли

Все исходные параметры шрифтов находятся в Primitives/font. `family/base = Medeo Sans`, `heading = Medeo Sans`, `code = Medeo Mono`, `pair = Medeo Mono`. CSS-роли: `--cap-font-base`, `--cap-font-code`, `--cap-font-heading`, `--cap-font-pair`. Для интерфейса используйте base и веса 400/500/600. При замене гарнитуры меняйте значение, сохраняя имя роли. Типографика не зависит от Density.

Граф, короткий гайд и автономная интерактивная схема доступны на странице «Система токенов». Используйте её для проверки конкретной цепочки aliases и выбранного контекста. Сначала измените источник, затем проверьте граф, соберите runtime и осмотрите компоненты в браузере.

## Акценты и Palette Lab

[Palette Lab](../figma/color-system-v2/editor/README.md) и runtime используют один `generatePalette` / `generateContext` из `figma/color-system-v2/editor/model.mjs`. Канонический источник хранит правила и точечные `accentSystem.overrides` по имени акцента. Запуск `npm run tokens` переносит их в graph, CSS и совместимые экспорты. `figma/token-system-v4/palette-contexts.json` даёт Palette Lab точные bg и neutral-подложки того же графа для обеих схем; не подставляйте старый v2 `resolved.json`.

Каждый из семи акцентов по умолчанию имеет одну непрозрачную шкалу по 41 ступени, как нейтральная шкала. Имена имеют вид `blue/01…41`; отдельные solid, soft, muted, Dark, foreground и surface-reference запрещены. Hue сохраняется; gamut mapping уменьшает chroma. Theme, Surface и назначение выбирают ступень общей шкалы и при необходимости alpha; runtime compatibility может хранить её через Opacity aliases. Alpha-текст проверяется после наложения на каждую допустимую подложку. Устаревшие имена акцентов допускаются только как совместимые входы: не создавайте для них дополнительные исходные палитры или режимы выбора.

В рекомендованном режиме Palette Lab использует общий алгоритм с пятью ограниченными группами: Light, Light/Neutral, Dark, Glass/Light и Glass/Dark. `alphaRecipeFamily` отделяет приглушённые светлые основы с OKLab L < 0.985 от ярких; Glass остаётся защищённой группой соответствующей локальной полярности. Внутри выбранной группы подбор совместно измеряет основы областей, block, нейтральные контролы, disabled и разрешённое вложение. Общие Secondary/Tertiary заменяют отдельные `on-layer/...` расчёты внутри этой группы, но не обязаны быть одной краской на всех Surface. Группа — внутренняя политика solver, не новый Surface mode; вложенный block сохраняет контекст области. Совместимые пути могут сохраняться как aliases. Точный контракт — [alpha-recipes.md](alpha-recipes.md).

Смешивание идёт в sRGB: `result = alpha × pigment + (1 − alpha) × backing`; контраст измеряется по линейной относительной светимости уже смешанного результата. Подбираются существующий пигмент и alpha из целых процентов, затем совместно выбираются Normal/Active и порядок Tertiary → Secondary. Ограничения читаемости, видимости, насыщенности и мягкого изменения состояния важнее количества пигментов. Текст подбирается отдельно по всему набору составленных фонов; alpha заливки не применяется к тексту.

Нейтральные block, control и disabled тоже используют alpha. Disabled имеет собственную тихую заливку и читаемый content. Primary/on-primary, основы областей и stable black/white сохраняют определённые цвета. Glass использует отдельное семейство того же расчёта и проверяется поверх обеих крайних подложек; произвольная прозрачная поверхность над изображением не получает такую гарантию автоматически.

Рецепт проверяет ограниченную композицию, а не бесконечную стопку полупрозрачных слоёв. Для новой области задайте Surface и нарисуйте `surface/bg`; для локальной карточки сохраните контекст. Не наслаивайте Active поверх Normal — замените paint. На цветной подложке используйте парный content того же hue. Custom требует точного RGB и пересчёта всего проектного scope; после ручной смены заливки Figma не пересчитывает контраст.

The default `primaryForegroundPolicy: theme` selects exact white in Light local polarity and black in Dark. Select the closest shared-ramp Normal/Active pair that passes the configured text contrast with one ink on both states. Invert uses its effective local polarity; Custom regenerates the whole pair. Explicit light/dark/custom foreground settings and tint remain authored overrides. `primaryForegroundPolicy: contrast` opts into joint black/white selection when preserving requested fill brightness matters more than the default ink preference. Neutral uses `content/on-primary`; native chromatic fills use matching `content/on-primary-<hue>`, and mode-bound controls use `Accent/on-primary`. These semantic routes reuse the two endpoint pigments. The default Orange seed is authored as `#F56918` (OKLCH hue about 44 degrees) to keep its white-compatible fill more saturated than the previous `#F07818` seed; white text still requires a darker orange than the seed. `content/<hue>` and `content/secondary/<hue>` remain the two accent text strengths for soft fills; `content/inverted` is opposite neutral content.

## Пользовательская подложка

Custom — явный запрос к генератору: задайте фон Light/Dark, пересчитайте пары и примените согласованный экспорт. Изменение произвольного CSS background или заливки фрейма само по себе не пересчитывает переменные. Компоненты не определяют Surface по DOM-цвету и не анализируют фон в Figma. При новом фоне повторно проверьте bg/block, нейтральные и акцентные заливки, content, border, focus и состояния; обновите их вместе. Custom в Palette Lab сохраняет точный RGB подложки и рассчитывает нейтральные и акцентные пары относительно него. Project export ниже создаёт отдельный набор рассчитанных COLOR-ролей и не меняет основной native preset.

```sh
node figma/color-system-v2/export-custom.mjs --light '#F1EEF8' --dark '#221D2C' --name 'Project' --out artifacts/custom-project
```

Команда создаёт `graph.json`, `import.js`, `tokens.css` и `verification.json`. `import.js` создаёт или обновляет только именованную project-коллекцию с режимами Light/Dark; проверьте её имена и результат перед применением в другом проекте. `verification.json` проверяет расчёт, но не подтверждает выполнение native-импорта или визуальную проверку. [Генерируемый пример](../figma/guide/custom-example.json) сохраняет точные запрошенные фоны и готовые RGBA-роли для страницы Custom backgrounds; основной native graph остаётся прежним.

Адаптация через alpha — смешивание краски с объявленной подложкой. Она не гарантирует контраст на произвольном изображении. Для Glass проверяются защитный слой и крайние подложки; для Custom проверяется выбранная подложка после пересчёта. Не выдавайте автоматическое смешивание браузера за автоматическую смену токенов.

## Invert и прозрачные материалы

Для чёрной области в Light или белой в Dark задайте `data-surface="invert"`. Это полноценный контекст с собственными bg, block, content, neutral и accent-парами. `data-theme` остаётся прежним. Invert независим от SurfaceScheme; переключение Standard/Dimmed сохраняет его контекст. Всплывающие элементы устанавливают Overlay и сохраняют внешнюю тему.

Glass использует белую основу 88% в Light и чёрную 80% в Dark. В runtime точная прозрачность участвует в вычислении; native COLOR использует RGBA из Palette с alpha в целых процентах, без дробного FLOAT-примитива. Такая основа ограничивает влияние любой RGB-текстуры. Проверка считает композицию над чёрной и белой подложками, поверх блока и нейтральных состояний. Blur смягчает изображение, но не заменяет эту защиту. Не снижайте opacity без нового расчёта. Для прозрачной области рисуйте blur и единственную защитную заливку статичным absolute/pseudo-слоем, а интерактивный контент размещайте выше как соседний слой; `backdrop-filter` не должен охватывать анимированные hover/focus-потомки. Вложенные блоки окрашивайте `surface/block` с сохранением Surface.

Пример с текстурой, Glass и Invert находится на странице «Поверхности и границы». Текстура принадлежит композиции; токены описывают защитные заливки и контент. Подход соответствует разделению материала, tint и читаемого контента в [Fluent Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic). Инверсные роли отделены от темы, как пары `bg-inverse` и `text-inverse` в [архиве Polaris React](https://github.com/Shopify/polaris-react-archive/blob/main/documentation/guides/migrating-from-v10-to-v11.md).

### Native Figma state and boundary rule

Native boundaries are literal 0.5 px. Keep FLOAT variables integral; the empty `.Border` layer may bind only its own opacity to the existing integer Borders 0/100 percent switch. Text, icons and component fills stay at opacity 1. Native Focus uses semantic fill/handle changes without an extra outline. Disabled uses `surface/disabled` with `content/disabled/neutral`. Secondary is a quiet tint below Primary, with explicit lower visibility and upper prominence bounds after compositing. Preserve hue identity without anchoring to the older dense Light chroma/lightness pair; Tertiary remains quieter. See [alpha recipes](alpha-recipes.md).

Native Figma `V2 · Borders` defaults to On. Set On/Off on the containing frame; masters and instances inherit Auto. `border/opacity` aliases whole numbers 100/0 because Figma variable-bound opacity is a percentage; actual layer opacity must read 1/0. It controls every applicable control, card, navigation item and overlay boundary, including Outline and Error. Text, icons, selection marks and layout-only wrappers do not get independent contours. This native adapter preserves the runtime `border/width` contract. Общий расчёт и границы применения alpha описаны в [alpha-recipes.md](alpha-recipes.md).
