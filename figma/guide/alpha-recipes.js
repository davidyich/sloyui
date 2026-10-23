// Concatenate common.js. All examples use public roles and inherit their modes.
const page=await figma.getNodeByIdAsync('155:3');await figma.setCurrentPageAsync(page);
const host=await figma.getNodeByIdAsync('161:4037');
if(host.children.some(n=>n.name==='Alpha · Shared recipes'))throw Error('Alpha guide already exists; update the existing section.');
const section=await gsection(host,'Alpha · Shared recipes','Одна семантическая краска адаптируется при смешивании с подложкой. Текст и состояния проверяются на всей группе допустимых фонов.');
host.insertChild(Math.min(4,host.children.length-1),section);
await gtext(section,'Результат = alpha × пигмент + (1 − alpha) × фон',1264,'label');
await glabel(section,'Прозрачность находится в COLOR. Opacity фрейма, текста и компонента — 100%. Normal и Active заменяют друг друга; не накладывайте Active поверх Normal.');
for(const theme of ['Light','Dark']){
 const row=gframe(section,theme+' · Shared paint across surfaces','HORIZONTAL',1264);row.itemSpacing=16;
 for(const surface of ['Shell','Workspace','Content','Overlay','Invert']){
  const panel=gcard(row,theme+' / '+surface,240,surface);gmode(panel,'Theme',theme);gmode(panel,'Borders','On');
  await gtext(panel,theme+' / '+surface,192,'label');
  await gsample(panel,'Normal','surface/secondary/blue-normal','content/primary/blue',192);
  await gsample(panel,'Active','surface/secondary/blue-active','content/primary/blue',192);
  const block=gcard(panel,'Inherited neutral block',192);gspace(block,'sm');
  await gtext(block,'На block',168,'caption','content/secondary/neutral');
  await gsample(block,'Normal','surface/secondary/blue-normal','content/primary/blue',168);
  await gsample(block,'Active','surface/secondary/blue-active','content/primary/blue',168);
  await gsample(panel,'Disabled','surface/disabled','content/disabled/neutral',192);
 }
}
await gtext(section,'Как собрать область',1264,'label');
await gtext(section,'1. На внешнем фрейме выберите Theme и Surface; фон — surface/bg.\n2. Внутренней карточке задайте surface/block и оставьте Surface = Auto.\n3. Контролу выберите Secondary или Tertiary и парный Content того же оттенка.\n4. Для тёмного блока в Light задайте Surface = Invert. Theme остаётся Light.',1264);
await gtext(section,'Пользовательский фон',1264,'label');
await gtext(section,'Укажите точный HEX в Palette Lab и пересчитайте проект. Экспорт содержит согласованные заливки, текст и состояния. При смене HEX пересчитайте весь scope: ручная заливка фрейма в Figma не запускает генератор.',1264);
await glabel(section,'Область создаёт непрозрачную основу. Проверенный рецепт охватывает локальные нейтральные слои; произвольные стопки цветных заливок и изображения требуют нового расчёта. Для изображения используйте защищённый Glass в runtime или определённый фон Overlay.');
const nodes=[section,...section.findAll(()=>true)];
return {createdNodeIds:nodes.map(n=>n.id),mutatedNodeIds:[host.id],sectionId:section.id,width:section.width,height:section.height,examples:10};
