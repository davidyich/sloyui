import {clamp,composite,contrast,luminance,toOklch} from '../color-engine.mjs';

// Legacy reference values remain readable for old project diagnostics. New
// recommendations derive a target from each actual backing, never a theme-wide Y.
export const recommendedFillTargets={
 Light:{'tertiary/normal':.92,'tertiary/active':.90,'secondary/normal':.85,'secondary/active':.82},
 Dark:{'tertiary/normal':.03,'tertiary/active':.035,'secondary/normal':.055,'secondary/active':.062}
};
export const fillVisibilityPolicy={tertiaryContrast:1.10,secondaryContrast:1.30,tertiaryDelta:.025,secondaryDelta:.06,stateContrast:1.06,stateDelta:.015,stateMaximumDelta:.05};
export const recommendedFillPolicy={
 'tertiary/normal':{contrast:1.15,lightness:.025},
 'tertiary/active':{contrast:1.28,lightness:.05},
 'secondary/normal':{contrast:1.5,lightness:.06},
 'secondary/active':{contrast:1.68,lightness:.085}
};
const channels=['r','g','b'],roles=Object.keys(recommendedFillPolicy);
export const opacityResolution=.01;
const opaqueTargetTolerance=.003;
// Leave room for a distinct quieter ink on the same whole-percent domain.
const contentContrastReserve=.08;
const angularDifference=(a,b)=>Math.abs((a-b+540)%360-180);
const lab=c=>{const {l,c:chroma,h}=toOklch(c),angle=h*Math.PI/180;return [l,chroma*Math.cos(angle),chroma*Math.sin(angle)];};
const distance=(a,b)=>Math.hypot(...a.map((value,i)=>value-b[i]));

/** Equal context/backing gives equal target Y for every hue. The ratio avoids
 * vanishing near black; the lightness distance avoids vanishing on mid-grays. */
export function resolveRecommendedFillTargets(backings,{dark=false,strength=1,minimumContrast=4.5,availableInks=[]}={}){
 const inkYs=availableInks.map(ink=>luminance(ink.value??ink));
 const extremeY=inkYs.length?(dark?Math.max(...inkYs):Math.min(...inkYs)):null;
 const readableBoundary=extremeY===null?null:dark?(extremeY+.05)/(minimumContrast+.1)-.05:(extremeY+.05)*(minimumContrast+.1)-.05;
 const result=Object.fromEntries(roles.map(role=>[role,backings.map(backing=>{
  const y=luminance(backing),l=Math.cbrt(y),policy=recommendedFillPolicy[role];
  const ratio=1+(policy.contrast-1)*strength,delta=policy.lightness*strength;
  const target=dark?Math.max((y+.05)*ratio-.05,Math.min(1,l+delta)**3):Math.min((y+.05)/ratio-.05,Math.max(0,l-delta)**3);
  const readableTarget=readableBoundary===null?target:dark?Math.min(target,readableBoundary):Math.max(target,readableBoundary);
  return clamp(readableTarget,.0001,.9999);
 })]));
 // Clipping each state independently can collapse Normal and Active onto the
 // same text limit. Keep the strongest state at its bound and use the remaining
 // range for the quieter state before declaring the pair unreachable.
 if(readableBoundary!==null)for(let index=0;index<backings.length;index++){
  const y=luminance(backings[index]);
  const before=(active,ratio=1.08,delta=.018)=>dark
   ? Math.min((active+.05)/ratio-.05,Math.max(0,Math.cbrt(active)-delta)**3)
   : Math.max((active+.05)*ratio-.05,Math.min(1,Math.cbrt(active)+delta)**3);
  const familyFloor=family=>dark?(y+.05)*fillVisibilityPolicy[family+'Contrast']-.05:(y+.05)/fillVisibilityPolicy[family+'Contrast']-.05;
  const pullNormal=family=>{
   const normalRole=family+'/normal',activeRole=family+'/active',normal=result[normalRole][index],active=result[activeRole][index];
   const ratio=(Math.max(normal,active)+.05)/(Math.min(normal,active)+.05),gap=Math.abs(Math.cbrt(active)-Math.cbrt(normal));
   if((dark?active>normal:active<normal)&&ratio>=fillVisibilityPolicy.stateContrast&&gap>=fillVisibilityPolicy.stateDelta)return;
   const requested=before(active),floor=familyFloor(family);
   result[normalRole][index]=clamp(dark?Math.min(active,Math.max(floor,Math.min(normal,requested))):Math.max(active,Math.min(floor,Math.max(normal,requested))),.0001,.9999);
  };
  pullNormal('secondary');
  const secondary=result['secondary/normal'][index],tertiary=result['tertiary/active'][index];
  if(dark?tertiary>=secondary-1e-7:tertiary<=secondary+1e-7){
   const floor=familyFloor('tertiary'),requested=before(secondary,1.005,.001);
   result['tertiary/active'][index]=clamp(dark?Math.min(secondary,Math.max(floor,requested)):Math.max(secondary,Math.min(floor,requested)),.0001,.9999);
  }
  pullNormal('tertiary');
 }
 return result;
}
// Evaluate the finite published opacity domain itself. Rounding an arbitrary
// continuous solution afterward can collapse states or break text contrast.
function fitStep(step,backings,targets,maxAlpha){
 const candidates=[];
 for(let percent=0;percent<=Math.floor(maxAlpha*100+1e-9);percent++){
  const alpha=percent/100,paint={...step.value,a:alpha};
  const values=backings.map(bg=>luminance(composite(paint,bg)));
  candidates.push({alpha,error:Math.max(...values.map((value,i)=>Math.abs(value-targets[i]))),values,step,paint});
 }
 return candidates;
}

/** Select only existing opaque ramp steps plus numeric opacity. Glass fits a
 * target vector on both actual underlays; it must remain visible on each one. */
export function solveRecommendedFills(accent,steps,{base,extremes=[],dark=false,minimumContrast=4.5,targets,maxAlpha}={}){
 if(!steps?.length||!base||![base,...extremes].every(bg=>channels.every(k=>Number.isFinite(bg[k])&&bg[k]>=0&&bg[k]<=1)))throw new Error('Recommended fills require opaque ramp steps and actual sRGB backings.');
 const backings=[base,...extremes].filter((bg,i,all)=>!all.slice(0,i).some(other=>channels.every(k=>Math.abs(bg[k]-other[k])<1e-12)));
 const strength=clamp((accent.opacityScale??1.2)/1.2,.1,2),chromaScale=clamp((accent.softChroma??1.4)/1.4,.1,3)*(dark?(accent.darkChromaMultiplier??.9)/.9:1);
 const requestedReference=targets?Object.fromEntries(roles.map(role=>[role,Array.isArray(targets[role])?targets[role]:backings.map(()=>targets[role])])):resolveRecommendedFillTargets(backings,{dark,strength});
 const reference=targets?requestedReference:resolveRecommendedFillTargets(backings,{dark,strength,minimumContrast,availableInks:steps});
 if(!roles.every(role=>reference[role]?.length===backings.length&&reference[role].every(value=>Number.isFinite(value)&&value>=0&&value<=1))||maxAlpha!==undefined&&!Number.isFinite(maxAlpha))throw new Error('Recommended fills require finite target luminance and opacity.');
 const fills={},references={},baseLabs=backings.map(lab),baseYs=backings.map(luminance),diagnostics={reference:dark?'Dark':'Light',referenceY:luminance(base),referenceYs:baseYs,minimumContrast,roles:{},activeDelta:{},maxError:0,limited:false,issues:[]};
 const inkYs=steps.map(step=>luminance(step.value)),inkY=dark?Math.max(...inkYs):Math.min(...inkYs);
 const textLimitY=dark?(inkY+.05)/(minimumContrast+.1)-.05:(inkY+.05)*(minimumContrast+.1)-.05;
 const pools={};
 for(const role of roles){
  const family=role.split('/')[0],requiredContrast=fillVisibilityPolicy[family+'Contrast'],requiredDelta=fillVisibilityPolicy[family+'Delta'],chromaGoal=(family==='secondary'?.04:.018)*chromaScale,chromaLimit=(family==='secondary'?.08:.05)*chromaScale;
  const candidates=steps.flatMap(step=>fitStep(step,backings,reference[role],clamp(maxAlpha??(backings.length>1?.96:1),0,1)));
  for(const c of candidates){
   const paints=backings.map(bg=>composite(c.paint,bg)),lch=toOklch(paints[0]),hueError=angularDifference(lch.h,accent.hue),inverted=lch.c>.005&&hueError>90;
   c.labs=paints.map(lab);c.chroma=lch.c;c.hueError=hueError;c.chromaLimit=chromaLimit;
   c.inkContrast=Math.min(...c.values.map(y=>(Math.max(y,inkY)+.05)/(Math.min(y,inkY)+.05)));
   c.inkReadable=c.inkContrast+1e-7>=minimumContrast+contentContrastReserve;
   c.minimumContrast=Math.min(...paints.map((paint,i)=>contrast(paint,backings[i])));
   c.minimumDelta=Math.min(...c.labs.map((value,i)=>distance(value,baseLabs[i])));
   c.ordered=c.values.every((value,i)=>dark?value>baseYs[i]+1e-7:value<baseYs[i]-1e-7);
   c.maxChroma=Math.max(...c.labs.map(value=>Math.hypot(value[1],value[2])));
   c.visible=c.minimumContrast+1e-7>=requiredContrast&&c.minimumDelta+1e-7>=requiredDelta&&c.ordered;
   c.soft=c.maxChroma<=chromaLimit+1e-8;
   c.quality=c.error*(backings.length>1?.5:4)+Math.abs(lch.c-chromaGoal)+(hueError/180)*Math.min(lch.c,.05)*.5+(inverted?1:0);
  }
  // Preserve the requested strength, including deliberately faint manual values.
  // Visibility selects among equally accurate fits; it must not jump to an
  // unrelated opaque endpoint just to satisfy a diagnostic floor.
  const inkReadable=candidates.filter(c=>c.inkReadable),inkPool=inkReadable.length?inkReadable:candidates;
  // An unreachable strength may be quieter, but must not reverse polarity on
  // either Glass backing. Direction remains independent of the visibility floor.
  const directed=inkPool.filter(c=>c.ordered),directionPool=directed.length?directed:inkPool;
  const smallestError=Math.min(...directionPool.map(c=>c.error));
  const errorBound=backings.length===1?Math.max(opaqueTargetTolerance,smallestError+1e-7):Math.max(.03,smallestError+1e-7);
  const accurate=directionPool.filter(c=>c.error<=errorBound+1e-9);
  const visible=accurate.filter(c=>c.visible),readable=visible.length?visible:accurate,soft=readable.filter(c=>c.soft),pool=soft.length?soft:readable;
  pools[role]=pool.sort((a,b)=>a.quality-b.quality||a.error-b.error||a.step.index-b.step.index).slice(0,96);
 }
 for(const family of ['tertiary','secondary']){
  const normalRole=family+'/normal',activeRole=family+'/active';let selected;
  for(const normal of pools[normalRole])for(const active of pools[activeRole]){
   const changes=normal.labs.map((value,i)=>distance(value,active.labs[i])),maximum=Math.max(...changes),minimum=Math.min(...changes);
   const contrastMin=Math.min(...normal.values.map((value,i)=>(Math.max(value,active.values[i])+.05)/(Math.min(value,active.values[i])+.05)));
   const ordered=normal.values.every((v,i)=>dark?active.values[i]>v+1e-7:active.values[i]<v-1e-7);
   const visible=minimum+1e-7>=fillVisibilityPolicy.stateDelta&&contrastMin+1e-7>=fillVisibilityPolicy.stateContrast;
   const valid=maximum<=fillVisibilityPolicy.stateMaximumDelta+1e-7&&visible&&ordered&&normal.visible&&active.visible;
   const penalty=Math.max(0,maximum-fillVisibilityPolicy.stateMaximumDelta)*8+Math.max(0,fillVisibilityPolicy.stateDelta-minimum)*8+Math.max(0,fillVisibilityPolicy.stateContrast-contrastMin)*2;
   const score=normal.quality+active.quality+penalty+Math.abs(normal.chroma-active.chroma)*.5;
   if(!selected||Number(valid)>Number(selected.valid)||valid===selected.valid&&(Number(ordered)>Number(selected.ordered)||ordered===selected.ordered&&score<selected.score))selected={normal,active,score,minimum,maximum,contrastMin,valid,visible,ordered};
  }
  diagnostics.activeDelta[family]={min:selected.minimum,max:selected.maximum,contrastMin:selected.contrastMin,gentle:selected.maximum<=fillVisibilityPolicy.stateMaximumDelta+1e-7,visible:selected.visible,ordered:selected.ordered};
  for(const [state,c] of [['normal',selected.normal],['active',selected.active]]){const role=family+'/'+state;
   fills[role]=c.paint;references[role]=c.step.name;
   diagnostics.roles[role]={requestedTargetYs:requestedReference[role],clampedTargetYs:requestedReference[role].map(y=>clamp(dark?Math.min(y,textLimitY):Math.max(y,textLimitY),.0001,.9999)),stateSpaceAdjusted:reference[role].some((y,i)=>Math.abs(y-clamp(dark?Math.min(requestedReference[role][i],textLimitY):Math.max(requestedReference[role][i],textLimitY),.0001,.9999))>1e-8),textLimitY,targetLimitedReason:reference[role].some((y,i)=>Math.abs(y-requestedReference[role][i])>1e-8)?'text-contrast':null,targetY:reference[role][0],targetYs:reference[role],readabilityLimited:reference[role].some((y,i)=>Math.abs(y-requestedReference[role][i])>1e-8),inkContrast:c.inkContrast,actualY:c.values[0],actualYs:c.values,minY:Math.min(...c.values),maxY:Math.max(...c.values),error:c.error,chroma:c.chroma,maxChroma:c.maxChroma,chromaLimit:c.chromaLimit,hueError:c.hueError,alpha:c.alpha,step:c.step.name,minimumContrast:c.minimumContrast,minimumDelta:c.minimumDelta,visible:c.visible};
   diagnostics.maxError=Math.max(diagnostics.maxError,c.error);
   if(c.error>(backings.length>1?.030001:opaqueTargetTolerance+1e-7))diagnostics.issues.push(role+': luminance target unreachable');
   if((!c.visible||!selected.valid)&&reference[role].some((y,i)=>Math.abs(y-requestedReference[role][i])>1e-8))diagnostics.issues.push(role+': fill separation limited by text contrast');
   if(!c.inkReadable)diagnostics.issues.push(role+': text contrast unreachable');
   if(!c.visible)diagnostics.issues.push(role+': fill separation unreachable');
   if(c.maxChroma>c.chromaLimit+1e-7)diagnostics.issues.push(role+': quiet chroma bound unreachable');
   if(c.chroma>.015&&c.hueError>90)diagnostics.issues.push(role+': rendered hue limited by backing/palette');
  }
  if(!selected.valid)diagnostics.issues.push(family+': gentle visible active state unreachable');
 }
 diagnostics.limited=diagnostics.issues.length>0;
 return {fills,references,diagnostics};
}
