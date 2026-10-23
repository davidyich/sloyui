import importerSource from '../figma/importer-core.js?raw';
import { describe, it, expect } from 'vitest';
import graph from '../src/tokens/figma-modes.json';
import exportSource from '../scripts/figma-export.mjs?raw';
import brand from '../src/brand.json';
import { readFileSync } from 'node:fs';
import { referenceColor } from './v4-reference';
const createExports = new Function(exportSource.replace('export function', 'function') + '\nreturn createFigmaExports;')();
const expectedCount=graph.collections.reduce((n,c)=>n+Object.keys(Object.values(c.modes)[0]).length,0);
const expectedModeCounts=graph.collections.map(c=>Object.keys(c.modes).length);
const expectedFileCount=expectedModeCounts.reduce((total,count)=>total+count,0);
const metadata=graph.metadata as Record<string,{css?:string;visibility?:string;scopes:string[]}>;
const importVariables = new Function(importerSource + '\nreturn importSloyVariables;')();
function mock(maxModes = 100) {
  let serial = 0;
  const collections: any[] = [], variables: any[] = [];
  return { collections, variables, api: { variables: {
    getLocalVariableCollectionsAsync: async () => collections,
    createVariableCollection(name: string) { const id = `c${++serial}`, c: any = { id, name, defaultModeId: 'm1', modes: [{modeId:'m1',name:'Mode 1'}], renameMode(id: string,name: string){this.modes.find((m: any)=>m.modeId===id).name=name;}, addMode(name: string){if(this.modes.length>=maxModes)throw Error('Mode limit');const modeId=`m${this.modes.length+1}`;this.modes.push({modeId,name});return modeId;}, remove(){collections.splice(collections.indexOf(c),1);for(const v of variables.filter(v=>v.collectionId===id))variables.splice(variables.indexOf(v),1);} };collections.push(c);return c; },
    createVariable(name: string,c: any) {const v: any={id:`v${++serial}`,collectionId:c.id,name,values:{},setValueForMode(mode: string,value: any){this.values[mode]=value;},setVariableCodeSyntax(platform: string,value: string){this.syntax=value;}};variables.push(v);return v;}
  } } };
}
describe('Figma importer',()=>{
 it('creates the full graph and real cross-collection aliases for all modes',async()=>{const m=mock();const r=await importVariables(m.api,graph);expect(r.variableCount).toBe(expectedCount);expect(m.collections.map(c=>c.modes.length)).toEqual(expectedModeCounts);const ids=new Set(m.variables.map(v=>v.id));for(const v of m.variables){const collectionName=m.collections.find(c=>c.id===v.collectionId).name.replace(brand.name+' · ','');const token=metadata[collectionName+'/'+v.name];expect(v.scopes).toEqual(token.scopes);expect(v.syntax).toBe(token.css?`var(${token.css})`:undefined);for(const value of Object.values(v.values) as any[])if(value.type==='VARIABLE_ALIAS')expect(ids.has(value.id)).toBe(true);}});
 it('rolls back the import when four surface modes are unavailable',async()=>{const m=mock(3);await expect(importVariables(m.api,graph)).rejects.toThrow('Mode limit');expect(m.collections).toHaveLength(0);expect(m.variables).toHaveLength(0);});
 it('refuses duplicate imports without altering the previous collections',async()=>{const m=mock();await importVariables(m.api,graph);await expect(importVariables(m.api,graph)).rejects.toThrow('already exist');expect(m.collections).toHaveLength(graph.collections.length);expect(m.variables).toHaveLength(expectedCount);});
});

describe('native Figma DTCG exports', () => {
 it('ships every collection mode without missing tokens and preserves resolvable cross-collection aliases', () => {
  const files = createExports(graph, brand);
  expect(expectedFileCount).toBe(16);
  const schemes=graph.collections.find(c=>c.name==='SurfaceScheme')!.modes;
  expect(Object.keys(schemes)).toEqual(['Standard','Inverted','Dimmed']);
  expect(files.filter((file: any)=>file.collection==='SurfaceScheme').map((file: any)=>file.mode)).toEqual(['Standard','Inverted','Dimmed']);
  expect(schemes.Inverted).toEqual(schemes.Dimmed);
  for(const surface of ['page','inset','panel','overlay']){
   const key=`context/${surface}/surface/background`;
   for(const scheme of ['Standard','Dimmed'] as const)for(const theme of ['Light','Dark']){
    const alias=(schemes[scheme] as any)[key].alias;
    expect(alias).toMatch(/^Theme\//);
    const read=(path:string,seen:string[]=[]):any=>{
     expect(seen,path).not.toContain(path);
     const [owner,...parts]=path.split('/'),collection=graph.collections.find(c=>c.name===owner)!;
     const values=(collection.modes as any)[owner==='Theme'?theme:Object.keys(collection.modes)[0]],value=values[parts.join('/')];
     expect(value,path).toBeDefined();
     return value?.alias?read(value.alias,[...seen,path]):value;
    };
    const canonical=({page:'Shell',inset:'Workspace',panel:'Content',overlay:'Overlay'} as Record<string,string>)[surface];
    expect(read(alias),`${theme}/${scheme}/${surface} keeps its rendered region`).toEqual(referenceColor('Theme/surface/bg',theme,canonical,scheme));
   }
  }
  expect(files).toHaveLength(expectedFileCount);
  const flatten = (group: any, prefix = ''): Record<string, any> => Object.fromEntries(Object.entries(group).filter(([name])=>!name.startsWith('$')).flatMap(([name,value]: [string,any])=>value.$type ? [[prefix+name,value]] : Object.entries(flatten(value,prefix+name+'/'))));
  for (const file of files) {
   const shipped = JSON.parse(readFileSync(new URL('../src/tokens/figma/'+file.filename, import.meta.url),'utf8'));
   expect(shipped).toEqual(file.document);
   const tokens=flatten(shipped),collection=graph.collections.find(c=>c.name===file.collection)!;
   expect(Object.keys(tokens).sort()).toEqual(Object.keys((collection.modes as any)[file.mode]).sort());
   for (const [name, token] of Object.entries(tokens)) {
    const value=(collection.modes as any)[file.mode][name],alias=token.$extensions['com.figma.aliasData'];
    if(value.alias) {
     const [target,...parts]=value.alias.split('/');
     expect(alias).toEqual({targetVariableSetName:brand.name+' · '+target,targetVariableName:parts.join('/')});
     const destination=graph.collections.find(c=>c.name===target)!;
     for(const mode of Object.values(destination.modes))expect(Object.hasOwn(mode,alias.targetVariableName)).toBe(true);
    } else expect(alias).toBeUndefined();
    const css=metadata[file.collection+'/'+name].css;
    expect(token.$extensions['com.sloyui.variable'].codeSyntax?.WEB).toBe(css?`var(${css})`:undefined);
    if(token.$type==='color') { expect(token.$value.colorSpace).toBe('srgb'); for(const c of [...token.$value.components,token.$value.alpha]){expect(c).toBeGreaterThanOrEqual(0);expect(c).toBeLessThanOrEqual(1);} }
   }
  }
 });
});
