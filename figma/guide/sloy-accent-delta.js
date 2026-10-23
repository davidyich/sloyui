// Run with common.js. Targets IDs returned by the first Sloy component build.
const accentPage=figma.root.children.find(p=>p.name==='03 · Components');
if(!accentPage)throw Error('Missing Components page');
await figma.setCurrentPageAsync(accentPage);
const accentSetIds={RailItem:'185:1246',Tabs3:'185:1276',Tabs5:'185:1309',ContentCard:'185:1488',WeekStrip:'185:1578'};
const accentSets={};for(const [name,id]of Object.entries(accentSetIds)){const set=await figma.getNodeByIdAsync(id);if(!set||set.type!=='COMPONENT_SET')throw Error('Stale '+name);accentSets[name]=set;}
const accentTexts=Object.values(accentSets).flatMap(s=>s.findAllWithCriteria({types:['TEXT']}));
const accentFonts=new Map(accentTexts.flatMap(t=>t.getStyledTextSegments(['fontName'])).map(s=>[JSON.stringify(s.fontName),s.fontName]));
await Promise.all([...accentFonts.values()].map(font=>figma.loadFontAsync(font)));
const accentChanged=new Set();
for(const v of accentSets.RailItem.children)if(v.variantProperties.State==='Selected'){
  gfill(v,'surface/secondary-normal','Accent');accentChanged.add(v.id);
  for(const n of v.findAll(n=>['VECTOR','ELLIPSE','LINE','RECTANGLE','BOOLEAN_OPERATION'].includes(n.type))){if('strokes'in n&&n.strokes.some(p=>p.visible!==false))n.strokes=[gp('content','Accent')];if('fills'in n&&n.fills!==figma.mixed&&n.fills.some(p=>p.visible!==false))n.fills=[gp('content','Accent')];accentChanged.add(n.id);}
}
for(const set of [accentSets.Tabs3,accentSets.Tabs5])for(const v of set.children){const item=v.children.find(n=>n.name==='Tab '+v.variantProperties.Active);if(!item)throw Error('Missing active Tab');for(const n of item.children){if(n.type==='TEXT'||n.name==='Selected indicator'){gfill(n,'content','Accent');accentChanged.add(n.id);}}}
for(const v of accentSets.ContentCard.children)if(v.variantProperties.State==='Selected'){v.strokes=[gp('border/normal','Accent')];accentChanged.add(v.id);}
for(const v of accentSets.WeekStrip.children){for(const day of v.children){const selected=day.name==='Day '+v.variantProperties.Selected;if(selected){gfill(day,'surface/primary-normal','Accent');accentChanged.add(day.id);for(const n of day.children)if(n.type==='TEXT'){gfill(n,'on-primary','Accent');accentChanged.add(n.id);}}const dot=day.children.find(n=>n.type==='ELLIPSE'&&n.name==='Has events');if(dot){gfill(dot,selected?'on-primary':'content','Accent');accentChanged.add(dot.id);}}}
return{createdNodeIds:[],mutatedNodeIds:[...accentChanged],fix:'Selected rail, tabs, week days and card border inherit Accent; no variable changes',sets:accentSetIds};
