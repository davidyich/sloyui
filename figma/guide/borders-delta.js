// Prelude: PAGE_ID. Concatenate common.js. Idempotent native boundary migration.

const page=await figma.getNodeByIdAsync(PAGE_ID);await figma.setCurrentPageAsync(page);
const all=[page,...page.findAll(()=>true)];
const fonts=new Map(all.filter(n=>n.type==='TEXT').flatMap(t=>t.getStyledTextSegments(['fontName'])).map(s=>[JSON.stringify(s.fontName),s.fontName]));await Promise.all([...fonts.values()].map(f=>figma.loadFontAsync(f)));
const mutated=[],created=[],borderIds=[];
const borders=guideCollectionMap.get('V2 · Borders'),on=borders.modes.find(m=>m.name==='On');
for(const n of all){if((n===page||n.parent===page)&&'explicitVariableModes'in n&&n.explicitVariableModes[borders.id]){n.setExplicitVariableModeForCollection(borders,on.modeId);mutated.push(n.id);}}
// Instances inherit changes from masters. Never add detached descendants inside them.
const local=all.filter(n=>['FRAME','COMPONENT'].includes(n.type)&&!n.id.startsWith('I'));
const targets=new Set(local.filter(n=>Array.isArray(n.strokes)&&n.strokes.some(p=>p.visible!==false)));
if(PAGE_ID==='155:5')for(const n of local){
 if(n.type==='COMPONENT'&&!['Select/Open','ComboBox','MultiSelect','Sloy/Tabs/3','Sloy/Tabs/5','Sloy/WeekStrip'].includes(n.parent.name)&&n.parent.type==='COMPONENT_SET')targets.add(n);
 if(n.type==='FRAME'&&(n.name==='Selection'||/^(Tab|Day|Choice) \d+$/.test(n.name)))targets.add(n);
}
for(const n of targets){const old=n.children.find(c=>c.name==='.Border');const paints=n.strokes.filter(p=>p.visible!==false);let layer=gstroke(n,'border/subtle');if(paints.length)layer.strokes=paints;created.push(...(old?[]:[layer.id]));mutated.push(n.id,layer.id);borderIds.push(layer.id);}
const taskDecorations=all.filter(n=>n.type==='TEXT'&&n.name==='Title').map(n=>({id:n.id,decoration:n.textDecoration}));
return {pageId:page.id,createdNodeIds:created,mutatedNodeIds:[...new Set(mutated)],borderIds,count:borderIds.length,defaultMode:on,taskDecorations};
