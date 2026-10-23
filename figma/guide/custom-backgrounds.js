const {page: customPage, root: customRoot} = await ginit('05 · Custom backgrounds', 'Custom backgrounds · explicit regeneration');
await gtext(customRoot, 'Своя подложка — явный пересчёт', 1264, 'title');
await gtext(customRoot, 'Цвета адаптируются к объявленному фону. Изменение заливки фрейма само по себе не пересчитывает переменные: выберите основу в генераторе и примените согласованный экспорт.', 1060);
const flow = await gsection(customRoot, 'От фона к готовой паре', null);
const flowRow = gframe(flow, 'Regeneration process', 'HORIZONTAL', 1264); flowRow.itemSpacing = 24;
for (const [title, body] of [
  ['1 · Выберите фон', 'В Palette Lab задайте точные HEX для Light и Dark. Custom сохраняет RGB подложки; пары рассчитываются относительно этого фона.'],
  ['2 · Пересчитайте', 'Обновите bg/block, neutral, шесть акцентов, Content, Border, Focus и Normal/Active вместе.'],
  ['3 · Примените и проверьте', 'Примените project export. На фрейме задайте Light/Dark его коллекции; дочерним слоям оставьте Auto. Назначьте пересчитанные пары.']
]) { const card = gcard(flowRow, title, 405); await gtext(card, title, 357, 'label'); await gtext(card, body, 357, 'body', 'content/secondary/neutral'); }
const generated = await gsection(customRoot, 'Точный фон из генератора', 'Это результат отдельного project export для выбранных HEX. Цвета ниже взяты из custom-example.json; основной native preset и его переменные не меняются.');
const generatedRow = gframe(generated, 'Generated custom project', 'HORIZONTAL', 1264); generatedRow.itemSpacing = 24;
function generatedPaint(rgba) { return {type: 'SOLID', color: {r: rgba.r, g: rgba.g, b: rgba.b}, opacity: rgba.a ?? 1}; }
for (const theme of ['Light', 'Dark']) {
  const context = guideCustomSample.contexts[theme];
  const panel = gcard(generatedRow, 'Generated ' + theme + ' · ' + guideCustomSample.backgrounds[theme], 620);
  gmode(panel, 'Theme', theme); panel.fills = [generatedPaint(context.roles['surface/bg'])];
  const generatedText = async (parent, value, width, role = 'content/primary/neutral', kind = 'body') => {
    const node = await gtext(parent, value, width, kind); node.fills = [generatedPaint(context.roles[role])]; return node;
  };
  await generatedText(panel, guideCustomSample.name + ' · ' + theme, 572, 'content/primary/neutral', 'label');
  await generatedText(panel, 'Exact background · ' + guideCustomSample.backgrounds[theme], 572, 'content/secondary/neutral');
  for (const [label, fillRole, textRole] of [
    ['Research', 'surface/secondary/purple-normal', 'content/primary/purple'],
    ['Ready for review', 'surface/secondary/green-normal', 'content/primary/green'],
    ['Create project', 'surface/primary/blue-normal', 'content/on-primary-blue']
  ]) {
    const example = gframe(panel, label + ' · generated roles', 'VERTICAL', 572); gspace(example); gradius(example);
    example.fills = [generatedPaint(context.roles[fillRole])];
    await generatedText(example, label, 548, textRole, 'label');
  }
  await generatedText(panel, 'Generated paint · Layer opacity 100%', 572, 'content/secondary/neutral', 'caption');
}
await glabel(generated, 'CLI: node figma/color-system-v2/export-custom.mjs --light "' + guideCustomSample.backgrounds.Light + '" --dark "' + guideCustomSample.backgrounds.Dark + '" --name "' + guideCustomSample.name + '" --out artifacts/custom-project');
const inheritance = await gsection(customRoot, 'Наследование видно на настоящих режимах', 'Ниже — связанные примеры текущих Light/Dark и Invert. Они показывают механизм контекста; это не имитация пересчитанного пользовательского фона.');
const pairRow = gframe(inheritance, 'Theme contexts', 'HORIZONTAL', 1264); pairRow.itemSpacing = 24;
for (const theme of ['Light', 'Dark']) {
  const panel = gcard(pairRow, theme + ' root · explicit Theme', 620, 'Content'); gmode(panel, 'Theme', theme);
  await gtext(panel, 'Theme · ' + theme, 572, 'label');
  await gtext(panel, 'Design workspace', 572, 'body', 'content/secondary/neutral');
  const row = gframe(panel, 'Normal and local Invert', 'HORIZONTAL', 572); row.itemSpacing = 16;
  for (const surface of ['Content', 'Invert']) {
    const card = gcard(row, surface + ' context · no Theme override', 278, surface);
    await gtext(card, surface === 'Invert' ? 'Inverted sidebar' : 'Project overview', 230, 'label');
    await gsample(card, 'Research', 'surface/secondary/purple-normal', 'content/primary/purple', 230);
    await gsample(card, 'Ready', 'surface/secondary/green-normal', 'content/primary/green', 230);
    await glabel(card, 'Surface · ' + surface + '\nTheme · Auto', 230);
  }
}
const alpha = await gsection(customRoot, 'Alpha относится к краске', 'Все образцы сохраняют opacity слоя 100%. Alpha находится внутри связанного COLOR, поэтому подпись и иконки остаются непрозрачными.');
const alphaRow = gframe(alpha, 'Paint compositing on declared backings', 'HORIZONTAL', 1264); alphaRow.itemSpacing = 24;
for (const surface of ['Workspace', 'Content', 'Invert']) {
  const card = gcard(alphaRow, 'Same soft role on ' + surface, 405, surface);
  await gtext(card, surface, 357, 'label');
  await gsample(card, 'Shared blue role', 'surface/secondary/blue-normal', 'content/primary/blue', 357);
  await glabel(card, 'surface/secondary/blue-normal\nLayer opacity · 100%', 357);
}
const limits = await gsection(customRoot, 'Что проверять после смены фона', null);
await gtext(limits, 'Текст читается после композиции; мягкая заливка отличается от подложки; Normal и Active различаются; Focus остаётся видимым. Для карточек проверьте ещё surface/block, для всплывающих элементов — собственный Overlay.', 1100);
await gtext(limits, 'Произвольная картинка или новый HEX требуют нового расчёта. В этом native файле нет автоматического определения фона и отдельного постоянно включённого Custom mode. Glass — отдельный защищённый runtime-материал; его проверяют в Palette Lab над крайними подложками, а не ослаблением opacity всей группы.', 1100, 'body', 'content/secondary/neutral');
const handoff = await gcard(customRoot, 'Export handoff', 1264);
await gtext(handoff, 'Один источник → согласованные экспорты', 1216, 'label');
await gtext(handoff, 'Palette Lab / source → generation → native-graph.json → Figma readback → визуальная проверка. Не редактируйте служебные aliases вручную и не считайте новый JSON подтверждением обновлённого canvas.', 1216, 'body', 'content/secondary/neutral');
return greport(customPage, customRoot, {pagePurpose: 'Explicit background regeneration and paint-only alpha', customModeCreated: false, themeContexts: ['Light', 'Dark'], layerOpacity: 1});
