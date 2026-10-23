// Prelude: APP_ICON_SVGS, followed by common.js. Reuses existing icon masters.
const iconPage=await figma.getNodeByIdAsync('155:4');await figma.setCurrentPageAsync(iconPage);
const iconCreated=[],iconMap={};
let iconX=iconPage.children.reduce((m,n)=>Math.max(m,n.x+n.width),80)+120;
for(const [name,svg] of Object.entries(APP_ICON_SVGS)){
 const existing=iconPage.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/'+name);
 if(existing){iconMap[name]=existing.id;continue;}
 const c=figma.createComponent();c.name='.Icons/'+name;c.resize(20,20);c.fills=[];c.description='Lucide '+name+'; swap this icon instance. Inherits neutral content.';iconPage.appendChild(c);c.x=iconX;c.y=80;iconX+=48;
 const svgNode=figma.createNodeFromSvg(svg);c.appendChild(svgNode);svgNode.resize(20,20);svgNode.x=0;svgNode.y=0;svgNode.constraints={horizontal:'SCALE',vertical:'SCALE'};
 for(const n of svgNode.findAll(()=>true)){if('constraints'in n)n.constraints={horizontal:'SCALE',vertical:'SCALE'};
  if('strokes'in n&&Array.isArray(n.strokes)&&n.strokes.length)n.strokes=n.strokes.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',gv('Surface','content/primary/neutral')):p);
  if('fills'in n&&Array.isArray(n.fills)&&n.fills.length)n.fills=n.fills.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',gv('Surface','content/primary/neutral')):p);
 }
 iconMap[name]=c.id;iconCreated.push(c,...c.findAll(()=>true));
}
return {icons:iconMap,createdNodeIds:iconCreated.map(n=>n.id),mutatedNodeIds:[iconPage.id]};
