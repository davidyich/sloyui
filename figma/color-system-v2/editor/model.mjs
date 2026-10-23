import {BLACK,WHITE,clamp,color,chroma,composite,contrast,css,fromHex,luminance,toHex,toOklch} from '../color-engine.mjs';
import {paletteScaleIds,palettePosition,paletteIndex,validatePaletteEdits,projectedAnchors,interpolateColor,toHsl,fromHsl,toOklab,labDistance,colorDifference} from './palette-math.mjs';
import {createNeutralSettings,validateNeutralSettings,resolveNeutralSurface} from './neutral-system.mjs';
import {solveRecommendedFills,fillVisibilityPolicy} from './recommended-fills.mjs';
import {solveAlphaRecipe,alphaRecipeFamily,neutralFillVisibilityPolicy} from './alpha-recipes.mjs';
export const schema='sloy-palette-lab/v5';
export const surfaces=['Shell','Workspace','Content','Overlay','Invert','Glass','Custom'];
export const defaultRules={minimumContrast:4.5,vividness:1.2,adaptPrimary:true,sharedAlpha:true};
export const presets=[
 ['blue','#087BE9'],['green','#00995B'],['orange','#F07818'],['red','#E53E3E'],['pink','#DA2DAB'],['purple','#9B3FE0']
].map(([name,hex])=>({name,hex}));
export const bounds={hue:[0,360],primaryChroma:[.005,.35],lightnessLight:[.25,.92],lightnessDark:[.5,.95],stateDelta:[.015,.09],softChroma:[.3,2],opacityScale:[.5,1.8],textChroma:[.3,1.8],foregroundTint:[0,1],vividness:[.5,1.5],darkChromaMultiplier:[.5,1.2]};
export function createAccent(name='purple',hex='#9B3FE0'){const c=toOklch(fromHex(hex));return {id:globalThis.crypto?.randomUUID?.()??String(Date.now()),name,hex:hex.toUpperCase(),seedHex:hex.toUpperCase(),hue:c.h,primaryChroma:Math.max(.005,c.c),lightnessLight:clamp(c.l,.25,.92),lightnessDark:.76,stateDelta:.04,softChroma:1.4,opacityScale:1.2,textChroma:1,paletteSteps:41,darkChromaMultiplier:.9,foregroundMode:'auto',foregroundTint:0,foregroundLight:'#FFFFFF',foregroundDark:'#14201D'};}
export function updateSeed(accent,hex){const c=toOklch(fromHex(hex));return {...accent,hex:hex.toUpperCase(),seedHex:hex.toUpperCase(),hue:c.h,primaryChroma:clamp(c.c,.005,.35),lightnessLight:clamp(c.l,.25,.92)};}
export function createNeutralSystem(){return {accent:{...createAccent('neutral','#777777'),id:'neutral',primaryChroma:0,vividness:1},settings:createNeutralSettings()};}
export function resetAccentRecommendations(accent){
 const next={...createAccent(accent.name,accent.seedHex??accent.hex),id:accent.id,hue:accent.hue,paletteSteps:accent.paletteSteps};
 if(accent.id==='neutral'){next.primaryChroma=0;next.vividness=1;}
 next.hex=toHex(color(next.lightnessLight,next.primaryChroma,next.hue));
 return next;
}
function validateAccent(a,i,names,neutral=false){
 if(!/^[a-z][a-z0-9-]{0,39}$/.test(a.name??'')||names.has(a.name))throw new Error('Имена цветов должны быть уникальными: латиница, цифры и дефис.');names.add(a.name);fromHex(a.hex);
 const n={...createAccent(a.name,a.hex),seedHex:a.seedHex??a.hex,id:neutral?'neutral':`import-${i}-${a.name}`};fromHex(n.seedHex);
 for(const [key,[min,max]] of Object.entries(bounds)){if(['foregroundTint','vividness','darkChromaMultiplier'].includes(key)&&a[key]===undefined)continue;if(!Number.isFinite(a[key])||a[key]<(neutral&&key==='primaryChroma'?0:min)||a[key]>max)throw new Error('Параметр '+key+' вне допустимого диапазона.');n[key]=a[key];}
 n.paletteSteps=a.paletteSteps??41;if(!Number.isInteger(n.paletteSteps)||n.paletteSteps<21||n.paletteSteps>49)throw new Error('Палитра должна содержать от 21 до 49 ступеней.');
 n.paletteEdits=validatePaletteEdits(a.paletteEdits);n.foregroundMode=a.foregroundMode??'auto';if(!['auto','light','dark','custom'].includes(n.foregroundMode))throw new Error('Неизвестный режим текста.');
 for(const key of ['foregroundLight','foregroundDark']){n[key]=a[key]??n[key];fromHex(n[key]);}return n;
}
export function validateProject(input){
 if(![schema,'sloy-palette-lab/v4','sloy-palette-lab/v3','sloy-palette-lab/v2','sloy-palette-lab/v1'].includes(input?.schema)||!Array.isArray(input.accents)||!input.accents.length||input.accents.length>128)throw new Error('Нужен проект Palette Lab с 1–128 цветами.');
 const names=new Set(['neutral']),occupied=new Set(input.accents.map(a=>a.name));
 const accents=input.accents.map((a,i)=>{if(input.schema!==schema&&a.name==='neutral'){let name='neutral-accent',suffix=2;while(occupied.has(name)||names.has(name))name=`neutral-accent-${suffix++}`;occupied.add(name);a={...a,name};}return validateAccent(a,i,names);});
 const backgrounds={Light:input.backgrounds?.Light??'#F1EEF8',Dark:input.backgrounds?.Dark??'#221D2C'};Object.values(backgrounds).forEach(fromHex);const {alphaRecipe:discardedRuntimeRecipe,...savedRules}=input.rules??{};const rules={...defaultRules,...savedRules,balanceSecondary:true,sharedAlpha:true};
 if(!Number.isFinite(rules.minimumContrast)||rules.minimumContrast<4.5||rules.minimumContrast>7||!Number.isFinite(rules.vividness)||rules.vividness<.5||rules.vividness>1.5||typeof rules.adaptPrimary!=='boolean')throw new Error('Некорректные общие правила.');
 const neutral=input.neutral?{accent:{...validateAccent({...input.neutral.accent,name:'neutral'},0,new Set(),true),name:'neutral'},settings:validateNeutralSettings(input.neutral.settings)}:createNeutralSystem();
 return {schema,accents,backgrounds,rules,neutral};
}
// One opaque ramp per hue. Themes and role controls select paint/opacity only.
// Semantic colors select final steps, including exact authored overrides.
export const scaleLabels={ramp:'Палитра'};
export function setPaletteStep(accent,scale,index,hex){
 if(!paletteScaleIds.includes(scale)||!Number.isInteger(index)||index<1||index>(accent.paletteSteps??41))throw new Error('Неизвестная ступень палитры.');
 fromHex(hex);const count=accent.paletteSteps??41,position=palettePosition(index,count);
 const anchors=(accent.paletteEdits?.anchors??[]).filter(a=>a.scale!==scale||paletteIndex(a.position,count)!==index);
 return {...accent,paletteEdits:{...accent.paletteEdits,interpolate:accent.paletteEdits?.interpolate??false,anchors:[...anchors,{scale,position,hex:hex.toUpperCase()}]}};
}
export function resetPaletteStep(accent,scale,index){
 if(!paletteScaleIds.includes(scale)||!Number.isInteger(index)||index<1||index>(accent.paletteSteps??41))throw new Error('Неизвестная ступень палитры.');
 if(!accent.paletteEdits)return accent;
 return {...accent,paletteEdits:{...accent.paletteEdits,anchors:accent.paletteEdits.anchors.filter(a=>a.scale!==scale||paletteIndex(a.position,accent.paletteSteps??41)!==index)}};
}
export function resetPaletteEdits(accent){const {paletteEdits,...original}=accent;return paletteEdits?.legacyAnchors?.length?{...original,paletteEdits:{interpolate:false,anchors:[],legacyAnchors:paletteEdits.legacyAnchors}}:original;}
export function setPaletteInterpolation(accent,interpolate){return {...accent,paletteEdits:{...accent.paletteEdits,anchors:accent.paletteEdits?.anchors??[],interpolate:Boolean(interpolate)}};}
export function generatePalette(accent,rules=defaultRules,_theme='Light'){
 const count=accent.paletteSteps??41,C=accent.primaryChroma*(accent.vividness??rules.vividness);
 const amplitudes={ramp:C};
 return Object.entries(amplitudes).map(([id,amplitude])=>{
  const anchors=projectedAnchors(accent.paletteEdits,id,count),ordered=[...anchors.entries()].sort((a,b)=>a[0]-b[0]);
  return {id,label:scaleLabels[id],theme:'Shared',steps:Array.from({length:count},(_,i)=>{
   const index=i+1,position=palettePosition(index,count),t=i/(count-1);
   // The permanent neutral uses the canonical gray ramp's 21:1 contrast curve.
   // At 41 steps and zero chroma these RGBs match Palette/gray/0…1000 exactly.
   const l=accent.id==='neutral'?Math.cbrt(Math.max(0,1.05*Math.exp(-Math.log(21)*t)-.05)):.99-.91*t**1.22;
   const original=color(l,amplitude*Math.sin(Math.PI*l)**.8,accent.hue),anchor=anchors.get(index);
   let value=anchor?fromHex(anchor.hex):original,interpolated=false;
   if(!anchor&&accent.paletteEdits?.interpolate){
    const left=ordered.filter(([j])=>j<index).at(-1),right=ordered.find(([j])=>j>index);
    if(left&&right){value=interpolateColor(fromHex(left[1].hex),fromHex(right[1].hex),(index-left[0])/(right[0]-left[0]));interpolated=true;}
   }
   const modified=['r','g','b'].some(k=>Math.abs(value[k]-original[k])>1e-9);
   return {name:`${accent.name}/${String(index).padStart(2,'0')}`,index,position,value,original,modified,authored:Boolean(anchor),interpolated,...toOklch(value)};
  })};
 });
}
function foregroundTarget(accent,theme){
 const target=theme==='Dark'?accent.lightnessDark:accent.lightnessLight,mode=accent.foregroundMode??'auto',tint=accent.foregroundTint??0;
 const light=mode==='light'||(mode==='auto'&&target<.70);
 // Zero tint means neutral endpoints, never a near-black chromatic ramp step.
 if(mode!=='custom'&&tint===0)return light?WHITE:BLACK;
 return mode==='custom'?fromHex(theme==='Light'?accent.foregroundLight:accent.foregroundDark):light?color(1-tint*.045,tint*.035,accent.hue):color(.12+tint*.06,tint*.045,accent.hue);
}
const neutralSteps=[{name:'black',value:BLACK,...toOklch(BLACK)},{name:'white',value:WHITE,...toOklch(WHITE)}];
const renderedContrast=(paint,bg)=>contrast(composite(paint,bg),bg);
const nearest=(steps,l)=>steps.reduce((best,s)=>Math.abs(s.l-l)<Math.abs(best.l-l)?s:best);
export function primaryPair(accent,theme,rules=defaultRules,palette=generatePalette(accent,rules,theme)){
 const target=theme==='Dark'?accent.lightnessDark:accent.lightnessLight,sign=theme==='Dark'?1:-1;
 const steps=palette[0].steps,foregroundRequest=foregroundTarget(accent,theme),foregroundStep=[...neutralSteps,...steps].reduce((best,s)=>colorDifference(s.value,foregroundRequest)<colorDifference(best.value,foregroundRequest)?s:best),fg=foregroundStep.value,requested=nearest(steps,target);
 const pair=normal=>{const directional=steps.filter(s=>sign*(s.l-normal.l)>1e-6);return [normal,directional.length?nearest(directional,normal.l+sign*accent.stateDelta):normal];};
 const score=values=>Math.min(...values.map(s=>renderedContrast(fg,s.value)));
 let values=pair(requested);
 if(rules.adaptPrimary&&score(values)<rules.minimumContrast+.1){
  const passing=steps.map(pair).filter(p=>p[0]!==p[1]&&score(p)>=rules.minimumContrast+.1).sort((a,b)=>Math.abs(a[0].l-target)-Math.abs(b[0].l-target));
  if(passing.length)values=passing[0];
 }
 return {normal:values[0].value,active:values[1].value,normalStep:values[0].name,activeStep:values[1].name,foreground:fg,foregroundStep:foregroundStep.name,foregroundRequest,requestedLightness:target,effectiveLightness:values[0].l,adjusted:values[0]!==requested,minimumContrast:score(values),targetContrast:rules.minimumContrast,foregroundMode:accent.foregroundMode??'auto',polarity:luminance(fg)>.5?'light':'dark'};
}
function selectInk(steps,backgrounds,target,minimumContrast,maximumChroma=Infinity){
 const score=s=>Math.min(...backgrounds.map(bg=>renderedContrast(s.value,bg)));
 const eligible=steps.filter(s=>s.c<=maximumChroma),pool=eligible.length?eligible:steps;
 const passing=pool.filter(s=>score(s)>=minimumContrast+.08);
 return passing.length?nearest(passing,target):pool.reduce((best,s)=>score(s)>score(best)?s:best);
}
const softRoles=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'];
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
export function effectiveContextTheme(theme,surface,custom={Light:'#F1EEF8',Dark:'#221D2C'}){
 if(surface==='Invert')return theme==='Light'?'Dark':'Light';
 if(surface==='Custom'){const bg=fromHex(custom[theme]);return contrast(BLACK,bg)>=contrast(WHITE,bg)?'Light':'Dark';}
 return theme;
}
function selectContentPair(palette,backgrounds,target,minimumContrast,textChroma=1){
 const minimum=minimumContrast+.08,steps=palette[0].steps;
 const passes=step=>backgrounds.every(bg=>renderedContrast(step.value,bg)>=minimum);
 const inks=steps.filter(passes).sort((a,b)=>Math.abs(a.l-target)-Math.abs(b.l-target));
 const painted=new Map();
 const readablePaint=step=>{
  if(painted.has(step.name))return painted.get(step.name);
  let low=0,high=1;
  for(let i=0;i<12;i++){const alpha=(low+high)/2;if(backgrounds.every(bg=>renderedContrast({...step.value,a:alpha},bg)>=minimum))high=alpha;else low=alpha;}
  const value={...step.value,a:Math.min(1,Math.ceil(high*100)/100)},paint={...step,value};painted.set(step.name,paint);return paint;
 };
 for(const ink of inks){
  const primaryContrasts=backgrounds.map(bg=>renderedContrast(ink.value,bg));
  const distinct=inks.filter(step=>step.c<ink.c/1.5),quiet=distinct.filter(step=>step.c<=ink.c*Math.min(.65,.45*textChroma));
  const preferred=(quiet.length?quiet:distinct).sort((a,b)=>Math.abs(a.l-ink.l)-Math.abs(b.l-ink.l));
  const candidates=[...preferred,...inks.filter(step=>!preferred.includes(step)).sort((a,b)=>Math.abs(a.c-ink.c*.45*textChroma)-Math.abs(b.c-ink.c*.45*textChroma))];
  for(const step of candidates){const muted=readablePaint(step);if(backgrounds.every((bg,i)=>renderedContrast(muted.value,bg)<=primaryContrasts[i]+1e-7&&colorDifference(composite(ink.value,bg),composite(muted.value,bg))>.02))return {ink,muted};}
 }
 const ink=inks[0]??selectInk(steps,backgrounds,target,minimumContrast);
 const candidates=inks.filter(step=>step.c<ink.c/1.5);
 return {ink,muted:candidates.length?readablePaint(nearest(candidates,ink.l)):readablePaint(ink)};
}
function softContextProfile(surface,dark){
 // Surface purpose changes emphasis; a translucent Glass material additionally
 // needs chromatic presence at both protected backing extremes.
 if(surface==='Glass')return dark?{secondary:.145,tertiary:.06,relative:.55,min:.055,max:.085,glass:true}:{secondary:.085,tertiary:.035,relative:.30,min:.035,max:.055,glass:false};
 if(surface==='Shell')return {secondary:.070,tertiary:.028,relative:.28,min:.025,max:.042};
 if(surface==='Workspace')return {secondary:.075,tertiary:.030,relative:.30,min:.027,max:.045};
 if(surface==='Overlay')return {secondary:.090,tertiary:.037,relative:.34,min:.030,max:.052};
 if(surface==='Invert')return {secondary:.080,tertiary:.032,relative:.32,min:.028,max:.050};
 return {secondary:.085,tertiary:.035,relative:.32,min:.028,max:.050};
}
const softSolutionCache=new WeakMap();
function solveSoftFills(accent,palette,backings,rules,dark,surface){
 const profile=softContextProfile(surface,dark),primaryChroma=chroma(primaryPair(accent,dark?'Dark':'Light',rules,palette).normal),targetChroma=clamp(primaryChroma*profile.relative,profile.min,profile.max)*(accent.softChroma/1.4)*(dark?(accent.darkChromaMultiplier??.9)/.9:1);
 const cache=softSolutionCache.get(accent)??new Map();
 const key=JSON.stringify([accent.hue,accent.opacityScale,accent.stateDelta,accent.softChroma,accent.textChroma,accent.darkChromaMultiplier,rules.minimumContrast,dark,surface,targetChroma,palette.map(scale=>scale.steps.map(({name,value})=>[name,value.r,value.g,value.b])),backings.map(({base})=>base)]);
 if(cache.has(key))return cache.get(key);
 const labs=backings.map(({base})=>toOklab(base)),scale=accent.opacityScale/1.2;
 const requested={tertiary:profile.tertiary*scale,secondary:profile.secondary*scale,reaction:Math.min(clamp(accent.stateDelta*.625,.012,.035),(profile.secondary-profile.tertiary)*.6*scale)};
 const hue=accent.hue*Math.PI/180;
 const candidates=palette[0].steps.map(pigment=>{
  const paints=alpha=>backings.map(({base})=>composite({...pigment.value,a:alpha},base));
  const alphaAt=(metric,target,start=0)=>{let low=start,high=.96;if(metric(high)<target)return .96;for(let i=0;i<12;i++){const mid=(low+high)/2;if(metric(mid)<target)low=mid;else high=mid;}return Math.floor(low*100)/100;};
  const alphas=[];
  for(const role of ['tertiary','secondary']){
   const normal=alphaAt(alpha=>median(paints(alpha).map((p,i)=>labDistance(toOklab(p),labs[i]))),requested[role]);
   const normalLabs=paints(normal).map(toOklab);
   const active=alphaAt(alpha=>Math.max(...paints(alpha).map((p,i)=>labDistance(toOklab(p),normalLabs[i]))),requested.reaction,normal);
   alphas.push(normal,active);
  }
  const fills=Object.fromEntries(softRoles.map((role,i)=>[role,{...pigment.value,a:alphas[i]}]));
  const backgrounds=backings.flatMap(({base})=>[base,...softRoles.map(role=>composite(fills[role],base))]);
  const {ink,muted}=selectContentPair(palette,backgrounds,dark?.86:.35,rules.minimumContrast,accent.textChroma);
  const minimum=Math.min(...backgrounds.flatMap(bg=>[renderedContrast(ink.value,bg),renderedContrast(muted.value,bg)]));
  const hierarchy=backings.every(({base})=>{const ratios=softRoles.map(role=>contrast(composite(fills[role],base),base));return ratios.every((r,i)=>!i||r>ratios[i-1]+1e-6);});
  const separation=backgrounds.every(bg=>colorDifference(composite(ink.value,bg),composite(muted.value,bg))>.02);
  const subordinate=surface==='Custom'||paints(alphas[2]).every(p=>chroma(p)<primaryChroma*(profile.glass?.75:.5));
  const visible=!dark||surface==='Custom'||backings.filter(({name})=>name==='bg').every(({base})=>colorDifference(composite(fills['secondary/normal'],base),base)>=.040001);
  const quiet=backgrounds.every(bg=>renderedContrast(muted.value,bg)<=renderedContrast(ink.value,bg)+1e-7);
  const normalLabs=paints(alphas[2]).map(toOklab);
  const expressions=normalLabs.map((p,i)=>(p.a-labs[i].a)*Math.cos(hue)+(p.b-labs[i].b)*Math.sin(hue)),expression=median(expressions),minimumExpression=Math.min(...expressions);
  const achieved=median(normalLabs.map((p,i)=>labDistance(p,labs[i])));
  const reactions=[0,2].map(i=>Math.max(...paints(alphas[i+1]).map((p,j)=>colorDifference(p,paints(alphas[i])[j]))));
  const minReactions=[0,2].map(i=>Math.min(...paints(alphas[i+1]).map((p,j)=>colorDifference(p,paints(alphas[i])[j]))));
  const reactionPass=reactions.every(d=>d>=requested.reaction*.9&&d<=requested.reaction*1.04)&&minReactions.every(d=>d>=Math.min(.006,requested.reaction*.45)),balanced=minReactions.every(d=>d>=requested.reaction*.45);
  const chromaGoal=targetChroma*scale;
  const huePresence=minimumExpression>=chromaGoal*(profile.glass?.75:.55);
  const quality=-Math.abs(expression-chromaGoal)*1.5-Math.abs(achieved-requested.secondary)*.75-(profile.glass?Math.abs(minimumExpression-chromaGoal*.85):0);
  return {pigment,fills,ink,muted,minimum,hierarchy,separation,subordinate,visible,quiet,reactionPass,balanced,huePresence,quality,requested};
 });
 const readable=candidates.filter(c=>c.minimum>=rules.minimumContrast+.075&&c.hierarchy&&c.subordinate&&c.visible&&c.quiet);
 const reacted=readable.filter(c=>c.reactionPass),eligible=reacted.length?reacted:readable;
 const distinct=eligible.filter(c=>c.separation),pool=distinct.length?distinct:eligible,hued=pool.filter(c=>c.huePresence),colors=hued.length?hued:pool,balanced=colors.filter(c=>c.balanced),passing=balanced.length?balanced:colors;
 // A manually edited palette may make the contract impossible. Keep its values
 // intact and return the best available result so ordinary context checks report it.
 const best=(passing.length?passing:candidates).sort((a,b)=>passing.length?b.quality-a.quality:(Number(b.hierarchy)-Number(a.hierarchy)||b.minimum-a.minimum||b.quality-a.quality))[0];
 if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,best);softSolutionCache.set(accent,cache);
 return best;
}
export function resolveContextBackings(theme,scheme,surface,source,resolved,custom={Light:'#F1EEF8',Dark:'#221D2C'},rules=defaultRules,neutralSystem){
 const isCustom=surface==='Custom',glass=surface==='Glass';let effectiveTheme=effectiveContextTheme(theme,surface,custom),dark=effectiveTheme==='Dark';
 // Canonical Invert has its own exact black/white backing and local neutrals
 // under the outer theme. Legacy V2 inputs only have opposite Content.
 const exactInvert=surface==='Invert'?resolved[`${theme}/${scheme}/Invert`]:undefined;
 const original=exactInvert??resolved[`${effectiveTheme}/${scheme}/${isCustom||surface==='Invert'?'Content':surface}`];
 const neutralStepsForProject=neutralSystem?generatePalette(neutralSystem.accent,rules)[0].steps:null;
 let neutralContext=neutralSystem&&!isCustom?resolveNeutralSurface(neutralSystem.settings,neutralStepsForProject,theme,scheme,surface,rules.minimumContrast):null;
 const bg=isCustom?fromHex(custom[theme]):neutralContext?.bg??original['surface/bg'];
 if(neutralContext||isCustom){effectiveTheme=neutralContext?.effectiveTheme??(contrast(BLACK,bg)>=contrast(WHITE,bg)?'Light':'Dark');dark=effectiveTheme==='Dark';}
 let customNeutral=dark?WHITE:BLACK;
 if(isCustom){const inkPole=dark?WHITE:BLACK;if(contrast(inkPole,composite({...customNeutral,a:.12},bg))<rules.minimumContrast+.2)customNeutral=dark?BLACK:WHITE;}
 const neutral={};for(const role of ['secondary','tertiary'])for(const [i,state] of source.states.entries())neutral[`${role}/${state}`]=isCustom?{...customNeutral,a:(role==='secondary'?[.08,.12]:[.03,.05])[i]}:neutralContext?.neutral[`${role}/${state}`]??original[`surface/${role}/${state}`];
 const bases=glass?[BLACK,WHITE].map(back=>composite(bg,back)):[bg];
 const disabled=neutralContext?.roles?.['surface/disabled']??{...(isCustom?customNeutral:dark?WHITE:BLACK),a:.03};
 const backings=bases.flatMap((base,index)=>{const block=composite(neutral['secondary/normal'],base);return[{name:'bg',base,extreme:index},...Object.entries(neutral).map(([name,value])=>({name,base:composite(value,base),extreme:index})),{name:'disabled',base:composite(disabled,base),extreme:index},...Object.entries({...neutral,disabled}).map(([name,value])=>({name:name+'/on-block',base:composite(value,block),extreme:index}))];});
 if(neutralSystem&&isCustom){
  const backgrounds=backings.map(b=>b.base),pair=selectContentPair([{steps:neutralStepsForProject}],backgrounds,dark?.86:.35,rules.minimumContrast,1),border=selectInk(neutralStepsForProject,bases,dark?.7:.5,3);
  neutralContext={bg,neutral,content:{primary:pair.ink.value,secondary:pair.muted.value,tertiary:pair.muted.value,inverted:dark?BLACK:WHITE},border:border.value,references:{'surface/bg':'custom/'+theme.toLowerCase(),...Object.fromEntries(Object.keys(neutral).map(role=>['surface/'+role,customNeutral===WHITE?'white':'black'])),'content/primary':pair.ink.name,'content/secondary':pair.muted.name,'content/tertiary':pair.muted.name,'content/inverted':dark?'black':'white',border:border.name}};
 }
 return {isCustom,glass,effectiveTheme,dark,bg,neutral,neutralContext,backings,bases};
}
export function generateContext(accent,theme,scheme,surface,source,resolved,custom={Light:'#F1EEF8',Dark:'#221D2C'},rules=defaultRules,palette,surfacePurpose=surface,neutralSystem){
 const backdrop=resolveContextBackings(theme,scheme,surface,source,resolved,custom,rules,neutralSystem);
 let {effectiveTheme,dark,neutralContext}=backdrop;const {isCustom,glass,bg,neutral,backings,bases}=backdrop;
 palette??=generatePalette(accent,rules,effectiveTheme);
 const sharedRecipe=rules.alphaRecipe??(rules.sharedAlpha?(isCustom?customAlphaRecipe(accent,palette,backings,dark,rules):projectAlphaRecipes(accent,source,resolved,custom,rules,palette,neutralSystem)[alphaRecipeFamily(effectiveTheme,surface,bg)]):null);
 // Choose one exact soft primitive and numeric opacity by measuring the
 // actual rendered layers. Perceptual reaction distance is bounded independently
 // of the surface's black/white polarity or the alpha curve's nonlinearity.
 const towardLight=dark;
 const layerFills={},layerReferences={},balanceDiagnostics={};
 let solution;
 if(sharedRecipe){
  for(const name of [...new Set(backings.map(b=>b.name))]){layerFills[name]=sharedRecipe.fills;layerReferences[name]=sharedRecipe.references;balanceDiagnostics[name]=sharedRecipe.diagnostics;}
  const painted=sharedRecipe.contentBackings;
  const {ink,muted}=selectContentPair([{steps:[...palette[0].steps,...neutralSteps]}],painted,dark?.86:.35,rules.minimumContrast,accent.textChroma);
  solution={fills:{...sharedRecipe.fills},ink,muted,quiet:painted.every(bg=>renderedContrast(muted.value,bg)<=renderedContrast(ink.value,bg)+1e-7),visible:!sharedRecipe.diagnostics.limited};
 }else if(rules.balanceSecondary){
  for(const name of [...new Set(backings.map(b=>b.name))]){
   const layerBases=backings.filter(b=>b.name===name).map(b=>b.base);
   const solved=solveRecommendedFills(accent,palette[0].steps,{base:layerBases[0],extremes:layerBases.slice(1),dark,minimumContrast:rules.minimumContrast});
   layerFills[name]=solved.fills;layerReferences[name]=solved.references;balanceDiagnostics[name]=solved.diagnostics;
  }
  const painted=backings.flatMap(({base,name})=>[base,...softRoles.flatMap(role=>[composite(layerFills[name][role],base),composite(layerFills.bg[role],base)])]);
  const {ink,muted}=selectContentPair([{steps:[...palette[0].steps,...neutralSteps]}],painted,dark?.86:.35,rules.minimumContrast,accent.textChroma);
  solution={fills:{...layerFills.bg},ink,muted,quiet:painted.every(bg=>renderedContrast(muted.value,bg)<=renderedContrast(ink.value,bg)+1e-7),visible:Object.values(balanceDiagnostics).every(d=>Object.values(d.roles).every(r=>r.visible))};
 }else solution=solveSoftFills(accent,palette,backings,rules,dark,surfacePurpose);
 const {fills,ink,muted}=solution,references={};
 for(const role of softRoles)references[role]=sharedRecipe||rules.balanceSecondary?layerReferences.bg[role]:solution.pigment.name;
 const primary=primaryPair(accent,effectiveTheme,rules,palette);fills['primary/normal']=primary.normal;fills['primary/active']=primary.active;
 references['primary/normal']=primary.normalStep;references['primary/active']=primary.activeStep;
 references['content/primary']=ink.name;references['content/secondary']=muted.name;references['content/on-primary']=primary.foregroundStep;
 const content={primary:ink.value,secondary:muted.value,'on-primary':primary.foreground};
 const borderStep=selectInk(palette[0].steps,bases,towardLight?.7:.5,3),border=borderStep.value;references.border=borderStep.name;
 const checks=[];const add=(label,value,min)=>checks.push({label,value,min,pass:value+1e-7>=min});
 for(const state of source.states)add(`Primary ${state}`,renderedContrast(primary.foreground,fills['primary/'+state]),rules.minimumContrast);
 for(const [role,value] of Object.entries(content).filter(([role])=>role!=='on-primary'))for(const {base,name,extreme} of backings){add(`Content ${role} / ${name} [${extreme}]`,renderedContrast(value,base),rules.minimumContrast);for(const fill of ['tertiary/normal','tertiary/active','secondary/normal','secondary/active'])add(`Content ${role} / ${fill} / ${name} [${extreme}]`,renderedContrast(value,composite(layerFills[name]?.[fill]??fills[fill],base)),rules.minimumContrast);}
 if(neutralContext)for(const [role,paint] of Object.entries(neutralContext.content).filter(([role])=>role!=='inverted'))for(const {base,name,extreme} of backings)add(`Neutral content ${role} / ${name} [${extreme}]`,renderedContrast(paint,base),rules.minimumContrast);
 for(const [i,base] of bases.entries())add(`Border [${i}]`,renderedContrast(border,base),3);
 const appearanceChecks=[],hierarchyIssues=[],appearancePolicy=accent.id==='neutral'?neutralFillVisibilityPolicy:fillVisibilityPolicy;
 for(const {base,name,extreme} of backings){
  const local=layerFills[name]??fills,painted=softRoles.map(role=>composite(local[role],base)),ratios=painted.map(paint=>contrast(paint,base));
  if(!ratios.every((r,i)=>!i||r>ratios[i-1]+1e-6))hierarchyIssues.push(`Порядок заливок на ${name} [${extreme}]`);
  if(!rules.balanceSecondary&&!sharedRecipe)continue;
  const addAppearance=(role,metric,value,min,max=Infinity)=>appearanceChecks.push({layer:name,extreme,role,metric,value,min,max,pass:value>=min-1e-7&&value<=max+1e-7});
  for(const [i,role] of softRoles.entries()){
   const family=role.split('/')[0];
   addAppearance(role,'surfaceContrast',ratios[i],appearancePolicy[family+'Contrast']);
   addAppearance(role,'surfaceDelta',colorDifference(painted[i],base),appearancePolicy[family+'Delta']);
  }
  for(const [i,family] of [[0,'tertiary'],[2,'secondary']]){
   addAppearance(family,'stateContrast',contrast(painted[i],painted[i+1]),appearancePolicy.stateContrast);
   addAppearance(family,'stateDelta',colorDifference(painted[i],painted[i+1]),appearancePolicy.stateDelta,appearancePolicy.stateMaximumDelta);
  }
 }
 const appearanceIssues=[...new Set(appearanceChecks.filter(c=>!c.pass).map(c=>`${c.role} / ${c.layer}: ${c.metric.startsWith('state')?(c.value>c.max?'переход Normal → Active слишком резкий':'Normal и Active недостаточно различаются'):'заливка слишком близка к фону'}`))];
 const balanceIssues=Object.entries(balanceDiagnostics).filter(([,d])=>d.limited).map(([layer,d])=>d.issues.some(issue=>issue.includes('text contrast'))?`${layer}: порог текста ${rules.minimumContrast}:1 ограничивает различимость заливок на этой подложке.`:`${layer}: доступные ступени и прозрачность не позволяют выполнить все условия рекомендации.`);
 const textSeparation=backings.flatMap(({base})=>[base,...softRoles.map(role=>composite(fills[role],base))]).every(bg=>colorDifference(composite(ink.value,bg),composite(muted.value,bg))>.01);
 return {accent:accent.name,theme,effectiveTheme,scheme,surface,bg,neutral,fills,content,border,primary,references,checks,appearanceChecks,layerFills,layerReferences,balanceDiagnostics,neutralContext,issues:[...checks.filter(c=>!c.pass).map(c=>`${c.label}: ${c.value.toFixed(2)}:1`),...hierarchyIssues,...appearanceIssues,...(!textSeparation?['Content: уровни слишком близки']:[]),...(!solution.quiet?['Content secondary: контраст выше primary']:[]),...(!rules.balanceSecondary&&!solution.visible?['Secondary: заливка слишком близка к фону']:[]),...balanceIssues],minimumText:Math.min(...checks.filter(c=>c.label.startsWith('Primary')||c.label.startsWith('Content')||c.label.startsWith('Neutral content')).map(c=>c.value)),neutralText:contrast(BLACK,bg)>contrast(WHITE,bg)?BLACK:WHITE};
}
const customRecipeCache=new Map();
function customAlphaRecipe(accent,palette,backings,dark,rules){
 const key=JSON.stringify([accent,palette[0].steps.map(s=>[s.name,s.value]),backings.map(b=>b.base),dark,rules.minimumContrast]);
 if(customRecipeCache.has(key))return customRecipeCache.get(key);
 const ink=dark?WHITE:BLACK;
 const alternatives=[dark,!dark].map(direction=>solveAlphaRecipe(accent,palette[0].steps,{backings,dark:direction,ink,minimumContrast:rules.minimumContrast,neutral:accent.id==='neutral',contentReserve:.08}));
 const recipe=alternatives.sort((a,b)=>Number(a.diagnostics.limited)-Number(b.diagnostics.limited)||a.diagnostics.issues.length-b.diagnostics.issues.length||b.diagnostics.minimumTextContrast-a.diagnostics.minimumTextContrast)[0];
 if(customRecipeCache.size>=32)customRecipeCache.delete(customRecipeCache.keys().next().value);customRecipeCache.set(key,recipe);return recipe;
}
const projectRecipeCache=new WeakMap();
/** Shared family is content-addressed and bounded per resolved project input.
 * Ready canonical recipes bypass this cache via rules.alphaRecipe. */
export function projectAlphaRecipes(accent,source,resolved,custom={Light:'#F1EEF8',Dark:'#221D2C'},rules=defaultRules,palette=generatePalette(accent,rules),neutralSystem){
 let cache=projectRecipeCache.get(resolved);if(!cache){cache=new Map();projectRecipeCache.set(resolved,cache);}
 const {alphaRecipe,...recipeRules}=rules,{id,...accentSettings}=accent;
 const key=JSON.stringify([accentSettings,source.themes,source.schemes,custom,recipeRules,neutralSystem,palette[0].steps.map(s=>[s.name,s.value])]);
 if(cache.has(key))return cache.get(key);
 const families={Light:[],'Light/Neutral':[],Dark:[],'Glass/Light':[],'Glass/Dark':[]},referenceBases={};
 for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of surfaces.filter(s=>s!=='Custom')){
  // Partial legacy inputs are legal for canonical callers with ready recipes.
  if(!resolved[`${theme}/${scheme}/${surface}`]&&surface!=='Invert')continue;
  const ctx=resolveContextBackings(theme,scheme,surface,source,resolved,custom,rules,neutralSystem);
  const family=alphaRecipeFamily(ctx.effectiveTheme,surface,ctx.bases[0]);families[family].push(...ctx.backings);for(const base of ctx.bases)if(!referenceBases[family]||(family.endsWith('Dark')?luminance(base)>luminance(referenceBases[family]):luminance(base)<luminance(referenceBases[family])))referenceBases[family]=base;
 }
 const recipes={};for(const family of Object.keys(families))if(families[family].length)recipes[family]=solveAlphaRecipe(accent,palette[0].steps,{backings:families[family],dark:family.endsWith('Dark'),minimumContrast:rules.minimumContrast,neutral:accent.id==='neutral',referenceBase:referenceBases[family]});
 if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,recipes);return recipes;
}
const contextCache=new WeakMap();
export function generateAll(accent,source,resolved,custom={Light:'#F1EEF8',Dark:'#221D2C'},rules=defaultRules,neutralSystem){
 const key=JSON.stringify([accent,custom,rules,neutralSystem]),cache=contextCache.get(accent);
 if(cache?.key===key&&cache.source===source&&cache.resolved===resolved)return cache.contexts;
 const shared=generatePalette(accent,rules),contexts=source.themes.flatMap(theme=>source.schemes.flatMap(scheme=>surfaces.map(surface=>generateContext(accent,theme,scheme,surface,source,resolved,custom,rules,shared,surface,neutralSystem))));
 contextCache.set(accent,{key,source,resolved,contexts});return contexts;
}
export function exportGraph(accents,source,resolved,custom={Light:'#F1EEF8',Dark:'#221D2C'},rules=defaultRules,neutralSystem){
 if(neutralSystem&&accents.some(a=>a.name==='neutral'&&a.id!=='neutral'))throw new Error('Имя neutral зарезервировано для нейтральной палитры.');
 const collections=[['palette','Palette',['Value']],['primitives','Primitives',['Value']],['opacity','Opacity',['Value']],['theme','Theme',source.themes],['scheme','Scheme',source.schemes],['surface','Surface',surfaces]].map(([key,name,modes])=>({key,name:'Palette Lab · '+name,modes,variables:[]}));const cols=Object.fromEntries(collections.map(c=>[c.key,c])),byKey=new Map();
 const add=(key,name,type,values,scopes=[])=>{const id=key+'/'+name;if(byKey.has(id))return {alias:id};const v={name,type,values,scopes};cols[key].variables.push(v);byKey.set(id,v);return {alias:id};};
 const ref=(name,value)=>{const pigment={alias:'palette/'+name};if((value.a??1)===1)return pigment;const percent=Number((value.a*100).toFixed(4)),step=String(percent).replace('.','-'),number=add('primitives','opacity/'+step,'FLOAT',{Value:percent}),opacity=add('opacity',step,'FLOAT',{Value:number},['COLOR_OPACITY']);return {color:pigment,opacity};};
 for(const s of [...neutralSteps,...(neutralSystem?generatePalette(neutralSystem.accent,rules)[0].steps:[])])add('palette',s.name,'COLOR',{Value:s.value});
 // Custom backings are authored project data, separate from canonical kit ramps.
 if(neutralSystem)for(const theme of source.themes)add('palette','custom/'+theme.toLowerCase(),'COLOR',{Value:fromHex(custom[theme])});
 const samePaint=(a,b)=>a&&b&&['r','g','b','a'].every(channel=>a[channel]===b[channel]);
 for(const accent of accents){
  for(const scale of generatePalette(accent,rules))for(const s of scale.steps){add('palette',s.name,'COLOR',{Value:s.value});Object.assign(byKey.get('palette/'+s.name),{position:s.position,modified:s.modified,authored:s.authored,interpolated:s.interpolated,original:s.original});}
  const contexts=generateAll(accent,source,resolved,custom,rules,neutralSystem),layerOverrides=new Set();
  // A public layer role is needed only if at least one context actually changes
  // the paint. Keep every Surface mode when a legacy/per-layer override exists.
  if(rules.balanceSecondary)for(const c of contexts)for(const [layer,paints] of Object.entries(c.layerFills).filter(([layer])=>layer!=='bg'))for(const [key,value] of Object.entries(paints))if(!samePaint(value,c.fills[key]))layerOverrides.add(`on-layer/${layer}/${key}`);
  for(const c of contexts){
   const values=[...Object.entries(c.fills).map(([key,value])=>({key,role:`surface/${key.split('/')[0]}/${accent.name}-${key.split('/')[1]}`,value})),...Object.entries(c.content).map(([key,value])=>({key:'content/'+key,role:`content/${key}/${accent.name}`,value})),{key:'border',role:`border/accent/${accent.name}`,value:c.border}];
   if(rules.balanceSecondary)for(const [layer,paints] of Object.entries(c.layerFills).filter(([layer])=>layer!=='bg'))for(const [key,value] of Object.entries(paints)){const referenceKey=`on-layer/${layer}/${key}`;if(layerOverrides.has(referenceKey))values.push({key:referenceKey,reference:c.layerReferences[layer][key],role:`on-layer/${layer}/surface/${key.split('/')[0]}/${accent.name}-${key.split('/')[1]}`,value});}
   if(neutralSystem){
    const neutralValues=c.neutralContext?[{key:'surface/bg',value:c.bg},...Object.entries(c.neutral).map(([role,value])=>({key:'surface/'+role,value})),...Object.entries(c.neutralContext.content).map(([role,value])=>({key:'content/'+role,value})),{key:'border',value:c.neutralContext.border}]:[{key:'surface/bg',value:c.bg}];
    for(const {key,value} of neutralValues){const refKey='neutral/'+key;c.references[refKey]=c.neutralContext.references[key];values.push({key:refKey,role:key==='border'?'border/neutral':key,value});}
   }
   for(const {key,role,value,reference} of values){const name=`${c.scheme.toLowerCase()}/${c.surface.toLowerCase()}/${role}`;add('theme',name,'COLOR',{});byKey.get('theme/'+name).values[c.theme]=ref(reference??c.references[key],value);add('scheme',`${c.surface.toLowerCase()}/${role}`,'COLOR',{});byKey.get('scheme/'+c.surface.toLowerCase()+'/'+role).values[c.scheme]={alias:'theme/'+name};add('surface',role,'COLOR',{},role.startsWith('content/')?['TEXT_FILL','SHAPE_FILL','STROKE_COLOR']:role.startsWith('border/')?['STROKE_COLOR']:['FRAME_FILL','SHAPE_FILL']);byKey.get('surface/'+role).values[c.surface]={alias:`scheme/${c.surface.toLowerCase()}/${role}`};}
  }
 }
 return {name:'Palette Lab',schema:'sloy-palette-graph/v3',sourceVersion:source.version,accents:accents.map(a=>a.name),paletteSettings:accents.map(({id,...a})=>({...a,vividness:a.vividness??rules.vividness})),customBackgrounds:custom,neutralSystem,rules,collections};
}
export function exportCSS(accents,source,resolved,custom={Light:'#F1EEF8',Dark:'#221D2C'},rules=defaultRules,neutralSystem){
 if(neutralSystem&&accents.some(a=>a.name==='neutral'&&a.id!=='neutral'))throw new Error('Имя neutral зарезервировано для нейтральной палитры.');
 const contextMap=new Map(accents.flatMap(a=>generateAll(a,source,resolved,custom,rules,neutralSystem).map(c=>[`${a.id}/${c.theme}/${c.scheme}/${c.surface}`,c])));
 const lines=['/* Palette Lab · opaque hue ramps → semantic roles + numeric opacity. */',':root {'];
 const variable=name=>'--pl-palette-'+name.replaceAll('/','-');
 for(const s of [...neutralSteps,...(neutralSystem?generatePalette(neutralSystem.accent,rules)[0].steps:[]),...(neutralSystem?source.themes.map(theme=>({name:'custom/'+theme.toLowerCase(),value:fromHex(custom[theme])})):[]),...accents.flatMap(a=>generatePalette(a,rules).flatMap(scale=>scale.steps))])lines.push(`  ${variable(s.name)}-rgb: ${['r','g','b'].map(k=>Number((s.value[k]*255).toFixed(6))).join(' ')};`,`  ${variable(s.name)}: rgb(var(${variable(s.name)}-rgb));`);lines.push('}');
 const paint=(key,name,value)=>{if(value.a===1)lines.push(`  ${key}: var(${name});`);else{const percent=Number((value.a*100).toFixed(4)),op=`--pl-opacity-${String(percent).replace('.','-')}`;lines.push(`  ${op}: ${value.a};`,`  ${key}: rgb(var(${name}-rgb) / var(${op}));`);}};
 for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of surfaces){
  lines.push(`[data-pl-theme="${theme}"][data-pl-scheme="${scheme}"] [data-pl-surface="${surface}"], [data-pl-theme="${theme}"][data-pl-scheme="${scheme}"][data-pl-surface="${surface}"] {`);
  for(const a of accents){const c=contextMap.get(`${a.id}/${theme}/${scheme}/${surface}`);for(const [role,value] of Object.entries(c.fills))paint(`--pl-surface-${role.replace('/','-')}-${a.name}`,variable(c.references[role]),value);for(const [role,value] of Object.entries(c.content))paint(`--pl-content-${role}-${a.name}`,variable(c.references['content/'+role]),value);paint(`--pl-border-${a.name}`,variable(c.references.border),c.border);
   if(neutralSystem){paint('--pl-surface-bg',variable(c.neutralContext.references['surface/bg']),c.bg);if(c.neutralContext){for(const [role,value] of Object.entries(c.neutral))paint(`--pl-surface-${role.replaceAll('/','-')}`,variable(c.neutralContext.references['surface/'+role]),value);for(const [role,value] of Object.entries(c.neutralContext.content))paint(`--pl-content-${role}`,variable(c.neutralContext.references['content/'+role]),value);paint('--pl-border-neutral',variable(c.neutralContext.references.border),c.neutralContext.border);}}
  }lines.push('}');
 }
 const samePaint=(a,b)=>a&&b&&['r','g','b','a'].every(channel=>a[channel]===b[channel]);
 if(rules.balanceSecondary)for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of surfaces)for(const layer of ['secondary/normal','secondary/active','tertiary/normal','tertiary/active']){
  const overrides=accents.flatMap(a=>{const c=contextMap.get(`${a.id}/${theme}/${scheme}/${surface}`);return Object.entries(c.layerFills[layer]??{}).filter(([role,value])=>!samePaint(value,c.fills[role])).map(([role,value])=>({a,c,role,value}));});
  if(!overrides.length)continue;
  lines.push(`[data-pl-theme="${theme}"][data-pl-scheme="${scheme}"] [data-pl-surface="${surface}"] [data-pl-layer="${layer}"], [data-pl-theme="${theme}"][data-pl-scheme="${scheme}"][data-pl-surface="${surface}"] [data-pl-layer="${layer}"] {`);
  for(const {a,c,role,value} of overrides)paint(`--pl-surface-${role.replace('/','-')}-${a.name}`,variable(c.layerReferences[layer][role]),value);lines.push('}');
 }
 return lines.join('\n');
}
export function makeFigmaCode(graph){return `// Import the Palette Lab graph. Only collections named "Palette Lab · ..." are touched.\nconst spec=${JSON.stringify(graph)};\nconst existing=await figma.variables.getLocalVariableCollectionsAsync();\nconst all=await figma.variables.getLocalVariablesAsync();\nconst cols={},vars={},created=[],updated=[];\nfor(const s of spec.collections){let c=existing.find(c=>c.name===s.name);if(!c){c=figma.variables.createVariableCollection(s.name);c.renameMode(c.defaultModeId,s.modes[0]);}for(const name of s.modes)if(!c.modes.some(m=>m.name===name))c.addMode(name);cols[s.key]=c;for(const v of s.variables){let variable=all.find(x=>x.variableCollectionId===c.id&&x.name===v.name);if(!variable){variable=figma.variables.createVariable(v.name,c,v.type);created.push(variable.id);}else updated.push(variable.id);variable.scopes=v.scopes;vars[s.key+'/'+v.name]=variable;}}\nfunction value(v){if(v?.alias){if(!vars[v.alias])throw new Error('Missing '+v.alias);return figma.variables.createVariableAlias(vars[v.alias]);}if(v?.color)return {color:value(v.color),opacity:value(v.opacity)};return v;}\nfor(const s of spec.collections)for(const v of s.variables)for(const [mode,data]of Object.entries(v.values))vars[s.key+'/'+v.name].setValueForMode(cols[s.key].modes.find(m=>m.name===mode).modeId,value(data));\nfigma.closePlugin('Palette Lab: '+created.length+' created, '+updated.length+' updated');\n`;}
export {css,toHex,toOklch,fromHex,contrast,composite,color,toHsl,fromHsl,colorDifference};
