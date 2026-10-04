import importerSource from '../figma/importer-core.js?raw';
import { describe, it, expect } from 'vitest';
import graph from '../src/tokens/figma-modes.json';
const importVariables = new Function(importerSource + '\nreturn importCapacitiesVariables;')();
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
 it('creates 48 variables and real cross-collection aliases for all modes',async()=>{const m=mock();const r=await importVariables(m.api,graph);expect(r.variableCount).toBe(48);expect(m.collections.map(c=>c.modes.length)).toEqual([1,18,2]);const ids=new Set(m.variables.map(v=>v.id));for(const v of m.variables){expect(v.scopes.length).toBeGreaterThan(0);expect(v.syntax).toMatch(/^var\(--cap-/);for(const value of Object.values(v.values) as any[])if(value.type==='VARIABLE_ALIAS')expect(ids.has(value.id)).toBe(true);}});
 it('leaves no partial data on a plan mode limit and accepts a smaller chosen mode set',async()=>{const m=mock(4);await expect(importVariables(m.api,graph)).rejects.toThrow('Mode limit');expect(m.collections).toHaveLength(0);expect(m.variables).toHaveLength(0);const r=await importVariables(m.api,graph,['neutral','blue','purple','teal']);expect(r.variableCount).toBe(48);expect(m.collections[1].modes).toHaveLength(4);});
 it('refuses duplicate imports without altering the previous collections',async()=>{const m=mock();await importVariables(m.api,graph);await expect(importVariables(m.api,graph)).rejects.toThrow('already exist');expect(m.collections).toHaveLength(3);expect(m.variables).toHaveLength(48);});
});
