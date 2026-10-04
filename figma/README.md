# Figma Variables · V2

Модель генерируется из тех же данных, что CSS: `src/tokens/figma-modes.json`. Три коллекции с 48 Variables:

- **Neutral**: 12 grayscale-цветов, один Base mode.
- **Accent**: 12 Variables `accent/1…12`, 18 модов: neutral и 17 акцентов. Neutral mode ссылается на Neutral collection.
- **Appearance**: 24 Variables в Light/Dark. Роли нейтральных поверхностей ссылаются на Neutral, цветные роли — на Accent.

Установите Appearance mode на экран, Accent mode — на компонент/контейнер. Дочерние элементы наследуют оба. Цвет роли нельзя копировать hex-значением: привязывайте fill/text/stroke к Appearance Variables. Это сохраняет оба независимых переключателя.

## Импорт

1. В Figma Desktop откройте целевой Design-файл.
2. Plugins → Development → Import plugin from manifest → `figma/importer/manifest.json`.
3. Запустите **Capacities UI V2 — Variables**. Выберите нужные моды и нажмите Create variables.
4. В Local variables проверьте три коллекции `Capacities V2 · …`. WEB code syntax совпадает с CSS.

Полный набор содержит 18 Accent modes; доступное число modes зависит от вашего Figma-плана. В импортере можно выбрать меньшую палитру (например neutral, blue, purple, teal) без изменения имён Variables. При ограничении плана весь неудачный импорт удаляется, существующие данные не затрагиваются. Повторный импорт поверх тех же имён запрещён, чтобы случайно не заменить значения.

Импортер не обращается к сети. Он создаёт настоящие VARIABLE_ALIAS, задаёт scopes и code syntax. Проверен на mock Plugin API: 48 Variables, aliases, повторный импорт, rollback при лимите modes. **В реальный Figma-файл эта версия пока не записана**: для записи нужен выбранный пользователем файл/проект.

После изменения токенов запустите `npm run tokens`; `figma/importer/code.js` обновится вместе с CSS. Сам генератор импорта: `figma/importer-core.js`.
