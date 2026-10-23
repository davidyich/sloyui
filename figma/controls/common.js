const page = figma.root.children.find(p=>p.name==='02 · Controls');
await figma.setCurrentPageAsync(page);
figma.skipInvisibleInstanceChildren=false;
await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const variables = await figma.variables.getLocalVariablesAsync();
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const collectionMap=new Map(collections.map(c=>[c.name,c]));
const variableMap=new Map(variables.map(v=>[v.variableCollectionId+'|'+v.name,v]));
const collection = name => collectionMap.get('V2 · '+name);
function mappedRole(name) {
 if (/^content\/(primary|secondary|tertiary|muted|disabled|inverted)$/.test(name)) return name+'/neutral';
 if (/^content\/(blue|green|orange|red|pink|purple)$/.test(name)) return 'content/primary/'+name.split('/')[1];
 if (name.startsWith('surface/secondary/neutral-')) return name.replace('surface/secondary/','surface/tertiary/').replace(/-(hover|pressed)$/,'-active');
 if (name.startsWith('surface/')) return name.replace(/-(hover|pressed)$/,'-active');
 if (/^border\/(blue|green|orange|red|pink|purple)-/.test(name)) return name.replace(/-(normal|hover|pressed)$/,'');
 return name;
}
const V = (group,name) => {if(group==='Theme'){group='Surface';name=mappedRole(name);}const v=variableMap.get(collection(group)?.id+'|'+name);if(!v)throw Error('Missing '+group+'/'+name);return v;};
const styles = await figma.getLocalTextStylesAsync();
const createdRoots=[];
function paint(role,group='Theme'){return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',V(group,role));}
function fill(node,role,group='Theme'){node.fills=[paint(role,group)];}
function radius(node,role='md'){node.setBoundVariable('cornerRadius',V('Radius','radius/'+role));}
function bind(node,key,role,group='Density'){node.setBoundVariable(key,V(group,role));}
function gap(node,role='inline-md'){bind(node,'itemSpacing','adaptive/gap/'+role);}
function border(node,role='border/default',group='Theme',fixed=false){node.strokes=[paint(role,group)];node.strokeAlign='INSIDE';if(fixed)node.strokeWeight=1;else bind(node,'strokeWeight','border/width','Borders');}
function frame(name,direction='VERTICAL'){const n=figma.createAutoLayout(direction);n.name=name;n.fills=[];n.clipsContent=false;return n;}
function prop(owner,name,type,value){return owner.addComponentProperty(name,type,value);}
async function textNode(value,style='Body',role='content/primary',group='Theme'){const n=figma.createText();n.name=value;n.fontName={family:'Inter',style:'Regular'};n.characters=value;const s=styles.find(s=>s.name==='Sloy UI / '+(style.includes('large')?'Controls / ':'Base / ')+style);if(!s)throw Error('Missing text style '+style);await n.setTextStyleIdAsync(s.id);fill(n,role,group);return n;}
function textProp(owner,node,name,value){node.componentPropertyReferences={characters:prop(owner,name,'TEXT',value)};}
function showProp(owner,node,name,value=true){node.visible=value;node.componentPropertyReferences={...node.componentPropertyReferences,visible:prop(owner,name,'BOOLEAN',value)};}
const iconMap=new Map(page.children.filter(n=>n.type==='COMPONENT'&&n.name.startsWith('.Icons/')).map(n=>[n.name.slice(7),n]));
function icon(name){const c=iconMap.get(name);if(!c)throw Error('Missing icon '+name);return c.createInstance();}
function recolorIcon(node,role,group='Theme'){for(const n of node.findAll(n=>'strokes' in n)){if(n.type==='FRAME'){n.fills=[];continue;}if(n.strokes.some(p=>p.visible!==false))n.strokes=[paint(role,group)];if('fills' in n&&n.fills.some(p=>p.visible!==false))fill(n,role,group);}}
function iconProp(owner,node,name,defaultName,visible){node.name=name;node.componentPropertyReferences={mainComponent:prop(owner,name,'INSTANCE_SWAP',page.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/'+defaultName).id)};if(visible!==undefined)showProp(owner,node,'Show '+name,visible);}
const sizes=['sm','md','lg','xl'];
const states=['Default','Hover','Pressed','Focus','Disabled'];
const stateName=state=>state==='Hover'?'hover':state==='Pressed'?'pressed':'normal';
function geometry(node,size,stretch=false){bind(node,'height','adaptive/control/height-'+size);radius(node);if(!stretch){bind(node,'paddingLeft','adaptive/control/padding-x-'+size);bind(node,'paddingRight','adaptive/control/padding-x-'+size);}gap(node,'inline-sm');}
function textStyle(size,weight='Label'){return ['lg','xl'].includes(size)?weight+' large':weight;}
function placeSet(set,cols=5){const cs=set.children;let x=40,y=40,rowHeight=0,maxX=0;for(let i=0;i<cs.length;i++){if(i&&i%cols===0){x=40;y+=rowHeight+32;rowHeight=0;}cs[i].x=x;cs[i].y=y;rowHeight=Math.max(rowHeight,cs[i].height);x+=cs[i].width+32;maxX=Math.max(maxX,x);}set.resizeWithoutConstraints(maxX+8,y+rowHeight+40);set.fills=[];set.clipsContent=false;set.x=1700;set.y=page.children.filter(n=>n.id!==set.id&&n.type==='COMPONENT_SET').reduce((y,n)=>Math.max(y,n.y+n.height+100),80);}
function allIds(roots){return [...new Set(roots.flatMap(n=>[n.id,...('findAll' in n?n.findAll(n=>!n.id.startsWith('I')).map(x=>x.id):[])]))];}
function report(roots=createdRoots){return {createdNodeIds:allIds(roots),sets:roots.filter(n=>n.type==='COMPONENT_SET').map(n=>({id:n.id,name:n.name,variants:n.children.length,properties:Object.keys(n.componentPropertyDefinitions),bounds:{w:n.width,h:n.height}}))};}
