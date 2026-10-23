import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory=new URL('./',import.meta.url),auditDirectory=new URL('../../artifacts/token-system-v4/',import.meta.url);
const sourceText=await readFile(new URL('source.json',directory),'utf8'),graphText=await readFile(new URL('graph.json',directory),'utf8');
const source=JSON.parse(sourceText),graph=JSON.parse(graphText),css=await readFile(new URL('tokens.css',directory),'utf8');
const owners=new Map(graph.collections.map(c=>[c.key,c])),tokens=new Map(graph.collections.flatMap(c=>c.variables.map(t=>[c.key+'/'+t.name,{...t,collection:c.key}])));
let checks=0,pairChecks=0;const check=(value,message)=>{checks++;assert.ok(value,message);},equal=(a,b,message)=>{checks++;assert.deepEqual(a,b,message);};
function resolve(path,selection={},seen=[]) {check(!seen.includes(path),'Cycle '+path);const token=tokens.get(path);check(token,'Missing '+path);const value=token.values[selection[token.collection]??graph.axes[token.collection]?.default??'Value'];check(value!==undefined,'Missing mode '+path);return value?.alias?resolve(value.alias,selection,[...seen,path]):value?.color?{...resolve(value.color.alias,selection,[...seen,path]),a:resolve(value.opacity.alias,selection,[...seen,path])/100}:value;}
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4,Y=c=>.2126*linear(c.r)+.7152*linear(c.g)+.0722*linear(c.b),ratio=(a,b)=>(Math.max(Y(a),Y(b))+.05)/(Math.min(Y(a),Y(b))+.05);
const composite=(fill,base)=>({r:fill.r*fill.a+base.r*(1-fill.a),g:fill.g*fill.a+base.g*(1-fill.a),b:fill.b*fill.a+base.b*(1-fill.a),a:1});
const BLACK={r:0,g:0,b:0,a:1},WHITE={r:1,g:1,b:1,a:1};
const hash=value=>createHash('sha256').update(value).digest('hex');
equal(graph.sourceHash,hash(sourceText),'Source freshness');equal(graph.schemaVersion,4,'Compatible schema');
equal(graph.axes.Surface.values,['Shell','Workspace','Content','Overlay','Invert','Glass'],'Six explicit surfaces');
equal(graph.conventions.accents,['blue','green','orange','red','pink','purple'],'Six named accents');check(!graph.axes.Accent,'No accent modes');
let composed=0;
for(const owner of graph.collections)for(const token of owner.variables){
 equal(Object.keys(token.values),owner.modes,'Complete modes '+owner.key+'/'+token.name);
 check(css.includes(token.css+':'),'CSS emitted '+token.name);
 for(const value of Object.values(token.values)) {
  if(value?.alias){check(value.alias.split('/')[0]!==owner.key,'Cross-collection alias');equal(tokens.get(value.alias)?.type,token.type,'Alias type');}
  else if(value?.color){composed++;check(token.type==='COLOR','Composed COLOR');for(const [part,type] of [['color','COLOR'],['opacity','FLOAT']]){check(value[part]?.alias?.split('/')[0]!==owner.key,'Cross-collection '+part);equal(tokens.get(value[part]?.alias)?.type,type,'Composition type');}check(value.opacity.alias.startsWith('Opacity/'),'Named opacity alias');}
  else {check(['Palette','Primitives'].includes(owner.key),'Raw values only in foundations');if(token.type==='FLOAT')check(Number.isInteger(value),'Whole number primitive '+token.name);if(token.type==='COLOR'){equal(owner.key,'Palette','Raw colors in Palette');check(Object.values(value).every(v=>Number.isFinite(v)&&v>=0&&v<=1),'RGBA channels');}}
 }
}
check(composed>0,'Native composed color aliases present');
equal(source.paletteSelection.alphaCount,0,'No alpha variants in the raw palette');
for(const token of owners.get('Palette').variables){equal(token.values.Value.a,1,'Every Palette color is opaque: '+token.name);check(!token.name.startsWith('alpha/'),'Alpha belongs to semantic composition: '+token.name);}
const rawPalette=owners.get('Palette').variables;
equal(rawPalette.length,source.paletteSelection.opaqueCount,'Only the unified ramps and neutral poles');
for(const token of rawPalette)check(/^(?:[a-z]+\/\d+|black|white)$/.test(token.name),'Palette names carry hue and step only: '+token.name);
for(const hue of graph.conventions.accents){const ramp=rawPalette.filter(t=>t.name.startsWith(hue+'/'));equal(ramp.length,source.accentSystem.paletteSteps,'One complete ramp '+hue);for(const [i,token]of ramp.entries()){equal(token.values.Value.a,1,'Opaque ramp');if(i)check(Y(token.values.Value)<Y(ramp[i-1].values.Value),'Monotonic ramp '+hue);}}
equal(rawPalette.filter(t=>t.name.startsWith('gray/')).length,source.palette.neutralSteps.length,'Shared neutral ramp');
const themes=['Light','Dark'],surfaces=graph.axes.Surface.values,schemes=graph.axes.SurfaceScheme.values,hues=['neutral',...graph.conventions.accents,...Object.keys(graph.conventions.legacyAccentAliases)],states=['normal','hover','pressed'];
let minimumText=Infinity,minimumFocus=Infinity;
for(const Theme of themes)for(const Surface of surfaces)for(const SurfaceScheme of schemes){
 const selection={Theme,Surface,SurfaceScheme},get=path=>resolve('Theme/'+path,selection),bg=get('surface/bg'),bases=Surface==='Glass'?[BLACK,WHITE].map(back=>composite(bg,back)):[bg];
 const neutralBackings=bases.flatMap(base=>[base,composite(get('surface/block'),base),...states.map(state=>composite(get('surface/secondary/neutral-'+state),base))]);
 if(SurfaceScheme==='Inverted')for(const token of owners.get('Theme').variables)equal(get(token.name),resolve('Theme/'+token.name,{Theme,Surface,SurfaceScheme:'Dimmed'}),'Inverted compatibility aliases Dimmed');
 if(['Shell','Workspace','Content','Overlay'].includes(Surface))check(rawPalette.some(t=>t.name.startsWith('gray/')&&JSON.stringify(t.values.Value)===JSON.stringify(bg)),'Surface uses an existing neutral step');
 if(Surface==='Invert'){equal(bg,Theme==='Light'?BLACK:WHITE,'Invert is opposite polarity without Theme swap');check(Theme==='Light'?Y(get('content/primary'))>.5:Y(get('content/primary'))<.1,'Invert content polarity');}
 if(Surface==='Glass')equal(bg.a,Theme==='Light'?.88:.8,'Protected glass opacity');
 for(const role of ['primary','secondary','tertiary','muted','caption'])for(const base of neutralBackings){const r=ratio(composite(get('content/'+role),base),base);check(r>=4.5-1e-7,'Neutral contrast '+Theme+'/'+Surface+'/'+role);minimumText=Math.min(minimumText,r);pairChecks++;}
 for(const hue of hues){
  const fg=get(hue==='neutral'?'content/on-primary':'content/on-primary/'+hue),ink=get('content/'+hue);
  for(const state of states){
   const primary=get('surface/primary/'+hue+'-'+state);check(ratio(composite(fg,primary),primary)>=4.5-1e-7,'Primary contrast '+hue);pairChecks++;
   for(const base of neutralBackings){const fill=composite(get('surface/secondary/'+hue+'-'+state),base),r=ratio(composite(ink,fill),fill);check(r>=4.5-1e-7,'Composed secondary contrast '+[Theme,Surface,hue,state].join('/'));minimumText=Math.min(minimumText,r);pairChecks++;}
   for(const base of bases){const fill=composite(get('surface/secondary/'+hue+'-'+state),base),r=ratio(get('border/focus'),fill);check(r>=3.1,'Focus '+[Theme,Surface,hue,state].join('/'));minimumFocus=Math.min(minimumFocus,r);}
  }
  if(hue!=='neutral'){equal(get('surface/secondary/'+hue+'-hover'),get('surface/secondary/'+hue+'-pressed'),'Two accent state aliases');for(const base of neutralBackings)check(ratio(composite(get('content/secondary/'+hue),base),base)>=4.5,'Muted accent text');}
 }
}
for(const percent of source.alphaSteps)for(const Theme of themes)for(const Surface of surfaces)for(const SurfaceScheme of schemes){
 const context={Theme,Surface,SurfaceScheme};
 for(const shade of ['white','black']){const value=resolve(`Theme/stable/alpha/${shade}-${percent}`,context);equal(value,{...(shade==='white'?WHITE:BLACK),a:percent/100},'Stable alpha ignores theme/surface');}
 for(const family of ['base','contrast']){const isWhite=(Theme==='Light')===(family==='base'),value=resolve(`Theme/adaptive/alpha/${family}-${percent}`,context);equal(value,{...(isWhite?WHITE:BLACK),a:percent/100},'Adaptive alpha depends only on Theme');}
}
for(const Density of ['Default','Compact']){const u=source.density[Density].unit;for(const [role,k] of Object.entries({xs:1,sm:2,md:3,lg:4,xl:6}))equal(resolve('Density/adaptive/padding/'+role,{Density}),Math.round(u*k),'Adaptive spacing');equal(resolve('Density/fixed/size/touch',{Density}),44,'Fixed touch size');}
for(const [Radius,base]of Object.entries(source.radius.modes))for(const [name,k]of Object.entries({base:1,...source.radius.ratios}))equal(resolve('Radius/radius/'+name,{Radius}),Math.round(base*k),'Radius independent');
for(const [name,mode]of Object.entries(graph.conventions.legacyAccentAliases))for(const Theme of themes)for(const Surface of surfaces)for(const state of states)equal(resolve('Theme/surface/secondary/'+name+'-'+state,{Theme,Surface}),resolve('Theme/surface/secondary/'+mode+'-'+state,{Theme,Surface}),'Legacy accent alias');
const report={result:'pass',checks,pairChecks,composedValues:composed,accents:graph.conventions.accents.length,surfaces:surfaces.length,minimumTextContrast:minimumText,minimumFocusContrast:minimumFocus,sourceHash:graph.sourceHash,graphHash:hash(graphText)};
await writeFile(new URL('verification.json',auditDirectory),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
