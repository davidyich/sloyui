import {BLACK,WHITE,clamp,composite,contrast,luminance,toOklch} from '../color-engine.mjs';
import {fillVisibilityPolicy,resolveRecommendedFillTargets,solveRecommendedFills,resolveFillAppearanceBounds} from './recommended-fills.mjs';

const roles=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'];
// Neutral blocks intentionally remain quieter than chromatic labels. State and
// text requirements are shared; surface prominence has its own explicit floor.
export const neutralFillVisibilityPolicy={...fillVisibilityPolicy,tertiaryContrast:1.04,secondaryContrast:1.10,tertiaryDelta:.015,secondaryDelta:.025};
const rgb=['r','g','b'];
const angle=(a,b)=>Math.abs((a-b+540)%360-180);
const referenceCache=new Map();
function lightReferenceChroma(accent,steps,minimumContrast,referenceBase){
 const key=JSON.stringify([accent,steps.map(s=>[s.name,s.value]),minimumContrast,referenceBase]);
 if(referenceCache.has(key))return referenceCache.get(key);
 // Preserve hue identity from the former white-reference fit, not its strength.
 // New prominence targets independently set C and L below.
 const oldPolicy={'tertiary/normal':[1.15,.025],'tertiary/active':[1.28,.05],'secondary/normal':[1.5,.06],'secondary/active':[1.68,.085]},strength=clamp((accent.opacityScale??1.2)/1.2,.1,2),y=luminance(referenceBase),l=Math.cbrt(y),inkY=Math.min(...steps.map(s=>luminance(s.value))),boundary=(inkY+.05)*(minimumContrast+.1)-.05;
 const hueTargets=Object.fromEntries(roles.map(role=>{const[ratio,lightness]=oldPolicy[role];return[role,[clamp(Math.max(Math.min((y+.05)/(1+(ratio-1)*strength)-.05,Math.max(0,l-lightness*strength)**3),boundary),.0001,.9999)]];}));
 const reference=solveRecommendedFills(accent,steps,{base:referenceBase,dark:false,minimumContrast,targets:hueTargets}),result=Object.fromEntries(roles.map(role=>[role,toOklch(composite(reference.fills[role],referenceBase)).c]));
 result.colors=Object.fromEntries(roles.map(role=>[role,toOklch(composite(reference.fills[role],referenceBase))]));
 for(const family of ['tertiary','secondary']){const normal=result.colors[family+'/normal'],active=result.colors[family+'/active'];active.h=normal.h;active.c=Math.max(active.c,normal.c*1.10);result[family+'/active']=active.c;}
 const targets=resolveRecommendedFillTargets([referenceBase],{dark:false,strength});
 for(const role of roles){result[role]*=role.startsWith('secondary/')?.5:.65;result.colors[role].c=result[role];result.colors[role].l=Math.cbrt(targets[role][0]);}
 if(referenceCache.size>=32)referenceCache.delete(referenceCache.keys().next().value);referenceCache.set(key,result);return result;
}

const lab=value=>{const {l,c,h}=toOklch(value),angle=h*Math.PI/180;return[l,c*Math.cos(angle),c*Math.sin(angle)];};
const delta=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const unique=values=>values.filter((v,i)=>!values.slice(0,i).some(b=>rgb.every(k=>Math.abs(v[k]-b[k])<1e-10)));
/** A light neutral backing needs a bounded recipe family: a pastel paint
 * calibrated on white cannot also darken nested gray without hue/L loss. */
export function alphaRecipeFamily(theme,surface,base){
 if(surface==='Glass')return 'Glass/'+theme;
 return theme==='Light'&&toOklch(base).l<.985?'Light/Neutral':theme;
}
function normalizeBackings(input){
 if(!Array.isArray(input)||!input.length)throw new Error('Alpha recipe requires at least one declared backing.');
 const values=input.map(item=>item.base??item);
 if(!values.every(v=>rgb.every(k=>Number.isFinite(v[k])&&v[k]>=0&&v[k]<=1)&&(v.a??1)===1))throw new Error('Alpha recipe backings must be opaque composed sRGB colors.');
 return unique(values);
}
function pairStats(normal,active,dark){
 let minDelta=Infinity,maxDelta=0,minContrast=Infinity,ordered=true;
 for(let i=0;i<normal.ys.length;i++){
  const d=delta(normal.labs[i],active.labs[i]);minDelta=Math.min(minDelta,d);maxDelta=Math.max(maxDelta,d);
  minContrast=Math.min(minContrast,(Math.max(normal.ys[i],active.ys[i])+.05)/(Math.min(normal.ys[i],active.ys[i])+.05));
  if(dark?active.ys[i]<=normal.ys[i]+1e-8:active.ys[i]>=normal.ys[i]-1e-8)ordered=false;
 }
 const valid=ordered&&minDelta>=fillVisibilityPolicy.stateDelta-1e-7&&maxDelta<=fillVisibilityPolicy.stateMaximumDelta+1e-7&&minContrast>=fillVisibilityPolicy.stateContrast-1e-7;
 const penalty=(ordered?0:10)+Math.max(0,fillVisibilityPolicy.stateDelta-minDelta)*20+Math.max(0,maxDelta-fillVisibilityPolicy.stateMaximumDelta)*20+Math.max(0,fillVisibilityPolicy.stateContrast-minContrast)*4;
 return{minDelta,maxDelta,minContrast,ordered,valid,penalty};
}

/** One finite pigment/whole-percent recipe, checked simultaneously on a complete
 * declared family. This function never assumes that a paint works on any RGB. */
export function solveAlphaRecipe(accent,steps,{backings,dark=false,minimumContrast=4.5,neutral=false,maxAlpha=.96,ink,contentReserve=.55,referenceBase=WHITE}={}){
 const bases=normalizeBackings(backings);
 if(!steps?.length||!steps.every(s=>s.name&&rgb.every(k=>Number.isFinite(s.value?.[k]))&&(s.value.a??1)===1))throw new Error('Alpha recipe requires named opaque ramp pigments.');
 if(!Number.isFinite(minimumContrast)||minimumContrast<1||!Number.isFinite(maxAlpha)||maxAlpha<=0||maxAlpha>1)throw new Error('Invalid alpha recipe contrast or opacity bound.');
 const strength=clamp((accent.opacityScale??1.2)/1.2,.1,2),chromaScale=clamp((accent.softChroma??1.4)/1.4,.1,3)*(dark?(accent.darkChromaMultiplier??.9)/.9:1);
 const pole=ink??(dark?WHITE:BLACK),poleY=luminance(pole),ys=bases.map(luminance),labs=bases.map(lab);
 const targets=neutral?Object.fromEntries(roles.map((role,index)=>[role,ys.map(y=>{const ratio=[1.07,1.14,1.18,1.26][index],target=dark?(y+.05)*ratio-.05:(y+.05)/ratio-.05,boundary=dark?1.05/(minimumContrast+.1)-.05:.05*(minimumContrast+.1)-.05;return clamp(dark?Math.min(target,boundary):Math.max(target,boundary),0,1);})])):resolveRecommendedFillTargets(bases,{dark,strength,minimumContrast,availableInks:((dark&&pole===WHITE)||(!dark&&pole===BLACK))?[pole]:[]});
 const referenceChroma=ink===undefined&&!dark&&!neutral?lightReferenceChroma(accent,steps,minimumContrast,referenceBase):null;
 const candidates=[];
 for(const [stepIndex,step]of steps.entries())for(let percent=1;percent<=Math.floor(maxAlpha*100+1e-9);percent++){
  const paint={...step.value,a:percent/100},rendered=bases.map(bg=>composite(paint,bg)),values=rendered.map(luminance),colors=rendered.map(toOklch),candidate={step,stepIndex,percent,paint,ys:values,labs:rendered.map(lab)};
  candidate.textContrast=Math.min(...values.map(y=>(Math.max(y,poleY)+.05)/(Math.min(y,poleY)+.05)));
  candidate.readable=candidate.textContrast>=minimumContrast+(neutral?.12:contentReserve)-1e-7;
  candidate.ordered=values.every((y,i)=>dark?y>ys[i]+1e-8:y<ys[i]-1e-8);
  candidate.surfaceContrast=Math.min(...rendered.map((v,i)=>contrast(v,bases[i])));
  candidate.surfaceDelta=Math.min(...candidate.labs.map((v,i)=>delta(v,labs[i])));
  const expression=ink===undefined?colors.map(c=>c.c):candidate.labs.map((v,i)=>Math.hypot(v[1]-labs[i][1],v[2]-labs[i][2]));
  candidate.renderedChroma=Math.max(...colors.map(c=>c.c));
  candidate.maxChroma=Math.max(...expression);
  candidate.meanChroma=expression.reduce((sum,c)=>sum+c,0)/expression.length;
  candidate.onWhite=toOklch(composite(paint,referenceBase));
  candidate.roles=Object.fromEntries(roles.map(role=>{const family=role.split('/')[0],goal=neutral?0:(referenceChroma?.[role]??(family==='secondary'?(dark?.025:.032):.014)*chromaScale),cap=Math.max((family==='secondary'?.08:.05)*chromaScale,referenceChroma?Math.min(.095,referenceChroma[role]+.025):0);
   const bounds=neutral?{minimumContrast:neutralFillVisibilityPolicy[family+'Contrast'],minimumDelta:neutralFillVisibilityPolicy[family+'Delta'],maximumContrast:Infinity}:resolveFillAppearanceBounds(role,strength),floorContrast=bounds.minimumContrast,floorDelta=bounds.minimumDelta;
   const visibility=Math.max(0,floorContrast-candidate.surfaceContrast)*3+Math.max(0,floorDelta-candidate.surfaceDelta)*10;
   const maximumContrast=Math.max(...rendered.map((v,i)=>contrast(v,bases[i]))),prominence=maximumContrast<=bounds.maximumContrast+1e-7;
   const error=Math.max(...values.map((y,i)=>Math.abs(y-targets[role][i]))),soft=neutral||candidate.maxChroma<=cap+1e-7;
   const anchor=referenceChroma?.colors[role],hueError=anchor?angle(candidate.onWhite.h,anchor.h):0,lightnessError=anchor?Math.abs(candidate.onWhite.l-anchor.l):0;
   const expressive=neutral||candidate.meanChroma>=goal-.002;
   const anchored=!anchor||(hueError<=3&&lightnessError<=.025);
   const valid=candidate.readable&&candidate.ordered&&visibility<1e-6&&soft&&expressive&&anchored&&prominence;
   const score=error*.5+Math.abs(candidate.meanChroma-goal)*(role.endsWith('/normal')?8:3)+visibility+Math.max(0,candidate.maxChroma-cap)*4+lightnessError*8+hueError/180*.3+Math.max(0,maximumContrast-bounds.maximumContrast)*3;
   return[role,{valid,score,error,soft,hueError,lightnessError,maximumContrast,bounds,gates:{text:candidate.readable,direction:candidate.ordered,visibility:visibility<1e-6,prominence,chroma:soft,expression:expressive,hue:!anchor||hueError<=3,lightness:!anchor||lightnessError<=.025}}];}));
  candidates.push(candidate);
 }
 // Text and direction are hard priorities; appearance impossibility remains
 // explicit instead of selecting an unreadable paint to hit a target luminance.
 const readable=candidates.filter(c=>c.readable&&c.ordered),pool=readable.length?readable:candidates;
 const familyPairs={};
 for(const family of ['tertiary','secondary']){
  const normalRole=family+'/normal',activeRole=family+'/active',pairs=[];
  for(const step of steps){const pigments=pool.filter(c=>c.step===step),alternatives=[];
   for(const normal of pigments)for(const active of pigments){if(active.percent<=normal.percent)continue;
    const stats=pairStats(normal,active,dark),valid=stats.valid&&normal.roles[normalRole].valid&&active.roles[activeRole].valid;
    const score=normal.roles[normalRole].score+active.roles[activeRole].score+stats.penalty;
    alternatives.push({normal,active,stats,valid,score});
   }pairs.push(...alternatives.sort((a,b)=>Number(b.valid)-Number(a.valid)||a.score-b.score).slice(0,24));
  }
  const normalPool=[...pool].sort((a,b)=>Number(b.roles[normalRole].valid)-Number(a.roles[normalRole].valid)||a.roles[normalRole].score-b.roles[normalRole].score).slice(0,64),activePool=[...pool].sort((a,b)=>Number(b.roles[activeRole].valid)-Number(a.roles[activeRole].valid)||a.roles[activeRole].score-b.roles[activeRole].score).slice(0,64);
  const mixed=[];for(const normal of normalPool)for(const active of activePool)if(normal.step!==active.step){const stats=pairStats(normal,active,dark),valid=stats.valid&&normal.roles[normalRole].valid&&active.roles[activeRole].valid,score=normal.roles[normalRole].score+active.roles[activeRole].score+stats.penalty+.001;mixed.push({normal,active,stats,valid,score});}pairs.push(...mixed.sort((a,b)=>Number(b.valid)-Number(a.valid)||a.score-b.score).slice(0,64));
  if(!pairs.length){const normal=pool[0],active=pool.at(-1);pairs.push({normal,active,stats:pairStats(normal,active,dark),valid:false,score:Infinity});}
  familyPairs[family]=pairs.sort((a,b)=>Number(b.valid)-Number(a.valid)||a.score-b.score);
 }
 let selected;
 const joint=(tertiary,secondary)=>{
  const ordered=tertiary.active.ys.every((v,i)=>dark?secondary.normal.ys[i]>v+1e-8:secondary.normal.ys[i]<v-1e-8),valid=tertiary.valid&&secondary.valid&&ordered;
  const pigments=new Set([tertiary.normal.step.name,tertiary.active.step.name,secondary.normal.step.name,secondary.active.step.name]).size,score=tertiary.score+secondary.score+(ordered?0:10);
  if(!selected||Number(valid)>Number(selected.valid)||valid===selected.valid&&(score<selected.score-0.004||Math.abs(score-selected.score)<=0.004&&pigments<selected.pigments))selected={tertiary,secondary,valid,ordered,pigments,score};
 };
 for(const tertiary of familyPairs.tertiary)for(const secondary of familyPairs.secondary)if(tertiary.normal.step===secondary.normal.step)joint(tertiary,secondary);
 if(!selected?.valid||selected.score>.025)for(const tertiary of familyPairs.tertiary.slice(0,64))for(const secondary of familyPairs.secondary.slice(0,64))joint(tertiary,secondary);
 const fills={},references={},roleDiagnostics={},issues=[];
 for(const family of ['tertiary','secondary'])for(const state of ['normal','active']){const c=selected[family][state],role=family+'/'+state;fills[role]=c.paint;references[role]=c.step.name;
  roleDiagnostics[role]={maximumContrast:c.roles[role].maximumContrast,prominenceBounds:c.roles[role].bounds,step:c.step.name,alpha:c.paint.a,chroma:c.meanChroma,actualY:c.ys[0],actualYs:c.ys,minY:Math.min(...c.ys),maxY:Math.max(...c.ys),targetYs:targets[role],targetY:targets[role][0],minimumContrast:c.surfaceContrast,minimumDelta:c.surfaceDelta,error:c.roles[role].error,gates:c.roles[role].gates,hueError:c.roles[role].hueError,anchorLightnessError:c.roles[role].lightnessError,renderedMaxChroma:c.renderedChroma,pigment:c.step.name,alphaPercent:c.percent,textContrast:c.textContrast,surfaceContrast:c.surfaceContrast,surfaceDelta:c.surfaceDelta,maxChroma:c.maxChroma,targetError:c.roles[role].error,visible:c.roles[role].valid};
  if(!c.readable)issues.push(role+': text contrast unattainable on declared backing family');
  if(!c.ordered)issues.push(role+': fill direction unattainable on declared backing family');
  if(!c.roles[role].valid)issues.push(role+': '+Object.entries(c.roles[role].gates).filter(([,pass])=>!pass).map(([gate])=>gate).join(', ')+' unattainable on declared backing family');
 }
 for(const family of ['tertiary','secondary'])if(!selected[family].stats.valid)issues.push(family+': distinct gentle Normal/Active unattainable on declared backing family');
 if(!selected.ordered)issues.push('Secondary/Tertiary hierarchy unattainable on declared backing family');
 return{fills,references,backings:bases,contentBackings:unique(bases.flatMap(bg=>[bg,...roles.map(role=>composite(fills[role],bg))])),diagnostics:{algorithm:'shared-alpha/v1',polarity:dark?'Dark':'Light',backingCount:bases.length,minimumContrast,feasibleSamples:issues.length?Object.fromEntries(roles.map(role=>[role,candidates.filter(c=>c.roles[role].valid).sort((a,b)=>a.roles[role].score-b.roles[role].score).slice(0,8).map(c=>({step:c.step.name,alpha:c.paint.a,anchor:c.onWhite,minY:Math.min(...c.ys),maxY:Math.max(...c.ys)}))])):undefined,candidateCounts:Object.fromEntries(roles.map(role=>[role,candidates.filter(c=>c.roles[role].valid).length])),pairCounts:Object.fromEntries(['tertiary','secondary'].map(f=>[f,familyPairs[f].filter(p=>p.valid).length])),referenceChroma,referenceBase,minimumTextContrast:Math.min(...roles.map(r=>roleDiagnostics[r].textContrast)),pigmentCount:selected.pigments,limited:issues.length>0,issues,roles:roleDiagnostics,activeDelta:Object.fromEntries(['tertiary','secondary'].map(f=>[f,selected[f].stats]))}};
}

/** Neutral endpoints share the same solver. Primary fills/foreground stay opaque. */
export function solveNeutralAlphaRecipe({backings,dark=false,minimumContrast=4.5}={}){
 const pole=dark?{name:'white',value:WHITE}:{name:'black',value:BLACK};
 const recipe=solveAlphaRecipe({hue:0,softChroma:0,opacityScale:1.2},[pole],{backings,dark,minimumContrast,neutral:true});
 // Disabled is intentionally quieter than an interactive state, not a layer
 // opacity on label/icon/children. It has no interactive contrast requirement.
 const disabled={...pole.value,a:.03};
 recipe.contentBackings=unique(recipe.backings.flatMap(bg=>{const block=composite(recipe.fills['secondary/normal'],bg),layers=[...Object.values(recipe.fills),disabled];return[bg,block,...layers.flatMap(paint=>[composite(paint,bg),composite(paint,block)])];}));
 return{...recipe,roles:{'surface/block':recipe.fills['secondary/normal'],'control/normal':recipe.fills['tertiary/normal'],'control/hover':recipe.fills['tertiary/active'],'control/pressed':recipe.fills['secondary/active'],'surface/disabled':disabled},references:{...recipe.references,'surface/block':pole.name,'control/normal':pole.name,'control/hover':pole.name,'control/pressed':pole.name,'surface/disabled':pole.name}};
}
