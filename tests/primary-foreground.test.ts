import {describe,it,expect} from 'vitest';
import {createAccent,presets,primaryPair,generatePalette,defaultRules,toHex,contrast,toOklch} from '../figma/color-system-v2/editor/model.mjs';

const BLACK={r:0,g:0,b:0,a:1},WHITE={r:1,g:1,b:1,a:1};

describe('Primary foreground policy',()=>{
 it('keeps orange and green near their authored brightness instead of darkening them for white ink',()=>{
  for(const [name,hex,normal,active] of [
   ['orange','#F07818','#EF7402','#DB6900'],
   ['green','#00995B','#00995B','#008850']
  ]){
   const accent=createAccent(name,hex),pair=primaryPair(accent,'Light');
   expect(toHex(pair.foreground)).toBe('#000000');
   expect([toHex(pair.normal),toHex(pair.active)]).toEqual([normal,active]);
   expect(pair.adjusted).toBe(false);
   expect(Math.abs(toOklch(pair.normal).l-accent.lightnessLight)).toBeLessThan(.01);
  }
 });

 it('uses one exact endpoint for both states and keeps every default hue accessible in both local polarities',()=>{
  for(const preset of presets)for(const theme of ['Light','Dark'])for(const minimumContrast of [4.5,7]){
   const accent=createAccent(preset.name,preset.hex),palette=generatePalette(accent),pair=primaryPair(accent,theme,{...defaultRules,minimumContrast},palette);
   expect([BLACK,WHITE]).toContainEqual(pair.foreground);
   expect(pair.foregroundRequest).toEqual(pair.foreground);
   expect(pair.foregroundStep).toBe(pair.polarity==='light'?'white':'black');
   for(const fill of [pair.normal,pair.active]){
    expect(contrast(pair.foreground,fill)).toBeGreaterThanOrEqual(minimumContrast+.1-1e-9);
    expect(palette[0].steps.some(step=>step.value===fill)).toBe(true);
    expect(fill.a).toBe(1);
   }
   expect(pair.normal).not.toEqual(pair.active);
  }
  // Same outer theme can legitimately have either foreground polarity.
  expect(primaryPair(createAccent('orange','#F07818'),'Light').foreground).toEqual(BLACK);
  expect(primaryPair(createAccent('purple','#9B3FE0'),'Light').foreground).toEqual(WHITE);
 });

 it('does not switch ink at the old arbitrary OKLCH .70 threshold',()=>{
  const accent=createAccent('orange','#F07818');
  const lower=primaryPair({...accent,lightnessLight:.699},'Light'),upper=primaryPair({...accent,lightnessLight:.701},'Light');
  expect(lower.normal).toEqual(upper.normal);
  expect(lower.active).toEqual(upper.active);
  expect(lower.foreground).toEqual(upper.foreground);
 });

 it('adapts ink even with fill adaptation disabled and honestly reports an infeasible requested pair',()=>{
  const orange=createAccent('orange','#F07818'),fixedRules={...defaultRules,adaptPrimary:false};
  const pair=primaryPair(orange,'Light',fixedRules);
  expect(pair.adjusted).toBe(false);expect(pair.foreground).toEqual(BLACK);expect(pair.minimumContrast).toBeGreaterThan(6);
  // These authored states straddle the luminance gap: neither single endpoint
  // reaches 4.6 on both. Automatic fill adaptation must resolve the whole pair.
  const blue=createAccent('blue','#087BE9'),fixed=primaryPair(blue,'Light',fixedRules),adapted=primaryPair(blue,'Light');
  expect(fixed.adjusted).toBe(false);expect(fixed.minimumContrast).toBeLessThan(4.6);
  expect(adapted.adjusted).toBe(true);expect(adapted.minimumContrast).toBeGreaterThanOrEqual(4.6);
 });

 it('preserves explicit ink selection, custom requests and tinted auto behavior',()=>{
  const orange=createAccent('orange','#F07818');
  const white=primaryPair({...orange,foregroundMode:'light'},'Light');
  expect([toHex(white.normal),toHex(white.active),toHex(white.foreground)]).toEqual(['#BB5900','#A64E00','#FFFFFF']);
  const black=primaryPair({...orange,foregroundMode:'dark'},'Light');
  expect([toHex(black.normal),toHex(black.active),toHex(black.foreground)]).toEqual(['#EF7402','#DB6900','#000000']);
  const custom=primaryPair({...orange,foregroundMode:'custom',foregroundLight:'#F4F1E9'},'Light');
  expect(toHex(custom.foregroundRequest)).toBe('#F4F1E9');
  const tinted=primaryPair({...orange,foregroundTint:.65},'Light');
  expect(toHex(tinted.foregroundRequest)).not.toBe('#000000');
  expect(tinted.foregroundRequest).toEqual(primaryPair({...orange,foregroundMode:'light',foregroundTint:.65},'Light').foregroundRequest);
 });
});
