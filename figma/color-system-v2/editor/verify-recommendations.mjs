import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAccent,createNeutralSystem,resetAccentRecommendations,generateAll,generateContext,generatePalette,exportGraph,exportCSS,validateProject,presets,defaultRules,schema,setPaletteStep,color,toHex,toOklch,colorDifference,fromHex} from './model.mjs';
import {solveRecommendedFills} from './recommended-fills.mjs';
import {setNeutralBase,setNeutralSurface,resetNeutralSurface} from './neutral-system.mjs';
import {composite,contrast,luminance} from '../color-engine.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../source.json',import.meta.url))),resolved=JSON.parse(fs.readFileSync(new URL('../../token-system-v4/palette-contexts.json',import.meta.url)));
const rules={...defaultRules,balanceSecondary:true},neutral=createNeutralSystem(),backgrounds={Light:'#F1EEF8',Dark:'#221D2C'};
const canonical=JSON.parse(fs.readFileSync(new URL('../../token-system-v4/graph.json',import.meta.url)));
const canonicalGray=canonical.collections.find(c=>c.key==='Palette').variables.filter(v=>v.name.startsWith('gray/'));
assert.deepEqual(generatePalette(neutral.accent,rules)[0].steps.map(s=>s.value),canonicalGray.map(v=>v.values.Value),'Default neutral must match the shared canonical gray ramp exactly');
// Contract constants are intentionally independent of solver exports: changing
// a generator default must not silently lower a visibility regression gate.
const roles=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'];
const ratios={'tertiary/normal':1.15,'tertiary/active':1.28,'secondary/normal':1.5,'secondary/active':1.68};
const lightnessOffsets={'tertiary/normal':.025,'tertiary/active':.05,'secondary/normal':.06,'secondary/active':.085};
const epsilon=1e-7,targetsByBacking=new Map(),targetsBySurface=new Map();
const stats={contexts:0,fillPairs:0,statePairs:0,textChecks:0,pigmentChecks:0,sameBackingTargets:0,glassVectors:0,minimumText:{4.5:Infinity,7:Infinity},minimumFillRatio:{tertiary:Infinity,secondary:Infinity},minimumFillDelta:{tertiary:Infinity,secondary:Infinity},minimumStateRatio:Infinity,minimumStateDelta:Infinity,maximumStateDelta:0,limitedLayers:0,limited7Layers:0,provenImpossible7FillPairs:0,provenImpossible7StatePairs:0,maximumTargetError:0};
const chromaRegression={defaultGlassChecks:0,minimumDefaultGlassChroma:Infinity,userContexts:0,userGlassChecks:0,minimumUserGlassChroma:Infinity,userTextChecks:0,minimumUserText:Infinity,userFillPairs:0,userStatePairs:0,userProvenImpossible7FillPairs:0,userProvenImpossible7StatePairs:0};
const actualBases=c=>c.surface==='Glass'?[fromHex('#000000'),fromHex('#FFFFFF')].map(back=>composite(c.bg,back)):[c.bg];
const textContrast=(paint,background)=>contrast(composite(paint,background),background);
function assertPaint(value,step,label){assert(step,`${label}: missing primitive`);for(const channel of ['r','g','b'])assert.equal(value[channel],step.value[channel],`${label}: synthesized RGB`);assert(value.a>=0&&value.a<=1);assert(Math.abs(value.a*100-Math.round(value.a*100))<1e-8,`${label}: fractional percentage opacity`);stats.pigmentChecks++;}
// Prove exceptions against the entire available palette, not just the selected
// candidate. A Glass paint uses one opacity on both underlays, so independent
// per-underlay luminance bounds are not a sufficient feasibility proof.
const feasibilityCache=new Map(),channelNames=['r','g','b'],luminanceWeights=[.2126,.7152,.0722];
function feasiblePaints(steps,bases,floor,minimumContrast,dark){
 const key=JSON.stringify([steps.map(step=>step.value),bases,floor,minimumContrast,dark]);if(feasibilityCache.has(key))return feasibilityCache.get(key);
 const inkYs=steps.map(step=>luminance(step.value)),inkY=dark?Math.max(...inkYs):Math.min(...inkYs),limit=dark?(inkY+.05)/(minimumContrast+.1)-.05:(inkY+.05)*(minimumContrast+.1)-.05;
 const ranges=bases.map(base=>dark?[(luminance(base)+.05)*floor-.05,limit]:[limit,(luminance(base)+.05)/floor-.05]);
 const result={paints:0,minimumYs:bases.map(()=>Infinity),maximumYs:bases.map(()=>-Infinity),maximumStateRatios:[],maximumStateDeltas:bases.map(()=>Infinity)};
 const intersect=(left,right)=>left.flatMap(([a,b])=>right.map(([c,d])=>[Math.max(a,c),Math.min(b,d)]).filter(([lo,hi])=>lo<=hi+1e-11));
 const derivative=x=>x<=.04045?1/12.92:2.4/1.055*((x+.055)/1.055)**1.4;
 const bisect=(fn,target,low,high,increasing=true)=>{for(let i=0;i<48;i++){const mid=(low+high)/2;if((fn(mid)<target)===increasing)low=mid;else high=mid;}return(low+high)/2;};
 if(ranges.every(([lo,hi])=>lo<=hi+1e-11))for(const step of steps){
  let allowed=[[0,1]];const curves=bases.map(base=>{const y=alpha=>luminance(composite({...step.value,a:alpha},base)),slope=alpha=>channelNames.reduce((sum,channel,i)=>sum+luminanceWeights[i]*derivative(base[channel]+alpha*(step.value[channel]-base[channel]))*(step.value[channel]-base[channel]),0),turn=slope(0)>=0?0:slope(1)<=0?1:bisect(slope,0,0,1);return{y,turn};});
  for(const [index,{y,turn}]of curves.entries()){
   const [lower,upper]=ranges[index],cuts=[0,1,turn];
   for(const target of [lower,upper]){if(turn>0&&target>=y(turn)-1e-12&&target<=y(0)+1e-12)cuts.push(bisect(y,target,0,turn,false));if(turn<1&&target>=y(turn)-1e-12&&target<=y(1)+1e-12)cuts.push(bisect(y,target,turn,1));}
   const ordered=[...new Set(cuts)].sort((a,b)=>a-b),inside=alpha=>y(alpha)>=lower-1e-11&&y(alpha)<=upper+1e-11,intervals=ordered.flatMap((lo,i)=>i+1<ordered.length&&inside((lo+ordered[i+1])/2)?[[lo,ordered[i+1]]]:inside(lo)?[[lo,lo]]:[]);allowed=intersect(allowed,intervals);if(!allowed.length)break;
  }
  if(allowed.length){result.paints++;for(const [index,{y,turn}]of curves.entries())for(const [lo,hi]of allowed){const samples=[lo,hi,...(turn>=lo&&turn<=hi?[turn]:[])].map(y);result.minimumYs[index]=Math.min(result.minimumYs[index],...samples);result.maximumYs[index]=Math.max(result.maximumYs[index],...samples);}}
 }
 result.maximumStateRatios=result.paints?result.maximumYs.map((high,i)=>(high+.05)/(result.minimumYs[i]+.05)):bases.map(()=>0);
 // On a genuinely gray palette/backing, every possible composite lies on the
 // gray axis. Its exact perceptual diameter proves a delta bound independently
 // of whether the contrast-ratio bound alone is feasible.
 const gray=value=>Math.max(value.r,value.g,value.b)-Math.min(value.r,value.g,value.b)<1e-10;
 if(result.paints&&steps.every(step=>gray(step.value))&&bases.every(gray)){const grayAt=Y=>{const v=Y<=.0031308?12.92*Y:1.055*Y**(1/2.4)-.055;return{r:v,g:v,b:v,a:1};};result.maximumStateDeltas=result.maximumYs.map((high,i)=>colorDifference(grayAt(high),grayAt(result.minimumYs[i])));}
 feasibilityCache.set(key,result);return result;
}
for(const minimumContrast of [4.5,7])for(const preset of [...presets,{name:'neutral',hex:'#777777'}]){
 const a=preset.name==='neutral'?neutral.accent:createAccent(preset.name,preset.hex),localRules={...rules,minimumContrast},palette=generatePalette(a,localRules),steps=new Map(palette[0].steps.map(step=>[step.name,step]));
 assert.equal(palette.length,1);assert.equal(palette[0].steps.length,41);assert(palette[0].steps.every(step=>step.value.a===1));
 assert.deepEqual(generatePalette(a,localRules,'Light'),generatePalette(a,localRules,'Dark'),'Theme never creates another palette');
 for(const patch of [{softChroma:.3},{textChroma:1.8},{darkChromaMultiplier:.5}])assert.deepEqual(generatePalette({...a,...patch},localRules),palette,'Role preferences never modify raw RGB');
 for(const c of generateAll(a,source,resolved,backgrounds,localRules,neutral)){
  stats.contexts++;const label=`${a.name}/${minimumContrast}/${c.theme}/${c.scheme}/${c.surface}`;
  for(const check of c.checks){assert(check.pass,`${label}: ${check.label} ${check.value} < ${check.min}`);if(/^(Primary|Content|Neutral content)/.test(check.label)){stats.textChecks++;stats.minimumText[minimumContrast]=Math.min(stats.minimumText[minimumContrast],check.value);assert(check.value+epsilon>=minimumContrast);}}
  const bases=actualBases(c),allPainted=[];
  for(const [layer,fills] of Object.entries(c.layerFills)){
   const layerBases=bases.map(base=>layer==='bg'?base:composite(c.neutral[layer],base)),diagnostics=c.balanceDiagnostics[layer];
   assert(diagnostics,`${label}/${layer}: missing diagnostics`);if(diagnostics.limited){stats.limitedLayers++;if(minimumContrast===7)stats.limited7Layers++;assert(diagnostics.issues.length>0,`${label}/${layer}: limitation needs a concrete reason`);assert(c.issues.some(issue=>issue.startsWith(layer+':')),`${label}/${layer}: limitation must reach the context`);}
   const key=JSON.stringify([minimumContrast,c.effectiveTheme,layerBases]),targets=Object.fromEntries(roles.map(role=>[role,diagnostics.roles[role].requestedTargetYs]));
   if(targetsByBacking.has(key)){assert.deepEqual(targets,targetsByBacking.get(key),`${label}/${layer}: hues on the same backing must share target luminance`);stats.sameBackingTargets++;}else targetsByBacking.set(key,targets);
   if(a.name==='purple'&&minimumContrast===4.5&&layer==='bg')targetsBySurface.set(`${c.theme}/${c.scheme}/${c.surface}`,targets);
   for(const role of roles){
    const family=role.split('/')[0],fill=fills[role],details=diagnostics.roles[role];assertPaint(fill,steps.get(c.layerReferences[layer][role]),`${label}/${layer}/${role}`);if(c.surface==='Glass'&&minimumContrast===4.5)assert(fill.a<.6,`${label}/${layer}/${role}: default Glass paint must preserve material transmission`);
    assert.equal(details.targetYs.length,layerBases.length);if(c.surface==='Glass'){assert.equal(details.targetYs.length,2);assert.notEqual(details.requestedTargetYs[0],details.requestedTargetYs[1],`${label}/${layer}/${role}: Glass must fit both backing targets`);stats.glassVectors++;}
    for(const [extreme,base] of layerBases.entries()){
     const painted=composite(fill,base),ratio=contrast(painted,base),delta=colorDifference(painted,base),Y=luminance(painted),baseY=luminance(base),baseL=Math.cbrt(baseY),dark=c.effectiveTheme==='Dark';
     if(minimumContrast===4.5&&preset.name!=='neutral'&&c.surface==='Glass'&&family==='secondary'){
      const renderedChroma=toOklch(painted).c;assert(renderedChroma+epsilon>=.015,`${label}/${layer}/${role}[${extreme}]: Glass accent lost its color, C=${renderedChroma}`);chromaRegression.defaultGlassChecks++;chromaRegression.minimumDefaultGlassChroma=Math.min(chromaRegression.minimumDefaultGlassChroma,renderedChroma);
     }
     const expected=Math.max(.0001,Math.min(.9999,dark?Math.max((baseY+.05)*ratios[role]-.05,Math.min(1,baseL+lightnessOffsets[role])**3):Math.min((baseY+.05)/ratios[role]-.05,Math.max(0,baseL-lightnessOffsets[role])**3)));
     assert(Math.abs(details.requestedTargetYs[extreme]-expected)<1e-10,`${label}/${layer}/${role}: requested target must follow its actual backing`);
     const inkYs=palette[0].steps.map(step=>luminance(step.value)),inkY=dark?Math.max(...inkYs):Math.min(...inkYs),textLimit=dark?(inkY+.05)/(minimumContrast+.1)-.05:(inkY+.05)*(minimumContrast+.1)-.05,clampedExpected=Math.max(.0001,Math.min(.9999,dark?Math.min(expected,textLimit):Math.max(expected,textLimit)));
     assert(Math.abs(details.textLimitY-textLimit)<1e-10);const effectiveTarget=details.targetYs[extreme];
     if(minimumContrast===4.5)assert(Math.abs(effectiveTarget-clampedExpected)<1e-10,`${label}/${layer}/${role}: ordinary targets must retain their requested strength`);else assert(dark?effectiveTarget<=clampedExpected+epsilon&&effectiveTarget>=baseY-epsilon:effectiveTarget>=clampedExpected-epsilon&&effectiveTarget<=baseY+epsilon,`${label}/${layer}/${role}: compressed target must preserve polarity and actual ink readability`);
     if(Math.abs(effectiveTarget-expected)>1e-8){assert.equal(details.targetLimitedReason,'text-contrast');assert(details.readabilityLimited);}
     const error=Math.abs(Y-effectiveTarget);stats.maximumTargetError=Math.max(stats.maximumTargetError,error);if(error>(c.surface==='Glass'?.030001:.0030001)){assert(diagnostics.limited,`${label}/${layer}/${role}: unreachable target must be explicit`);assert(diagnostics.issues.includes(role+': luminance target unreachable'));}
     const floor=family==='secondary'?1.30:1.10;
     const fillPass=ratio+epsilon>=floor&&delta+epsilon>=.015;
     if(!fillPass){assert.equal(minimumContrast,7,`${label}/${layer}/${role}[${extreme}]: default fill visibility failed ratio=${ratio}, delta=${delta}`);const feasible=feasiblePaints(palette[0].steps,layerBases,floor,minimumContrast,dark);assert.equal(feasible.paints,0,`${label}/${layer}/${role}[${extreme}]: fill visibility failed despite ${feasible.paints} exact palette steps supporting the full backing vector; actual ratio=${ratio}, delta=${delta}`);assert(diagnostics.limited);assert(diagnostics.issues.includes(role+': fill separation unreachable'));assert(details.readabilityLimited);stats.provenImpossible7FillPairs++;}
     assert(dark?Y>baseY:Y<baseY,`${label}/${layer}/${role}: fill must move away from its backing in the intended direction`);
     if(minimumContrast===4.5)assert(details.visible,`${label}/${layer}/${role}: selected default paint must satisfy solver visibility checks`);else if(!details.visible)assert(diagnostics.limited&&diagnostics.issues.includes(role+': fill separation unreachable'));
     stats.fillPairs++;stats.minimumFillRatio[family]=Math.min(stats.minimumFillRatio[family],ratio);stats.minimumFillDelta[family]=Math.min(stats.minimumFillDelta[family],delta);allPainted.push(painted);
     for(const [textRole,text]of Object.entries(c.content).filter(([textRole])=>textRole!=='on-primary'))assert(textContrast(text,painted)+epsilon>=minimumContrast,`${label}/${layer}/${role}: actual ${textRole} text contrast`);
    }
   }
   for(const family of ['tertiary','secondary'])for(const [extreme,base] of layerBases.entries()){
    const normal=composite(fills[family+'/normal'],base),active=composite(fills[family+'/active'],base),ratio=contrast(normal,active),delta=colorDifference(normal,active);
    const ordered=c.effectiveTheme==='Dark'?luminance(active)>luminance(normal):luminance(active)<luminance(normal),statePass=ratio+epsilon>=1.06&&delta+epsilon>=.015&&ordered;
    if(!statePass){const dark=c.effectiveTheme==='Dark',floor=family==='secondary'?1.30:1.10,feasible=feasiblePaints(palette[0].steps,layerBases,floor,minimumContrast,dark);assert.equal(minimumContrast,7,`${label}/${layer}/${family}[${extreme}]: default state visibility failed ratio=${ratio}, delta=${delta}`);assert(!feasible.paints||feasible.maximumStateRatios.some(maximum=>maximum+epsilon<1.06)||feasible.maximumStateDeltas.some(maximum=>maximum+epsilon<.015),`${label}/${layer}/${family}[${extreme}]: state visibility failed despite palette-vector envelope ratios ${feasible.maximumStateRatios}, deltas ${feasible.maximumStateDeltas}; actual ratio=${ratio}, delta=${delta}`);assert(diagnostics.limited);assert(diagnostics.issues.includes(family+': gentle visible active state unreachable'));assert(diagnostics.issues.some(issue=>issue.includes('limited by text contrast')));stats.provenImpossible7StatePairs++;}
    assert(delta<=.05+epsilon,`${label}/${layer}/${family}[${extreme}]: state change too strong ${delta}`);
    if(statePass)assert(ordered,`${label}/${layer}/${family}: Active direction`);
    stats.statePairs++;stats.minimumStateRatio=Math.min(stats.minimumStateRatio,ratio);stats.minimumStateDelta=Math.min(stats.minimumStateDelta,delta);stats.maximumStateDelta=Math.max(stats.maximumStateDelta,delta);
   }
   allPainted.push(...layerBases);
  }
  for(const base of allPainted)assert(textContrast(c.content.secondary,base)<=textContrast(c.content.primary,base)+epsilon,`${label}: secondary text must stay quieter than primary`);
 }
}
assert(stats.sameBackingTargets>0);assert.notDeepEqual(targetsBySurface.get('Dark/Standard/Overlay'),targetsBySurface.get('Dark/Standard/Content'),'Different backings must not reuse one absolute luminance');
// Preserve the exact manually tuned cases that exposed the nearly gray Glass
// fills. Primary is intentionally manual here; supporting content still needs
// 7:1 on every actual backing, and all appearance exceptions need a proof.
const userCases=[
 ['green','#00995B',{hue:211,primaryChroma:.145,vividness:1.01,softChroma:1,opacityScale:1,paletteSteps:25}],
 ['amber','#EFAF00',{hue:82,primaryChroma:.165,vividness:1.2,softChroma:1.4,opacityScale:1.2,paletteSteps:25}],
 ['pink','#DA2DAB',{hue:187,primaryChroma:.135,vividness:1.2,softChroma:1.22,opacityScale:.93,paletteSteps:25}],
];
for(const [name,hex,parameters]of userCases){
 const accent={...createAccent(name,hex),...parameters},userRules={...rules,minimumContrast:7,adaptPrimary:false},palette=generatePalette(accent,userRules),steps=new Map(palette[0].steps.map(step=>[step.name,step]));
 assert.equal(palette.length,1);assert.equal(palette[0].steps.length,25);assert(palette[0].steps.every(step=>step.value.a===1));
 assert.deepEqual(generatePalette(accent,userRules,'Dark'),palette,'Manual Glass settings retain one shared opaque palette');
 for(const c of generateAll(accent,source,resolved,undefined,userRules,neutral)){
  chromaRegression.userContexts++;const label=`user/${name}/${c.theme}/${c.scheme}/${c.surface}`,dark=c.effectiveTheme==='Dark',bases=actualBases(c);
  for(const check of c.checks.filter(check=>/^(Content|Neutral content)/.test(check.label))){assert(check.pass&&check.value+epsilon>=7,`${label}: ${check.label} ${check.value} < 7`);chromaRegression.userTextChecks++;chromaRegression.minimumUserText=Math.min(chromaRegression.minimumUserText,check.value);}
  for(const [layer,fills]of Object.entries(c.layerFills)){
   const layerBases=bases.map(base=>layer==='bg'?base:composite(c.neutral[layer],base)),diagnostics=c.balanceDiagnostics[layer];
   if(diagnostics.limited)assert(diagnostics.issues.length&&c.issues.some(issue=>issue.startsWith(layer+':')),`${label}/${layer}: limitations must reach the context`);
   for(const role of roles){
    const family=role.split('/')[0],fill=fills[role],details=diagnostics.roles[role],floor=family==='secondary'?1.30:1.10;
    assertPaint(fill,steps.get(c.layerReferences[layer][role]),`${label}/${layer}/${role}`);
    for(const [extreme,base]of layerBases.entries()){
     const painted=composite(fill,base),ratio=contrast(painted,base),delta=colorDifference(painted,base),Y=luminance(painted),baseY=luminance(base);
     if(c.surface==='Glass'&&family==='secondary'){const renderedChroma=toOklch(painted).c;assert(renderedChroma+epsilon>=.015,`${label}/${layer}/${role}[${extreme}]: tuned Glass accent lost its color, C=${renderedChroma}`);chromaRegression.userGlassChecks++;chromaRegression.minimumUserGlassChroma=Math.min(chromaRegression.minimumUserGlassChroma,renderedChroma);}
     if(ratio+epsilon<floor||delta+epsilon<.015){
      const feasible=feasiblePaints(palette[0].steps,layerBases,floor,7,dark);assert.equal(feasible.paints,0,`${label}/${layer}/${role}[${extreme}]: fill failed despite ${feasible.paints} feasible palette steps; ratio=${ratio}, delta=${delta}`);assert(diagnostics.limited&&diagnostics.issues.includes(role+': fill separation unreachable')&&details.readabilityLimited,`${label}/${layer}/${role}: impossible fill needs an explicit text-contrast limitation`);chromaRegression.userProvenImpossible7FillPairs++;
     }
     assert(dark?Y>baseY:Y<baseY,`${label}/${layer}/${role}: fill direction`);
     for(const [textRole,paint]of Object.entries(c.content).filter(([textRole])=>textRole!=='on-primary'))assert(textContrast(paint,painted)+epsilon>=7,`${label}/${layer}/${role}: actual ${textRole} contrast < 7`);
     chromaRegression.userFillPairs++;
    }
   }
   for(const family of ['tertiary','secondary'])for(const [extreme,base]of layerBases.entries()){
    const normal=composite(fills[family+'/normal'],base),active=composite(fills[family+'/active'],base),ratio=contrast(normal,active),delta=colorDifference(normal,active),ordered=dark?luminance(active)>luminance(normal):luminance(active)<luminance(normal);
    if(ratio+epsilon<1.06||delta+epsilon<.015||!ordered){
     const feasible=feasiblePaints(palette[0].steps,layerBases,family==='secondary'?1.30:1.10,7,dark);assert(!feasible.paints||feasible.maximumStateRatios.some(maximum=>maximum+epsilon<1.06)||feasible.maximumStateDeltas.some(maximum=>maximum+epsilon<.015),`${label}/${layer}/${family}[${extreme}]: state failed despite a feasible palette envelope; ratio=${ratio}, delta=${delta}`);assert(diagnostics.limited&&diagnostics.issues.includes(family+': gentle visible active state unreachable')&&diagnostics.issues.some(issue=>issue.includes('limited by text contrast')),`${label}/${layer}/${family}: impossible state needs an explicit text-contrast limitation`);chromaRegression.userProvenImpossible7StatePairs++;
    }
    assert(delta<=.05+epsilon,`${label}/${layer}/${family}: state change too strong ${delta}`);chromaRegression.userStatePairs++;
   }
  }
 }
}
assert.equal(chromaRegression.defaultGlassChecks,480,'All six default hues, two themes, two schemes, five layers, two states and two underlays must retain color');
assert.equal(chromaRegression.userContexts,84);assert.equal(chromaRegression.userGlassChecks,240);
// A hand-edited ramp equal to its backing cannot separate any state. Keep the
// authored pigment, expose infeasibility, and never fabricate a new palette RGB.
let unreachable=createAccent('unreachable');for(let i=1;i<=41;i++)unreachable=setPaletteStep(unreachable,'ramp',i,'#777777');
const unreachableSteps=generatePalette(unreachable,rules)[0].steps,beforeUnreachable=structuredClone(unreachableSteps),unreachableResult=solveRecommendedFills(unreachable,unreachableSteps,{base:fromHex('#777777'),dark:false});
assert(unreachableResult.diagnostics.limited);assert(unreachableResult.diagnostics.issues.some(issue=>issue.includes('fill separation unreachable')));assert(unreachableResult.diagnostics.issues.some(issue=>issue.includes('active state unreachable')));assert.deepEqual(unreachableSteps,beforeUnreachable);
for(const [role,paint] of Object.entries(unreachableResult.fills)){assert.equal(toHex(paint),'#777777');assert(unreachableSteps.some(step=>step.name===unreachableResult.references[role]));assert(Math.abs(contrast(composite(paint,fromHex('#777777')),fromHex('#777777'))-1)<1e-12);}
const accent=createAccent('test','#7955F6'),before=generateAll(accent,source,resolved,backgrounds,rules,neutral);
const changed={...neutral,settings:setNeutralBase(neutral.settings,'Light',.12)},after=generateAll(accent,source,resolved,backgrounds,rules,changed);
assert.notDeepEqual(before.find(c=>c.theme==='Light'&&c.surface==='Shell').bg,after.find(c=>c.theme==='Light'&&c.surface==='Shell').bg);
assert.deepEqual(before.filter(c=>c.theme==='Dark'&&c.surface!=='Invert'),after.filter(c=>c.theme==='Dark'&&c.surface!=='Invert'));
for(const [outer,position,expected] of [['Light',.95,'Dark'],['Dark',0,'Light']]){const swapped={...neutral,settings:setNeutralSurface(neutral.settings,outer,'Glass',position)};const c=generateAll(accent,source,resolved,backgrounds,rules,swapped).find(c=>c.theme===outer&&c.surface==='Glass');assert.equal(c.effectiveTheme,expected);assert(c.checks.every(t=>t.pass),c.issues.join(';'));}
const override=setNeutralSurface(changed.settings,'Light','Shell',.2);assert.deepEqual(resetNeutralSurface(override,'Light','Shell'),changed.settings);
const authored=setPaletteStep({...accent,hue:123,opacityScale:1.7},'ramp',5,'#11AA99'),reset=resetAccentRecommendations(authored);assert.equal(reset.hue,123);assert.equal(reset.id,accent.id);assert.equal(reset.name,'test');assert.equal(reset.opacityScale,1.2);assert.equal(reset.paletteEdits,undefined);
const changedSeed={...accent,primaryChroma:.1,lightnessLight:.8,hex:toHex(color(.8,.1,accent.hue))};const originalReset=resetAccentRecommendations(changedSeed);assert.equal(originalReset.primaryChroma,accent.primaryChroma);assert.equal(originalReset.lightnessLight,accent.lightnessLight);assert.equal(originalReset.seedHex,accent.hex);
const project={schema,accents:[authored],backgrounds,rules,neutral:changed},roundTrip=validateProject(JSON.parse(JSON.stringify(project)));assert.deepEqual(roundTrip.neutral.settings,changed.settings);assert.deepEqual(roundTrip.accents[0].paletteEdits,authored.paletteEdits);assert.equal(roundTrip.rules.balanceSecondary,true);
const graph=exportGraph([accent],source,resolved,backgrounds,rules,neutral),vars=new Map(graph.collections.flatMap(c=>c.variables.map(v=>[c.key+'/'+v.name,v])));
let aliases=0;function walk(value){if(value?.alias){assert(vars.has(value.alias),'Missing '+value.alias);aliases++;}else if(value?.color){walk(value.color);walk(value.opacity);}}
for(const collection of graph.collections)for(const v of collection.variables){for(const mode of collection.modes)assert(mode in v.values,`${collection.key}/${v.name} missing mode ${mode}`);Object.values(v.values).forEach(walk);}
const collectionsByKey=new Map(graph.collections.map(c=>[c.key,c]));
function resolveExport(key,context,seen=new Set()){
 assert(!seen.has(key),`Alias cycle: ${key}`);const variable=vars.get(key);assert(variable,`Missing export ${key}`);const collectionKey=key.split('/')[0],collection=collectionsByKey.get(collectionKey),mode=context[collectionKey]??collection.modes[0],value=variable.values[mode],next=new Set([...seen,key]);assert.notEqual(value,undefined,`${key}/${mode}`);
 if(value?.alias)return resolveExport(value.alias,context,next);
 if(value?.color){const rgb=resolveExport(value.color.alias,context,next),opacity=resolveExport(value.opacity.alias,context,next);return {...rgb,a:opacity/100};}
 return value;
}
let exportedPaintChecks=0;const equalExport=(path,context,expected)=>{const actual=resolveExport(path,context);for(const channel of ['r','g','b','a'])assert(Math.abs(actual[channel]-expected[channel])<1e-6,`${path}: exported ${channel} differs from preview`);exportedPaintChecks++;};
for(const c of before){const context={theme:c.theme,scheme:c.scheme,surface:c.surface};
 for(const [role,value]of Object.entries(c.fills)){const [family,state]=role.split('/');equalExport(`surface/surface/${family}/test-${state}`,context,value);}
 for(const [role,value]of Object.entries(c.content))equalExport(`surface/content/${role}/test`,context,value);
 equalExport('surface/border/accent/test',context,c.border);
 for(const [layer,fills]of Object.entries(c.layerFills).filter(([layer])=>layer!=='bg'))for(const [role,value]of Object.entries(fills)){const [family,state]=role.split('/');equalExport(`surface/on-layer/${layer}/surface/${family}/test-${state}`,context,value);}
 equalExport('surface/surface/bg',context,c.bg);
 for(const [role,value]of Object.entries(c.neutral))equalExport(`surface/surface/${role}`,context,value);
 for(const [role,value]of Object.entries(c.neutralContext.content))equalExport(`surface/content/${role}`,context,value);
 equalExport('surface/border/neutral',context,c.neutralContext.border);
}
const primitives=graph.collections.find(c=>c.key==='palette').variables;assert(primitives.every(v=>v.values.Value.a===1));assert.equal(primitives.length,84);assert(primitives.every(v=>/^(white|black|neutral\/\d{2}|test\/\d{2})$/.test(v.name)));
assert.throws(()=>validateProject({...project,accents:[{...accent,name:'neutral'}]}));
const legacy=validateProject({...project,schema:'sloy-palette-lab/v4',accents:[{...authored,name:'neutral'},{...accent,name:'neutral-accent'}]});assert.equal(legacy.accents.length,2);assert.equal(legacy.accents[0].name,'neutral-accent-2');assert.deepEqual(legacy.accents[0].paletteEdits,authored.paletteEdits);
const highContrast=generateAll(accent,source,resolved,backgrounds,{...rules,minimumContrast:7},neutral);assert(highContrast.flatMap(c=>c.checks).every(t=>t.pass));
assert(before.filter(c=>c.surface==='Custom').every(c=>c.neutralContext.references['surface/bg'].startsWith('neutral/')));
assert(vars.has('surface/on-layer/secondary/normal/surface/secondary/test-normal'));
const css=exportCSS([accent],source,resolved,backgrounds,rules,neutral);assert(css.includes('data-pl-layer="secondary/normal"'));assert(css.includes('--pl-surface-bg'));
console.log(JSON.stringify({pass:true,...stats,chromaRegression,canonicalNeutralParity:true,aliases,exportedPaintChecks,unreachableAuthoredPalette:true,neutralThemeIsolation:true,reset:true,roundTrip:true,exportModesComplete:true},null,2));
