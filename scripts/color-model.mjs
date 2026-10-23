import { readFileSync } from 'node:fs';
const compose=(fill,base)=>({colorSpace:'srgb',components:fill.components.map((channel,i)=>channel*fill.alpha+base.components[i]*(1-fill.alpha)),alpha:1});
import { legacyColorPath, resolveV4, toRuntimeColor, surfaceCompatibility, v4Variables, runtimeV4Graph } from './runtime-v4-model.mjs';
export const readJSON = path => JSON.parse(readFileSync(new URL('../'+path, import.meta.url), 'utf8'));
export const flatten = (node, path='', out={}) => { for(const [key,value] of Object.entries(node)) { const name=path?path+'/'+key:key;if(value.$type)out[name]=value;else flatten(value,name,out); } return out; };
// Palette and semantic values are generated from the authored foundation.
export const foundation = readJSON('source/foundation.json');
const srgbEncode = x => x <= .0031308 ? 12.92*x : 1.055*x**(1/2.4)-.055;
export function oklchToSRGB(L,C,h) {
 const a=C*Math.cos(h*Math.PI/180), b=C*Math.sin(h*Math.PI/180);
 const l=(L+.3963377774*a+.2158037573*b)**3;
 const m=(L-.1055613458*a-.0638541728*b)**3;
 const s=(L-.0894841775*a-1.2914855480*b)**3;
 return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s];
}
export function gamutColor(L,C,h) {
 const inGamut = rgb => rgb.every(x=>x>=0&&x<=1);
 let rgb=oklchToSRGB(L,C,h);
 if(!inGamut(rgb)){let low=0,high=C;for(let i=0;i<32;i++){const mid=(low+high)/2;if(inGamut(oklchToSRGB(L,mid,h)))low=mid;else high=mid;}rgb=oklchToSRGB(L,low,h);}
 return {colorSpace:'srgb',components:rgb.map(x=>Number(srgbEncode(Math.max(0,Math.min(1,x))).toFixed(10))),alpha:1};
}
export const palette=Object.fromEntries([...v4Variables].filter(([path])=>/^Palette\/(?:[^/]+\/\d+|black|white)$/.test(path)).map(([path])=>['palette/'+path.slice(8),toRuntimeColor(resolveV4(path))]));
export const hues = ['neutral', ...runtimeV4Graph.conventions.accents];
export const surfaceRules = readJSON('source/surface-rules.json');
export const themes=['Light','Dark'], surfaces=['base','canvas','raised','floating'], states=['normal','hover','pressed','disabled'];
export const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export const luminance = c => c.components.reduce((s,x,i)=>s+linear(x)*[.2126,.7152,.0722][i],0);
export const contrast = (a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
export const hex = c => '#'+c.components.map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export const scales=Object.fromEntries(hues.map(hue=>[hue,Object.entries(palette).filter(([n])=>n.startsWith('palette/'+(hue==='neutral'?'gray':runtimeV4Graph.conventions.legacyAccentAliases[hue]??hue)+'/')).map(([name,c])=>({name,Y:luminance(c),color:c})).sort((a,b)=>a.Y-b.Y)]));
const choose=(candidates,target)=>[...candidates].sort((a,b)=>Math.abs(Math.log((a.Y+.05)/(target+.05)))-Math.abs(Math.log((b.Y+.05)/(target+.05))))[0];
/** Compatibility names resolve the authoritative v4 graph. Extra legacy
 * structural divider roles keep their contrast contract on the new surfaces. */
export function buildColorModel() {
 const roles=[
  'surface/current','surface/block',...surfaces.map(surface=>'surface/'+surface),
  'disabled/background','disabled/text',
  ...['primary','secondary','tertiary','muted','caption'].map(role=>'content/'+role),
  ...['subtle','default','strong','emphasis','panel','overlay','control','control-hover','control-pressed'].map(role=>'border/'+role),'focus/ring',
  ...['background','hover','selected','pressed','prefix','text'].map(role=>'group/'+role),
  ...[...states,'text','disabled-text'].map(role=>'control/'+role),
  ...hues.flatMap(hue=>[
   ...[...states,'text','disabled-text','border','border-hover','border-pressed'].map(role=>'element/'+hue+'/'+role),
   ...['action','action-vivid'].flatMap(family=>[...states.slice(0,3),'text'].map(role=>family+'/'+hue+'/'+role)),
  ]),
  ...['danger','success','warning','info'].flatMap(tone=>[...states,'text'].map(role=>'feedback/'+tone+'/'+role)),
 ];
 const model={contexts:{},audit:[],secondaryPrimitives:{}};
 for(const surface of surfaces)for(const theme of themes)model.contexts[theme+' · '+surface[0].toUpperCase()+surface.slice(1)]={theme,surface,values:Object.fromEntries(roles.map(role=>[role,null]))};
 for(const context of Object.values(model.contexts)) {
  const selection={Theme:context.theme,Surface:surfaceCompatibility[context.surface],SurfaceScheme:'Standard'};
  for(const name of [...Object.keys(context.values),'surface/block']) {
   const absolute=/^surface\/(base|canvas|raised|floating)$/.exec(name)?.[1];
   const path=absolute?'Theme/surface/bg':legacyColorPath(name);
   if(!path)continue;
   const selected=absolute?{...selection,Surface:surfaceCompatibility[absolute]}:selection;
   const key=`derived/v4/${context.theme.toLowerCase()}/${context.surface}/${name}`;
   model.secondaryPrimitives[key]=toRuntimeColor(resolveV4(path,selected));
   context.values[name]=key;
  }
  const get=name=>({...palette,...model.secondaryPrimitives})[context.values[name]];
  const surfaceY=luminance(get('surface/current')),dark=context.theme==='Dark';
  const structural=(bg,minimum)=>choose(scales.neutral.filter(color=>(dark?color.Y>bg:color.Y<bg)&&contrast(color.Y,bg)>=minimum),dark?(bg+.05)*minimum-.05:(bg+.05)/minimum-.05).name;
  for(const [role,minimum]of Object.entries({subtle:1.5,default:1.8,strong:2.4}))context.values['divider/'+role]=structural(surfaceY,minimum);
  context.values['divider/panel']=structural(surfaceY,dark?1.25:1.15);
  context.values['divider/control']=structural(luminance(get('control/normal')),1.8);
  for(const hue of hues)for(const state of states) {
   const background=context.values[`element/${hue}/${state}`],text=context.values[`element/${hue}/${state==='disabled'?'disabled-text':'text'}`];
   const colors={...palette,...model.secondaryPrimitives},bg=compose(colors[background],get('surface/current')),fg=colors[text];
   const reactionBackgrounds=state==='disabled'?[bg]:['hover','pressed'].map(reaction=>compose(get(`element/${hue}/${reaction}`),get('surface/current')));
   model.audit.push({theme:context.theme,surface:context.surface,hue,state,background,text,contrast:contrast(luminance(bg),luminance(fg)),reactionContrast:Math.min(...reactionBackgrounds.map(fill=>contrast(luminance(fg),luminance(fill)))),backgroundY:luminance(bg),surfaceContrast:contrast(luminance(bg),surfaceY),source:'figma/token-system-v4/graph.json'});
  }
 }
 const retained=new Set(Object.values(model.contexts).flatMap(context=>Object.values(context.values)));
 model.secondaryPrimitives=Object.fromEntries(Object.entries(model.secondaryPrimitives).filter(([name])=>retained.has(name)));
 return model;
}
