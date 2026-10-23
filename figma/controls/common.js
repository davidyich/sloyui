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
// Figma interprets a FLOAT bound to opacity as percent: Off=0, On=100.
// Only empty border geometry uses border/opacity; actual node.opacity is 0/1.
// Stroke geometry stays literal 0.5 px; text/fills never inherit layer opacity.
function border(node,role='border/default',group='Theme'){
 if(!('children' in node)||['TEXT','INSTANCE'].includes(node.type))throw Error('Border requires a control container: '+node.id);
 node.setBoundVariable('strokeWeight',null);node.strokeWeight=0.5;node.strokeAlign='INSIDE';
 let layer='children' in node?node.children.find(n=>n.name==='.Border'):null;
 node.strokes=[];
 if(!layer){layer=figma.createRectangle();layer.name='.Border';node.appendChild(layer);layer.layoutPositioning='ABSOLUTE';}
 layer.visible=true;layer.fills=[];layer.strokes=[paint(role,group)];layer.setBoundVariable('strokeWeight',null);layer.strokeWeight=0.5;layer.strokeAlign='INSIDE';
 layer.resize(node.width,node.height);layer.x=0;layer.y=0;layer.constraints={horizontal:'STRETCH',vertical:'STRETCH'};
 if(typeof node.cornerRadius==='number')layer.cornerRadius=node.cornerRadius;
 const corner=node.boundVariables?.cornerRadius;if(corner)layer.setBoundVariable('cornerRadius',variables.find(v=>v.id===corner.id));
 bind(layer,'opacity','border/opacity','Borders');
}
// All control contours follow the inherited Borders axis, including Outline/Error.
// Masters/instances must not pin On: the collection default owns the default.
function buttonBorder(node,appearance,state){
 const s=stateName(state);
 if(state==='Disabled')border(node,'border/neutral-normal');
 else if(appearance==='Outline')border(node,'border/strong');
 else if(appearance==='Ghost')border(node,'border/neutral-'+s);
 else if(appearance==='Danger')border(node,'border/red-'+s);
 else border(node,'border/'+s,'Accent');
}
function selectionBorder(node,selected,state){
 if(state==='Disabled')border(node,'border/neutral-normal');
 else border(node,selected?'border/'+stateName(state):'border/neutral-'+stateName(state),selected?'Accent':'Theme');
}
function clearBorder(node){node.strokes=[];node.setBoundVariable('strokeWeight',null);node.strokeWeight=0.5;const layer=node.children?.find(n=>n.name==='.Border');if(layer)layer.visible=false;}
function restoreInk(node,role,group='Theme'){
 node.setBoundVariable('opacity',null);node.opacity=1;
 if(node.type==='TEXT')fill(node,role,group);else recolorIcon(node,role,group);
}

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
const stateName=state=>state==='Hover'||state==='Focus'?'hover':state==='Pressed'?'pressed':'normal';
function geometry(node,size,stretch=false){bind(node,'height','adaptive/control/height-'+size);radius(node);if(!stretch){bind(node,'paddingLeft','adaptive/control/padding-x-'+size);bind(node,'paddingRight','adaptive/control/padding-x-'+size);}gap(node,'inline-sm');}
function textStyle(size,weight='Label'){return ['lg','xl'].includes(size)?weight+' large':weight;}
function placeSet(set,cols=5){const cs=set.children;let x=40,y=40,rowHeight=0,maxX=0;for(let i=0;i<cs.length;i++){if(i&&i%cols===0){x=40;y+=rowHeight+32;rowHeight=0;}cs[i].x=x;cs[i].y=y;rowHeight=Math.max(rowHeight,cs[i].height);x+=cs[i].width+32;maxX=Math.max(maxX,x);}set.resizeWithoutConstraints(maxX+8,y+rowHeight+40);set.fills=[];set.clipsContent=false;set.x=1700;set.y=page.children.filter(n=>n.id!==set.id&&n.type==='COMPONENT_SET').reduce((y,n)=>Math.max(y,n.y+n.height+100),80);}
function allIds(roots){return [...new Set(roots.flatMap(n=>[n.id,...('findAll' in n?n.findAll(n=>!n.id.startsWith('I')).map(x=>x.id):[])]))];}
function report(roots=createdRoots){return {createdNodeIds:allIds(roots),sets:roots.filter(n=>n.type==='COMPONENT_SET').map(n=>({id:n.id,name:n.name,variants:n.children.length,properties:Object.keys(n.componentPropertyDefinitions),bounds:{w:n.width,h:n.height}}))};}

// Palette Lab FillSlider uses a filled ParameterSlider row, not a range rail.
// Reuse named descendants when patching so component, variant and text IDs survive.
async function layoutParameterSlider(c,keys={}){
 const {Value:value,State:state}=c.variantProperties;const step=Number(value)/25;const disabled=state==='Disabled';
 c.opacity=1;c.setBoundVariable('opacity',null);c.layoutMode='VERTICAL';c.primaryAxisSizingMode='FIXED';c.counterAxisSizingMode='FIXED';c.itemSpacing=0;c.clipsContent=true;bind(c,'height','adaptive/control/height-md');radius(c);fill(c,disabled?'surface/disabled':'surface/secondary/neutral-normal');
 let heading=c.children.find(n=>n.name==='Heading');if(!heading){heading=frame('Heading','HORIZONTAL');c.appendChild(heading);}
 let control=c.children.find(n=>n.name==='Slider control');if(!control){control=frame('Slider control','HORIZONTAL');c.insertChild(0,control);}else c.insertChild(0,control);
 control.layoutPositioning='ABSOLUTE';control.resize(c.width,c.height);control.x=0;control.y=0;control.constraints={horizontal:'STRETCH',vertical:'STRETCH'};control.setBoundVariable('height',null);control.paddingLeft=0;control.paddingRight=0;control.itemSpacing=0;control.counterAxisAlignItems='CENTER';control.fills=[];clearBorder(control);
 let rail=control.children.find(n=>n.name==='Track');if(!rail){rail=frame('Track','HORIZONTAL');control.appendChild(rail);}
 rail.resize(control.width,control.height);rail.layoutSizingHorizontal='FILL';rail.layoutSizingVertical='FILL';rail.itemSpacing=0;rail.itemReverseZIndex=false;rail.fills=[];
 const segments=[];for(let i=0;i<4;i++){
  let segment=rail.children.find(n=>n.name==='Track '+(i+1));if(!segment){segment=frame('Track '+(i+1),'HORIZONTAL');rail.appendChild(segment);}
  segment.resize(rail.width/4,rail.height);segment.layoutSizingHorizontal='FILL';segment.layoutSizingVertical='FILL';segment.fills=[];clearBorder(segment);
  for(const key of ['cornerRadius','topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])segment.setBoundVariable(key,null);
  segment.cornerRadius=0;if(i<step)fill(segment,disabled?'surface/secondary/neutral-normal':'surface/secondary/neutral-'+(state==='Default'?'pressed':stateName(state)));segments.push(segment);
 }
 let thumb=c.findOne(n=>n.name==='Thumb');if(!thumb){thumb=figma.createRectangle();thumb.name='Thumb';}
 const anchor=segments[step===0?0:step-1];anchor.appendChild(thumb);thumb.layoutPositioning='ABSOLUTE';thumb.resize(2,14);thumb.x=step===0?0:step===4?anchor.width-2:anchor.width-1;thumb.y=(anchor.height-14)/2;thumb.constraints={horizontal:step===0?'MIN':'MAX',vertical:'CENTER'};thumb.setBoundVariable('cornerRadius',null);thumb.cornerRadius=1;fill(thumb,disabled?'content/disabled':['Focus','Pressed'].includes(state)?'content/primary':'content/secondary');clearBorder(thumb);thumb.opacity=1;
 heading.layoutPositioning='AUTO';heading.resize(c.width,c.height);heading.layoutSizingHorizontal='FILL';heading.layoutSizingVertical='FILL';heading.counterAxisAlignItems='CENTER';heading.primaryAxisAlignItems='MAX';heading.itemSpacing=12;heading.fills=[];bind(heading,'paddingLeft','adaptive/control/padding-x-md');bind(heading,'paddingRight','adaptive/control/padding-x-md');
 let label=heading.children.find(n=>n.type==='TEXT');if(!label){label=await textNode('Opacity','Body');label.name='Label';heading.insertChild(0,label);}
 label.layoutSizingHorizontal='FILL';restoreInk(label,disabled?'content/disabled':'content/secondary');if(keys.label)label.componentPropertyReferences={characters:keys.label,visible:keys.showLabel};
 let display=heading.children.find(n=>n.name==='Value');if(!display){display=frame('Value','HORIZONTAL');heading.appendChild(display);}display.itemSpacing=3;display.counterAxisAlignItems='CENTER';if(keys.showValue)display.componentPropertyReferences={visible:keys.showValue};
 let val=display.children.find(n=>n.type==='TEXT'&&n.name!=='Unit');if(!val){val=await textNode(value,'Body');val.name='Value text';display.appendChild(val);}restoreInk(val,disabled?'content/disabled':'content/primary');
 let unit=display.children.find(n=>n.type==='TEXT'&&n.id!==val.id);if(!unit){unit=await textNode('%','Body');unit.name='Unit';display.appendChild(unit);}restoreInk(unit,disabled?'content/disabled':'content/secondary');if(keys.unit)unit.componentPropertyReferences={characters:keys.unit};
 border(c,'border/neutral-normal');
}
