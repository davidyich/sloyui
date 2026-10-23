const {page: colorsPage, root: colorsRoot} = await ginit('01 · Colors', 'Colors · practical guide');
await gtext(colorsRoot, 'Цвет выбирается по назначению', 1264, 'title');
await gtext(colorsRoot, 'Начните с Surface. Настройте контекст на фрейме, затем выбирайте роль заливки, текста и границы. Вложенные элементы наследуют Auto.', 1000);
const steps = await gsection(colorsRoot, 'Три решения перед цветом', null);
const stepsRow = gframe(steps, 'Context steps', 'HORIZONTAL', 1264); stepsRow.itemSpacing = 24;
for (const [title, body] of [
  ['1 · Контекст', 'Theme: Light / Dark. Scheme: Standard / Dimmed. Surface: назначение области.'],
  ['2 · Роль', 'Primary — действие. Secondary — мягкая плашка. Tertiary — тихая подложка. Content и Border выбираются отдельно.'],
  ['3 · Акцент', 'Neutral по умолчанию. Blue, Green, Orange, Red, Pink, Purple — через Accent modes на внешнем фрейме.']
]) { const card = gcard(stepsRow, title, 405); await gtext(card, title, 357, 'label'); await gtext(card, body, 357, 'body', 'content/secondary/neutral'); }
const hues = ['neutral', 'blue', 'green', 'orange', 'red', 'pink', 'purple'];
const matrix = await gsection(colorsRoot, 'Одна роль — семь цветов', 'Плоский picker: neutral первым, затем шесть акцентов; Normal и Active рядом. Показаны реальные привязки Surface.');
for (const family of ['primary', 'secondary', 'tertiary']) {
  await gtext(matrix, family[0].toUpperCase() + family.slice(1), 1264, 'label');
  const row = gframe(matrix, family + ' samples', 'HORIZONTAL', 1264); row.itemSpacing = 12;
  for (const hue of hues) {
    const column = gframe(row, hue, 'VERTICAL', 170); column.itemSpacing = 8;
    const ink = family === 'primary' ? 'content/on-primary' + (hue === 'neutral' ? '' : '-' + hue) : 'content/primary/' + hue;
    await gsample(column, hue[0].toUpperCase() + hue.slice(1), 'surface/' + family + '/' + hue + '-normal', ink, 170);
    await gsample(column, 'Active', 'surface/' + family + '/' + hue + '-active', ink, 170);
    await glabel(column, 'surface/' + family + '/' + hue + '-normal', 170);
  }
}
const pairs = await gsection(colorsRoot, 'Текст и граница — часть пары', 'Текст Primary по умолчанию белый в Light и чёрный в Dark; Invert следует локальной полярности. Заливки Normal/Active рассчитаны под этот текст. Выберите content/on-primary-<hue>; у готового контрола он следует Accent.');
const pairsRow = gframe(pairs, 'Usage pairs', 'HORIZONTAL', 1264); pairsRow.itemSpacing = 24;
for (const [name, fillRole, inkRole, hint] of [
  ['Primary action', 'surface/primary/blue-normal', 'content/on-primary-blue', 'surface/primary/blue-normal + content/on-primary-blue'],
  ['Project label', 'surface/secondary/green-normal', 'content/primary/green', 'surface/secondary/green-normal + content/primary/green'],
  ['Quiet field', 'surface/tertiary/neutral-normal', 'content/primary/neutral', 'surface/tertiary/neutral-normal + content/primary/neutral']
]) { const card = gcard(pairsRow, name + ' recipe', 405); await gsample(card, name, fillRole, inkRole, 357); if (name === 'Primary action') await gbutton(card, 'Create project', 'Blue'); await glabel(card, hint, 357); }
const contexts = await gsection(colorsRoot, 'Поверхность меняет всю пару', 'В каждой строке Theme задана только на общем контейнере. Invert меняет локальную полярность через Surface; вложенной Dark/Light Theme у него нет.');
for (const theme of ['Light', 'Dark']) {
  const themePanel = gcard(contexts, theme + ' context group', 1264, 'Content'); gmode(themePanel, 'Theme', theme);
  await gtext(themePanel, 'Theme · ' + theme, 1216, 'label');
  const row = gframe(themePanel, theme + ' surfaces', 'HORIZONTAL', 1216); row.itemSpacing = 16;
  for (const surface of ['Shell', 'Workspace', 'Content', 'Overlay', 'Invert']) {
    const card = gcard(row, surface + ' · inherits ' + theme, 230, surface);
    await gtext(card, surface, 182, 'label');
    const block = gframe(card, 'Local block · inherits Surface', 'VERTICAL', 182); gspace(block, 'sm', 'stack-sm'); gradius(block); gfill(block, 'surface/block');
    await gtext(block, 'Project notes', 166, 'label');
    await gsample(card, 'In progress', 'surface/secondary/blue-normal', 'content/primary/blue', 182);
    await glabel(card, surface === 'Invert' ? 'Surface · Invert\nTheme · Auto' : 'Surface · ' + surface, 182);
  }
}
const rules = await gsection(colorsRoot, 'Режимы без лишних переопределений', null);
await gtext(rules, 'Задайте Theme, Scheme, Surface и Accent на содержащем фрейме. У экземпляров оставьте Auto. Density, Radius и Borders меняются независимо. Карточка внутри области рисует surface/block и сохраняет Surface родителя.', 1100);
await gtext(rules, 'Native Palette содержит только используемые RGBA. Alpha уже находится в краске; opacity слоя остаётся 100%. Проверяйте заливку после смешивания с фоном, а также Normal/Active и текст. Для новой пользовательской подложки выполните явный пересчёт — порядок действий на странице Custom backgrounds.', 1100, 'body', 'content/secondary/neutral');
return greport(colorsPage, colorsRoot, {pagePurpose: 'Color roles, pair recipes and true local Invert', themes: ['Light', 'Dark'], surfaces: ['Shell', 'Workspace', 'Content', 'Overlay', 'Invert'], hues});
