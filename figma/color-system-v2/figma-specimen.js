await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:12'));
const existing=figma.currentPage.findOne(n=>n.type==='COMPONENT'&&n.name==='V2 / Surface specimen');
if(existing)return {existing:existing.id};
const c=mainComponent('V2 / Surface specimen',432);pad(c,24);gap(c,20);rad(c,'large');fill(c,'surface/surface/bg');stroke(c);
c.description='One native, reusable color specimen. Set V2 Theme, Scheme and Surface on the instance or parent. All fills and content use contextual semantic variables. The Glass instance requires a backdrop and blur.';
const title=txt(c,'Surface','Title');const labelKey=c.addComponentProperty('Surface','TEXT','Surface');title.componentPropertyReferences={characters:labelKey};
txt(c,'One context · normal + active','Label','surface/content/secondary');
const neutral=box(c,'Neutral surface pairs',384,'VERTICAL',0,8);
txt(neutral,'NEUTRAL SURFACES','Caption','surface/content/secondary');
const labels=box(neutral,'State headers',384,'HORIZONTAL',0,8);txt(labels,'NORMAL','Caption','surface/content/muted',188);txt(labels,'ACTIVE','Caption','surface/content/muted',188);
for(const role of ['primary','invert','secondary','tertiary']){
 const row=box(neutral,role,384,'HORIZONTAL',0,8);
 for(const state of ['normal','active'])pill(row,role[0].toUpperCase()+role.slice(1),`surface/surface/${role}/${state}`,`surface/content/${role==='primary'?'on-primary':role==='invert'?'on-invert':'primary'}`,188,36);
}
const neutrals=box(c,'Content',384,'VERTICAL',0,8);txt(neutrals,'CONTENT','Caption','surface/content/secondary');
for(const group of [['primary','secondary','tertiary'],['muted','disabled','inverted']]){
 const row=box(neutrals,'Content levels',384,'HORIZONTAL',0,12);
 for(const role of group){const cell=box(row,role,120,'VERTICAL',0,4);if(role==='inverted'){fill(cell,'surface/surface/primary/normal');rad(cell,'small');cell.counterAxisAlignItems='CENTER';}txt(cell,'Aa  ●','Heading','surface/content/'+role);txt(cell,role,'Caption',role==='inverted'?'surface/content/inverted':'surface/content/secondary');}
}
txt(neutrals,'Disabled is decorative, never essential copy.','Caption','surface/content/muted');
const accents=box(c,'Five accent families',384,'VERTICAL',0,8);txt(accents,'ACCENT SURFACES + PAIRED CONTENT','Caption','surface/content/secondary');
const heads=box(accents,'Hierarchy headings',384,'HORIZONTAL',0,8);txt(heads,'','Caption','surface/content/secondary',56);for(const name of ['PRIMARY','SECONDARY','TERTIARY'])txt(heads,name,'Caption','surface/content/muted',101);
for(const hue of ['blue','green','yellow','orange','red']){
 const row=box(accents,hue,384,'HORIZONTAL',0,8);txt(row,hue[0].toUpperCase()+hue.slice(1),'Label',`surface/content/accent/${hue}/primary`,56);
 for(const role of ['primary','secondary','tertiary']){
  const pair=box(row,role,101,'HORIZONTAL',0,5);
  for(const state of ['normal','active'])pill(pair,state==='normal'?'Aa':'Aa+ ',`surface/surface/accent/${hue}/${role}/${state}`,`surface/content/accent/${hue}/${role==='primary'?'on-primary':'primary'}`,48,36);
 }
}
const colorText=box(accents,'Accent content levels',384,'HORIZONTAL',0,12);
for(const hue of ['blue','green','yellow','orange','red']){const cell=box(colorText,hue,67,'VERTICAL',0,4);txt(cell,'Aa ●','Body medium',`surface/content/accent/${hue}/primary`);txt(cell,'Aa ●','Body',`surface/content/accent/${hue}/secondary`);}
const alphaRow=box(c,'Material and stable examples',384,'VERTICAL',0,8);txt(alphaRow,'ADAPTIVE ALPHA / STABLE','Caption','surface/content/secondary');
const arow=box(alphaRow,'Alpha examples',384,'HORIZONTAL',0,8);
for(const [name,key,fg] of [['Ink 8%','alpha/adaptive/ink/8','content/primary'],['Canvas 32%','alpha/adaptive/canvas/32','content/primary'],['White','stable/white','stable/black'],['Black','stable/black','stable/white']])pill(arow,name,'surface/'+key,'surface/'+fg,90,32);
txt(alphaRow,'Alpha follows Theme; stable never changes.','Caption','surface/content/muted');
const footer=box(c,'Named accent',384,'HORIZONTAL',12,12,'surface/surface/tertiary/normal');rad(footer,'medium');
pill(footer,'Continue','surface/surface/accent/blue/primary/normal','surface/content/accent/blue/on-primary',120,34);txt(footer,'Explicit color → Blue','Label','surface/content/secondary');
return report({componentId:c.id,labelKey,width:c.width,height:c.height,nodeCount:c.findAll(()=>true).length+1});
