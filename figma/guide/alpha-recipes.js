// Concatenate common.js. All examples use public roles and inherit their modes.
const page=await figma.getNodeByIdAsync('155:3');await figma.setCurrentPageAsync(page);
const host=await figma.getNodeByIdAsync('161:4037');
const existing=host.children.find(n=>n.name==='Alpha · Shared recipes');
const removedNodeIds=existing?existing.findAll(()=>true).map(n=>n.id):[];
if(existing){
 for(const node of existing.findAllWithCriteria({types:['TEXT']}))
  for(const segment of node.getStyledTextSegments(['fontName']))await figma.loadFontAsync(segment.fontName);
 for(const child of [...existing.children])child.remove();
}
const section=existing??await gsection(host,'Alpha · Shared recipes','');
if(existing)await gtext(section,'Alpha · Shared recipes',1264,'label');
await gtext(section,'Primary — главный акцент. Secondary — мягкая цветная подложка. Tertiary — самый тихий уровень. Цвет оценивается после смешивания с фоном.',1264,'body','content/secondary/neutral');
host.insertChild(Math.min(4,host.children.length-1),section);
await gtext(section,'Результат = alpha × пигмент + (1 − alpha) × фон',1264,'label');
await glabel(section,'Прозрачность находится в COLOR. Opacity фрейма, текста и компонента — 100%. Normal и Active заменяют друг друга; не накладывайте Active поверх Normal.');
const hierarchy=await gsection(section,'Primary / Secondary / Tertiary','Шесть акцентов на одной поверхности. Active усиливает Secondary небольшим шагом; текст сохраняет читаемость.');
for(const theme of ['Light','Dark']){
 const row=gframe(hierarchy,theme+' · Emphasis hierarchy','HORIZONTAL',1264);row.itemSpacing=8;
 for(const hue of ['blue','green','orange','red','pink','purple']){
  const panel=gcard(row,theme+' / '+hue,204,'Content');gmode(panel,'Theme',theme);
  await gtext(panel,theme+' / '+hue,156,'label');
  await gsample(panel,'Primary','surface/primary/'+hue+'-normal','content/on-primary-'+hue,156);
  await gsample(panel,'Secondary','surface/secondary/'+hue+'-normal','content/primary/'+hue,156);
  await gsample(panel,'Secondary · Active','surface/secondary/'+hue+'-active','content/primary/'+hue,156);
  await gsample(panel,'Tertiary','surface/tertiary/'+hue+'-normal','content/primary/'+hue,156);
 }
}
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
return {createdNodeIds:nodes.filter(n=>n!==existing).map(n=>n.id),mutatedNodeIds:[host.id,...(existing?[existing.id]:[])],removedNodeIds,sectionId:section.id,hierarchyId:hierarchy.id,width:section.width,height:section.height,surfaceExamples:10,hierarchyExamples:12};
