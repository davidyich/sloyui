# Цвета в макете: практический гайд

В [SloyUI V2](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp) выбирайте обычные цвета из **V2 · Surface**. Theme и Scheme переключают контекст фрейма; их внутренние переменные не нужно назначать слоям вручную. Имена ниже сверены с `native-graph.json`; runtime и CSS могут использовать другие совместимые пути.

Актуальные страницы:

- [Start · 0.17.0](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=164-498) — карта использования.
- [Colors](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=161-4037) — роли, пары и Invert.
- [Controls](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=162-468) — экземпляры кнопок, полей, переключателей и слайдеров.
- [Components](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=163-2) — Tag, Card, EmptyState, NavItem и Alert.
- [Layouts](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=164-2) — Project board и Settings.
- [Custom backgrounds](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=161-4299) — точные пользовательские фоны и явный пересчёт.

Ссылки ведут на созданные материалы; фактически проверенный объём и публикация записываются отдельно в [verification.md](../../docs/verification.md).

## Начните с внешнего фрейма

1. Задайте **V2 · Theme → Light / Dark** и **V2 · Scheme → Standard / Dimmed**.
2. Выберите **V2 · Surface** по назначению области и назначьте фону `surface/bg` из этой коллекции.
3. Для наследуемых контролов задайте **V2 · Accent**: Neutral по умолчанию, Blue, Green, Orange, Red, Pink или Purple.
4. Оставьте вложенные экземпляры на **Auto**. Меняйте только ту ось, которую действительно нужно переопределить.
5. Density, Radius и Borders переключайте независимо. Совпадающие названия режимов разных коллекций сами по себе не связывают их.

В native Figma есть ровно пять Surface modes:

| Surface | Назначение |
| --- | --- |
| Shell | Оболочка приложения |
| Workspace | Рабочий список или боковая панель |
| Content | Документ, форма, основное содержимое |
| Overlay | Меню, popover или диалог |
| Invert | Полный локальный контекст противоположной полярности |

Для тёмной панели в Light задайте панели **Surface → Invert**, оставив Theme на Auto. Меняются фон, локальный блок, текст, границы и контролы; внешняя Theme остаётся Light. В Dark тот же Invert создаёт светлую область. Invert независим от Scheme.

Карточка внутри Content обычно сохраняет Surface родителя и рисует `surface/block`. Не переключайте её на другой Surface только ради заливки. Glass — защищённый полупрозрачный материал **runtime/Palette Lab**, а не шестой режим native Surface. Custom также не является постоянно добавленным native Surface mode.

## Выберите роль

Поддерживаются neutral и шесть акцентов: `blue`, `green`, `orange`, `red`, `pink`, `purple`. В семантической группе они лежат плоским списком; оттенок и состояние находятся в имени, например `surface/secondary/blue-normal` и `surface/secondary/blue-active`.

| Задача | Точный путь в V2 · Surface |
| --- | --- |
| Фон области | `surface/bg` |
| Локальный блок | `surface/block` |
| Сильная заливка | `surface/primary/neutral-normal` или `surface/primary/blue-normal` |
| Мягкая заливка | `surface/secondary/neutral-normal` или `surface/secondary/blue-normal` |
| Тихая заливка контрола | `surface/tertiary/neutral-normal` или `surface/tertiary/blue-normal` |
| Усиленное состояние заливки | Замените `-normal` на `-active` |
| Основной нейтральный текст | `content/primary/neutral` |
| Второстепенный нейтральный текст | `content/secondary/neutral` |
| Промежуточный текст | `content/tertiary/neutral` |
| Подпись и placeholder | `content/muted/neutral` |
| Текст на мягкой синей заливке | `content/primary/blue`; второстепенный — `content/secondary/blue` |
| Текст на Primary | Общий `content/on-primary`, точно чёрный или белый |
| Disabled | `surface/disabled` + `content/disabled/neutral` |
| Нейтральная граница | `border/subtle`, `border/default`, `border/strong` |
| Граница нейтрального контрола | `border/neutral-normal`, `border/neutral-hover`, `border/neutral-pressed` |
| Акцентная граница | `border/blue` и аналогичные пути пяти других акцентов |
| Focus в native Figma | Смена semantic fill / цвета ручки без отдельного контура |
| Противоположный нейтральный текст | `content/inverted/neutral` |
| Фиксированные полюса | `stable/black`, `stable/white` |

Для других акцентов заменяйте `blue` на поддерживаемое имя. Не создавайте новые пути на основании похожего runtime-имени. В этой native коллекции нет публичных `reaction/*`, `alpha/*` или `surface/primary/invert-*`: Invert задаётся режимом Surface.

Primary непрозрачен. Secondary/Tertiary уже содержат рассчитанную alpha. На мягкой заливке используйте Content того же hue, а не on-primary. Общий `content/on-primary` следует теме и поверхности; не заменяйте его постоянным белым.

`content/on-bright-primary` сохранён как отдельная роль для особого светлого Primary, но не нужен в обычных рецептах ниже. Служебные `content/on-primary-blue`, `-green`, `-orange`, `-red`, `-pink`, `-purple` остаются маршрутами для Accent; они скрыты из обычного picker. Для ручного назначения текста Primary используйте общий `content/on-primary`.

## Рецепты

Все пути в таблице относятся к **V2 · Surface**. Роль цвета задаёт внешний вид; обработчики и поведение определяет компонент.

| Элемент | Заливка | Текст / иконка | Дополнение |
| --- | --- | --- | --- |
| Основная синяя кнопка | `surface/primary/blue-normal` | `content/on-primary` | Состояние — `surface/primary/blue-active` |
| Основная нейтральная кнопка | `surface/primary/neutral-normal` | `content/on-primary` | Состояние — `surface/primary/neutral-active` |
| Мягкое синее действие или Tag | `surface/secondary/blue-normal` | `content/primary/blue` | При необходимости `border/blue`; статичный Tag остаётся Normal |
| Карточка | `surface/block` | `content/primary/neutral`, подпись `content/muted/neutral` | Surface наследуется; структурная граница `border/subtle` |
| Input / Select | `surface/tertiary/neutral-normal` | Значение `content/primary/neutral`, placeholder `content/muted/neutral` | Нейтральная граница 0.5 px; Focus меняет заливку без отдельного контура |
| Выбранная строка | `surface/secondary/blue-active` | `content/primary/blue` | Добавьте маркер выбора, а не только цвет |
| Нейтральный Alert | `surface/tertiary/neutral-normal` | Нейтральный текст | Только статусный индикатор получает blue / green / orange / red |
| Мягкая ошибка | `surface/secondary/red-normal` | `content/primary/red` | Текст объясняет причину; цвет не заменяет сообщение |
| Меню / диалог | `surface/bg` с Surface = Overlay | `content/primary/neutral` | `border/default`; контекст Overlay задаётся на оболочке |

Neutral — исходный выбор для обычных полей, карточек и поддерживающих действий. Акцент обозначает действие или выбор. Статус сохраняет смысл независимо от выбранного Accent: red — ошибка/опасность, green — успех, orange — предупреждение, blue — информация.

## Готовые controls и web mapping

При работе с экземплярами меняйте Accent на содержащем фрейме. Figma Appearance и Accent вместе определяют web variant; одно название Primary не означает полное совпадение API.

| Figma Appearance | Accent | Web variant |
| --- | --- | --- |
| Primary | Neutral | `primary` |
| Primary | Цветной | `accent` с соответствующим `data-accent` |
| Secondary | Neutral | `secondary` |
| Secondary | Цветной | `accent-secondary` с соответствующим `data-accent` |
| Outline | Любой | `outline`, нейтральный |
| Ghost | Любой | `ghost`, нейтральный |
| Danger | Любой | `danger`, фиксированная красная пара |

IconButton использует ту же схему. Outside/Inside у полей соответствует `labelPlacement="outside"|"inside"`. State-варианты показывают внешний вид, а не работающий Prototype. Полное соответствие композиции и web API — в [Controls README](../controls/README.md).

## Alpha и числовые примитивы

Opacity компонента и его родителя оставляйте **100%**. Единственное исключение — пустой слой `.Border`: integer Borders 0/100% включает только его границу 0.5 px, не текст или заливку контрола. Рассчитанная alpha находится в RGBA краски; дополнительное снижение opacity ослабляет также текст, иконки и focus. Проверяйте результат после смешивания с фактическим фоном, включая block и усиленные состояния.

Runtime хранит одну непрозрачную растяжку на hue и точные промежуточные вычисления. Native Palette содержит только используемые RGBA-цвета с alpha в целых процентах. Native FLOAT-примитивы — целые числа; дробные opacity/ratio/intermediate FLOAT и отдельная Opacity-коллекция в native не экспортируются. Не добавляйте промежуточные RGB или числовые примитивы вручную.

Focus в Figma меняет semantic fill или цвет ручки, без чёрного контура. Выбор обозначается дополнительно маркером или подписью. Disabled использует собственную нейтральную пару и отключённое действие. Active не заменяет ни focus, ни disabled.

## Точный пользовательский фон

Изменение HEX заливки фрейма не пересчитывает переменные. Для точных произвольных RGB Light/Dark выполните отдельный project export **из полного репозитория с зависимостями генератора**, а не из одного скачанного файла:

```sh
node figma/color-system-v2/export-custom.mjs --light '#F1EEF8' --dark '#221D2C' --name 'Project' --out artifacts/custom-project
```

Команда создаёт `graph.json`, `tokens.css`, `verification.json` и, при успешной проверке, `import.js`. Текущий project export содержит **одну отдельную коллекцию с 75 COLOR-переменными и режимами Light/Dark**. Имя коллекции — `Sloy UI · Custom · Project`; исходные HEX сохраняются точно. Основной native graph не меняется.

Примените `import.js` к нужному файлу: он создаёт или обновляет только эту именованную project-коллекцию. Назначайте её роли вместо core Surface только внутри соответствующей пользовательской области. Задайте режим Light/Dark **этой project-коллекции** на содержащем фрейме; одноимённая Theme другой коллекции не переключает её автоматически. Дочерние элементы оставьте на Auto. Не смешивайте пересчитанную заливку с прежним текстом из другого контекста.

В project-экспорте используются свои рассчитанные пары, например `surface/secondary/purple-normal` + `content/primary/purple`, а Primary blue — `surface/primary/blue-normal` + **`content/on-primary-blue`**. Здесь парный foreground относится именно к запрошенному RGB-фону; правило общего core `content/on-primary` не подменяет эту проектную пару.

При новом фоне пересчитайте и примените весь scope снова. Проверяйте текст, fill/background, Normal/Active и focus после композиции. Посмотрите `verification.json`: результат генерации не подтверждает native-импорт или визуальную проверку. На странице [Custom backgrounds](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=161-4299) показан реальный отдельный экспорт для `#F1EEF8` / `#221D2C`; его данные сохранены в `figma/guide/custom-example.json`.

## Проверка макета

- Обычные цвета назначены из V2 · Surface; фон области использует `surface/bg`, карточка — `surface/block`.
- Вложенные элементы наследуют Auto; локальный Invert не переопределяет Theme.
- Проверены обе темы, обе схемы, мягкие пары, состояния, focus и disabled.
- У слоя нет дополнительного общего opacity; alpha проверена на реальной подложке.
- Пользовательский RGB имеет отдельный согласованный project export; его режим и парные роли выбраны явно.

Внутренние Palette/Theme/Scheme остаются видимы в менеджере переменных как источники и маршруты, но не служат конкурирующими picker для обычного дизайна. Density, Radius и Borders отвечают за геометрию независимо от цвета. Подробный контракт и границы совместимости — в [surface-context.md](../../docs/surface-context.md).

### Обводки

На внешнем фрейме выберите `V2 · Borders → On / Off`; по умолчанию включено On. У вложенных компонентов оставьте Auto. Режим управляет границами контролов, карточек, навигационных элементов и всплывающих панелей. Толщина — 0.5 px. Текст, иконки и заливки не меняют общую opacity; Focus не добавляет внешний контур. [Примеры On/Off в Figma](https://www.figma.com/design/E6Qw912qUU0h9JDplYzQsp?node-id=200-7).
