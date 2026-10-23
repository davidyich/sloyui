import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import generatedGraph from '../src/tokens/figma-modes.json';

type Color = { colorSpace: string; components: number[]; alpha: number };
type Value = Color | { alias: string } | string | number;
type Metadata = { type: string; visibility: 'public' | 'internal'; css?: string; scopes: string[] };
type Graph = {
 schemaVersion: number;
 collections: { name: string; modes: Record<string, Record<string, Value>> }[];
 metadata: Record<string, Metadata>;
 legacyPaths: Record<string, string>;
 surfaceModes: Record<string, string>;
 publicRoles: string[];
};
type AuditRow = { theme: string; surface: string; hue: string; state: string; background: string; text: string };
type Model = { contexts: Record<string, { theme: string; surface: string; values: Record<string, string> }>; audit: AuditRow[]; secondaryPrimitives: Record<string, Color> };
const graph = generatedGraph as unknown as Graph;
// Rebuild the pre-architecture color model independently from its authored input.
// This never imports the graph transformation and does not rewrite artifacts.
const modelModule = '../scripts/color-model.mjs';
const { buildColorModel, palette } = await import(/* @vite-ignore */ modelModule) as { buildColorModel: () => Model; palette: Record<string, Color> };
const model = buildColorModel();
const originalColors = { ...palette, ...model.secondaryPrimitives };

function resolve(path: string, theme: string, surface: string, seen: string[] = []): Value {
 path = graph.legacyPaths[path] ?? path;
 if (seen.includes(path)) throw new Error(`Alias cycle: ${[...seen, path].join(' -> ')}`);
 const [collectionName, ...parts] = path.split('/');
 const collection = graph.collections.find(value => value.name === collectionName);
 if (!collection) throw new Error(`Missing collection: ${collectionName}`);
 const mode = collectionName === 'Theme' ? theme : collectionName === 'SurfaceScheme' ? 'Standard' : collectionName === 'Semantic' ? graph.surfaceModes[surface] : Object.keys(collection.modes)[0];
 const value = collection.modes[mode]?.[parts.join('/')];
 if (value === undefined) throw new Error(`Missing ${path} in ${mode}`);
 return typeof value === 'object' && 'alias' in value ? resolve(value.alias, theme, surface, [...seen, path]) : value;
}

function styleFiles(directory: string): string[] {
 return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? styleFiles(`${directory}/${entry.name}`) : entry.name.endsWith('.css') ? [`${directory}/${entry.name}`] : []);
}

describe('Token architecture v2: public contract and implementation boundaries', () => {
 it('separates palette, raw primitives, internal routing, public roles and component bindings', () => {
  expect(graph.schemaVersion).toBe(2);
  expect(graph.collections.map(collection => collection.name)).toEqual(['Palette', 'Primitives', 'Theme', 'SurfaceScheme', 'Density', 'Semantic', 'Components', 'Borders']);
  expect(graph.surfaceModes).toEqual({ base: 'Page', canvas: 'Inset', raised: 'Panel', floating: 'Overlay' });
  const paletteCollection = graph.collections.find(collection => collection.name === 'Palette')!;
  expect(Object.keys(paletteCollection.modes.Value)).toHaveLength(289);
  expect(Object.keys(paletteCollection.modes.Value).sort()).toEqual(Object.keys(palette).map(path=>path.slice('palette/'.length)).sort());
  for (const [name, value] of Object.entries(paletteCollection.modes.Value)) {
   expect(name).not.toMatch(/^palette\//);
   expect(value).toEqual(palette[`palette/${name}`]);
  }
  const primitives = graph.collections.find(collection => collection.name === 'Primitives')!.modes.Value;
  for (const name of Object.keys(primitives)) expect(name).not.toMatch(/(?:^|\/)(?:derived|palette|inline-counter-size|selection-size|slider-thumb|slider-track)(?:\/|$)/);
  for (const name of Object.keys(graph.collections.find(collection => collection.name === 'Theme')!.modes.Light)) {
   expect(graph.metadata[`Theme/${name}`].visibility).toBe('internal');
   expect(graph.metadata[`Theme/${name}`].css).toBeUndefined();
  }
 });

 it('limits the public color contract to 35 explicit semantic roles', () => {
  expect(graph.publicRoles).toHaveLength(35);
  expect(new Set(graph.publicRoles).size).toBe(35);
  for (const path of graph.publicRoles) {
   expect(path).toMatch(/^Semantic\//);
   expect(graph.metadata[path]).toMatchObject({ type: 'COLOR', visibility: 'public' });
   for (const context of Object.values(model.contexts)) expect(resolve(path, context.theme, context.surface)).toHaveProperty('components');
  }
  const publicColors = Object.entries(graph.metadata).filter(([, metadata]) => metadata.visibility === 'public' && metadata.type === 'COLOR').map(([path]) => path);
  expect(publicColors.sort()).toEqual([...graph.publicRoles].sort());
  for (const [path, metadata] of Object.entries(graph.metadata)) if (metadata.type === 'COLOR') {
   if (metadata.visibility === 'internal') expect(metadata.scopes, `${path} must stay out of color property pickers`).toEqual([]);
   else expect(metadata.scopes.length, `${path} must be available in its intended picker`).toBeGreaterThan(0);
  }
 });

 it('only advertises WEB token syntax that the shipped styles actually declare', () => {
  const styles = styleFiles('src/styles').map(path => readFileSync(path, 'utf8')).join('\n');
  const declarations = new Set([...styles.matchAll(/(--cap-[\w-]+)\s*:/g)].map(match => match[1]));
  for (const [path, metadata] of Object.entries(graph.metadata)) {
   if (metadata.css !== undefined) {
    expect(metadata.css, path).toMatch(/^--cap-/);
    expect(declarations.has(metadata.css), `${path} advertises missing ${metadata.css}`).toBe(true);
   }
  }
 });
});

describe('Token architecture v2: unchanged rendered colors', () => {
 it('preserves every authored contextual role through the migration mapping', () => {
  for (const [contextName, context] of Object.entries(model.contexts)) {
   for (const [role, primitive] of Object.entries(context.values)) {
    const oldPath = `Semantic/${role}`;
    expect(graph.legacyPaths[oldPath], `${oldPath} needs a migration destination`).toBeTypeOf('string');
    expect(resolve(oldPath, context.theme, context.surface), `${contextName}/${role}`).toEqual(originalColors[primitive]);
   }
  }
 });

 it('preserves all canonical fill/text pairs and their nested reactions exactly', () => {
  expect(model.audit).toHaveLength(224);
  for (const row of model.audit) {
   const context = `${row.theme}/${row.surface}/${row.hue}/${row.state}`;
   const background = resolve(`Semantic/element/${row.hue}/${row.state}`, row.theme, row.surface) as Color;
   const foreground = resolve(`Semantic/element/${row.hue}/${row.state === 'disabled' ? 'disabled-text' : 'text'}`, row.theme, row.surface) as Color;
   expect(background, `${context}/background`).toEqual(originalColors[row.background]);
   expect(foreground, `${context}/text`).toEqual(originalColors[row.text]);
   for (const reaction of ['normal', 'hover', 'pressed'] as const) {
    const opacity = reaction === 'normal' ? 0 : reaction === 'hover' ? row.theme === 'Dark' ? .06 : .04 : row.theme === 'Dark' ? .10 : .08;
    const overlay = resolve(`Semantic/reaction/${reaction}`, row.theme, row.surface) as Color;
    expect(overlay.alpha, `${context}/${reaction}`).toBe(opacity);
    expect(overlay.components, `${context}/${reaction}`).toEqual(row.theme === 'Dark' ? [1, 1, 1] : [0, 0, 0]);
    const composite = background.components.map((channel, index) => channel * (1 - overlay.alpha) + overlay.components[index] * overlay.alpha);
    const originalComposite = originalColors[row.background].components.map(channel => channel * (1 - opacity) + (row.theme === 'Dark' ? opacity : 0));
    expect(composite, `${context}/${reaction} composite`).toEqual(originalComposite);
   }
  }
 });
});
