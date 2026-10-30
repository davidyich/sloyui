import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import graph from '../src/tokens/figma-modes.json';
import foundation from '../source/foundation.json';
import audit from '../src/tokens/element-states.json';
import derivedColors from '../src/tokens/derived.json';
import { referenceColor } from './v4-reference';
import v4Source from '../figma/token-system-v4/source.json';
import canonicalGraph from '../figma/token-system-v4/graph.json';
type RGB = { colorSpace: string; components: number[]; alpha: number };
type Value = RGB | { alias: string } | string | number;
const collections = graph.collections as unknown as { name: string; modes: Record<string, Record<string, Value>> }[];
const architecture = graph as unknown as { legacyPaths: Record<string, string>; surfaceModes: Record<string, string> };
function resolve(path: string, mode: string, seen: string[] = [], scheme: 'Standard'|'Dimmed'|'Inverted' = 'Standard'): Value {
 if(path.startsWith('Primitives/derived/')){
  const color=(derivedColors as Record<string,RGB>)[path.slice('Primitives/'.length)];
  if(!color)throw Error('Missing derived provenance '+path);
  return color;
 }
 path=architecture.legacyPaths[path]??path;
 if(seen.includes(path))throw Error('Cycle '+path);
 const [c,...parts]=path.split('/'),col=collections.find(x=>x.name===c);
 if(!col)throw Error('Missing collection '+c);
 const [theme='Light',surface='Base']=mode.includes(' · ')?mode.split(' · '):[mode==='Dark'?'Dark':'Light','Base'];
 const selected=mode in col.modes?mode:c==='Theme'?theme:c==='SurfaceScheme'?scheme:c==='Semantic'?architecture.surfaceModes[surface.toLowerCase()]??surface:Object.keys(col.modes)[0];
 const v=col.modes[selected]?.[parts.join('/')];
 if(v===undefined||v===null)throw Error('Missing '+path+' in '+selected);
 return typeof v==='object'&&'alias'in v?resolve(v.alias,mode,[...seen,path],scheme):v;
}
function canonicalColor(path:string,theme:string,surface:string,scheme:'Standard'|'Dimmed'|'Inverted'='Standard'):{value:RGB;paths:string[]} {
 const selection:Record<string,string>={Theme:theme,Surface:({Base:'Shell',Canvas:'Workspace',Raised:'Content',Floating:'Overlay'} as Record<string,string>)[surface]??surface,SurfaceScheme:scheme};
 const paths:string[]=[];
 const read=(path:string,seen:string[]=[]):any=>{
  if(seen.includes(path))throw Error('Canonical alias cycle '+path);paths.push(path);
  const [key,...parts]=path.split('/'),collection=canonicalGraph.collections.find(c=>c.key===key)!;
  if(!collection)throw Error('Canonical missing collection '+path);
  const token=collection.variables.find(v=>v.name===parts.join('/'))!;
  if(!token)throw Error('Canonical missing token '+path);
  const value=(token.values as Record<string,any>)[selection[key]??(canonicalGraph.axes as Record<string,{default:string}>)[key]?.default??'Value'];
  if(value===undefined)throw Error('Canonical missing mode '+path);
  const next=[...seen,path];
  return value?.alias?read(value.alias,next):value?.color?{...read(value.color.alias,next),a:read(value.opacity.alias,next)/100}:value;
 };
 const {r,g,b,a}=read(path);return {value:{colorSpace:'srgb',components:[r,g,b],alpha:a},paths};
}
function Y(c:RGB){return c.components.reduce((y,x,i)=>y+(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);}
function over(c:RGB,bg:RGB):RGB{return {...c,components:c.components.map((v,i)=>v*c.alpha+bg.components[i]*(1-c.alpha)),alpha:1};}
function paint(c:RGB,mode:string):RGB{if(c.alpha===1)return c;return over(c,resolve('Semantic/surface/current',mode) as RGB);}
function ratio(a:RGB,b:RGB){return (Math.max(Y(a),Y(b))+.05)/(Math.min(Y(a),Y(b))+.05);}
function textRatio(ink:RGB,bg:RGB){return ratio(over(ink,bg),bg);}
function oklch(color:RGB){
 const [r,g,b]=color.components.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
 const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
 const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 const a=1.9779984951*l-2.428592205*m+.4505937099*s;
 const bb=.0259040371*l+.7827717662*m-.808675766*s;
 return {L:.2104542553*l+.793617785*m-.0040720468*s,a,b:bb,C:Math.hypot(a,bb),h:(Math.atan2(bb,a)*180/Math.PI+360)%360};
}
function perceptualDistance(a:RGB,b:RGB){const x=oklch(a),y=oklch(b);return Math.hypot(x.L-y.L,x.a-y.a,x.b-y.b);}
describe('Canonical full palette graph',()=>{
 it('publishes the independent authored palette with stable public geometry',()=>{expect(foundation.authoring.method).toContain('analytic OKLCH');
 const palette=collections.find(c=>c.name==='Palette')!.modes.Value;
 const canonical=canonicalGraph.collections.find(c=>c.key==='Palette')!.variables;
 expect(Object.keys(palette).sort()).toEqual(canonical.map(token=>token.name).sort());
 expect(v4Source.accentSystem.paletteSteps).toBe(v4Source.palette.neutralSteps.length);
 expect(Object.keys(palette)).toHaveLength((canonicalGraph.conventions.accents.length+1)*41+2);
 expect(Object.keys(palette).filter(n=>n.startsWith('gray/'))).toHaveLength(41);
 for(const hue of canonicalGraph.conventions.accents)expect(Object.keys(palette).filter(name=>name.startsWith(hue+'/'))).toEqual(Array.from({length:41},(_,index)=>`${hue}/${String(index+1).padStart(2,'0')}`));
 });
 it('keeps authored primitives inside sRGB and removes captured app aliases',()=>{
  const palette=collections.find(c=>c.name==='Palette')!.modes.Value;
  for(const [name,value] of Object.entries(palette)){
   const color=value as RGB;expect(color.colorSpace,name).toBe('srgb');expect(color.alpha,name).toBe(1);
   for(const channel of color.components)expect(channel,name).toBeGreaterThanOrEqual(0);
   for(const channel of color.components)expect(channel,name).toBeLessThanOrEqual(1);
  }
  for(const collection of collections)for(const values of Object.values(collection.modes))expect(Object.keys(values).some(name=>name.startsWith('source/')||name.startsWith('source-literals/'))).toBe(false);
  const gray=foundation.palette.neutralSteps.map(step=>resolve(`Primitives/palette/gray/${step}`,'Light · Base') as RGB);
  for(let i=1;i<gray.length;i++)expect(Y(gray[i])).toBeLessThan(Y(gray[i-1]));
  for(const path of ['scripts/color-model.mjs','scripts/build-tokens.mjs'])expect(readFileSync(path,'utf8')).not.toMatch(/colors-light|colors-dark|token-rules|dark-css/);
 });
 it('resolves all aliases across independent theme, surface scheme, surface, component and border collections',()=>{expect(Object.fromEntries(collections.map(c=>[c.name,Object.keys(c.modes)]))).toEqual({Palette:['Value'],Primitives:['Value'],Theme:['Light','Dark'],SurfaceScheme:['Standard','Inverted','Dimmed'],Density:['Default','Compact'],Semantic:['Page','Inset','Panel','Overlay'],Components:['Default'],Borders:['Off','On']});for(const c of collections)for(const [mode,vs]of Object.entries(c.modes))for(const n of Object.keys(vs)){expect(n).not.toMatch(/^(kit|el-h|el-w)\//);const v=resolve(c.name+'/'+n,mode);expect(v).not.toBeNull();if(typeof v==='number')expect(Number.isFinite(v)).toBe(true);}
 });
 it('routes Dimmed and the Inverted alias through complete themed reference contexts including Shell',()=>{
  const schemes=collections.find(c=>c.name==='SurfaceScheme')!.modes;
  expect(schemes.Inverted).toEqual(schemes.Dimmed);
  for(const theme of ['Light','Dark'])for(const surface of ['Base','Canvas','Raised','Floating']){
   const mode=`${theme} · ${surface}`;
   for(const scheme of ['Standard','Dimmed','Inverted'] as const){
    // Exercise every scheme alias in both themes, not just the default Light.
    for(const name of Object.keys(schemes[scheme]))expect(resolve(`SurfaceScheme/${name}`,mode,[],scheme),`${theme}/${scheme}/${name}`).not.toBeNull();
    expect(resolve('Semantic/surface/current',mode,[],scheme)).toEqual(canonicalColor('Theme/surface/bg',theme,surface,scheme).value);
   }
   const standard=resolve('Semantic/surface/current',mode,[],'Standard'),dimmed=resolve('Semantic/surface/current',mode,[],'Dimmed');
   if(theme==='Dark'||surface==='Canvas')expect(dimmed,`${theme}/${surface} has an authored scheme background`).not.toEqual(standard);
   else if(surface==='Raised'||surface==='Floating')expect(dimmed,`${theme}/${surface} preserves the shared light endpoint`).toEqual(standard);
  }
  // A full scheme changes Shell directly; swapping Workspace/Content cannot
  // satisfy these canonical alias routes.
  // Neutral ink can now be shared across the complete alpha backing family;
  // it need not acquire a duplicate scheme route when its value is unchanged.
  for(const role of ['surface/bg'])for(const theme of ['Light','Dark']){
   const token=canonicalGraph.collections.find(c=>c.key==='SurfaceScheme')!.variables.find(v=>v.name===`${role}-${theme.toLowerCase()}`)!;
   expect(token.values).toEqual({Standard:{alias:`Surface/${role}-${theme.toLowerCase()}`},Dimmed:{alias:`Surface/${role}-${theme.toLowerCase()}-dimmed`},Inverted:{alias:`Surface/${role}-${theme.toLowerCase()}-dimmed`}});
  }
 });
 it('keeps every canonical secondary and action pair readable, including disabled',()=>{expect(audit).toHaveLength(256);for(const row of audit){expect(row.reactionContrast,JSON.stringify(row)).toBeGreaterThanOrEqual(4.5);const mode=row.theme+' · '+row.surface[0].toUpperCase()+row.surface.slice(1);expect(textRatio(resolve('Primitives/'+row.text,mode) as RGB,paint(resolve('Primitives/'+row.background,mode) as RGB,mode)),JSON.stringify(row)).toBeGreaterThanOrEqual(4.5);}
 for(const mode of Object.keys(graph.contexts))for(const h of graph.modes)for(const s of ['normal','hover','pressed'])expect(textRatio(resolve(`Semantic/action/${h}/text`,mode) as RGB,resolve(`Semantic/action/${h}/${s}`,mode) as RGB)).toBeGreaterThanOrEqual(4.5);
 });
 it('uses the exact authored v4 secondary hues and states in both themes',()=>{
  for(const surface of ['Base','Canvas','Raised','Floating'])for(const hue of graph.modes.filter(h=>h!=='neutral')){
   const dark='Dark · '+surface,light='Light · '+surface;
   const background=resolve('Semantic/surface/current',dark) as RGB;
   const fills=['normal','hover','pressed'].map(state=>resolve(`Semantic/element/${hue}/${state}`,dark) as RGB);
   const tint=fills.map(oklch);
   for(const [index,state] of ['normal','hover','pressed'].entries()){
    expect(fills[index],`${dark}/${hue}/${state}`).toEqual(referenceColor(`Theme/surface/secondary/${hue}-${state}`,'Dark',surface.toLowerCase()));
    expect(fills[index].alpha).toBeGreaterThan(0);expect(fills[index].alpha).toBeLessThan(1);
    // Chromatic surfaces may change hue without a large luminance ratio.
    expect(perceptualDistance(paint(fills[index],dark),background),`${dark}/${hue}/${state} visible`).toBeGreaterThanOrEqual(.04);
    expect(oklch(paint(fills[index],dark)).C,`${dark}/${hue}/${state} retains actual composed hue`).toBeGreaterThan(.015);
    const canonicalHue=(v4Source.accentSystem.legacyAliases as Record<string,string>)[hue]??hue;
    const authoredHue=canonicalGraph.collections.find(c=>c.key==='Palette')!.variables.filter(v=>v.name.startsWith(canonicalHue+'/')).map(v=>{const c=(v.values as Record<string,unknown>).Value as {r:number;g:number;b:number;a:number};return {colorSpace:'srgb',components:[c.r,c.g,c.b],alpha:1};});
    expect(authoredHue,`${dark}/${hue}/${state} selects a shared hue step`).toContainEqual({...fills[index],alpha:1});
    for(const [theme,mode]of [['Light',light],['Dark',dark]]){
     const actual=resolve(`Semantic/element/${hue}/${state}`,mode) as RGB;
     const reference=canonicalColor(`Theme/surface/secondary/${hue}-${state}`,theme,surface);
     expect(actual,`${mode}/${hue}/${state} matches themed canonical aliases`).toEqual(reference.value);
     const prefix=`${canonicalHue}/`;
     const palette=canonicalGraph.collections.find(c=>c.key==='Palette')!.variables;
     const expectedRamp=palette.filter(v=>v.name.startsWith(prefix));
     expect(expectedRamp,`${mode}/${hue} shares one complete hue ramp`).toHaveLength(v4Source.accentSystem.paletteSteps);
     const matching=expectedRamp.filter(v=>{const c=(v.values as Record<string,any>).Value;return c.r===actual.components[0]&&c.g===actual.components[1]&&c.b===actual.components[2]&&c.a===1;});
     expect(matching.length,`${mode}/${hue}/${state} selects a pigment from the shared ramp`).toBeGreaterThan(0);
     const aliasPath=[...reference.paths].reverse().find(path=>path.startsWith('Palette/'))!;
     expect(aliasPath,`${mode}/${hue}/${state} retains a real Palette alias`).toBeTruthy();
     const aliased=palette.find(v=>v.name===aliasPath.slice('Palette/'.length))!;
     expect(aliasPath).toMatch(new RegExp(`^Palette/${canonicalHue}/\\d{2}$`));
     expect((aliased.values as Record<string,unknown>).Value,`${aliasPath} equals a ${prefix} primitive`).toEqual((matching[0].values as Record<string,unknown>).Value);
    }
    expect(tint[index].C).toBeGreaterThan(.015);
    const lightRow=audit.find(row=>row.theme==='Light'&&row.surface===surface.toLowerCase()&&row.hue===hue&&row.state===state)!;
    expect(resolve(`Semantic/element/${hue}/${state}`,light)).toEqual(referenceColor(`Theme/surface/secondary/${hue}-${state}`,'Light',surface.toLowerCase()));
    expect(resolve(`Semantic/element/${hue}/${state}`,light)).toEqual(resolve(`Primitives/${lightRow.background}`,light));
   }
   expect(fills[1].alpha).toBeGreaterThan(fills[0].alpha);expect(fills[2]).toEqual(fills[1]);
  }
 });
 it('orders border strengths on each real surface and keeps focus distinguishable',()=>{
  for(const mode of Object.keys(graph.contexts)){
   const bg=resolve('Semantic/surface/current',mode) as RGB;
   const levels=['subtle','default','strong','emphasis'].map(n=>resolve('Semantic/border/'+n,mode) as RGB);
   const ratios=levels.map(c=>ratio(c,bg));
   expect(ratios[0]).toBeGreaterThan(1.04);
   for(let i=1;i<ratios.length;i++)expect(ratios[i],mode).toBeGreaterThan(ratios[i-1]);
   expect(ratio(resolve('Semantic/focus/ring',mode) as RGB,bg)).toBeGreaterThanOrEqual(3);
   const [theme,surface]=mode.split(' · ');
   for(const [index,role] of ['subtle','default','strong'].entries())expect(levels[index]).toEqual(referenceColor('Theme/border/'+role,theme,surface.toLowerCase()));
   for(const h of graph.modes)for(const state of ['normal','hover','pressed']){
    const edge=resolve(`Semantic/element/${h}/border${state==='normal'?'':'-'+state}`,mode) as RGB;
    const fill=resolve(`Semantic/element/${h}/${state}`,mode) as RGB;
    expect(ratio(edge,paint(fill,mode)),`${mode} ${h} ${state}`).toBeGreaterThan(1.04);
   }
  }
 });
 it('keeps structural dividers visible on every surface independently of decorative strokes',()=>{
  expect(resolve('Primitives/number/divider/width','Value')).toBe(1);
  for(const mode of Object.keys(graph.contexts)){
   const surface=resolve('Semantic/surface/current',mode) as RGB;
   const contrasts=['subtle','default','strong'].map((role,index)=>{
    const result=ratio(resolve('Semantic/divider/'+role,mode) as RGB,surface);
    expect(result,mode+' '+role).toBeGreaterThanOrEqual([1.5,1.8,2.4][index]);
    return result;
   });
   expect(contrasts[1]).toBeGreaterThan(contrasts[0]);
   expect(contrasts[2]).toBeGreaterThan(contrasts[1]);
   const panelContrast=ratio(resolve('Semantic/divider/panel',mode) as RGB,surface);
   expect(panelContrast,mode).toBeGreaterThanOrEqual(mode.startsWith('Light')?1.15:1.25);
   expect(panelContrast,mode).toBeLessThan(mode.startsWith('Light')?1.3:1.45);
   expect(ratio(resolve('Semantic/divider/control',mode) as RGB,resolve('Semantic/control/normal',mode) as RGB),mode).toBeGreaterThanOrEqual(1.8);
  }
 });
 it('switches decorative stroke independently while retaining the width primitive',()=>{
  expect(resolve('Primitives/number/border/width','Value')).toBe(.5);
  expect(resolve('Borders/border/width','Off')).toBe(0);
  expect(resolve('Borders/border/width','On')).toBe(.5);
  expect(resolve('Primitives/number/focus/width','Value')).toBe(2);
 });

});

it('does not emit self-referencing CSS aliases that invalidate font and size primitives',()=>{
 const css=readFileSync('src/styles/tokens.css','utf8');
 for(const match of css.matchAll(/(--cap-[\w-]+):\s*var\((--cap-[\w-]+)\)\s*;/g)) expect(match[1],match[0]).not.toBe(match[2]);
});

it('uses a strong neutral primary and maps legacy vivid accents to v4 primary roles',()=>{
 for(const mode of Object.keys(graph.contexts)) {
  const neutral=['normal','hover','pressed'].map(state=>resolve(`Semantic/action/neutral/${state}`,mode) as RGB);
  const ink=resolve('Semantic/action/neutral/text',mode) as RGB;
  expect(ratio(neutral[0],ink)).toBeGreaterThan(15);
  expect(ratio(neutral[0],ink)).toBeGreaterThan(ratio(neutral[1],ink));
  expect(ratio(neutral[1],ink)).toBeGreaterThan(ratio(neutral[2],ink));
  for(const hue of graph.modes)for(const state of ['normal','hover','pressed']) {
   const vivid=resolve(`Semantic/action-vivid/${hue}/${state}`,mode) as RGB;
   expect(ratio(vivid,resolve(`Semantic/action-vivid/${hue}/text`,mode) as RGB)).toBeGreaterThanOrEqual(4.5);
   const [theme,surface]=mode.split(' · ');
   expect(vivid).toEqual(referenceColor(`Theme/surface/primary/${hue}-${state}`,theme,surface.toLowerCase()));
   expect(vivid).toEqual(resolve(`Semantic/action/${hue}/${state}`,mode));
  }
 }
});

it('preserves the chosen per-hue foreground policy across all primary states',()=>{
 const black=resolve('Primitives/palette/gray/1000','Light · Base') as RGB;
 const white=resolve('Primitives/palette/gray/0','Light · Base') as RGB;
 for(const mode of Object.keys(graph.contexts))for(const hue of graph.modes)for(const family of ['action','action-vivid']){
  const fills=['normal','hover','pressed'].map(state=>resolve(`Semantic/${family}/${hue}/${state}`,mode) as RGB);
  const ink=resolve(`Semantic/${family}/${hue}/text`,mode) as RGB;
  const blackNormal=ratio(fills[0],black),whiteNormal=ratio(fills[0],white),chosenNormal=ratio(fills[0],ink);
  expect(chosenNormal,`${mode} ${family}/${hue} respects the contrast floor`).toBeGreaterThanOrEqual(4.5);const [theme,surface]=mode.split(' · ');expect(ink).toEqual(referenceColor('Theme/content/'+(hue==='neutral'?'on-primary':'on-primary/'+hue),theme,surface.toLowerCase()));
  for(const [index,fill] of fills.entries())expect(ratio(fill,ink),`${mode} ${family}/${hue}/${['normal','hover','pressed'][index]}`).toBeGreaterThanOrEqual(4.5);
 }
});

it('keeps neutral ButtonGroup surfaces soft, distinct, and readable in every context',()=>{
 for(const mode of Object.keys(graph.contexts))for(const scheme of ['Standard','Dimmed'] as const){
  const surface=resolve('Semantic/surface/current',mode,[],scheme) as RGB;
  const fills=['background','hover','selected','pressed','prefix'].map(role=>resolve(`Semantic/group/${role}`,mode,[],scheme) as RGB);
  const ink=resolve('Semantic/group/text',mode,[],scheme) as RGB;
  const [theme,context]=mode.split(' · ');
  expect(fills[0],mode).toEqual(canonicalColor('Theme/surface/block',theme,context,scheme).value);
  expect(fills[1],mode).toEqual(canonicalColor('Theme/surface/secondary/neutral-hover',theme,context,scheme).value);
  expect(fills[3],mode).toEqual(canonicalColor('Theme/surface/secondary/neutral-pressed',theme,context,scheme).value);
  expect(fills[4]).toEqual(fills[0]);
  expect(fills[2]).toEqual(fills[1]);
  for(const underlay of [surface,over(fills[0],surface)]){
   const background=over(fills[0],underlay);
   const painted=[background,over(fills[1],background),over(fills[2],background),over(fills[3],background),over(fills[4],underlay)];
   expect(ratio(underlay,background),mode).toBeGreaterThanOrEqual(1.045);
   expect(ratio(background,painted[1]),`${mode}/${scheme} hover`).toBeGreaterThanOrEqual(1.045);
   expect(ratio(painted[1],painted[3]),`${mode}/${scheme} pressed`).toBeGreaterThanOrEqual(1.045);
   expect(ratio(background,painted[2]),`${mode}/${scheme} selected differs from normal`).toBeGreaterThan(1.04);
   for(const [index,fill] of [...painted,over(fills[4],background)].entries())expect(textRatio(ink,fill),`${mode}/${scheme} role ${index}`).toBeGreaterThanOrEqual(4.5);
  }
 }
});

it('uses the generated accent element pairs for colored secondary ButtonGroups',()=>{
 for(const mode of Object.keys(graph.contexts))for(const hue of graph.modes.filter(value=>value!=='neutral')){
  const text=resolve(`Semantic/element/${hue}/text`,mode) as RGB;
  const normal=paint(resolve(`Semantic/element/${hue}/normal`,mode) as RGB,mode);
  const hover=paint(resolve(`Semantic/element/${hue}/hover`,mode) as RGB,mode);
  const pressed=paint(resolve(`Semantic/element/${hue}/pressed`,mode) as RGB,mode);
  expect(textRatio(text,normal),`${mode} ${hue} normal`).toBeGreaterThanOrEqual(4.5);
  expect(textRatio(text,hover),`${mode} ${hue} hover`).toBeGreaterThanOrEqual(4.5);
  expect(textRatio(text,pressed),`${mode} ${hue} pressed`).toBeGreaterThanOrEqual(4.5);
  const reaction=perceptualDistance(normal,hover);
  expect(reaction,`${mode} ${hue} perceptible hover`).toBeGreaterThanOrEqual(.015);
  expect(ratio(normal,hover),`${mode} ${hue} visible state`).toBeGreaterThanOrEqual(1.06);
  expect(reaction,`${mode} ${hue} bounded hover`).toBeLessThanOrEqual(.05);
  expect(pressed,`${mode} ${hue} pressed reuses active`).toEqual(hover);
 }
});


it('honors each radius mode on the page root without the default overriding compact',()=>{
 const css=readFileSync('src/styles/tokens.css','utf8');
 const factors:number[]=[];
 for(const mode of ['compact','default','rounded']){
  let factorName='';
  for(const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
   if(!selectors.split(',').some(selector=>selector.trim()===':root'||selector.trim()===`[data-radius="${mode}"]`))continue;
   const match=body.match(/--cap-radius-scale:\s*var\((--cap-number-radius-scale-[\w]+)\)/);
   if(match)factorName=match[1];
  }
  factors.push(Number(css.match(new RegExp(`${factorName}:\\s*([\\d.]+)`))?.[1]));
 }
 expect(factors[0]).toBeGreaterThan(0);
 expect(factors[0]).toBeLessThan(factors[1]);
 expect(factors[1]).toBe(1);
 expect(factors[2]).toBeGreaterThan(factors[1]);
});
