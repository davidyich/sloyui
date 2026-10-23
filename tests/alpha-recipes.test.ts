import {describe,it,expect} from 'vitest';
import {solveAlphaRecipe,solveNeutralAlphaRecipe,alphaRecipeFamily} from '../figma/color-system-v2/editor/alpha-recipes.mjs';
import {createAccent,createNeutralSystem,generateAll,generateContext,generatePalette,presets,defaultRules,validateProject,schema} from '../figma/color-system-v2/editor/model.mjs';
import {normalizeNeutralSettings,resolveNeutralSurface} from '../figma/color-system-v2/editor/neutral-system.mjs';
import {fromHex,composite,contrast,toOklch} from '../figma/color-system-v2/editor/model.mjs';
const BLACK={r:0,g:0,b:0,a:1},WHITE={r:1,g:1,b:1,a:1};
import source from '../figma/color-system-v2/source.json';
import resolved from '../figma/token-system-v4/palette-contexts.json';
const rules={...defaultRules,balanceSecondary:true};
const soft=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'];
const channels=['r','g','b'] as const;

describe('Shared finite alpha recipes',()=>{
 it('solves an entire backing family with existing pigments, quantized paint and distinct states',()=>{
  for(const preset of presets)for(const dark of [false,true]){
   const accent=createAccent(preset.name,preset.hex),steps=generatePalette(accent)[0].steps;
   const backings=(dark?['#000000','#161616','#242424','#3B3B3B']:['#FFFFFF','#F6F6F6','#EEEEEE','#DADADA']).map(fromHex);
   const recipe=solveAlphaRecipe(accent,steps,{backings,dark});
   expect(recipe.diagnostics.limited,`${preset.name}/${dark}`).toBe(false);
   for(const role of soft){const paint=recipe.fills[role];expect(paint.a*100).toBeCloseTo(Math.round(paint.a*100),10);expect(steps.some(step=>channels.every(k=>step.value[k]===paint[k]))).toBe(true);for(const base of backings)expect(contrast(dark?WHITE:BLACK,composite(paint,base))).toBeGreaterThanOrEqual(4.5);}
   if(!dark)expect(recipe.diagnostics.roles['secondary/normal'].chroma).toBeGreaterThanOrEqual(.05-1e-7);
   for(const family of ['tertiary','secondary'])for(const base of backings){const a=composite(recipe.fills[family+'/normal'],base),b=composite(recipe.fills[family+'/active'],base);expect(contrast(a,b)).toBeGreaterThanOrEqual(1.06-1e-7);const x=toOklch(a),y=toOklch(b),ax=x.h*Math.PI/180,ay=y.h*Math.PI/180,d=Math.hypot(x.l-y.l,x.c*Math.cos(ax)-y.c*Math.cos(ay),x.c*Math.sin(ax)-y.c*Math.sin(ay));expect(d).toBeGreaterThanOrEqual(.015-1e-7);expect(d).toBeLessThanOrEqual(.05+1e-7);}
  }
 },30000);
 it('preserves the prior Light normal hue, chroma and brightness while fitting nested backings',()=>{
  // Measured 0.17.1 Light/Standard/Content secondary-normal appearance.
  const anchors:Record<string,{l:number;c:number;h:number}>={blue:{l:.865272,c:.067577,h:254.0142},green:{l:.859761,c:.053020,h:168.3133},orange:{l:.869805,c:.064468,h:64.7236},red:{l:.874106,c:.066925,h:24.1066},pink:{l:.873578,c:.061427,h:334.1205},purple:{l:.872828,c:.063241,h:313.9222}};
  const bases=['#FFFFFF'].map(fromHex),neutral=solveNeutralAlphaRecipe({backings:bases,dark:false});
  const backings=bases.flatMap(base=>[base,...[base,composite(neutral.roles['surface/block'],base)].flatMap(bg=>Object.values(neutral.roles).map(paint=>composite(paint,bg)))]);
  for(const preset of presets){const a=createAccent(preset.name,preset.hex),r=solveAlphaRecipe(a,generatePalette(a)[0].steps,{backings,dark:false}),actual=toOklch(composite(r.fills['secondary/normal'],WHITE)),old=anchors[preset.name];expect(r.diagnostics.limited,preset.name).toBe(false);expect(Math.abs(actual.l-old.l),preset.name).toBeLessThanOrEqual(.025);expect(actual.c,preset.name).toBeGreaterThanOrEqual(old.c-.003);expect(Math.abs((actual.h-old.h+540)%360-180),preset.name).toBeLessThanOrEqual(3);}
 },30000);
 it('routes all ordinary contexts and Invert to one recipe per local polarity, with a bounded cache',()=>{
  const neutral=createNeutralSystem(),accent=createAccent('blue','#087BE9'),all=generateAll(accent,source,resolved,undefined,rules,neutral);
  const groups=new Map();for(const context of all.filter(c=>c.surface!=='Custom')){expect(context.checks.every(c=>c.pass)).toBe(true);expect(context.issues).toEqual([]);const fills=Object.fromEntries(soft.map(role=>[role,context.fills[role]])),key=alphaRecipeFamily(context.effectiveTheme,context.surface,context.bg);if(groups.has(key))expect(fills).toEqual(groups.get(key));else groups.set(key,fills);}
  expect(groups.size).toBe(5);expect(all.find(c=>c.theme==='Light'&&c.surface==='Invert')!.bg).toEqual(BLACK);expect(all.find(c=>c.theme==='Dark'&&c.surface==='Invert')!.bg).toEqual(WHITE);
  expect(generateAll(accent,source,resolved,undefined,rules,neutral)).toBe(all);
 },30000);
 it('evaluates permanent neutral with its quiet policy without weakening text or state checks',()=>{
  const n=createNeutralSystem(),contexts=generateAll(n.accent,source,resolved,undefined,rules,n);
  for(const c of contexts){expect(c.checks.every(check=>check.pass)).toBe(true);expect(c.issues,`${c.theme}/${c.surface}`).toEqual([]);for(const check of c.appearanceChecks.filter(check=>check.metric==='stateContrast'))expect(check.min).toBe(1.06);}
  const accent=createAccent('authored-brand','#8453B9'),project=validateProject({schema,accents:[accent],rules:{...rules,alphaRecipe:{fills:{'secondary/normal':BLACK}}}});expect(project.rules).not.toHaveProperty('alphaRecipe');expect(project.accents[0].hex).toBe(accent.hex);
 });
 it('regenerates exact RGB Custom with the shared algorithm and adapts fill direction independently of ink',()=>{
  const accent=createAccent('blue','#087BE9'),neutral=createNeutralSystem();for(const hex of ['#E53E3E','#7955F6','#777777','#FFFFFF','#000000']){
   const c=generateContext(accent,'Light','Standard','Custom',source,resolved,{Light:hex,Dark:hex},rules,undefined,'Custom',neutral);
   expect(c.bg).toEqual(fromHex(hex));expect(c.minimumText,hex).toBeGreaterThanOrEqual(4.5);expect(c.checks.every(check=>check.pass),hex).toBe(true);expect(c.balanceDiagnostics.bg.algorithm).toBe('shared-alpha/v1');for(const fills of Object.values(c.layerFills))for(const role of soft)expect(fills[role]).toEqual(c.fills[role]);
  }
 },30000);
 it('reports incompatible families instead of publishing a universal guarantee, and preserves authored neutral overrides',()=>{
  const accent=createAccent('blue','#087BE9');const impossible=solveAlphaRecipe(accent,generatePalette(accent)[0].steps,{backings:[BLACK,WHITE],dark:false});expect(impossible.diagnostics.limited).toBe(true);expect(impossible.diagnostics.issues.length).toBeGreaterThan(0);
  const migrated=normalizeNeutralSettings({bases:{Light:.025,Dark:.9},overrides:{}});expect(migrated.bases.Dark).toBe(.95);
  const authored=normalizeNeutralSettings({bases:{Light:.025,Dark:.9},overrides:{Dark:{Shell:.82}}});expect(authored.bases.Dark).toBe(.9);expect(authored.overrides.Dark?.Shell).toBe(.82);
  const authoredInvert={...authored,overrides:{Light:{Invert:.875}}},neutral=createNeutralSystem();expect(resolveNeutralSurface(authoredInvert,generatePalette(neutral.accent)[0].steps,'Light','Standard','Invert').position).toBe(.875);
  const n=solveNeutralAlphaRecipe({backings:[fromHex('#FFFFFF'),fromHex('#EEEEEE')],dark:false});expect(n.roles['surface/block']).not.toEqual(n.roles['control/pressed']);expect(n.roles['surface/disabled'].a).toBe(.03);
 });
});
