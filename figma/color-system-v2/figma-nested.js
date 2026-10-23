// Append to figma-helpers.js. Editable nested-neutral material specimen.
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:12'));
const existing=figma.currentPage.children.find(n=>n.name==='V2 / Nested accents');
if(existing)return {existing:true,componentId:existing.id};
const right=Math.max(240,...figma.currentPage.children.map(n=>n.x+n.width+160));
const c=mainComponent('V2 / Nested accents',432);figma.currentPage.appendChild(c);c.x=right;c.y=240;pad(c,24);gap(c,16);fill(c,'surface/surface/bg');rad(c,'large');
c.description='Accent Secondary/Tertiary on bg and neutral Secondary/Tertiary normal/active. Inherit Theme and Scheme; select Surface on the instance. No extra backing mode. Normal is left, active right.';
const title=txt(c,'Surface','Heading');const property=c.addComponentProperty('Surface','TEXT','Surface');title.componentPropertyReferences={characters:property};
txt(c,'Five backings · same accent variables','Body','surface/content/secondary');
const columns=box(c,'Hue columns',384,'HORIZONTAL',12,8);
for(const hue of ['Blue','Green','Yellow','Orange','Red'])txt(columns,hue,'Caption','surface/content/secondary',64);
for(const [label,backing]of [['Base','bg'],['Neutral tertiary · normal','tertiary/normal'],['Neutral tertiary · active','tertiary/active'],['Neutral secondary · normal','secondary/normal'],['Neutral secondary · active','secondary/active']]){
 const panel=box(c,label,384,'VERTICAL',12,8,backing==='bg'?null:'surface/surface/'+backing);rad(panel,'medium');
 txt(panel,label,'Label');
 for(const role of ['secondary','tertiary']){
  txt(panel,'Accent '+role+'   ·   normal / active','Caption','surface/content/secondary');
  const row=box(panel,role,360,'HORIZONTAL',0,8);
  for(const hue of ['blue','green','yellow','orange','red']){
   const pair=box(row,hue,64,'HORIZONTAL',0,4);
   for(const state of ['normal','active'])pill(pair,state==='normal'?'Aa':'Aa+','surface/surface/accent/'+hue+'/'+role+'/'+state,'surface/content/accent/'+hue+'/primary',30,26);
  }
 }
}
return report({componentId:c.id,property,width:c.width,height:c.height});
