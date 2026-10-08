import { readFileSync } from 'node:fs';
export const readJSON = path => JSON.parse(readFileSync(new URL('../'+path, import.meta.url), 'utf8'));
export const flatten = (node, path='', out={}) => { for(const [key,value] of Object.entries(node)) { const name=path?path+'/'+key:key;if(value.$type)out[name]=value;else flatten(value,name,out); } return out; };
// This authored model deliberately reads no captured app colors or CSS.
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
export const palette={};
for(const [hue,angle] of Object.entries(foundation.palette.hues))for(const step of foundation.palette.steps){
 const t=step/1000,L=1-(1-foundation.palette.lightnessFloor)*t;
 const C=foundation.palette.chromaPeak*Math.sin(Math.PI*t)**foundation.palette.chromaExponent;
 palette[`palette/${hue}/${step}`]=gamutColor(L,C,angle);
}
for(const step of foundation.palette.neutralSteps){const Y=Math.max(0,1.05*Math.exp(-Math.log(foundation.palette.neutralContrastSpan)*step/1000)-.05);palette[`palette/gray/${step}`]=gamutColor(Math.cbrt(Y),0,0);}
palette['palette/black']=gamutColor(0,0,0);palette['palette/white']=gamutColor(1,0,0);
export const hues = ['neutral','rose','pink','fuchsia','purple','violet','indigo','blue','sky','cyan','teal','emerald','green','lime','yellow','amber','orange','red'];
export const surfaceRules = readJSON('source/surface-rules.json');
export const themes=['Light','Dark'], surfaces=['base','canvas','raised','floating'], states=['normal','hover','pressed','disabled'];
export const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export const luminance = c => c.components.reduce((s,x,i)=>s+linear(x)*[.2126,.7152,.0722][i],0);
export const contrast = (a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
export const hex = c => '#'+c.components.map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('').toUpperCase();
export const scales=Object.fromEntries(hues.map(hue=>[hue,Object.entries(palette).filter(([n])=>n.startsWith('palette/'+(hue==='neutral'?'gray':hue)+'/')).map(([name,c])=>({name,Y:luminance(c),color:c})).sort((a,b)=>a.Y-b.Y)]));
const reactionY=(c,theme,alpha)=>luminance({...c,components:c.components.map(x=>x*(1-alpha)+(theme==='Dark'?1:0)*alpha)});
const choose=(candidates,target)=>[...candidates].sort((a,b)=>Math.abs(Math.log((a.Y+.05)/(target+.05)))-Math.abs(Math.log((b.Y+.05)/(target+.05))))[0];
function triple(candidates,targets,direction,surfaceY) {
 let best;for(const a of candidates)for(const b of candidates)for(const c of candidates){const v=[a,b,c];if((b.Y-a.Y)*direction<=0||(c.Y-b.Y)*direction<=0||contrast(a.Y,b.Y)<1.045||contrast(b.Y,c.Y)<1.045)continue;if(surfaceY!==undefined&&(a.Y-surfaceY)*direction<=0)continue;const score=v.reduce((s,x,i)=>s+Math.log((x.Y+.05)/(targets[i]+.05))**2,0);if(!best||score<best.score)best={v,score};}if(!best)throw Error('No monotonic state ramp');return best.v;
}
const blackInk='palette/gray/1000',whiteInk='palette/gray/0';
function chooseActionInk(backgroundY){
 const blackContrast=contrast(backgroundY,luminance(palette[blackInk]));
 const whiteContrast=contrast(backgroundY,luminance(palette[whiteInk]));
 return whiteContrast>blackContrast?whiteInk:blackInk;
}
function vividRamp(hue,solid){
 const candidates=scales[hue].map(color=>({...color,step:Number(color.name.split('/').at(-1))})).filter(color=>color.step>=450&&color.step<=700);
 const targetSteps=[550,600,650];let best;
 for(const normal of candidates)for(const hover of candidates)for(const pressed of candidates){
  if(!(normal.step<hover.step&&hover.step<pressed.step))continue;
  const ramp=[normal,hover,pressed];if(ramp.some((color,index)=>color.Y<=solid[index].Y))continue;
  const ink=chooseActionInk(normal.Y),inkY=luminance(palette[ink]);
  if(ramp.some(color=>contrast(color.Y,inkY)<4.5))continue;
  const score=ramp.reduce((sum,color,index)=>sum+(color.step-targetSteps[index])**2,0);
  if(!best||score<best.score)best={ramp,ink,score};
 }
 if(!best)throw Error(`No vivid action ramp with a stable readable ink for ${hue}`);
 return best;
}
export function buildColorModel(){
 const contexts={},audit=[];
 for(const surface of ['base','canvas','raised','floating'])for(const [ti,theme] of themes.entries()){
  const surfaceName='palette/'+surfaceRules[surface].palette[ti],surfaceY=luminance(palette[surfaceName]);
  const ratios=ti?[1.35,1.70,2.15]:[1.12,1.22,1.34];const targets=ratios.map(r=>ti?(surfaceY+.05)*r-.05:(surfaceY+.05)/r-.05);
  const disabledBg=choose(scales.neutral,ti?(surfaceY+.05)*1.15-.05:(surfaceY+.05)/1.06-.05);
  const disabledText=choose(scales.neutral.filter(p=>contrast(p.Y,disabledBg.Y)>=4.5&&(ti?p.Y>disabledBg.Y:p.Y<disabledBg.Y)),ti?.3:.16);
  const values={'surface/current':surfaceName,'disabled/background':disabledBg.name,'disabled/text':disabledText.name};
  for(const s of surfaces)values['surface/'+s]='palette/'+surfaceRules[s].palette[ti];
  const element={};
  for(const hue of hues){const ramp=triple(scales[hue],targets,ti?1:-1,surfaceY);const ink=choose(scales[hue].filter(p=>ramp.every(bg=>contrast(p.Y,bg.Y)>=4.5&&contrast(p.Y,reactionY(bg.color,theme,ti?.10:.08))>=4.5)&&(ti?p.Y>ramp[2].Y:p.Y<ramp[2].Y)),ti?.72:.063);if(!ink)throw Error('Unreadable '+hue+' '+theme+' '+surface+' '+JSON.stringify(ramp.map(x=>[x.name,x.Y])));element[hue]={};for(const [i,state]of states.entries()){const bg=i===3?disabledBg:ramp[i],fg=i===3?disabledText:ink;element[hue][state]={background:bg.name,text:fg.name};values[`element/${hue}/${state}`]=bg.name;audit.push({theme,surface,hue,state,background:bg.name,text:fg.name,contrast:contrast(bg.Y,fg.Y),reactionContrast:contrast(fg.Y,reactionY(bg.color,theme,i===3?0:ti?.10:.08)),backgroundY:bg.Y,surfaceContrast:contrast(bg.Y,surfaceY)});}values[`element/${hue}/text`]=ink.name;values[`element/${hue}/disabled-text`]=disabledText.name;
   const solid=triple(scales[hue],hue==='neutral'?(ti?[.94,.80,.66]:[.009,.025,.045]):ti?[.55,.65,.75]:[.1,.075,.05],hue==='neutral'?(ti?-1:1):(ti?1:-1));const solidInk=chooseActionInk(solid[0].Y);for(let i=0;i<3;i++){if(contrast(solid[i].Y,luminance(palette[solidInk]))<4.5)throw Error('Solid contrast '+hue);values[`action/${hue}/${states[i]}`]=solid[i].name;}values[`action/${hue}/text`]=solidInk;
   const vividResult=ti||hue==='neutral'?{ramp:solid,ink:solidInk}:vividRamp(hue,solid),vivid=vividResult.ramp,vividInk=vividResult.ink;
   for(let i=0;i<3;i++)values[`action-vivid/${hue}/${states[i]}`]=vivid[i].name;
   for(let i=0;i<3;i++)if(contrast(vivid[i].Y,luminance(palette[vividInk]))<4.5)throw Error(`Vivid contrast ${hue}/${states[i]}`);
   values[`action-vivid/${hue}/text`]=vividInk;
  }
  for(const state of states)values['control/'+state]=element.neutral[state].background;
  values['control/text']=element.neutral.normal.text;values['control/disabled-text']=disabledText.name;
  const backgrounds=[surfaceY,...audit.filter(r=>r.theme===theme&&r.surface===surface&&r.state!=='disabled').map(r=>r.backgroundY)];
  for(const [role,target]of Object.entries({primary:ti?.94:.017,secondary:ti?.72:.06,muted:ti?.60:.09})){const ink=choose(scales.neutral.filter(p=>backgrounds.every(y=>contrast(p.Y,y)>=4.5)&&(ti?p.Y>Math.max(...backgrounds):p.Y<Math.min(...backgrounds))),target);if(!ink)throw Error('No '+role);values['content/'+role]=ink.name;}
  values['content/caption']=choose(scales.neutral.filter(p=>contrast(p.Y,surfaceY)>=4.5&&(ti?p.Y>surfaceY:p.Y<surfaceY)),ti?(surfaceY+.05)*4.6-.05:(surfaceY+.05)/4.6-.05).name;
  // Decorative edges follow the actual surface/fill. Meaningful focus stays ≥3:1.
  const edge=(bg,ratio,scale=scales.neutral)=>choose(scale.filter(p=>ti?p.Y>bg:p.Y<bg),ti?(bg+.05)*ratio-.05:(bg+.05)/ratio-.05);
  for(const [role,ratio]of Object.entries({subtle:1.14,default:1.3,strong:1.65}))values['border/'+role]=edge(surfaceY,ratio).name;
  // Structural dividers are opaque and independent of decorative border visibility.
  const divider=(backgroundY,minimumRatio)=>choose(scales.neutral.filter(p=>(ti?p.Y>backgroundY:p.Y<backgroundY)&&contrast(p.Y,backgroundY)>=minimumRatio),ti?(backgroundY+.05)*minimumRatio-.05:(backgroundY+.05)/minimumRatio-.05);
  for(const [role,ratio]of Object.entries({subtle:1.5,default:1.8,strong:2.4}))values['divider/'+role]=divider(surfaceY,ratio).name;
  values['divider/panel']=divider(surfaceY,ti?1.25:1.15).name;
  values['divider/control']=divider(luminance(palette[values['control/normal']]),1.8).name;
  const emphasis=choose(scales.neutral.filter(p=>contrast(p.Y,surfaceY)>=3&&(ti?p.Y>surfaceY:p.Y<surfaceY)),ti?(surfaceY+.05)*3.1-.05:(surfaceY+.05)/3.1-.05);
  values['border/emphasis']=emphasis.name;values['focus/ring']=emphasis.name;
  values['border/panel']=values['border/subtle'];values['border/overlay']=values['border/default'];
  // A grouped control must remain distinct even when decorative borders are off.
  // Choose each reaction from the previous fill while preserving AA for its ink.
  values['group/text']=values['content/primary'];
  const groupInkY=luminance(palette[values['group/text']]);
  const groupStep=(backgroundY,minimumRatio)=>{
   const candidates=scales.neutral.filter(p=>(ti?p.Y>backgroundY:p.Y<backgroundY)&&contrast(p.Y,backgroundY)>=minimumRatio&&contrast(p.Y,groupInkY)>=4.5);
   if(!candidates.length)throw Error('No readable group state');
   const target=ti?(backgroundY+.05)*minimumRatio-.05:(backgroundY+.05)/minimumRatio-.05;
   return choose(candidates,target);
  };
  const groupNormal=groupStep(surfaceY,1.12),groupHover=groupStep(groupNormal.Y,1.12),groupPressed=groupStep(groupHover.Y,1.12);
  values['group/background']=groupNormal.name;
  values['group/hover']=groupHover.name;
  values['group/selected']=groupHover.name;
  values['group/pressed']=groupPressed.name;
  values['group/prefix']=groupNormal.name;
  for(const [i,state]of states.slice(0,3).entries())values['border/control'+(i?'-'+state:'')]=edge(luminance(palette[element.neutral[state].background]),1.16+i*.08).name;
  for(const hue of hues)for(const [i,state]of states.slice(0,3).entries())values[`element/${hue}/border${i?'-'+state:''}`]=edge(luminance(palette[element[hue][state].background]),1.22+i*.08,scales[hue]).name;
  for(const [tone,hue]of Object.entries({danger:'red',success:'green',warning:'amber',info:'blue'})){for(const state of states)values[`feedback/${tone}/${state}`]=element[hue][state].background;values[`feedback/${tone}/text`]=element[hue].normal.text;}
  contexts[theme+' · '+surface[0].toUpperCase()+surface.slice(1)]={theme,surface,values};
 }
 return {contexts,audit};
}
