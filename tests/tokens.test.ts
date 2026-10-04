import { describe, expect, it } from 'vitest';
import graph from '../src/tokens/figma-modes.json';
import light from '../src/tokens/light.json';
import dark from '../src/tokens/dark.json';
type RGB = { colorSpace: string; components: number[]; alpha: number };
type Value = RGB | { alias: string };
const collections = graph.collections as unknown as { name: string; modes: Record<string, Record<string, Value>> }[];
function resolve(path: string, theme: string, accent: string, seen: string[] = []): RGB {
  if (seen.includes(path)) throw new Error(`Cycle ${path}`);
  const [collectionName, ...parts] = path.split('/');
  const collection = collections.find(c => c.name === collectionName)!;
  const mode = collectionName === 'Appearance' ? theme : collectionName === 'Accent' ? accent : 'Base';
  const value = collection.modes[mode][parts.join('/')];
  if (!value) throw new Error(`Missing ${path} in ${mode}`);
  return 'alias' in value ? resolve(value.alias, theme, accent, [...seen, path]) : value;
}
function luminance(c: RGB) { return c.components.map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((a,n,i) => a + n * [.2126, .7152, .0722][i], 0); }
function contrast(a: RGB, b: RGB) { const values = [luminance(a), luminance(b)].sort((a,b) => b-a); return (values[0] + .05) / (values[1] + .05); }
describe('V2 independent variable modes', () => {
  it('exposes one identical 12-step accent contract across all modes', () => {
    const modes = collections.find(c => c.name === 'Accent')!.modes;
    expect(Object.keys(modes)).toHaveLength(18);
    for (const mode of Object.values(modes)) expect(Object.keys(mode)).toEqual(graph.steps.map(n => `accent/${n}`));
    expect(Object.keys(light)).toEqual(Object.keys(dark)); expect(Object.keys(light)).toHaveLength(24);
  });
  it('resolves every cross-collection alias in all 36 appearance/accent combinations', () => {
    for (const theme of ['Light', 'Dark']) for (const accent of graph.modes) for (const collection of collections) {
      const mode = collection.name === 'Appearance' ? theme : collection.name === 'Accent' ? accent : 'Base';
      for (const name of Object.keys(collection.modes[mode])) {
        const color = resolve(`${collection.name}/${name}`, theme, accent);
        expect(color.colorSpace).toBe('srgb'); expect(color.components).toHaveLength(3);
        for (const n of [...color.components, color.alpha]) { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(1); }
      }
    }
  });
  it('keeps neutral truly grayscale and readable role pairs above 4.5:1', () => {
    for (const step of graph.steps) { const c = resolve(`Neutral/neutral/${step}`, 'Light', 'neutral'); expect(c.components[0]).toBe(c.components[1]); expect(c.components[1]).toBe(c.components[2]); }
    for (const theme of ['Light', 'Dark']) for (const accent of graph.modes) {
      const get = (name: string) => resolve(`Appearance/${name}`, theme, accent);
      for (const [fg,bg] of [['content/muted','surface/base'], ['content/muted','surface/canvas'], ['content/muted','surface/active'], ['content/secondary','surface/raised'], ['accent/text','accent/bg'], ['accent/ink','accent/soft'], ['accent/on-solid','accent/solid']]) expect(contrast(get(fg), get(bg)), `${theme}/${accent}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
