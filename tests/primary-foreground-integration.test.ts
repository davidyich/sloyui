import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {createAccent,defaultRules,generatePalette,primaryPair,presets} from '../figma/color-system-v2/editor/model.mjs';

type Color={r:number;g:number;b:number;a:number};
type Value=Color|number|string|{alias:string}|{color:{alias:string};opacity:{alias:string}};
type Variable={name:string;values:Record<string,Value>;scopes?:string[];figmaName?:string};
type Graph={collections:{key:string;modes:string[];variables:Variable[]}[]};
const load=(file:string)=>JSON.parse(readFileSync(file,'utf8')) as Graph;
const canonical=load('figma/token-system-v4/graph.json');
const runtime=load('src/tokens/runtime-v4.json');
const native=load('figma/color-system-v2/native-graph.json');
const hues=['blue','green','yellow','orange','red','pink','purple'];
const black:Color={r:0,g:0,b:0,a:1},white:Color={r:1,g:1,b:1,a:1};
const contrastRules={...defaultRules,primaryForegroundPolicy:'contrast' as const};
function reader(graph:Graph){
 const tokens=new Map(graph.collections.flatMap(c=>c.variables.map(v=>[c.key+'/'+v.name,{...v,collection:c}])));
 const read=(path:string,selection:Record<string,string>,seen:string[]=[]):Value=>{
  if(seen.includes(path))throw Error('Alias cycle '+path);
  const token=tokens.get(path);if(!token)throw Error('Missing token '+path);
  const value=token.values[selection[token.collection.key]??token.collection.modes[0]],next=[...seen,path];
  if(value===undefined)throw Error('Missing mode '+path);
  if(typeof value==='object'&&'alias'in value)return read(value.alias,selection,next);
  if(typeof value==='object'&&'color'in value)return {...read(value.color.alias,selection,next) as Color,a:Number(read(value.opacity.alias,selection,next))/100};
  return value;
 };
 return {read:(path:string,selection:Record<string,string>)=>read(path,selection) as Color,tokens};
}
const c=reader(canonical),r=reader(runtime),n=reader(native);
const luminance=(color:Color)=>[color.r,color.g,color.b].reduce((sum,v,i)=>sum+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);
const contrast=(a:Color,b:Color)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const isEndpoint=(ink:Color)=>[black,white].some(p=>Object.keys(p).every(k=>ink[k as keyof Color]===p[k as keyof Color]));

describe('Primary foreground integration',()=>{
 it('preserves each hue foreground across canonical, shipped runtime, native Surface and Accent for both states',()=>{
  let pairs=0;
  for(const theme of ['Light','Dark'])for(const scheme of ['Standard','Dimmed'])for(const surface of ['Shell','Workspace','Content','Overlay','Invert'])for(const hue of hues){
   const selection={Theme:theme,SurfaceScheme:scheme,Surface:surface},nativeSelection={theme,scheme,surface,accent:hue[0].toUpperCase()+hue.slice(1)},label=[theme,scheme,surface,hue].join('/');
   const ink=c.read('Theme/content/on-primary/'+hue,selection);
   expect(isEndpoint(ink),label+' exact opaque black or white').toBe(true);
   expect(ink,label+' local theme policy').toEqual((surface==='Invert'?theme==='Dark':theme==='Light')?white:black);
   expect(r.read('Theme/content/on-primary/'+hue,selection),label+' runtime').toEqual(ink);
   expect(n.read('surface/content/accent/'+hue+'/on-primary',nativeSelection),label+' native').toEqual(ink);
   expect(n.read('accent/on-primary',nativeSelection),label+' Accent').toEqual(ink);
   for(const state of ['normal','active']){
    const canonicalState=state==='normal'?'normal':'pressed',fill=c.read(`Theme/surface/primary/${hue}-${canonicalState}`,selection);
    expect(fill.a,label+' opaque fill').toBe(1);
    expect(r.read(`Theme/surface/primary/${hue}-${canonicalState}`,selection),label+' runtime fill').toEqual(fill);
    expect(n.read(`surface/surface/accent/${hue}/primary/${state}`,nativeSelection),label+' native fill').toEqual(fill);
    expect(n.read('accent/surface/primary-'+(state==='normal'?'normal':'pressed'),nativeSelection),label+' Accent fill').toEqual(fill);
    expect(contrast(ink,fill),label+'/'+state).toBeGreaterThanOrEqual(4.5-1e-7);pairs++;
   }
  }
  expect(pairs).toBe(hues.length * 40);
 });

 it('keeps the seven semantic foreground choices selectable even when some current colors match',()=>{
  for(const hue of hues){
   const token=n.tokens.get('surface/content/accent/'+hue+'/on-primary')!;
   expect(token.figmaName).toBe('content/on-primary-'+hue);
   expect(token.scopes).toEqual(expect.arrayContaining(['TEXT_FILL','SHAPE_FILL']));
   expect(n.tokens.get('accent/on-primary')!.values[hue[0].toUpperCase()+hue.slice(1)]).toEqual({alias:'surface/content/accent/'+hue+'/on-primary'});
  }
 });

 it('follows local Invert polarity without replacing the selected hue or outer theme',()=>{
  for(const theme of ['Light','Dark'])for(const scheme of ['Standard','Dimmed'])for(const hue of hues){
   const invert={Theme:theme,Surface:'Invert',SurfaceScheme:scheme},opposite={Theme:theme==='Light'?'Dark':'Light',Surface:'Content',SurfaceScheme:scheme};
   for(const role of ['content/on-primary/'+hue,...['normal','pressed'].map(state=>`surface/primary/${hue}-${state}`)])expect(c.read('Theme/'+role,invert),[theme,scheme,hue,role].join('/')).toEqual(c.read('Theme/'+role,opposite));
  }
 });

 it('keeps the authored orange pair when exact black already meets contrast in both states',()=>{
  const accent=createAccent('orange','#F07818'),palette=generatePalette(accent),requested=primaryPair(accent,'Light',{...contrastRules,adaptPrimary:false},palette),actual=primaryPair(accent,'Light',contrastRules,palette);
  expect(contrast(black,requested.normal)).toBeGreaterThan(4.5);
  expect(contrast(black,requested.active)).toBeGreaterThan(4.5);
  expect(actual.foreground).toEqual(black);
  expect(actual.normal).toEqual(requested.normal);
  expect(actual.active).toEqual(requested.active);
  expect(actual.adjusted).toBe(false);
  expect(primaryPair(createAccent('purple','#9B3FE0'),'Light',contrastRules).foreground).toEqual(white);
 });

 it('chooses the foreground from the actual requested colors rather than the hue name',()=>{
  expect(primaryPair(createAccent('purple','#F07818'),'Light',contrastRules).foreground).toEqual(black);
  expect(primaryPair(createAccent('orange','#9B3FE0'),'Light',contrastRules).foreground).toEqual(white);
 });

 it('never adapts farther from authored lightness than an already accessible exact-ink alternative',()=>{
  for(const preset of presets)for(const theme of ['Light','Dark']){
   const accent=createAccent(preset.name,preset.hex),palette=generatePalette(accent),steps=palette[0].steps,target=theme==='Light'?accent.lightnessLight:accent.lightnessDark;
   const error=(pair:ReturnType<typeof primaryPair>)=>Math.abs(steps.find(step=>step.name===pair.normalStep)!.l-target);
   const automatic=primaryPair(accent,theme,contrastRules,palette);
   for(const foregroundMode of ['light','dark']){
    const alternative=primaryPair({...accent,foregroundMode},theme,contrastRules,palette);
    if([alternative.normal,alternative.active].every(fill=>contrast(alternative.foreground,fill)>=4.6-1e-7))expect(error(automatic),`${preset.name}/${theme}/${foregroundMode}`).toBeLessThanOrEqual(error(alternative)+1e-10);
   }
  }
 });
});
