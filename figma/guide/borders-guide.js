// Concatenate common.js. Existing IDs belong to the V2 rebuild receipt.
const page=await figma.getNodeByIdAsync('155:3');await figma.setCurrentPageAsync(page);
const host=await figma.getNodeByIdAsync('161:4037');
if(host.children.some(n=>n.name==='Borders · On and Off'))throw Error('Borders guide already exists');
Object.assign(guideControlIds,{primaryButton:'161:87',secondaryButton:'161:348',input:'161:1699',Slider:'161:3543',checkbox:'161:3442'});
Object.assign(guideComponentIds,{Card:'163:14',Toast:'179:2033'});
const section=await gsection(host,'Borders · On and Off','На внешнем фрейме выберите V2 · Borders → On или Off. По умолчанию On; вложенные элементы оставьте Auto.');
host.insertChild(Math.min(3,host.children.length-1),section);
for(const [theme,surface] of [['Light','Content'],['Dark','Content'],['Light','Invert']]){
 const row=gframe(section,theme+' / '+surface,'HORIZONTAL',1264);row.itemSpacing=24;
 for(const mode of ['On','Off']){
  const panel=gcard(row,theme+' · '+surface+' · Borders '+mode,620,surface);gmode(panel,'Theme',theme);gmode(panel,'Borders',mode);gmode(panel,'Accent','Blue');
  await gtext(panel,theme+' / '+surface+' · '+mode,572,'label');
  const actions=gframe(panel,'Actions','HORIZONTAL',572);actions.itemSpacing=12;
  await ginstance(actions,'primaryButton',{Label:'Сохранить'},{Size:'md',State:'Default'});
  await ginstance(actions,'secondaryButton',{Label:'Отмена'},{Size:'md',State:'Default'});
  await ginstance(panel,'input',{Label:'Название',Value:'Материалы по проекту','Show hint':false},{Size:'md',State:'Default'});
  await ginstance(panel,'Slider',{Label:'Насыщенность'},{Value:'50',State:'Default'});
  await ginstance(panel,'Card',{Title:'Карточка',Description:'Рамка наследует общий режим.',Meta:'0.5 px'}, {Appearance:'Default'});
  await ginstance(panel,'Toast',{Title:'Готово',Message:'Всплывающая панель тоже наследует Borders.'},{Tone:'Success'});
 }
}
await glabel(section,'On/Off меняет только границу 0.5 px. Текст и заливки остаются непрозрачными как слои; alpha хранится в самом цвете. Focus не добавляет внешний контур.');
const nodes=[section,...section.findAll(()=>true)],width=gv('Borders','border/opacity');
const boundarySamples=nodes.filter(n=>n.name==='.Border').map(n=>({id:n.id,mode:n.resolvedVariableModes[width.variableCollectionId],resolved:width.resolveForConsumer(n).value,weight:n.strokeWeight}));
return {createdNodeIds:nodes.map(n=>n.id),mutatedNodeIds:[host.id],sectionId:section.id,bounds:{width:section.width,height:section.height},boundarySamples};
