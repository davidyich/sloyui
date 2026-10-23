# Sloy UI V2 — native colors and project backgrounds

Актуальная native-библиотека использует шесть акцентов: blue, green, orange, red, pink, purple. Neutral обязателен и существует отдельно. Числа геометрии целые; прозрачность native-красок хранится внутри COLOR, без коллекции Opacity и переменных процентов.

## Native library

`native-graph.json` содержит 972 переменные в девяти коллекциях. Публичные `V2 · Surface` (86 ролей), `V2 · Accent` (11 ролей), Density, Radius и Borders предназначены для макетов. Palette, Theme и Scheme содержат исходные цвета и служебные маршруты. Palette включает только 327 используемых красок: 104 непрозрачные и 223 RGBA. Режимы Theme — Light/Dark; Scheme — Standard/Dimmed; Surface — Shell/Workspace/Content/Overlay/Invert. Accent содержит Neutral и шесть оттенков.

Выбирайте цвет по роли: `surface/bg`, `surface/block`, `surface/{primary,secondary,tertiary}/<hue>-normal` и соседний `-active`, `content/{primary,secondary}/<hue>`, `content/on-primary`, `content/on-bright-primary`, `border/<hue>`. Нейтральные пары находятся в тех же группах. Для компонентов используйте Accent: локальный режим наследуется независимо от Theme и Surface. Hover/pressed акцентного компонента выбирают Active. Alpha принадлежит краске; opacity слоя остаётся 100%.

Invert создаёт чёрную область в Light и белую в Dark вместе с согласованными текстом, контролами и границами. Внешняя Theme сохраняется. Glass остаётся защищённым runtime-материалом и не входит в пять native-поверхностей.

```sh
node figma/token-system-v4/build.mjs
node figma/token-system-v4/verify.mjs
node figma/color-system-v2/build-native.mjs
node figma/color-system-v2/verify-native.mjs
```

`native.css` сопровождает граф и объявляет каждый CSS token из native code syntax. Корень использует `.sloy-native`, режимы задаются независимыми `data-native-theme`, `data-native-scheme`, `data-native-surface`, `data-native-accent`, `data-native-density`, `data-native-radius`, `data-native-borders` с именами в нижнем регистре. Вложенные области наследуют остальные оси. Совместимые `--cap-*` aliases включены для основных цветовых ролей; основной web runtime поставляется через обычный пакет кита.

Проверка native-графа разрешает 1720 точных сравнений контекстов, измеряет 6000 текстовых пар на составленных подложках и проверяет отсутствие дробных FLOAT, циклов, пропавших ссылок и недостижимых переменных. Локальная проверка не подтверждает живой импорт Figma.

## Exact custom backgrounds

Произвольный HEX требует отдельного расчёта. Figma смешивает alpha с подложкой, но не запускает solver при ручной смене заливки фрейма. Запускайте команды из корня репозитория после `npm ci`: `export-custom.mjs` импортирует соседние модули редактора, color engine и JSON-данные. Скачанный исходник `.mjs` сам по себе не является автономным генератором. Генерируйте отдельную область проекта из точных Light/Dark фонов:

```sh
node figma/color-system-v2/export-custom.mjs --light '#F1EEF8' --dark '#221D2C' --name 'Project' --out artifacts/custom-project
node figma/color-system-v2/verify-custom.mjs artifacts/custom-project/graph.json
```

Команда создаёт `graph.json`, `tokens.css`, `verification.json` и `import.js`. Последний содержит готовый Figma Plugin API script для запуска в исполнителе plugin-кода: он создаёт или обновляет только коллекцию `Sloy UI · Custom · Project`. Основные 972 переменные не меняются. Project scope содержит 75 COLOR variables с режимами Light/Dark, точными RGB подложек и целыми процентами alpha. В нём есть neutral, шесть акцентов, foreground, border и focus. Смена фона требует нового запуска команды и применения всего согласованного scope.

При недостижимом контрасте текста команда завершится с ошибкой, запишет конкретные пары в отчёт и не оставит `import.js`. Ограничения различимости заливок и состояний на средних тонах выводятся отдельно даже при читаемом тексте. Картинка или текстура требуют защищённого материала и проверки реальных подложек. Нельзя считать один HEX гарантией для произвольных пикселей под элементом.

[Custom example](../guide/custom-example.json) содержит реально рассчитанные #F1EEF8 / #221D2C для страницы гайда. Его 788 независимых текстовых проверок проходят с минимумом 4.6006:1. Гайд показывает эти значения как результат отдельного project export.

## Shared generator and compatibility bridge

Канонический `../token-system-v4/source.json` задаёт шесть именованных палитр и нейтральную шкалу. Внутри solver сохраняются плотные шкалы: шесть × 41 + 41 neutral + black/white = 289 непрозрачных цветов. Native compiler выгружает только нужные ступени и RGBA. Общие методы `editor/model.mjs` и `editor/recommended-fills.mjs` используются Palette Lab, runtime и project exporter.

`build.mjs` сохраняет историческую структуру bridge для совместимых preview/Palette Lab; это отдельный полный граф, который не следует импортировать поверх компактной native-библиотеки. Для обновления его `graph.json`, `resolved.json` и `tokens.css` выполните `node figma/color-system-v2/build.mjs`. Старые `figma-*.js`, атласы и reference-прототипы документируют прежнюю генерацию и не являются рецептом повторного создания актуальной библиотеки.

[Palette Lab](palette-editor.html), [контракт редактора](editor/README.md), [практический гайд](designer-guide.md), [исследование](system-research.md). Пользовательские сохранённые палитры редактора остаются редактируемыми; ограничение шести акцентов относится к стандартной библиотеке.
