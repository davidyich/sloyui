// Shared Plugin API prelude. Concatenate with one page-specific construction script.
const createdNodeIds=[],mutatedNodeIds=[],styleIds=[];
await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const collections=await figma.variables.getLocalVariableCollectionsAsync();
const col=Object.fromEntries(collections.filter(c=>c.name.startsWith('V2 · ')).map(c=>[c.name.slice(5).toLowerCase(),c]));
const allVariables=await figma.variables.getLocalVariablesAsync();
const vars={};for(const [key,c] of Object.entries(col))for(const v of allVariables.filter(v=>v.variableCollectionId===c.id))vars[key+'/'+v.name]=v;
const varsByCss=Object.fromEntries(allVariables.filter(v=>v.codeSyntax.WEB).map(v=>[v.codeSyntax.WEB,v]));
const existingStyles=await figma.getLocalTextStylesAsync();
const styles={};
for(const [name,size,line,weight] of [['Caption',11,16,'Medium'],['Label',12,18,'Medium'],['Body',14,21,'Regular'],['Body medium',14,21,'Medium'],['Heading',20,28,'Semi Bold'],['Title',28,36,'Semi Bold'],['Display',40,48,'Semi Bold']]) {
 let style=existingStyles.find(s=>s.name==='V2/'+name);if(!style)style=figma.createTextStyle();
 style.name='V2/'+name;style.fontName={family:'Inter',style:weight};style.fontSize=size;style.lineHeight={unit:'PIXELS',value:line};styles[name]=style;styleIds.push(style.id);
}
function track(n){createdNodeIds.push(n.id);return n;}
function mode(n,key,name){const c=col[key];const m=c.modes.find(m=>m.name===name);if(!m)throw new Error('Missing mode '+key+'/'+name);n.setExplicitVariableModeForCollection(c,m.modeId);}
function paint(key){const v=vars[key]??varsByCss['var(--sloy-v2-'+key.replaceAll('/','-')+')'];if(!v)throw new Error('Unknown variable '+key);return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',v);}
function fill(n,key){n.fills=key?[paint(key)]:[];return n;}
function stroke(n,key='surface/border/subtle'){n.strokes=[paint(key)];n.strokeWeight=1;n.strokeAlign='INSIDE';return n;}
function rad(n,kind='medium'){for(const prop of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])n.setBoundVariable(prop,vars['geometry/radius/'+kind]);}
function pad(n,value){for(const prop of ['paddingLeft','paddingRight','paddingTop','paddingBottom']){if(vars['geometry/space/'+value])n.setBoundVariable(prop,vars['geometry/space/'+value]);else n[prop]=value;}}
function gap(n,value){if(vars['geometry/space/'+value])n.setBoundVariable('itemSpacing',vars['geometry/space/'+value]);else n.itemSpacing=value;}
function box(parent,name,width,direction='VERTICAL',padding=0,spacing=0,color=null,height=null){
 const n=track(figma.createAutoLayout(direction));n.name=name;n.fills=[];n.clipsContent=false;
 if(parent)parent.appendChild(n);n.resize(width||100,height||100);
 n.primaryAxisSizingMode=height?'FIXED':'AUTO';n.counterAxisSizingMode='FIXED';
 if(direction==='HORIZONTAL'){n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode=height?'FIXED':'AUTO';n.counterAxisAlignItems='CENTER';}
 if(!width&&parent)n.layoutSizingHorizontal='FILL';pad(n,padding);gap(n,spacing);if(color)fill(n,color);return n;
}
function txt(parent,text,style='Body',color='surface/content/primary',width=null){
 const n=track(figma.createText());n.name=text.length>50?text.slice(0,50):text;n.fontName={family:'Inter',style:'Regular'};n.characters=text;n.textStyleId=styles[style].id;fill(n,color);parent.appendChild(n);
 if(width){n.textAutoResize='HEIGHT';n.resize(width,n.height);}return n;
}
function line(parent,width){const n=track(figma.createRectangle());n.name='Divider';parent.appendChild(n);n.resize(width,1);fill(n,'surface/border/subtle');return n;}
function pill(parent,label,bg='surface/surface/secondary/normal',fg='surface/content/primary',width=null,height=34){
 const n=box(parent,label,width||Math.max(48,label.length*7+24),'HORIZONTAL',0,8,bg,height);n.primaryAxisAlignItems='CENTER';rad(n,'small');txt(n,label,'Label',fg);return n;
}
function icon(parent,name,svgPath,color='surface/content/secondary',size=18){
 const n=track(figma.createNodeFromSvg('<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="'+svgPath+'" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
 n.name='Icon/'+name;parent.appendChild(n);n.resize(size,size);for(const v of n.findAllWithCriteria({types:['VECTOR']})){createdNodeIds.push(v.id);if(v.strokes.length)v.strokes=[paint(color)];if(v.fills.length)v.fills=[paint(color)];}return n;
}
function shadow(n){n.effects=[...n.effects.filter(e=>e.type!=='DROP_SHADOW'),figma.variables.setBoundVariableForEffect({type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:.12},offset:{x:0,y:8},radius:24,spread:-4,visible:true,blendMode:'NORMAL'},'color',vars['surface/alpha/stable/black/12'])];}
function glass(n){n.effects=[{type:'BACKGROUND_BLUR',blurType:'NORMAL',radius:24,visible:true}];n.effects=[figma.variables.setBoundVariableForEffect(n.effects[0],'radius',vars['geometry/glass/blur'])];}
function mainComponent(name,width){const c=track(figma.createComponent());c.name=name;c.layoutMode='VERTICAL';c.resize(width,100);c.primaryAxisSizingMode='AUTO';c.counterAxisSizingMode='FIXED';c.fills=[];c.x=240;c.y=240;return c;}
function instance(parent,c,name){const n=track(c.createInstance());n.name=name;parent.appendChild(n);return n;}
function report(extra={}){return {createdNodeIds,mutatedNodeIds,styleIds,...extra};}
