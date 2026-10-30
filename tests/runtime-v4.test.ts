import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expandCSSVariables } from './css-variable-resolver';

type Color={r:number;g:number;b:number;a:number};
type Value=Color|number|string|{alias:string}|{color:{alias:string};opacity:{alias:string}};
type Token={name:string;type:string;values:Record<string,Value>;hiddenFromPublishing?:boolean};
type Graph={schemaVersion:number;sourceHash:string;axes:Record<string,{default:string;values:string[]}>;conventions:{accents:string[]};collections:{key:string;modes:string[];variables:Token[]}[]};
const graph=JSON.parse(readFileSync('figma/token-system-v4/graph.json','utf8')) as Graph;
const shipped=JSON.parse(readFileSync('src/tokens/runtime-v4.json','utf8')) as Graph;
const contract=JSON.parse(readFileSync('src/tokens/token-contract.json','utf8'));
const tokens=new Map(graph.collections.flatMap(collection=>collection.variables.map(token=>[collection.key+'/'+token.name,{...token,collection:collection.key}])));
const css=readFileSync('src/styles/tokens.css','utf8');
const name=(path:string)=>'--cap-v4-'+path.replaceAll('/','-').toLowerCase().replaceAll('.','_');
function resolve(path:string,selection:Record<string,string>={},seen:string[]=[]):Value {
 if(seen.includes(path))throw Error('Graph cycle '+path);
 const token=tokens.get(path)!;
 const value=token.values[selection[token.collection]??graph.axes[token.collection]?.default??'Value'];
 if(value===undefined)throw Error('Missing '+path);
 return typeof value==='object'&&'alias' in value?resolve(value.alias,selection,[...seen,path]):typeof value==='object'&&'color' in value?{...resolve(value.color.alias,selection,[...seen,path]) as Color,a:Number(resolve(value.opacity.alias,selection,[...seen,path]))/100}:value;
}
const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([,selectors,body])=>({selectors:selectors.replace(/\/\*[\s\S]*?\*\//g,'').split(',').map(value=>value.trim()),declarations:[...body.matchAll(/(--[\w-]+)\s*:\s*([^;]*);/g)].map(([,key,value])=>[key,value.trim()] as const)}));
type Node={get:(name:string)=>string|undefined};
function node(attributes:Record<string,string>={},parent?:Node):Node {
 const own=new Map<string,string>();
 for(const rule of rules)if(rule.selectors.some(selector=>{
  if(selector.startsWith(':root')) {
   if(parent)return false;
   const missing=[...selector.matchAll(/:not\(\[(data-[\w-]+)\]\)/g)].map(match=>match[1]);
   return selector===':root'||missing.length>0&&missing.every(attribute=>!(attribute in attributes));
  }
  const match=/^\[(data-[\w-]+)(?:="([^"]+)")?\]$/.exec(selector);
  return !!match&&match[1] in attributes&&(match[2]===undefined||attributes[match[1]]===match[2]);
 }))for(const [key,value]of rule.declarations)own.set(key,value);
 const cache=new Map<string,string>(),seen=new Set<string>();
 const get=(key:string):string|undefined=>{
  if(cache.has(key))return cache.get(key);
  if(!own.has(key))return parent?.get(key);
  if(seen.has(key))throw Error('CSS cycle '+key);
  seen.add(key);
  const value=expandCSSVariables(own.get(key)!,get).trim();
  seen.delete(key);cache.set(key,value);return value;
 };
 return {get};
}
function cssColor(node:Node,key:string):Color {
 const raw=node.get(key)?.trim().replace(/calc\(([\d.]+)\s*\/\s*100\)/g,(_,n)=>String(Number(n)/100));
 const match=/^rgb\(([\d.eE+ -]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(raw??'');
 if(!match)throw Error('Invalid computed color '+key+': '+raw);
 const [r,g,b]=match[1].trim().split(/\s+/).map(Number).map(value=>value/255);
 return {r,g,b,a:match[2]===undefined?1:Number(match[2])};
}
function sameColor(actual:Color,expected:Color,label:string) {
 for(const channel of ['r','g','b','a'] as const)expect(actual[channel],label+'/'+channel).toBeCloseTo(expected[channel],9);
}
const composite=(fill:Color,base:Color):Color=>({r:fill.r*fill.a+base.r*(1-fill.a),g:fill.g*fill.a+base.g*(1-fill.a),b:fill.b*fill.a+base.b*(1-fill.a),a:1});
const luminance=(color:Color)=>[color.r,color.g,color.b].reduce((sum,channel,index)=>sum+(channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4)*[.2126,.7152,.0722][index],0);
const contrast=(a:Color,b:Color)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const attributes=(selection:Record<string,string>)=>Object.fromEntries(Object.entries(selection).map(([axis,mode])=>['data-'+({Theme:'theme',Surface:'surface',SurfaceScheme:'surface-scheme',Density:'density',Radius:'radius',Borders:'borders'} as Record<string,string>)[axis],mode.toLowerCase()]));
const colors=graph.collections.find(collection=>collection.key==='Theme')!.variables;
const contexts=['Light','Dark'].flatMap(Theme=>graph.axes.Surface.values.flatMap(Surface=>graph.axes.SurfaceScheme.values.map(SurfaceScheme=>({Theme,Surface,SurfaceScheme}))));

describe('Authoritative v4 runtime',()=>{
 it('keeps decorative boundaries quiet through nested context and Borders overrides without fading focus or pigments',()=>{
  const paint=(scope:Node,role:string)=>{
   const expanded=scope.get('--cap-'+role)!;
   const mixed=/^color-mix\(in srgb,\s*(rgb\(.+\))\s+([\d.]+)%,\s*transparent\)$/.exec(expanded);
   if(!mixed)return cssColor(scope,'--cap-'+role);
   const pigment=cssColor({get:()=>mixed[1]},'paint');
   return {...pigment,a:pigment.a*Number(mixed[2])/100};
  };
  for(const Theme of ['Light','Dark'])for(const Surface of ['Content','Invert','Glass'])for(const accent of graph.conventions.accents){
   const selection={Theme,Surface,SurfaceScheme:'Standard'};
   const parent=node({'data-borders':'on'});
   const local=node({...attributes(selection),'data-accent':accent},parent);
   const off=node({'data-borders':'off'},local),on=node({'data-borders':'on'},off);
   for(const [scope,enabled]of [[local,true],[off,false],[on,true]] as const){
    for(const state of ['normal','hover','pressed']){
     const suffix=state==='normal'?'':'-'+state;
     const pigment=cssColor(scope,'--cap-accent-border'+suffix);
     sameColor(pigment,resolve('Theme/border/'+accent+'-'+state,selection) as Color,'raw pigment');
     sameColor(paint(scope,'accent-outline'+suffix),{...pigment,a:enabled?.25:0},'decorative accent');
    }
    expect(paint(scope,'control-border').a).toBe(enabled?.55:0);
    sameColor(cssColor(scope,'--cap-focus-ring'),resolve('Theme/border/focus',selection) as Color,'focus independent of Borders');
   }
  }
 });

 it('ships the unchanged canonical graph and clearly labels the compatibility export',()=>{
  expect(shipped).toEqual(graph);
  expect(graph.collections).toHaveLength(9);
  expect(contract).toMatchObject({schemaVersion:4,source:'figma/token-system-v4/source.json',canonicalExport:'runtime-v4.json',publicColorCount:colors.filter(token=>!token.hiddenFromPublishing).length,sourceHash:graph.sourceHash});
  const compatibility=JSON.parse(readFileSync('src/tokens/figma-modes.json','utf8'));
  expect(compatibility.runtimeSource).toMatchObject({schemaVersion:4,kind:'resolved-legacy-compatibility-graph',canonicalExport:'runtime-v4.json'});
  for(const collection of graph.collections)for(const token of collection.variables)for(const value of Object.values(token.values)) {
   if(!['Palette','Primitives'].includes(collection.key)) {
    if(typeof value==='object'&&'color' in value){expect(value.color.alias.split('/')[0]).not.toBe(collection.key);expect(value.opacity.alias).toMatch(/^Opacity\//);}else{expect(value).toHaveProperty('alias');expect((value as {alias:string}).alias.split('/')[0]).not.toBe(collection.key);}
   }
  }
 });

 it('keeps one opaque 41-step ramp per hue and routes every semantic value across collection boundaries',()=>{
  const palette=graph.collections.find(collection=>collection.key==='Palette')!;
  expect(palette.modes).toEqual(['Value']);
  expect(graph.conventions.accents).toEqual(['blue','green','yellow','orange','red','pink','purple']);
  expect(palette.variables).toHaveLength(330);
  expect(new Set(palette.variables.map(token=>token.name)).size).toBe(palette.variables.length);
  const expectedNames=[...graph.conventions.accents.flatMap(hue=>Array.from({length:41},(_,index)=>`${hue}/${String(index+1).padStart(2,'0')}`)),...Array.from({length:41},(_,index)=>`gray/${index*25}`),'black','white'];
  expect(palette.variables.map(token=>token.name).sort()).toEqual(expectedNames.sort());
  for(const hue of [...graph.conventions.accents,'gray']){
   const ramp=palette.variables.filter(token=>token.name.startsWith(hue+'/')).map(token=>token.values.Value as Color);
   expect(ramp).toHaveLength(41);
   for(const [index,color]of ramp.entries()){
    expect(color.a,`${hue}/${index} stays opaque`).toBe(1);
    if(index)expect(luminance(color),`${hue}/${index} preserves lightness order`).toBeLessThan(luminance(ramp[index-1]));
   }
  }
  for(const collection of graph.collections)for(const token of collection.variables){
   expect(Object.keys(token.values),collection.key+'/'+token.name).toEqual(collection.modes);
   for(const value of Object.values(token.values)){
    const references=typeof value==='object'&&'alias'in value?[[value.alias,token.type]]:typeof value==='object'&&'color'in value?[[value.color.alias,'COLOR'],[value.opacity.alias,'FLOAT']]:[];
    if(!references.length){
     expect(['Palette','Primitives'],collection.key+'/'+token.name).toContain(collection.key);
     if(token.type==='COLOR')expect(collection.key).toBe('Palette');
    }
    for(const [path,type]of references){expect(path.split('/')[0],collection.key+'/'+token.name).not.toBe(collection.key);expect(tokens.get(path)?.type,path).toBe(type);}
   }
  }
 });

 it('measures translucent accent text over every actual surface and fill backing',()=>{
  const black:Color={r:0,g:0,b:0,a:1},white:Color={r:1,g:1,b:1,a:1};
  const failures:string[]=[];let checkedPairs=0,translucentPairs=0;
  for(const selection of contexts){
   const get=(role:string)=>resolve('Theme/'+role,selection) as Color;
   const surface=get('surface/bg');
   const bases=selection.Surface==='Glass'?[black,white].map(base=>composite(surface,base)):[surface];
   const backings=bases.flatMap(base=>[base,composite(get('surface/block'),base),...['normal','hover','pressed'].map(state=>composite(get('surface/secondary/neutral-'+state),base))]);
   for(const hue of graph.conventions.accents){
    const inks=[get('content/'+hue),get('content/secondary/'+hue)];
    for(const backing of backings){
     const painted=[backing,...['secondary','tertiary'].flatMap(role=>['normal','hover','pressed'].map(state=>composite(get(`surface/${role}/${hue}-${state}`),backing)))];
     for(const [level,ink]of inks.entries())for(const [index,background]of painted.entries()){
      const ratio=contrast(composite(ink,background),background);checkedPairs++;if(ink.a<1)translucentPairs++;
      if(ratio<4.5-1e-7)failures.push(`${selection.Theme}/${selection.Surface}/${selection.SurfaceScheme}/${hue}/content-${level}/backing-${index}: ${ratio}`);
     }
    }
    const foreground=get('content/on-primary/'+hue);
    for(const state of ['normal','hover','pressed']){
     const background=get(`surface/primary/${hue}-${state}`),ratio=contrast(composite(foreground,background),background);checkedPairs++;
     if(ratio<4.5-1e-7)failures.push(`${selection.Theme}/${selection.Surface}/${hue}/primary-${state}: ${ratio}`);
    }
   }
  }
  expect(checkedPairs).toBeGreaterThan(15000);
  expect(translucentPairs,'Secondary content must retain its exported opacity').toBeGreaterThan(0);
  expect(failures).toEqual([]);
 });

 it.each(contexts)('$Theme/$Surface/$SurfaceScheme renders every Theme role exactly',selection=>{
  const current=node({...attributes(selection),'data-accent':'rose'});
  for(const token of colors)sameColor(cssColor(current,name('Theme/'+token.name)),resolve('Theme/'+token.name,selection) as Color,token.name);
  for(const hue of colors.filter(t=>/^surface\/primary\/[^/]+-normal$/.test(t.name)).map(t=>t.name.slice('surface/primary/'.length,-'-normal'.length))) {
   const accent=node({'data-accent':hue},current);
   for(const state of ['normal','hover','pressed']) {
    const secondary=resolve(`Theme/surface/secondary/${hue}-${state}`,selection) as Color;
    expect(secondary.a).toBeGreaterThan(0);expect(secondary.a).toBeLessThanOrEqual(1);
    sameColor(cssColor(accent,'--cap-accent-'+state),secondary,hue+'/'+state);
    sameColor(cssColor(accent,'--cap-accent-solid-'+state),resolve(`Theme/surface/primary/${hue}-${state}`,selection) as Color,hue+'/primary/'+state);
    sameColor(cssColor(accent,'--cap-accent-border'+(state==='normal'?'':'-'+state)),resolve(`Theme/border/${hue}-${state}`,selection) as Color,hue+'/border/'+state);
   }
   sameColor(cssColor(accent,'--cap-accent-text'),resolve('Theme/content/'+hue,selection) as Color,hue+'/content');
   sameColor(cssColor(accent,'--cap-accent-text-secondary'),resolve('Theme/content/secondary'+(hue==='neutral'?'':'/'+hue),selection) as Color,hue+'/secondary-content');
   sameColor(cssColor(accent,'--cap-accent-solid-text'),resolve('Theme/content/'+(hue==='neutral'?'on-primary':'on-primary/'+hue),selection) as Color,hue+'/on-primary');
  }
 });

 it('keeps stable and theme-adaptive alpha ramps independent of local surfaces',()=>{
  const steps=[3,5,8,10,12,15,16,20,24,30,32,40,48,60,64,72,80,88,92,96];
  for(const Theme of ['Light','Dark'])for(const Surface of graph.axes.Surface.values)for(const percent of steps){
   const selection={Theme,Surface},current=node(attributes(selection));
   for(const shade of ['white','black']){
    const value=resolve(`Theme/stable/alpha/${shade}-${percent}`,selection) as Color;
    expect([value.r,value.g,value.b]).toEqual(Array(3).fill(shade==='white'?1:0));expect(value.a).toBeCloseTo(percent/100,10);
    sameColor(cssColor(current,`--cap-stable-alpha-${shade}-${percent}`),value,'stable alpha');
   }
   for(const family of ['base','contrast']){
    const value=resolve(`Theme/adaptive/alpha/${family}-${percent}`,selection) as Color,isWhite=(Theme==='Light')===(family==='base');
    expect([value.r,value.g,value.b]).toEqual(Array(3).fill(isWhite?1:0));expect(value.a).toBeCloseTo(percent/100,10);
    sameColor(cssColor(current,`--cap-adaptive-alpha-${family}-${percent}`),value,'adaptive alpha');
   }
  }
 });

 it('keeps every axis independent through nested changes, reset and default root',()=>{
  const root=node();
  sameColor(cssColor(root,'--cap-surface-current'),resolve('Theme/surface/bg') as Color,'default');
  const parent=node({'data-theme':'dark','data-surface':'workspace','data-accent':'rose','data-density':'compact','data-radius':'rounded','data-borders':'on'});
  const inverted=node({'data-surface-scheme':'inverted'},parent);
  const content=node({'data-surface':'content'},inverted);
  const light=node({'data-theme':'light'},content);
  const reset=node({'data-surface-scheme':'standard','data-radius':'none'},content);
  for(const [current,selection]of [[inverted,{Theme:'Dark',Surface:'Workspace',SurfaceScheme:'Inverted'}],[content,{Theme:'Dark',Surface:'Content',SurfaceScheme:'Inverted'}],[light,{Theme:'Light',Surface:'Content',SurfaceScheme:'Inverted'}],[reset,{Theme:'Dark',Surface:'Content',SurfaceScheme:'Standard'}]] as const) {
   sameColor(cssColor(current,'--cap-surface-current'),resolve('Theme/surface/bg',selection) as Color,'nested/bg');
   sameColor(cssColor(current,'--cap-surface-block'),resolve('Theme/surface/block',selection) as Color,'nested/block');
   sameColor(cssColor(current,'--cap-accent-normal'),resolve('Theme/surface/secondary/rose-normal',selection) as Color,'nested/accent');
   expect(current.get('--cap-control-height-md')).toBe('30px');
   expect(current.get('--cap-touch-target')).toBe('44px');
   expect(current.get('--cap-decoration-width')).toBe('1px');
  }
  expect(light.get('--cap-radius-base')).toBe('16px');
  expect(reset.get('--cap-radius-base')).toBe('0px');
 });

 it('keeps Inverted as a complete compatibility alias of Dimmed',()=>{
  for(const Theme of ['Light','Dark'])for(const Surface of graph.axes.Surface.values)for(const token of colors)expect(resolve('Theme/'+token.name,{Theme,Surface,SurfaceScheme:'Inverted'}),token.name).toEqual(resolve('Theme/'+token.name,{Theme,Surface,SurfaceScheme:'Dimmed'}));
 });

 it('preserves all old surface spellings with canonical bg and block colors',()=>{
  const aliases=contract.contexts.surfaceAliases;
  for(const [old,canonical]of Object.entries(aliases))for(const Theme of ['Light','Dark'])for(const SurfaceScheme of graph.axes.SurfaceScheme.values) {
   const current=node({'data-theme':Theme.toLowerCase(),'data-surface':old,'data-surface-scheme':SurfaceScheme.toLowerCase()});
   for(const [css,role]of [['--cap-surface-current','surface/bg'],['--cap-surface-block','surface/block'],['--cap-control-bg','surface/secondary/neutral-normal'],['--cap-content-muted','content/muted']] as const)sameColor(cssColor(current,css),resolve('Theme/'+role,{Theme,Surface:canonical as string,SurfaceScheme}) as Color,old+'/'+role);
  }
 });

 it('softens only enabled decorative borders and keeps focus and structure independent',()=>{
  const on=node({'data-borders':'on'}), off=node({'data-borders':'off'});
  expect(on.get('--cap-outline-opacity')).toBe('55%');
  expect(off.get('--cap-outline-opacity')).toBe('0%');
  for(const key of ['--cap-focus-width','--cap-border-width','--cap-border-subtle']) expect(on.get(key)).toBe(off.get(key));
  expect(on.get('--cap-accent-outline')).toContain('25%');
  expect(off.get('--cap-accent-outline')).toContain('0%');
 });

 it('uses density formulas, exact control heights and fixed type/icon/touch dimensions',()=>{
  for(const Density of ['Default','Compact']) {
   const current=node({'data-density':Density.toLowerCase()});
   const unit=Density==='Default'?4:3;
   for(const [size,coefficient]of Object.entries({xs:1,sm:2,md:3,lg:4,xl:6}))expect(current.get('--cap-padding-'+size)).toBe(Math.round(unit*coefficient)+'px');
   for(const [size,geometry]of Object.entries({sm:[16,1],md:[20,1.5],lg:[20,2],xl:[20,3]}))expect(current.get('--cap-control-height-'+size)).toBe((geometry[0]+2*Math.round(unit*geometry[1]))+'px');
   expect(current.get('--cap-fixed-space-16')).toBe('16px');
   expect(current.get('--cap-gap-inline-xs')).toBe('2px');
   expect(current.get('--cap-icon-size-sm')).toBe('16px');
   expect(current.get('--cap-icon-size-md')).toBe('20px');
   expect(current.get('--cap-touch-target')).toBe('44px');
   expect(current.get('--cap-font-size-base')).toBe('14px');
   expect(current.get('--cap-line-height-base')).toBe('20px');
   expect(current.get('--cap-font-heading')).toBe('"Medeo Sans"');
   expect(current.get('--cap-font-sans')).toBe('"Medeo Sans"');
   expect(current.get('--cap-font-code')).toBe('"Medeo Mono"');
   expect(current.get('--cap-font-pair')).toBe('"Medeo Mono"');
  }
  for(const [Radius,base]of Object.entries({None:0,Compact:4,Default:8,Rounded:16}))for(const Density of ['Default','Compact']) {
   const current=node({'data-radius':Radius.toLowerCase(),'data-density':Density.toLowerCase()});
   expect(current.get('--cap-radius-base')).toBe(base+'px');
   for(const [size,ratio]of Object.entries({sm:.5,md:1,lg:1.5,xl:2}))expect(current.get('--cap-radius-'+size)).toBe(Math.round(base*ratio)+'px');
  }
 });
});
