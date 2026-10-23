// Six context color proof for representative disabled masters; read-only.
const page=figma.root.children.find(n=>n.name==='02 · Controls');
const cs=(await figma.variables.getLocalVariableCollectionsAsync()).map(c=>({id:c.id,name:c.name,modes:c.modes,defaultModeId:c.defaultModeId}));
const cm=new Map(cs.map(c=>[c.id,c])),vm=new Map((await figma.variables.getLocalVariablesAsync()).map(v=>[v.id,v]));const snapshots=new Map();
function snapshot(id){if(!snapshots.has(id)){const v=vm.get(id);if(!v)throw Error('Broken variable '+id);snapshots.set(id,{id,name:v.name,collectionId:v.variableCollectionId,values:v.valuesByMode});}return snapshots.get(id);}
function resolve(id,axes,seen=new Set()){
 if(seen.has(id))throw Error('Alias cycle');seen.add(id);const v=snapshot(id),c=cm.get(v.collectionId),mode=c.modes.find(m=>m.name===axes[c.name.replace(/^V2 · /,'')])?.modeId??c.defaultModeId;const z=v.values[mode];return z?.type==='VARIABLE_ALIAS'?resolve(z.id,axes,seen):z;
}
const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const luminance=c=>[c.r,c.g,c.b].map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
function paint(p,axes){const z=p.boundVariables?.color?resolve(p.boundVariables.color.id,axes):p.color;return {...z,a:(z.a??1)*(p.opacity??1)};}
const sets=page.children.filter(n=>n.type==='COMPONENT_SET');const samples=[];
for(const name of ['Button/Primary','Input/Outside','Slider']){
 const set=sets.find(n=>n.name===name);const c=set?.children.find(n=>n.variantProperties.State==='Disabled'&&(name==='Slider'?n.variantProperties.Value==='50':n.variantProperties.Size==='md'));if(!c)throw Error('Missing representative '+name);
 const texts=c.findAll(n=>n.type==='TEXT'&&(name==='Button/Primary'?n.name==='Label':name==='Input/Outside'?n.name==='Value':n.characters==='Opacity'));
 for(const text of texts){const ancestors=[];for(let n=text.parent;n&&n!==c.parent;n=n.parent)ancestors.unshift({opacity:n.opacity,fills:Array.isArray(n.fills)?n.fills.filter(p=>p.type==='SOLID'&&p.visible!==false):[]});samples.push({id:text.id,family:name,visible:text.visible,opacity:text.opacity,paint:text.fills.find(p=>p.type==='SOLID'&&p.visible!==false),ancestors});}
}
if(samples.length!==3)throw Error('Expected three representative text nodes, got '+samples.length);
const surface=cs.find(c=>c.name==='V2 · Surface');const bgVariable=[...vm.values()].find(v=>v.variableCollectionId===surface.id&&v.name==='surface/bg');
const pairs=[];
for(const sample of samples)for(const Theme of ['Light','Dark'])for(const Surface of ['Content','Invert','Shell']){
 const axes={Theme,Scheme:'Standard',Surface,Accent:'Neutral'};let bg={...resolve(bgVariable.id,axes),a:1};let opacity=sample.opacity;
 for(const n of sample.ancestors){opacity*=n.opacity;for(const p of [...n.fills].reverse()){const f=paint(p,axes);f.a*=n.opacity;bg=over(f,bg);}}
 const fg=paint(sample.paint,axes);fg.a*=opacity;const ink=over(fg,bg),a=luminance(ink),b=luminance(bg);pairs.push({id:sample.id,family:sample.family,Theme,Surface,visible:sample.visible,opacity,background:bg,ink,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
}
const fractionalReadFloats=[...snapshots.values()].filter(v=>Object.values(v.values).some(z=>typeof z==='number'&&!Number.isInteger(z))).map(v=>({id:v.id,name:v.name}));
const failures=pairs.filter(p=>!p.visible||p.opacity!==1||p.contrast<4.5-1e-6);
return {readOnly:true,result:failures.length||fractionalReadFloats.length?'fail':'pass',pairChecks:pairs.length,variableSnapshots:snapshots.size,minimumContrast:Math.min(...pairs.map(p=>p.contrast)),failures,fractionalReadFloats,pairs,scope:'Representative live bindings across Light/Dark x Content/Invert/Shell. Full graph integer FLOAT validation is a separate existing source/native audit; this script does not claim to repeat it.'};
