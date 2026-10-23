// Concatenate common.js. Adds a focused neutral-role recipe ahead of colors.
const neutralPage=await figma.getNodeByIdAsync('155:3');await figma.setCurrentPageAsync(neutralPage);
const colors=await figma.getNodeByIdAsync('161:4037');if(colors.children.some(n=>n.name==='Neutral roles · start here'))throw Error('Neutral recipe already exists');
const section=gframe(colors,'Neutral roles · start here','VERTICAL',1264);section.itemSpacing=24;colors.insertChild(2,section);
await gtext(section,'Нейтральные цвета · начните здесь',1264,'title');
await gtext(section,'Цвет слоя выбирайте из V2 · Surface. Theme задаёт Light/Dark; Scheme — Standard/Dimmed. Это независимые режимы фрейма, а не дополнительные наборы цветов.',1264,'body','content/secondary/neutral');
const row=gframe(section,'Light · Dark · Light + Invert','HORIZONTAL',1264);row.itemSpacing=24;
for(const [theme,surface,title]of [['Light','Content','Светлая поверхность'],['Dark','Content','Тёмная поверхность'],['Light','Invert','Invert внутри Light']]){
 const panel=gcard(row,title,405);gmode(panel,'Theme',theme);gmode(panel,'Surface',surface);gfill(panel,'surface/bg');await gtext(panel,title,357,'label');
 await gtext(panel,'surface/bg',357,'caption','content/secondary/neutral');
 const block=gframe(panel,'surface/block','VERTICAL',357);paddNeutral(block);gfill(block,'surface/block');await gtext(block,'surface/block',333,'body');
 for(const role of ['primary','secondary','tertiary','muted'])await gtext(panel,'content/'+role+'/neutral',357,'body','content/'+role+'/neutral');
 const b=gframe(panel,'Neutral primary','HORIZONTAL',220);paddNeutral(b);gfill(b,'surface/primary/neutral-normal');await gtext(b,'Нейтральная кнопка',196,'label','content/on-primary');
}
function paddNeutral(n){for(const e of ['paddingTop','paddingRight','paddingBottom','paddingLeft'])gbind(n,e,'adaptive/padding/md');gradius(n);}
const fixed=gframe(section,'Stable black and white','HORIZONTAL',1264);fixed.itemSpacing=24;
for(const name of ['black','white']){const sample=gframe(fixed,'stable/'+name,'VERTICAL',240);paddNeutral(sample);gfill(sample,'stable/'+name);gstroke(sample,'border/subtle');await gtext(sample,'stable/'+name,216,'label','stable/'+(name==='black'?'white':'black'));}
await gtext(section,'stable/black и stable/white сохраняют точные #000000 / #FFFFFF в любой теме. Для обычных областей используйте bg и block; для противоположной поверхности — Surface → Invert.',1264,'body','content/secondary/neutral');
return {createdNodeIds:[section,...section.findAll(()=>true)].map(n=>n.id),mutatedNodeIds:[colors.id],neutralGuide:{id:section.id,w:section.width,h:section.height}};
