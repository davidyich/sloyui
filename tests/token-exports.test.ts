import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Color = { colorSpace: string; components: number[]; alpha: number };
type Value = Color | number | string | { alias: string };
type Token = { $type: string; $value: Color | number | string | { value: number; unit: string }; $extensions: { 'com.sloyui.token': { path: string } } };
type Document = { $extensions: { 'com.sloyui.export': Record<string, unknown> } } & Record<string, unknown>;
const read = <T,>(name: string): T => JSON.parse(readFileSync(`src/tokens/${name}.json`, 'utf8')) as T;
const graph = read<{
 collections: { name: string; modes: Record<string, Record<string, Value>> }[];
 metadata: Record<string, { type: string; unit?: string }>;
 legacyPaths: Record<string, string>;
}>('figma-modes');
const tokens = (document: Document): [string, Token][] => Object.entries(document).filter(([name]) => !name.startsWith('$')) as [string, Token][];

function resolve(path: string, theme: string, seen: string[] = []): Value {
 if (seen.includes(path)) throw new Error(`Alias cycle: ${path}`);
 const [collectionName, ...parts] = path.split('/');
 const collection = graph.collections.find(value => value.name === collectionName);
 if (!collection) throw new Error(`Missing collection: ${collectionName}`);
 const mode = collectionName === 'Theme' ? theme : collectionName === 'SurfaceScheme' ? 'Standard' : collectionName === 'Semantic' ? 'Page' : Object.keys(collection.modes)[0];
 const value = collection.modes[mode]?.[parts.join('/')];
 if (value === undefined) throw new Error(`Missing token: ${path}`);
 return typeof value === 'object' && 'alias' in value ? resolve(value.alias, theme, [...seen, path]) : value;
}

describe('Standalone token JSON exports', () => {
 for (const theme of ['Light', 'Dark']) {
  it(`${theme} keeps every legacy role as a resolved Standard Page snapshot without external references`, () => {
   const document = read<Document>(theme.toLowerCase());
   expect(document.$extensions['com.sloyui.export']).toMatchObject({ schemaVersion: 2, kind: 'resolved-legacy-semantic-snapshot', modes: { Theme: theme, SurfaceScheme: 'Standard', Semantic: 'Page' }, resolved: true });
   const exported = tokens(document);
   const legacyRoles = Object.keys(graph.legacyPaths).filter(path => path.startsWith('Semantic/')).map(path => path.slice('Semantic/'.length));
   expect(exported.map(([name]) => name).sort()).toEqual(legacyRoles.sort());
   for (const [name, token] of exported) {
    const path = graph.legacyPaths[`Semantic/${name}`];
    expect(token.$extensions['com.sloyui.token'].path, name).toBe(path);
    expect(token.$value, name).toEqual(resolve(path, theme));
    expect(['color', 'number'], name).toContain(token.$type);
    if (token.$type === 'color') {
     const color = token.$value as Color;
     expect(color.colorSpace, name).toBe('srgb');
     expect(color.components, name).toHaveLength(3);
     for (const channel of [...color.components, color.alpha]) {
      expect(Number.isFinite(channel), name).toBe(true);
      expect(channel, name).toBeGreaterThanOrEqual(0);
      expect(channel, name).toBeLessThanOrEqual(1);
     }
    } else expect(typeof token.$value, name).toBe('number');
   }
  });
 }

 it('foundations contains only the raw v2 primitives with valid DTCG types and units', () => {
  const document = read<Document>('foundations');
  expect(document.$extensions['com.sloyui.export']).toMatchObject({ schemaVersion: 2, kind: 'raw-primitives', collection: 'Primitives', mode: 'Value', resolved: true });
  const raw = graph.collections.find(collection => collection.name === 'Primitives')!.modes.Value;
  const exported = tokens(document);
  expect(exported.map(([name]) => name).sort()).toEqual(Object.keys(raw).sort());
  for (const [name, token] of exported) {
   const path = `Primitives/${name}`;
   expect(name).toMatch(/^(dimension|duration|opacity|weight|ratio|font-family)\//);
   expect(token.$extensions['com.sloyui.token'].path).toBe(path);
   const metadata = graph.metadata[path];
   if (metadata.unit === 'px' || metadata.unit === 'ms') {
    expect(token.$type).toBe(metadata.unit === 'px' ? 'dimension' : 'duration');
    expect(token.$value).toEqual({ value: raw[name], unit: metadata.unit });
   } else {
    expect(token.$type).toBe(metadata.type === 'STRING' ? 'fontFamily' : 'number');
    expect(token.$value).toEqual(raw[name]);
   }
  }
 });
});
