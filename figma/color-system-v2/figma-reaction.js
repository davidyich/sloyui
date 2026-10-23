await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:12'));
for(const n of figma.currentPage.findAll(()=>true)){if('effects' in n&&n.effects.some(e=>e.type==='DROP_SHADOW')){n.effects=n.effects.map(e=>e.type==='DROP_SHADOW'?figma.variables.setBoundVariableForEffect(e,'color',vars['surface/alpha/stable/black/12']):e);mutatedNodeIds.push(n.id);}}
let c=figma.currentPage.findOne(n=>n.type==='COMPONENT'&&n.name==='V2 / Optional reaction');
if(c)return report({componentId:c.id});
c=mainComponent('V2 / Optional reaction',400);c.x=5120;c.y=240;pad(c,24);gap(c,16);rad(c,'large');fill(c,'surface/surface/bg');stroke(c);
c.description='Reactions is Off by default. The circular layer is visible only in On. This native specimen illustrates the layer; preview.html implements pointer-origin expansion, keyboard center, 420 ms cleanup, and reduced motion.';
txt(c,'Press surface','Heading');txt(c,'Normal + active remain the fill states.','Body','surface/content/secondary',352);
const button=box(c,'Reaction target',352,'HORIZONTAL',0,0,'surface/surface/primary/normal',88);rad(button,'medium');button.clipsContent=true;button.primaryAxisAlignItems='CENTER';
const ripple=track(figma.createEllipse());button.appendChild(ripple);ripple.name='Optional ripple · 5%';ripple.resize(150,150);ripple.layoutPositioning='ABSOLUTE';ripple.x=-12;ripple.y=-31;fill(ripple,'surface/reaction/on-primary');ripple.setBoundVariable('visible',vars['reactions/enabled']);
txt(button,'Continue','Body medium','surface/content/on-primary');txt(c,'Origin → pointer / keyboard center','Label','surface/content/secondary');
return report({componentId:c.id});
