import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import graph from '../src/tokens/figma-modes.json';
import originalLight from '../source/colors-light.json';
import originalDark from '../source/colors-dark.json';
import audit from '../src/tokens/element-states.json';
type RGB = { colorSpace: string; components: number[]; alpha: number };
type Value = RGB | { alias: string } | string | number;
const collections = graph.collections as unknown as { name: string; modes: Record<string, Record<string, Value>> }[];
function resolve(path: string, mode: string, seen: string[] = []): Value {
 if(seen.includes(path))throw Error('Cycle '+path);const [c,...parts]=path.split('/');const col=collections.find(x=>x.name===c)!;const [theme='Light',surface='Base']=mode.includes(' · ')?mode.split(' · '):['Light','Base'];const selected=c==='Primitives'?'Value':c==='Theme'?(mode==='Dark'?'Dark':theme):c==='Semantic'?(mode in col.modes?mode:surface):mode;const v=col.modes[selected][parts.join('/')];if(v===undefined||v===null)throw Error('Missing '+path);return typeof v==='object'&&'alias'in v?resolve(v.alias,mode,[...seen,path]):v;
}
function flatten(node: any,path='',out: Record<string,any>={}): Record<string,any>{for(const [key,v]of Object.entries(node) as [string,any][]){const name=path?path+'/'+key:key;if(v.$type)out[name]=v.$value;else flatten(v,name,out);}return out;}
function Y(c:RGB){return c.components.reduce((y,x,i)=>y+(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);}
function ratio(a:RGB,b:RGB){return (Math.max(Y(a),Y(b))+.05)/(Math.min(Y(a),Y(b))+.05);}
describe('Canonical full palette graph',()=>{
 it('preserves every original color and original semantic alias in both themes',()=>{for(const [theme,source]of [['Light',originalLight],['Dark',originalDark]] as const){const flat=flatten(source);function original(n:string):Value{const v=flat[n];return typeof v==='string'?original(v.slice(1,-1).replaceAll('.','/')):v;}
 for(const name of Object.keys(flat))expect(resolve((name.startsWith('palette/')?'Primitives/':'Semantic/source/')+name,theme+' · Base')).toEqual(original(name));}
 const prim=collections[0].modes.Value;expect(Object.keys(prim).filter(n=>n.startsWith('palette/'))).toHaveLength(417);expect(Object.keys(prim).filter(n=>n.startsWith('palette/gray/'))).toHaveLength(41);for(const h of graph.modes.filter(x=>x!=='neutral'))expect(Object.keys(prim).filter(n=>n.startsWith('palette/'+h+'/'))).toHaveLength(22);
 });
 it('resolves all aliases and uses independent theme, surface and border modes with grouped numeric/font primitives',()=>{expect(collections.map(c=>Object.keys(c.modes).length)).toEqual([1,2,4,2]);for(const c of collections)for(const [mode,vs]of Object.entries(c.modes))for(const n of Object.keys(vs)){expect(n).not.toMatch(/^(kit|el-h|el-w)\//);const v=resolve(c.name+'/'+n,mode);expect(v).not.toBeNull();if(typeof v==='number')expect(Number.isFinite(v)).toBe(true);if(c.name==='Primitives'&&typeof v!=='object')expect(n).toMatch(/^(number|font)\//);}
 });
 it('keeps all 576 secondary pairs and 432 action pairs readable, including disabled',()=>{expect(audit).toHaveLength(576);for(const row of audit){expect(row.reactionContrast,JSON.stringify(row)).toBeGreaterThanOrEqual(4.5);const mode=row.theme+' · '+row.surface[0].toUpperCase()+row.surface.slice(1);expect(ratio(resolve('Primitives/'+row.text,mode) as RGB,resolve('Primitives/'+row.background,mode) as RGB),JSON.stringify(row)).toBeGreaterThanOrEqual(4.5);}
 for(const mode of Object.keys(graph.contexts))for(const h of graph.modes)for(const s of ['normal','hover','pressed'])expect(ratio(resolve(`Semantic/action/${h}/text`,mode) as RGB,resolve(`Semantic/action/${h}/${s}`,mode) as RGB)).toBeGreaterThanOrEqual(4.5);
 });
 it('orders border strengths on each real surface and keeps focus distinguishable',()=>{
  const colorsByMode=[];
  for(const mode of Object.keys(graph.contexts)){
   const bg=resolve('Semantic/surface/current',mode) as RGB;
   const levels=['subtle','default','strong','emphasis'].map(n=>resolve('Semantic/border/'+n,mode) as RGB);
   const ratios=levels.map(c=>ratio(c,bg));
   expect(ratios[0]).toBeGreaterThan(1.04);
   for(let i=1;i<ratios.length;i++)expect(ratios[i],mode).toBeGreaterThan(ratios[i-1]);
   expect(ratio(resolve('Semantic/focus/ring',mode) as RGB,bg)).toBeGreaterThanOrEqual(3);
   colorsByMode.push(JSON.stringify(levels));
   for(const h of graph.modes)for(const state of ['normal','hover','pressed']){
    const edge=resolve(`Semantic/element/${h}/border${state==='normal'?'':'-'+state}`,mode) as RGB;
    const fill=resolve(`Semantic/element/${h}/${state}`,mode) as RGB;
    expect(ratio(edge,fill),`${mode} ${h} ${state}`).toBeGreaterThan(1.04);
   }
  }
  expect(new Set(colorsByMode).size).toBe(7);
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

it('uses a strong neutral primary which fades on hover/press, and readable vivid accents',()=>{
 for(const mode of Object.keys(graph.contexts)) {
  const neutral=['normal','hover','pressed'].map(state=>resolve(`Semantic/action/neutral/${state}`,mode) as RGB);
  const ink=resolve('Semantic/action/neutral/text',mode) as RGB;
  expect(ratio(neutral[0],ink)).toBeGreaterThan(15);
  expect(ratio(neutral[0],ink)).toBeGreaterThan(ratio(neutral[1],ink));
  expect(ratio(neutral[1],ink)).toBeGreaterThan(ratio(neutral[2],ink));
  for(const hue of graph.modes)for(const state of ['normal','hover','pressed']) {
   const vivid=resolve(`Semantic/action-vivid/${hue}/${state}`,mode) as RGB;
   expect(ratio(vivid,resolve(`Semantic/action-vivid/${hue}/text`,mode) as RGB)).toBeGreaterThanOrEqual(4.5);
   if(mode.startsWith('Light')&&hue!=='neutral')expect(Y(vivid)).toBeGreaterThan(Y(resolve(`Semantic/action/${hue}/${state}`,mode) as RGB));
  }
 }
});

it('chooses the strongest actual grayscale ink and preserves it across action states',()=>{
 const black=resolve('Primitives/palette/gray/1000','Light · Base') as RGB;
 const white=resolve('Primitives/palette/gray/0','Light · Base') as RGB;
 for(const mode of Object.keys(graph.contexts))for(const hue of graph.modes)for(const family of ['action','action-vivid']){
  const fills=['normal','hover','pressed'].map(state=>resolve(`Semantic/${family}/${hue}/${state}`,mode) as RGB);
  const ink=resolve(`Semantic/${family}/${hue}/text`,mode) as RGB;
  const blackNormal=ratio(fills[0],black),whiteNormal=ratio(fills[0],white),chosenNormal=ratio(fills[0],ink);
  expect(chosenNormal,`${mode} ${family}/${hue} chooses max contrast for normal`).toBeGreaterThanOrEqual(Math.max(blackNormal,whiteNormal));
  for(const [index,fill] of fills.entries())expect(ratio(fill,ink),`${mode} ${family}/${hue}/${['normal','hover','pressed'][index]}`).toBeGreaterThanOrEqual(4.5);
 }
});

it('keeps red and rose vivid text white while allowing brighter yellow to use the dark ink',()=>{
 const mode='Light · Base';
 for(const hue of ['red','rose'])expect(resolve(`Semantic/action-vivid/${hue}/text`,mode)).toEqual(resolve('Primitives/palette/gray/0',mode));
 expect(resolve('Semantic/action-vivid/yellow/text',mode)).toEqual(resolve('Primitives/palette/gray/1000',mode));
 const expected:Record<string,string[]>={red:['palette/red/550','palette/red/600','palette/red/650'],rose:['palette/rose/600','palette/rose/650','palette/rose/700'],violet:['palette/violet/550','palette/violet/600','palette/violet/650'],yellow:['palette/yellow/500','palette/yellow/550','palette/yellow/600']};
 for(const [hue,shades] of Object.entries(expected))for(const [index,state] of ['normal','hover','pressed'].entries())expect(resolve(`Semantic/action-vivid/${hue}/${state}`,mode)).toEqual(resolve(`Primitives/${shades[index]}`,mode));
});

it('keeps neutral ButtonGroup surfaces soft, distinct, and readable in every context',()=>{
 for(const mode of Object.keys(graph.contexts)){
  const surface=resolve('Semantic/surface/current',mode) as RGB;
  const fills=['background','hover','selected','pressed','prefix'].map(role=>resolve(`Semantic/group/${role}`,mode) as RGB);
  const ink=resolve('Semantic/group/text',mode) as RGB;
  expect(ratio(surface,fills[0]),mode).toBeGreaterThanOrEqual(1.12);
  expect(ratio(surface,fills[0]),mode).toBeLessThanOrEqual(1.20);
  expect(ratio(fills[0],fills[1]),`${mode} hover`).toBeGreaterThanOrEqual(1.12);
  expect(ratio(fills[1],fills[3]),`${mode} pressed`).toBeGreaterThanOrEqual(1.12);
  expect(fills[4]).toEqual(fills[0]);
  expect(fills[2]).toEqual(fills[1]);
  expect(ratio(fills[0],fills[2]),`${mode} selected differs from normal`).toBeGreaterThan(1.04);
  for(const [index,fill] of fills.entries())expect(ratio(ink,fill),`${mode} role ${index}`).toBeGreaterThanOrEqual(4.5);
 }
});

it('uses the generated accent element pairs for colored secondary ButtonGroups',()=>{
 for(const mode of Object.keys(graph.contexts))for(const hue of graph.modes.filter(value=>value!=='neutral')){
  const text=resolve(`Semantic/element/${hue}/text`,mode) as RGB;
  const normal=resolve(`Semantic/element/${hue}/normal`,mode) as RGB;
  const hover=resolve(`Semantic/element/${hue}/hover`,mode) as RGB;
  const pressed=resolve(`Semantic/element/${hue}/pressed`,mode) as RGB;
  expect(ratio(text,normal),`${mode} ${hue} normal`).toBeGreaterThanOrEqual(4.5);
  expect(ratio(text,hover),`${mode} ${hue} hover`).toBeGreaterThanOrEqual(4.5);
  expect(ratio(text,pressed),`${mode} ${hue} pressed`).toBeGreaterThanOrEqual(4.5);
  expect(ratio(normal,hover),`${mode} ${hue} hover distinct`).toBeGreaterThan(1.04);
  expect(ratio(hover,pressed),`${mode} ${hue} pressed distinct`).toBeGreaterThan(1.04);
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
