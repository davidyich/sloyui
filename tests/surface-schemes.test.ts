import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const graph = JSON.parse(readFileSync('figma/token-system-v4/graph.json', 'utf8'));
const tokens = new Map<string, any>(graph.collections.flatMap((collection: any) => collection.variables.map((token: any) => [collection.key + '/' + token.name, { ...token, collection: collection.key }])));
function resolve(path: string, selection: Record<string, string>): any {
 const token = tokens.get(path);
 const value = token.values[selection[token.collection] ?? graph.axes[token.collection]?.default ?? 'Value'];
 return value?.alias ? resolve(value.alias, selection) : value?.color ? { ...resolve(value.color.alias, selection), a: resolve(value.opacity.alias, selection) / 100 } : value;
}
function pigmentPath(path:string,selection:Record<string,string>):string {
 const token=tokens.get(path),value=token.values[selection[token.collection]??graph.axes[token.collection]?.default??'Value'];
 return value?.alias?pigmentPath(value.alias,selection):value?.color?pigmentPath(value.color.alias,selection):path;
}
const regions = ['Shell', 'Workspace', 'Content', 'Overlay'];
const themes = ['Light', 'Dark'] as const;

describe('Reference surface schemes', () => {
 it('exposes Standard and Dimmed with the Inverted compatibility alias', () => {
  expect(graph.axes.SurfaceScheme.values).toEqual(['Standard', 'Dimmed', 'Inverted']);
  expect(graph.axes.Surface.values).toEqual([...regions, 'Invert', 'Glass']);
 });
 for (const SurfaceScheme of ['Standard', 'Dimmed'] as const) for (const Theme of themes) {
  it(`${Theme}/${SurfaceScheme} selects backgrounds and blocks from the shared neutral ramp`, () => {
   regions.forEach(Surface => {
    const selection={Theme,Surface,SurfaceScheme},bg=resolve('Theme/surface/bg',selection),block=resolve('Theme/surface/block',selection);
    for(const role of ['surface/bg','surface/block']){
     const path=pigmentPath('Theme/'+role,selection);
     expect(path).toMatch(/^Palette\/(?:gray\/\d+|black|white)$/);
     expect(resolve('Theme/'+role,selection)).toEqual(resolve(path,selection));
    }
    expect(bg.r).toBe(bg.g);expect(bg.g).toBe(bg.b);
    expect(bg.a).toBe(1);
    expect(block.a).toBe(1);
    expect((block.r-bg.r)*(Theme==='Dark'?1:-1),`${Surface} separates its block`).toBeGreaterThan(0);
   });
  });
 }
 it('retains ordered surface levels after quantizing reference targets to existing steps',()=>{
  const values=(Theme:string,SurfaceScheme:string)=>regions.map(Surface=>resolve('Theme/surface/bg',{Theme,Surface,SurfaceScheme}).r);
  const light=values('Light','Standard');expect(light[0]).toBeLessThan(light[1]);expect(light[1]).toBeLessThan(light[2]);expect(light[3]).toBe(light[2]);
  const dark=values('Dark','Standard');for(let index=1;index<dark.length;index++)expect(dark[index]).toBeGreaterThan(dark[index-1]);
  const dimmed=values('Dark','Dimmed');expect(dimmed[0]).toBeGreaterThan(dimmed[1]);expect(dimmed[1]).toBeGreaterThan(dimmed[2]);expect(dimmed[3]).toBeGreaterThan(dimmed[0]);
 });
 it('exports exact scheme and neutral backings for Palette Lab from the same graph', () => {
  const bridge=JSON.parse(readFileSync('figma/token-system-v4/palette-contexts.json','utf8'));
  for(const Theme of themes)for(const SurfaceScheme of ['Standard','Dimmed'])for(const Surface of graph.axes.Surface.values)for(const [name,role]of Object.entries({'surface/bg':'surface/bg','surface/secondary/normal':'surface/block','surface/secondary/active':'surface/secondary/neutral-pressed','surface/tertiary/normal':'surface/secondary/neutral-normal','surface/tertiary/active':'surface/secondary/neutral-hover'}))expect(bridge[`${Theme}/${SurfaceScheme}/${Surface}`][name]).toEqual(resolve('Theme/'+role,{Theme,Surface,SurfaceScheme}));
 });
 it('keeps distinct primary and secondary ink for blue, indigo and sapphire on Dark Glass', () => {
  for(const SurfaceScheme of ['Standard','Dimmed'])for(const hue of ['blue','indigo','sapphire'])expect(resolve('Theme/content/'+hue,{Theme:'Dark',Surface:'Glass',SurfaceScheme})).not.toEqual(resolve('Theme/content/secondary/'+hue,{Theme:'Dark',Surface:'Glass',SurfaceScheme}));
 });
 it('changes Shell and Overlay in Dark and Workspace in Light', () => {
  for (const [Theme, Surface] of [['Dark', 'Shell'], ['Dark', 'Overlay'], ['Light', 'Workspace']]) expect(resolve('Theme/surface/bg', { Theme, Surface, SurfaceScheme: 'Dimmed' })).not.toEqual(resolve('Theme/surface/bg', { Theme, Surface, SurfaceScheme: 'Standard' }));
 });
 it('keeps Inverted equivalent to the complete Dimmed context', () => {
  for (const Theme of themes) for (const Surface of graph.axes.Surface.values) for (const token of graph.collections.find((c: any) => c.key === 'Theme').variables) expect(resolve('Theme/' + token.name, { Theme, Surface, SurfaceScheme: 'Inverted' })).toEqual(resolve('Theme/' + token.name, { Theme, Surface, SurfaceScheme: 'Dimmed' }));
 });
 it('preserves independent Invert, Glass, stable and adaptive roles', () => {
  for (const Theme of themes) for (const Surface of graph.axes.Surface.values) for (const token of graph.collections.find((c: any) => c.key === 'Theme').variables) {
   if (['Invert', 'Glass'].includes(Surface) || /^(stable|adaptive)\//.test(token.name)) expect(resolve('Theme/' + token.name, { Theme, Surface, SurfaceScheme: 'Dimmed' })).toEqual(resolve('Theme/' + token.name, { Theme, Surface, SurfaceScheme: 'Standard' }));
  }
 });
});
