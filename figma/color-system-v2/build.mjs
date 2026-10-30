import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export {composite,luminance,contrast,chroma} from './color-engine.mjs';
import {figmaName} from './figma-names.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
export const historicalSource=JSON.parse(fs.readFileSync(path.join(dir,'source.json')));
const canonicalBytes=fs.readFileSync(path.join(dir,'../token-system-v4/graph.json'));
export const canonicalGraph=JSON.parse(canonicalBytes);
const canonicalSource=JSON.parse(fs.readFileSync(path.join(dir,'../token-system-v4/source.json')));
const canonicalCollections=new Map(canonicalGraph.collections.map(c=>[c.key,c]));
const canonicalVariables=new Map(canonicalGraph.collections.flatMap(c=>c.variables.map(v=>[`${c.key}/${v.name}`,v])));
const canonicalPalette=canonicalCollections.get('Palette');
if(!canonicalPalette)throw new Error('Build the canonical v4 graph before the v2 bridge.');
const accents=[...new Set(canonicalPalette.variables.filter(v=>/^[a-z]+\/01$/.test(v.name)).map(v=>v.name.split('/')[0]))];
if(JSON.stringify(accents.slice().sort())!==JSON.stringify(canonicalSource.accentSystem.accents.slice().sort())||canonicalPalette.variables.length!==canonicalSource.paletteSelection.opaqueCount)throw new Error('V2 requires canonical shared hue ramps, neutral and black/white.');
// source.json remains the historical v2 specimen. Its public exports use the
// shared accent inventory while retaining existing axis names and their order.
export const source={...historicalSource,accents,alphaSteps:[...new Set([...canonicalSource.alphaSteps,...historicalSource.alphaSteps])].sort((a,b)=>a-b),surfaces:[...new Set([...historicalSource.surfaces,'Invert'])]};
export const graph={name:source.name,version:source.version,accents,axes:{theme:source.themes,scheme:source.schemes,surface:source.surfaces,reactions:['Off','On']},bridge:{source:'figma/token-system-v4/graph.json',sourceHash:canonicalGraph.sourceHash,graphSha256:createHash('sha256').update(canonicalBytes).digest('hex'),palette:'One shared opaque ramp per hue; semantic colors select a step and an Opacity alias.',legacyLogicalKeys:'Preserved outside Palette; Figma names group by role with context in the leaf.'},collections:[]};
const byKey=new Map();
const fill=['FRAME_FILL','SHAPE_FILL'];
const content=['TEXT_FILL','SHAPE_FILL','STROKE_COLOR'];
const allColor=[...fill,'TEXT_FILL','STROKE_COLOR','EFFECT_COLOR'];
const ref=alias=>({alias});
const clone=value=>structuredClone(value);
function collection(key,name,modes,hidden=false){const c={key,name,modes,hidden,variables:[]};graph.collections.push(c);return c;}
function variable(c,name,values,scopes=[],description='',type='COLOR'){
  if(byKey.has(`${c.key}/${name}`))throw new Error(`Duplicate variable: ${c.key}/${name}`);
  const v={name,figmaName:figmaName(c.key,name),type,values,scopes:type==='BOOLEAN'?['ALL_SCOPES']:scopes,description,css:`--sloy-v2-${c.key}-${name.replaceAll('/','-')}`};
  if(c.key==='surface'&&name==='content/strong'){v.scopes=[];v.description='Legacy strong. Use content/primary/neutral. Retained for existing bindings; excluded from property pickers.';}
  if(c.key==='surface'&&name==='content/inverted')v.description='Opposite-polarity text and icons. Pair with surface/primary/neutral-normal or neutral-active; not with the region background.';
  c.variables.push(v);byKey.set(`${c.key}/${name}`,v);return v;
}
const palette=collection('palette','V2 · Palette',['Value'],true);
for(const v of canonicalPalette.variables){
  if(!/^(?:[a-z]+\/\d+|black|white)$/.test(v.name)||v.type!=='COLOR'||v.values.Value?.a!==1)throw new Error(`Non-ramp canonical Palette value: ${v.name}`);
  variable(palette,v.name,clone(v.values),[],'Shared canonical opaque palette step. Identical in every theme and surface.');
}
const primitives=collection('primitives','V2 · Primitives',['Value'],true);
for(const [name,value] of Object.entries({'space/4':4,'space/8':8,'space/12':12,'space/16':16,'space/20':20,'space/24':24,'space/32':32,'radius/small':6,'radius/medium':10,'radius/large':16,'glass/blur':source.glass.blur,'reaction/duration':source.reaction.durationMs,'reaction/off':false,'reaction/on':true}))variable(primitives,name,{Value:value},[],'Fixed specimen geometry / optional reaction setting.',typeof value==='boolean'?'BOOLEAN':'FLOAT');
const theme=collection('theme','V2 · Theme',source.themes);
const scheme=collection('scheme','V2 · Scheme',source.schemes);
const surface=collection('surface','V2 · Surface',source.surfaces);
const opacity=collection('opacity','V2 · Opacity',['Value']);
const reactions=collection('reactions','V2 · Reactions',['Off','On']);
const geometry=collection('geometry','V2 · Geometry',['Value']);
for(const v of primitives.variables.filter(v=>v.name.startsWith('space/')||v.name.startsWith('radius/')||v.name==='glass/blur'))variable(geometry,v.name,{Value:ref(`primitives/${v.name}`)},v.name.startsWith('space/')?['GAP']:v.name.startsWith('radius/')?['CORNER_RADIUS']:['EFFECT_FLOAT'],'Shared fixed specimen geometry.','FLOAT');
variable(reactions,'enabled',{Off:ref('primitives/reaction/off'),On:ref('primitives/reaction/on')},[],'Optional pointer-origin ripple. Default Off. Reduced motion removes expansion.','BOOLEAN');
variable(reactions,'duration',{Off:ref('primitives/reaction/duration'),On:ref('primitives/reaction/duration')},[],'Duration in ms; used only when enabled.','FLOAT');

function canonicalValue(key,context,seen=new Set()){
  if(seen.has(key))throw new Error(`Canonical alias cycle: ${key}`);
  const v=canonicalVariables.get(key);if(!v)throw new Error(`Missing canonical alias: ${key}`);
  const c=canonicalCollections.get(key.split('/')[0]);
  const mode=context[c.key]??c.modes[0],value=v.values[mode];
  if(value===undefined)throw new Error(`Missing canonical value: ${key}/${mode}`);
  return {value,next:new Set([...seen,key])};
}
export function resolveCanonical(key,context={},seen=new Set()){
  const {value,next}=canonicalValue(key,context,seen);
  if(value?.alias)return resolveCanonical(value.alias,context,next);
  if(value?.color&&value?.opacity)return {...resolveCanonical(value.color.alias,context,next),a:resolveCanonical(value.opacity.alias,context,next)/100};
  return value;
}
function addOpacity(name,percent){
  if(!Number.isFinite(percent)||percent<0||percent>100)throw new Error(`Invalid opacity: ${name}`);
  if(byKey.has(`opacity/${name}`)){if(resolve(`opacity/${name}`)!==percent)throw new Error(`Conflicting opacity: ${name}`);return;}
  variable(primitives,`opacity/${name}`,{Value:percent},[],'Color opacity in percent, 0–100.','FLOAT');
  variable(opacity,name,{Value:ref(`primitives/opacity/${name}`)},['COLOR_OPACITY'],'Shared color opacity percentage; affects the paint, not the whole layer.','FLOAT');
}
for(const v of canonicalCollections.get('Opacity').variables)addOpacity(v.name,resolveCanonical(`Opacity/${v.name}`));
// Keep all historical Opacity and Primitives identities, including old soft-fill
// percentages no longer selected by canonical roles. These are numbers, not RGB.
for(const percent of [...historicalSource.alphaSteps,7,11,12,17,22])addOpacity(String(percent).replaceAll('.','-'),percent);

// Collapse the v4 routing order into the existing v2 routing order, stopping at
// Palette and Opacity identities. Never resolve a semantic color to a raw RGBA.
export function canonicalSelection(key,context={},seen=new Set()){
  if(key.startsWith('Palette/')){
    const name=key.slice(8);if(!byKey.has(`palette/${name}`))throw new Error(`Missing shared step: ${key}`);
    return ref(`palette/${name}`);
  }
  if(key.startsWith('Opacity/')){
    const name=key.slice(8);if(!byKey.has(`opacity/${name}`))throw new Error(`Missing shared opacity: ${key}`);
    return ref(`opacity/${name}`);
  }
  const {value,next}=canonicalValue(key,context,seen);
  if(value?.alias)return canonicalSelection(value.alias,context,next);
  if(value?.color?.alias&&value?.opacity?.alias){
    const color=canonicalSelection(value.color.alias,context,next),alpha=canonicalSelection(value.opacity.alias,context,next);
    if(!color.alias?.startsWith('palette/')||!alpha.alias?.startsWith('opacity/'))throw new Error(`Invalid canonical composition: ${key}`);
    return {color,opacity:alpha};
  }
  throw new Error(`Raw canonical semantic value: ${key}`);
}
export function resolve(key,context={},seen=new Set()){
  if(seen.has(key))throw new Error(`Alias cycle: ${key}`);
  const v=byKey.get(key);if(!v)throw new Error(`Missing alias: ${key}`);
  const c=graph.collections.find(c=>c.key===key.split('/')[0]);
  const value=v.values[context[c.key]??c.modes[0]];if(value===undefined)throw new Error(`Missing value: ${key}`);
  const next=new Set([...seen,key]);
  if(value?.alias)return resolve(value.alias,context,next);
  if(value?.color&&value?.opacity)return {...resolve(value.color.alias,context,next),a:resolve(value.opacity.alias,context,next)/100};
  return value;
}

// These legacy logical names are the identity contract for existing v2 canvas
// bindings. Only their display names and canonical selections change.
export const roleBindings={
  'surface/bg':'surface/bg',
  'surface/primary/normal':'surface/primary/neutral-normal',
  'surface/primary/active':'surface/primary/neutral-pressed',
  'surface/invert/normal':'surface/primary/neutral-normal',
  'surface/invert/active':'surface/primary/neutral-pressed',
  // Exactly the neutral backing contract in canonical palette-contexts.json.
  'surface/secondary/normal':'surface/block',
  'surface/secondary/active':'surface/secondary/neutral-pressed',
  'surface/tertiary/normal':'surface/secondary/neutral-normal',
  'surface/tertiary/active':'surface/secondary/neutral-hover',
};
for(const hue of accents){
  for(const state of source.states)for(const role of ['primary','secondary','tertiary'])roleBindings[`surface/accent/${hue}/${role}/${state}`]=`surface/${role}/${hue}-${state==='normal'?'normal':'pressed'}`;
  roleBindings[`content/accent/${hue}/primary`]=`content/${hue}`;
  roleBindings[`content/accent/${hue}/secondary`]=`content/secondary/${hue}`;
  roleBindings[`content/accent/${hue}/on-primary`]=`content/on-primary/${hue}`;
  roleBindings[`border/accent/${hue}`]=`border/${hue}-normal`;
}
for(const role of ['primary','secondary','tertiary','muted','disabled','inverted','on-primary'])roleBindings[`content/${role}`]=`content/${role}`;
roleBindings['content/strong']='content/primary';
roleBindings['content/on-invert']='content/on-primary';
for(const role of ['subtle','default','strong'])roleBindings[`border/${role}`]=`border/${role}`;
roleBindings['reaction/on-surface']=`adaptive/alpha/contrast-${source.reaction.opacity}`;
roleBindings['reaction/on-primary']=`adaptive/alpha/base-${source.reaction.opacity}`;
roleBindings['reaction/subtle']=`adaptive/alpha/contrast-${source.reaction.reducedOpacity}`;
const opposite=t=>t==='Light'?'Dark':'Light';
export function roleContext(role,t,s,sf){
  const invertedPair=role.startsWith('surface/invert/')||role==='content/on-invert';
  const reactionOnInvert=role.startsWith('reaction/')&&sf==='Invert';
  return {Theme:invertedPair||reactionOnInvert?opposite(t):t,SurfaceScheme:s,Surface:sf};
}
const maps={};
for(const t of source.themes)for(const s of source.schemes)for(const sf of source.surfaces)maps[`${t}/${s}/${sf}`]=Object.fromEntries(Object.entries(roleBindings).map(([role,key])=>[role,canonicalSelection(`Theme/${key}`,roleContext(role,t,s,sf))]));
const roleNames=Object.keys(roleBindings);
function scopesFor(name){return name.startsWith('content/')?content:name.startsWith('border/')?['STROKE_COLOR']:fill;}
for(const s of source.schemes)for(const sf of source.surfaces)for(const role of roleNames){
  const name=`${s.toLowerCase()}/${sf.toLowerCase()}/${role}`;
  variable(theme,name,Object.fromEntries(source.themes.map(t=>[t,maps[`${t}/${s}/${sf}`][role]])),[],'Internal route from the shared canonical graph. Bind the corresponding V2 · Surface role.');
}
for(const sf of source.surfaces)for(const role of roleNames){const name=`${sf.toLowerCase()}/${role}`;variable(scheme,name,Object.fromEntries(source.schemes.map(s=>[s,ref(`theme/${s.toLowerCase()}/${name}`)])),[],'Internal Standard/Dimmed route.');}
for(const role of roleNames)variable(surface,role,Object.fromEntries(source.surfaces.map(sf=>[sf,ref(`scheme/${sf.toLowerCase()}/${role}`)])),scopesFor(role),'Contextual role from the shared Palette; color and opacity retain separate variable aliases.');
// Adaptive alpha keeps its historical ink/canvas keys and depends on Theme only.
for(const a of source.alphaSteps)for(const group of ['ink','canvas']){
  const name=`alpha/adaptive/${group}/${a}`;
  variable(theme,name,Object.fromEntries(source.themes.map(t=>[t,canonicalSelection(`Theme/adaptive/alpha/${group==='ink'?'contrast':'base'}-${a}`,{Theme:t})])),[],'Changes only with Light/Dark.');
  variable(scheme,name,Object.fromEntries(source.schemes.map(s=>[s,ref(`theme/${name}`)])),[],'Theme-only alpha passes through Scheme without changing its selection.');
  variable(surface,name,Object.fromEntries(source.surfaces.map(sf=>[sf,ref(`scheme/${name}`)])),allColor,'Ink: black in Light / white in Dark. Canvas: the opposite. Surface and Scheme invariant.');
}
for(const hue of ['black','white']){
  for(const [name,key] of [[`stable/${hue}`,`stable/neutral/${hue}`],...source.alphaSteps.map(a=>[`alpha/stable/${hue}/${a}`,`stable/alpha/${hue}-${a}`])]){
    variable(theme,name,Object.fromEntries(source.themes.map(t=>[t,canonicalSelection(`Theme/${key}`,{Theme:t})])),[],'Stable shared selection; every Theme mode uses the same aliases.');
    variable(scheme,name,Object.fromEntries(source.schemes.map(s=>[s,ref(`theme/${name}`)])),[],'Stable color passes through Scheme without changing its selection.');
    variable(surface,name,Object.fromEntries(source.surfaces.map(sf=>[sf,ref(`scheme/${name}`)])),allColor,'Never changes with theme, surface or scheme.');
  }
}

// Shared neutral foreground choices. Existing per-hue IDs remain compatible.
variable(surface,'content/on-bright-primary',Object.fromEntries(source.surfaces.map(sf=>[sf,ref('scheme/stable/black')])),content,'Black text for bright Primary fills (amber, yellow, lime, mint, turquoise in the default palette).');
const sharedPrimary=['content/on-primary','content/on-bright-primary'];
for(const v of surface.variables.filter(v=>/^content\/accent\/[^/]+\/on-primary$/.test(v.name))){
 const shared=sharedPrimary.find(name=>source.themes.every(theme=>source.schemes.every(scheme=>source.surfaces.every(surface=>{
  const context={theme,scheme,surface};
  return JSON.stringify(resolve(`surface/${v.name}`,context))===JSON.stringify(resolve(`surface/${name}`,context));
 }))));
 if(shared){v.scopes=[];v.pickerAlias=shared;v.description=`Compatibility alias: identical to ${shared} in every context. Use the shared role for new designs.`;}
}
surface.variables.find(v=>v.name==='content/on-primary').description='Adaptive white/black text for neutral and standard Primary fills. Bright Primary fills use content/on-bright-primary.';
// Export order follows common UI usage, not the palette spectrum.
const huePriority=['neutral','invert','blue','green','red','amber','yellow','orange','purple','violet','pink','teal','sky','indigo','sapphire','mint','turquoise','lime','shamrock','cherry','vermilion','grape'];
const groupPriority=['surface','surface/primary','surface/secondary','surface/tertiary','content/primary','content/secondary','content/tertiary','content/muted','content/disabled','content','content/inverted','content/on-invert','border','reaction','stable','alpha/adaptive/ink','alpha/adaptive/canvas','alpha/stable/black','alpha/stable/white','compat'];
function pickerOrder(v){
 const parts=v.figmaName.split('/'),group=parts.slice(0,-1).join('/'),leaf=parts.at(-1),hue=leaf.replace(/-(normal|active)$/,'');
 const g=groupPriority.indexOf(group),h=huePriority.indexOf(hue);
 return [g<0?groupPriority.length:g,h<0?huePriority.length:h,leaf.endsWith('-active')?1:0];
}
surface.variables.sort((a,b)=>{const x=pickerOrder(a),y=pickerOrder(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];});

export function cssValue(v){return typeof v==='object'?`rgb(${[v.r,v.g,v.b].map(x=>Number((x*255).toFixed(5))).join(' ')} / ${v.a??1})`:String(v);}
export function writeBuild(){
  const css=['/* Generated by build.mjs from the canonical v4 graph. V2 logical keys remain stable. */'];
  const resolved={};
  for(const t of source.themes)for(const s of source.schemes)for(const sf of source.surfaces){
    const context={theme:t,scheme:s,surface:sf};
    css.push(`[data-v2-theme="${t}"][data-v2-scheme="${s}"] [data-v2-surface="${sf}"], [data-v2-theme="${t}"][data-v2-scheme="${s}"][data-v2-surface="${sf}"] {`);
    for(const v of surface.variables)css.push(`  ${v.css}: ${cssValue(resolve(`surface/${v.name}`,context))};`);
    css.push('}');
    resolved[`${t}/${s}/${sf}`]=Object.fromEntries(roleNames.map(role=>[role,resolve(`surface/${role}`,context)]));
  }
  css.push(':root {');for(const v of opacity.variables)css.push(`  ${v.css}: ${resolve(`opacity/${v.name}`)};`);css.push('}');
  fs.writeFileSync(path.join(dir,'graph.json'),JSON.stringify(graph,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'tokens.css'),css.join('\n')+'\n');
  fs.writeFileSync(path.join(dir,'resolved.json'),JSON.stringify(resolved,null,2)+'\n');
  return {collections:graph.collections.map(c=>({name:c.name,modes:c.modes.length,variables:c.variables.length})),contexts:Object.keys(resolved).length,canonicalSourceHash:canonicalGraph.sourceHash};
}
// Importing the bridge for verification or native-script generation is read-only.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(writeBuild()));
