# Sloy UI V2 — native colors and project backgrounds

Актуальная native-библиотека использует шесть акцентов: blue, green, orange, red, pink, purple. Neutral обязателен и существует отдельно. Числа геометрии целые; прозрачность native-красок хранится внутри COLOR, без коллекции Opacity и отдельных FLOAT-процентов для цвета.

## Native library

`native-graph.json` содержит публичные `V2 · Surface`, `V2 · Accent`, Density, Radius и Borders для макетов. Palette, Theme и Scheme содержат только используемые краски и служебные маршруты. Compiler сравнивает эквивалентные порядки Theme/Scheme, выбирает меньшее число внутренних переменных и записывает решение в `native.routingOptimization`; публичные роли и их имена сохраняются. Текущие количества берите из отчёта `verify-native.mjs`. Режимы Theme — Light/Dark; Scheme — Standard/Dimmed; Surface — Shell/Workspace/Content/Overlay/Invert. Accent содержит Neutral и шесть оттенков.

Выбирайте цвет по роли: `surface/bg`, `surface/block`, `surface/{primary,secondary,tertiary}/<hue>-normal` и соседний `-active`, `content/{primary,secondary}/<hue>`, `content/on-primary`, `content/on-bright-primary`, `border/<hue>`. Нейтральные пары находятся в тех же группах. Для компонентов используйте Accent: локальный режим наследуется независимо от Theme и Surface. Hover/pressed акцентного компонента выбирают Active. Alpha принадлежит краске; opacity слоя остаётся 100%.

`V2 · Borders` по умолчанию On. Пустой слой `.Border` рисует обводку literal 0.5 px и единственный привязывает opacity к целым процентам `border/opacity`: On 100, Off 0; фактический `node.opacity` равен 1/0. Masters и instances наследуют режим. Это исключение не распространяется на текст, иконки или компонент целиком; runtime `border/width` остаётся отдельным контрактом.

Invert создаёт чёрную область в Light и белую в Dark вместе с согласованными текстом, контролами и границами. Внешняя Theme сохраняется. Glass остаётся защищённым runtime-материалом и не входит в пять native-поверхностей.

```sh
node figma/token-system-v4/build.mjs
node figma/token-system-v4/verify.mjs
node figma/color-system-v2/build-native.mjs
node figma/color-system-v2/verify-native.mjs
node figma/color-system-v2/verify-native.mjs --compare-routing
```

`native.css` сопровождает граф и объявляет каждый CSS token из native code syntax. Корень использует `.sloy-native`, режимы задаются независимыми `data-native-theme`, `data-native-scheme`, `data-native-surface`, `data-native-accent`, `data-native-density`, `data-native-radius`, `data-native-borders` с именами в нижнем регистре. Вложенные области наследуют остальные оси. Совместимые `--cap-*` aliases включены для основных цветовых ролей; основной web runtime поставляется через обычный пакет кита.

Проверка native-графа сравнивает точные RGBA контекстов Surface/Accent, измеряет текстовые пары на составленных подложках и проверяет отсутствие дробных FLOAT, циклов, пропавших ссылок и недостижимых переменных. `--compare-routing` проверяет исходники в памяти, сохранность публичных имён/types/scopes и отсутствие роста числа переменных; экспорты не перезаписываются. Локальная проверка не подтверждает живой импорт Figma.

`sync-native.mjs` обновляет существующую библиотеку с сохранением публичных IDs. Команды выводят Plugin API script для исполнителя Figma. Сначала выполните `plan`, затем `create <palette|theme|scheme> <offset>` и `values <collection-key> <offset>` порциями по 50 переменных (Surface — по 25). План показывает количества, IDs устаревших переменных, ограниченные образцы имён и IDs всех страниц. Результат cleanup возвращает компактные списки IDs и количества.

Перед очисткой выполните `scan-page <pageId>` отдельно для каждой страницы. Каждый script переключает только указанную страницу и возвращает квитанцию с прямыми ссылками на устаревшие внутренние переменные, включая невидимые узлы и смешанные текстовые заливки. Сохраните все результаты JSON-массивом в файл, затем создайте `cleanup-plan <receipts.json>` и проверьте его результат; `cleanup <receipts.json>` удаляет только недостижимые Palette/Theme/Scheme. Между сканированием и очисткой не меняйте холст. Очистка требует квитанции всех текущих страниц с тем же fileKey, SHA графа и набором устаревших IDs, повторно проверяет aliases и локальные стили и прекращается до удаления при оставшихся ссылках. Публичные переменные этот updater не создаёт и не удаляет.

## Exact custom backgrounds

Произвольный HEX требует отдельного расчёта. Figma смешивает alpha с подложкой, но не запускает solver при ручной смене заливки фрейма. Запускайте команды из корня репозитория после `npm ci`: `export-custom.mjs` импортирует соседние модули редактора, color engine и JSON-данные. Скачанный исходник `.mjs` сам по себе не является автономным генератором. Генерируйте отдельную область проекта из точных Light/Dark фонов:

```sh
node figma/color-system-v2/export-custom.mjs --light '#F1EEF8' --dark '#221D2C' --name 'Project' --out artifacts/custom-project
node figma/color-system-v2/verify-custom.mjs artifacts/custom-project/graph.json
```

Команда создаёт `graph.json`, `tokens.css`, `verification.json` и `import.js`. Последний содержит готовый Figma Plugin API script для запуска в исполнителе plugin-кода: он создаёт или обновляет только коллекцию `Sloy UI · Custom · Project`. Основная native-библиотека не меняется. Project scope содержит 75 COLOR variables с режимами Light/Dark, точными RGB подложек и целыми процентами alpha. В нём есть neutral, шесть акцентов, foreground, border и focus. Смена фона требует нового запуска команды и применения всего согласованного scope.

При недостижимом контрасте текста команда завершится с ошибкой, запишет конкретные пары в отчёт и не оставит `import.js`. Ограничения различимости заливок и состояний на средних тонах выводятся отдельно даже при читаемом тексте. Картинка или текстура требуют защищённого материала и проверки реальных подложек. Нельзя считать один HEX гарантией для произвольных пикселей под элементом.

[Custom example](../guide/custom-example.json) содержит рассчитанные #F1EEF8 / #221D2C для страницы гайда. Актуальные измерения находятся в его `audit` и `verification.json` соответствующего project export; генерация примера не подтверждает обновление живого гайда Figma.

## Shared generator and compatibility bridge

Канонический `../token-system-v4/source.json` задаёт шесть именованных палитр и нейтральную шкалу. Внутри solver сохраняются плотные шкалы; native compiler выгружает только нужные ступени и RGBA. Общий алгоритм `editor/alpha-recipes.mjs` использует пять ограниченных групп: Light, Light/Neutral, Dark, Glass/Light и Glass/Dark. `alphaRecipeFamily` отделяет приглушённые светлые основы с OKLab L < 0.985; одна краска на всех обычных поверхностях не требуется. `recommended-fills.mjs` задаёт цели, а `model.mjs` связывает расчёт с Palette Lab и экспортами. Эти группы не добавляют публичных режимов Surface. Полный контракт — [alpha-recipes.md](../../docs/alpha-recipes.md).

`build.mjs` сохраняет историческую структуру bridge для совместимых preview/Palette Lab; это отдельный полный граф, который не следует импортировать поверх компактной native-библиотеки. Для обновления его `graph.json`, `resolved.json` и `tokens.css` выполните `node figma/color-system-v2/build.mjs`. Старые `figma-*.js`, атласы и reference-прототипы документируют прежнюю генерацию и не являются рецептом повторного создания актуальной библиотеки.

[Palette Lab](palette-editor.html), [контракт редактора](editor/README.md), [практический гайд](designer-guide.md), [исследование](system-research.md). Пользовательские сохранённые палитры редактора остаются редактируемыми; ограничение шести акцентов относится к стандартной библиотеке.
