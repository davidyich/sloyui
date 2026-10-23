import { describe, expect, it } from 'vitest';
import generatedGraph from '../src/tokens/figma-modes.json';
import { referenceColor } from './v4-reference';

type Color = { components: number[] };
type Context = { theme: string; surface: string; values: Record<string, string> };
type Audit = { hue: string; theme: string; surface: string; state: string; backgroundY: number };
const modelModule = '../scripts/color-model.mjs';
const { buildColorModel, palette, luminance, contrast } = await import(/* @vite-ignore */ modelModule) as {
 buildColorModel: () => { contexts: Record<string, Context>; audit: Audit[]; secondaryPrimitives:Record<string,Color> };
 palette: Record<string, Color>;
 luminance: (color: Color) => number;
 contrast: (a: number, b: number) => number;
};
const model = buildColorModel();
const colors={...palette,...model.secondaryPrimitives};
const roles = ['primary', 'secondary', 'tertiary', 'muted', 'caption'];
const graph = generatedGraph as unknown as {
 metadata: Record<string, { type: string; visibility: string; scopes: string[] }>;
 publicRoles: string[];
};

describe('Content hierarchy and shared Figma content scopes', () => {
 it('uses five distinct authored v4 neutral content roles in their intended order', () => {
  for (const context of Object.values(model.contexts)) {
   const { theme, surface, values } = context;
   const dark = theme === 'Dark';
   const names = roles.map(role => values[`content/${role}`]);
   expect(new Set(names).size, `${theme}/${surface}`).toBe(5);
   for (const name of names) {
    expect(colors[name], name).toBeDefined();
   }
   for (const role of roles) expect(colors[values[`content/${role}`]], `${theme}/${surface}/${role}`).toEqual(referenceColor('Theme/content/'+role,theme,surface));
   const levels = names.map(name => luminance(colors[name]));
   for (let index = 1; index < levels.length; index++) {
    expect((levels[index] - levels[index - 1]) * (dark ? -1 : 1), `${theme}/${surface}: ${roles[index - 1]} → ${roles[index]}`).toBeGreaterThan(0);
   }
  }
 });

 it('keeps neutral content AA on neutral backgrounds, with hue content used on chromatic fills', () => {
  for (const { theme, surface, values } of Object.values(model.contexts)) {
   const surfaceY = luminance(colors[values['surface/current']]);
   const activeBackgrounds = model.audit.filter(row => row.theme === theme && row.surface === surface && row.hue === 'neutral' && row.state !== 'disabled').map(row => row.backgroundY);
   for (const role of roles) {
    const inkY = luminance(colors[values[`content/${role}`]]);
    const backgrounds = role === 'caption' ? [surfaceY] : [surfaceY, ...activeBackgrounds];
    for (const backgroundY of backgrounds) expect(contrast(inkY, backgroundY), `${theme}/${surface}/${role}`).toBeGreaterThanOrEqual(4.5);
   }
  }
 });

 it('publishes tertiary and offers every public content color for text, icon fills and strokes', () => {
  expect(graph.publicRoles).toContain('Semantic/content/tertiary');
  for (const role of roles) expect(graph.metadata[`Semantic/content/${role}`]).toMatchObject({ type: 'COLOR', visibility: 'public', scopes: ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] });
  const publicContent = Object.entries(graph.metadata).filter(([, entry]) => entry.type === 'COLOR' && entry.visibility === 'public' && entry.scopes.includes('TEXT_FILL'));
  expect(publicContent.map(([path]) => path)).toEqual(expect.arrayContaining([
   'Semantic/primary/content', 'Semantic/secondary/neutral/content', 'Semantic/disabled/content',
   ...['danger', 'success', 'warning', 'info'].map(tone => `Semantic/status/${tone}/content`),
  ]));
  for (const [path, entry] of publicContent) expect(entry.scopes, path).toEqual(['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']);
 });
});
