// Common guide helpers and SLOY_IDS/SLOY_DATA preludes are supplied by build-sloy.mjs.
const sloyMasters = {};
const sloyNodeCache = new Map();
async function snode(id) { if (!id) throw Error('Missing Sloy dependency ID'); if (!sloyNodeCache.has(id)) sloyNodeCache.set(id, await figma.getNodeByIdAsync(id)); const node = sloyNodeCache.get(id); if (!node) throw Error('Stale Sloy dependency ID: '+id); return node; }
async function sfonts(node) {
  const texts = node.type === 'TEXT' ? [node] : 'findAllWithCriteria' in node ? node.findAllWithCriteria({types:['TEXT']}) : [];
  const fonts = new Map(texts.flatMap(t=>t.getStyledTextSegments(['fontName'])).map(s=>[JSON.stringify(s.fontName),s.fontName]));
  await Promise.all([...fonts.values()].map(font=>figma.loadFontAsync(font)));
}
async function sinstance(parent, name, props={}, variants={}) {
  const source = sloyMasters[name] || SLOY_IDS.sloy?.[name] || SLOY_IDS.components?.[name] || SLOY_IDS.controls?.[name];
  const owner = typeof source === 'string' ? await snode(source) : source;
  if (!owner || !['COMPONENT','COMPONENT_SET'].includes(owner.type)) throw Error('Missing Sloy component: '+name);
  const component = owner.type === 'COMPONENT_SET' ? owner.children.find(n=>n.type==='COMPONENT'&&Object.entries(variants).every(([k,v])=>n.variantProperties?.[k]===v)) || owner.defaultVariant : owner;
  await sfonts(component);
  const instance=component.createInstance(); parent.appendChild(instance); instance.name=name;
  const defs=owner.componentPropertyDefinitions, updates={};
  for (const [key,value] of Object.entries(props)) { const target=Object.keys(defs).find(k=>k===key||k.startsWith(key+'#')); if(target)updates[target]=value; }
  if(Object.keys(updates).length)instance.setProperties(updates);
  if(name==='TaskRow')for(const text of instance.findAllWithCriteria({types:['TEXT']}))text.textDecoration='NONE';
  return instance;
}
function sproperty(set,name,type,value) { return set.addComponentProperty(name,type,value); }
async function sgtext(parent,value,width,kind='body',role='content/primary/neutral') {
  const node=await gtext(parent,value,width,kind,role);
  if(parent.layoutMode==='VERTICAL')node.layoutSizingHorizontal='FILL';
  return node;
}
async function stext(parent,value,width,key,kind='body',role='content/primary/neutral') {
  const node=await sgtext(parent,value,width,kind,role); if(key)node.componentPropertyReferences={characters:key}; return node;
}
function sshow(node,key,value=true) { node.visible=value; node.componentPropertyReferences={...node.componentPropertyReferences,visible:key}; }
function sradius(node,role='md') { gradius(node,role); }
function sborder(node,role='border/subtle',group='Surface') { return gstroke(node,role,group); }
function siconId(name) { const aliases={Calendar:'CalendarDays',More:'MoreHorizontal'}; const id=SLOY_IDS.icons?.[name]||SLOY_IDS.icons?.[aliases[name]]; if(!id)throw Error('Missing icon: '+name); return id; }
async function sicon(parent,name,role='content/primary/neutral',size=20,propertyKey,group='Surface') {
  const component=await snode(siconId(name)); if(component.type!=='COMPONENT')throw Error('Icon must be a component: '+name);
  const node=component.createInstance(); parent.appendChild(node); node.name=name; if(node.width!==size)node.rescale(size/node.width);
  if(propertyKey)node.componentPropertyReferences={mainComponent:propertyKey};
  for(const child of node.findAll(n=>['VECTOR','ELLIPSE','LINE','RECTANGLE','BOOLEAN_OPERATION'].includes(n.type))) {
    if('strokes' in child&&child.strokes.some(p=>p.visible!==false))child.strokes=[gp(role,group)];
    if('fills' in child&&child.fills!==figma.mixed&&child.fills.some(p=>p.visible!==false))child.fills=[gp(role,group)];
  }
  return node;
}
async function siconButton(parent,icon,label,size='sm') { const button=await sinstance(parent,'iconButtonGhost',{Icon:siconId(icon)},{Size:size,State:'Default'}); button.name=label; return button; }
async function sroot(pageName,name,width=1600) { const result=await ginit(pageName,name); result.root.resize(width,result.root.height); result.root.layoutSizingHorizontal='FIXED'; result.root.layoutSizingVertical='HUG'; return result; }
async function sset(page,name,axes,width,build) {
  const fullName='Sloy/'+name;
  if(page.children.some(n=>n.type==='COMPONENT_SET'&&n.name===fullName))throw Error('Sloy set already exists: '+name);
  const {componentSet:set,variants}=await createComponentWithVariants({name:fullName,description:'Sloy composition: '+name+'. Editable data and native context bindings; appearance variants do not implement application actions.',variantAxes:axes,baseProps:{width,height:32,fills:[],layoutMode:'VERTICAL'},page});
  guideCreatedRoots.push(set);
  for(const variant of variants){variant.primaryAxisSizingMode='AUTO';variant.counterAxisSizingMode='FIXED';variant.clipsContent=false;variant.opacity=1;}
  await build(set,variants);
  for(const v of variants){
    if(!["Tabs/3","Tabs/5","WeekStrip"].includes(name)&&!v.children.some(n=>n.name===".Border"))gstroke(v,"border/subtle");
    for(const n of v.children.filter(n=>n.type==="FRAME"&&/^(Tab|Day|Choice) \d+$/.test(n.name)))gstroke(n,"border/subtle");
  }
  let y=24,w=0;for(const variant of variants){variant.x=24;variant.y=y;y+=variant.height+20;w=Math.max(w,variant.width);}
  set.resizeWithoutConstraints(w+48,y+4);set.fills=[];set.clipsContent=false;
  set.x=page.children.filter(n=>n.id!==set.id).reduce((right,n)=>Math.max(right,n.x+n.width+100),80);set.y=80;
  sloyMasters[name]=set;return set;
}
function scomponentMap(){return Object.fromEntries(Object.entries(sloyMasters).map(([name,set])=>[name,{id:set.id,variants:set.children.length,properties:Object.keys(set.componentPropertyDefinitions)}]));}
