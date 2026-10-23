// Pure color/edit helpers shared by the editor and its non-DOM exports.
import {clamp,color,fromHex,toOklch} from '../color-engine.mjs';
export const paletteScaleIds=['ramp'];
const legacyScaleIds=['solid','soft','muted'];
export const palettePosition=(index,count)=>Number(((index-1)/(count-1)).toFixed(12));
export const paletteIndex=(position,count)=>Math.round(position*(count-1))+1;
export function validatePaletteEdits(edits){
 if(edits===undefined)return undefined;
 if(!edits||typeof edits!=='object'||Array.isArray(edits)||typeof edits.interpolate!=='boolean'||!Array.isArray(edits.anchors)||edits.anchors.length>384||edits.legacyAnchors!==undefined&&(!Array.isArray(edits.legacyAnchors)||edits.legacyAnchors.length>768))throw new Error('Некорректные ручные ступени палитры.');
 const parse=(values,allowed,archive=false)=>{const keys=new Set();return values.map(anchor=>{
  if(!anchor||!allowed.includes(anchor.scale)||!Number.isFinite(anchor.position)||anchor.position<0||anchor.position>1)throw new Error('Некорректная позиция ручной ступени.');
  const position=Number(anchor.position.toFixed(12)),key=anchor.scale+'/'+position+(archive?'/'+String(anchor.hex).toUpperCase():'');
  if(keys.has(key))throw new Error('Ручные ступени не должны повторяться.');keys.add(key);fromHex(anchor.hex);
  return {scale:anchor.scale,position,hex:anchor.hex.toUpperCase()};
 });};
 const input=parse(edits.anchors,[...paletteScaleIds,...legacyScaleIds]);
 const anchors=input.filter(a=>a.scale==='ramp'),legacyAnchors=parse(edits.legacyAnchors??[],legacyScaleIds,true);
 for(const anchor of input.filter(a=>legacyScaleIds.includes(a.scale))){
  if(anchor.scale==='solid'&&!anchors.some(a=>a.position===anchor.position))anchors.push({...anchor,scale:'ramp'});
  else if(!legacyAnchors.some(a=>a.scale===anchor.scale&&a.position===anchor.position&&a.hex===anchor.hex))legacyAnchors.push(anchor);
 }
 // Retain obsolete soft/muted edits as source data; they never generate a second
 // ramp. Existing solid anchors become active ramp anchors without changing RGB.
 return {interpolate:edits.interpolate,anchors:anchors.sort((a,b)=>a.position-b.position),...(legacyAnchors.length?{legacyAnchors}: {})};
}
export function projectedAnchors(edits,scale,count){
 const projected=new Map();
 for(const anchor of edits?.anchors??[]){if(anchor.scale!==scale)continue;const index=paletteIndex(anchor.position,count),prior=projected.get(index);
  // Preserve every authored position in the project even if a shorter ramp maps
  // two points to one step. The closest original position wins deterministically.
  if(!prior||Math.abs(anchor.position-palettePosition(index,count))<=Math.abs(prior.position-palettePosition(index,count)))projected.set(index,anchor);
 }
 return projected;
}
export function interpolateColor(left,right,t){
 const a=toOklch(left),b=toOklch(right),angle=n=>n*Math.PI/180;
 const x=a.c*Math.cos(angle(a.h))*(1-t)+b.c*Math.cos(angle(b.h))*t,y=a.c*Math.sin(angle(a.h))*(1-t)+b.c*Math.sin(angle(b.h))*t;
 // Cartesian OKLab interpolation does not wrap through the long hue arc.
 return color(a.l+(b.l-a.l)*t,Math.hypot(x,y),(Math.atan2(y,x)*180/Math.PI+360)%360);
}
export function toHsl(value){
 const {r,g,b}=value,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,l=(max+min)/2;
 const h=delta===0?0:max===r?((g-b)/delta+6)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
 return {h:h*60,s:delta===0?0:delta/(1-Math.abs(2*l-1))*100,l:l*100};
}
export function fromHsl(h,s,l){
 if(![h,s,l].every(Number.isFinite)||h<0||h>360||s<0||s>100||l<0||l>100)throw new Error('HSL: тон 0–360°, насыщенность и светлота 0–100%.');
 h=(h%360)/60;s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;
 const channels=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];
 return {r:clamp(channels[0]+m,0,1),g:clamp(channels[1]+m,0,1),b:clamp(channels[2]+m,0,1),a:1};
}

// Cartesian OKLab measurements use the actual rendered sRGB composite.
export function toOklab(c){
 const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
 const r=linear(c.r),g=linear(c.g),b=linear(c.b);
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return {l:.2104542553*l+.793617785*m-.0040720468*s,a:1.9779984951*l-2.428592205*m+.4505937099*s,b:.0259040371*l+.7827717662*m-.808675766*s};
}
export const labDistance=(x,y)=>Math.hypot(x.l-y.l,x.a-y.a,x.b-y.b);
export const colorDifference=(x,y)=>labDistance(toOklab(x),toOklab(y));
