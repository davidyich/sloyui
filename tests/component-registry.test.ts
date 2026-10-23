import { describe,expect,it } from 'vitest';
import registry from '../source/component-registry.json';
import manifest from '../agent-manifest.json';
import componentHistory from '../source/component-history.json';
import { componentNames,filterComponents,resolveRoute } from '../demo/catalog';
import { documentFiles } from '../demo/document-files';
import { existsSync,readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';

describe('Persistent component registry',()=>{
 it('keeps unique permanent IDs and valid multiple group memberships',()=>{
   const records=Object.values(registry.components);
   expect(new Set(records.map(record=>record.id)).size).toBe(records.length);
   for(const record of records){
     expect(record.id).toMatch(/^cp-\d{3}$/);
     expect(record.groups).toContain(record.primaryGroup);
     for(const group of record.groups)expect(registry.groups.some(item=>item.id===group)).toBe(true);
     expect(Object.keys(registry.statuses)).toContain(record.status);
   }
   for(const name of Object.keys(manifest.components))expect(registry.components).toHaveProperty(name);
   expect(registry.components.MultiSelect.groups).toEqual(expect.arrayContaining(['fields','selection']));
 });
 it('archives the old editor without breaking its links',()=>{
   expect(componentNames).not.toContain('MarkdownEditor');
   expect(resolveRoute('#MarkdownEditor')).toBe('RichTextEditor');
   expect(registry.components.MarkdownEditor.status).toBe('archived');
   expect(manifest.components.MarkdownEditor.catalogueRoute).toBe('#RichTextEditor');
   expect(manifest.catalogue.archivedRoutes['#MarkdownEditor']).toBe('#RichTextEditor');
 });
 it('archives FloatingField while preserving its Input route and permanent ID',()=>{
   expect(componentNames).not.toContain('FloatingField');
   for(const hash of ['#FloatingField','#floatingfield','#floating-field'])expect(resolveRoute(hash)).toBe('Input');
   expect(registry.components.FloatingField).toMatchObject({id:'cp-049',status:'archived',replacement:'Input'});
   expect(manifest.components.FloatingField.catalogueRoute).toBe('#Input');
   expect(manifest.catalogue.archivedRoutes['#FloatingField']).toBe('#Input');
 });
 it('archives chart pages while preserving their routes, IDs and animation utility',()=>{
   const charts=Object.entries(registry.components).filter(([,record])=>record.primaryGroup==='charts');
   expect(charts).toHaveLength(12);
   for(const [name,record] of charts){
     expect(record.status,name).toBe('archived');
     expect(componentNames,name).not.toContain(name);
     expect(resolveRoute(`#${name}`),name).toBe(name);
     expect(resolveRoute(`#${name.toLowerCase()}`),name).toBe(name);
     expect(manifest.components[name as keyof typeof manifest.components].catalogueRoute,name).toBe(`#${name}`);
     expect(filterComponents({status:'archived'}),name).toContain(name);
     expect(filterComponents({query:name}),name).not.toContain(name);
   }
   expect(registry.components.AnimatedCounter.status).toBe('needs-review');
   expect(componentNames).toContain('AnimatedCounter');
   expect(filterComponents({status:'archived',group:'charts',query:'cp-083'})).toEqual(['LineChart']);
   expect(filterComponents({status:'archived'})).not.toContain('MarkdownEditor');
   expect(filterComponents({group:'charts'})).toEqual(['AnimatedCounter']);
   expect(filterComponents()).toEqual(componentNames);
 });
 it('publishes registry groups with all memberships and canonical counts',()=>{
   expect(manifest.componentCount).toBe(componentNames.length);
   expect(manifest.exportedComponentCount).toBe(Object.keys(manifest.components).length);
   expect(manifest.catalogue.groups.map(group=>group.id)).toEqual(registry.groups.map(group=>group.id));
   for(const group of manifest.catalogue.groups){
     expect(group.label).toBe(registry.groups.find(record=>record.id===group.id)?.label);
     const expected=Object.entries(registry.components).filter(([,record])=>record.status!=='archived'&&record.groups.includes(group.id)).map(([name])=>name);
     expect([...group.components].sort()).toEqual(expected.sort());
   }
   expect(manifest.catalogue.groups.filter(group=>group.components.includes('MultiSelect')).map(group=>group.id)).toEqual(registry.components.MultiSelect.groups);
 });
 it('keeps core instructions, the protected maintenance guide and upstream task workflow',()=>{
   const maintenance=documentFiles.filter(file=>file.path==='docs/catalog-maintenance.md');
   const core=documentFiles.filter(file=>file.path!=='docs/catalog-maintenance.md');
   expect(core.map(file=>file.path)).toEqual(['AGENTS.md','llms.txt','DESIGN.md','docs/component-guidelines.md','docs/surface-context.md','docs/recipes.md','docs/github-tasks.md']);
   expect(maintenance).toEqual([{path:'docs/catalog-maintenance.md',label:'catalog-maintenance.md',protected:true}]);
   expect(documentFiles).toHaveLength(8);
   expect(new Set(documentFiles.map(file=>file.path)).size).toBe(documentFiles.length);
   for(const file of documentFiles){expect(existsSync(file.path),file.path).toBe(true);expect(file.protected).toBe(true);}
   expect(documentFiles.map(file=>file.path)).toContain('docs/component-guidelines.md');
   expect(documentFiles.some(file=>file.path.endsWith('-revision.md'))).toBe(false);
 });
 it('publishes unique kit and component versions linked to actual kit releases',()=>{
   const kitVersions=componentHistory.kit.map(entry=>entry.version);
   expect(new Set(kitVersions).size).toBe(kitVersions.length);
   const ids=new Set(Object.values(registry.components).map(record=>record.id));
   for(const [id,record] of Object.entries(componentHistory.components)){
     expect(ids.has(id),id).toBe(true);
     const versions=record.entries.map(entry=>entry.version);
     expect(new Set(versions).size,id).toBe(versions.length);
     for(const entry of record.entries)expect(kitVersions,`${id}@${entry.version}`).toContain(entry.kitVersion);
   }
   const changelogVersions=Array.from(readFileSync('CHANGELOG.md','utf8').matchAll(/^## (\d+\.\d+\.\d+)\b/gm),match=>match[1]);
   expect(new Set(changelogVersions).size).toBe(changelogVersions.length);
   expect(changelogVersions).toEqual(kitVersions);
 });
 it('stops manifest generation before writing output for duplicate or unlinked release seeds',()=>{
   type HistorySeed={schemaVersion:number;kit:{version:string;date:string;summary:string}[];components:Record<string,{name:string;version:string;entries:{version:string;kitVersion:string;date:string;summary:string}[]}>};
   const baseline:HistorySeed=componentHistory;
   const first=Object.values(baseline.components).find(record=>record.entries.length)!;
   const firstId=Object.entries(componentHistory.components).find(([,record])=>record===first)![0];
   const cases=[
     {mutate:(history:HistorySeed)=>history.kit.push({...history.kit[0]}),error:`Duplicate kit version ${componentHistory.kit[0].version}`},
     {mutate:(history:HistorySeed)=>history.components[firstId].entries.push({...first.entries[0]}),error:`Duplicate component version ${firstId}@${first.entries[0].version}`},
     {mutate:(history:HistorySeed)=>{history.components[firstId].entries[0].kitVersion='99.0.0';},error:'Unknown kit version 99.0.0'},
     {mutate:(history:HistorySeed)=>{Object.assign(history.components,{'cp-999':{name:'Unknown',version:'0.10.0',entries:[]}});},error:'Unknown component history ID cp-999'},
   ];
   for(const scenario of cases){
     const directory=mkdtempSync(join(tmpdir(),'sloy-invalid-history-'));
     try{
       mkdirSync(join(directory,'source'));const history=structuredClone(baseline);scenario.mutate(history);
       writeFileSync(join(directory,'source/component-registry.json'),JSON.stringify(registry));
       writeFileSync(join(directory,'source/component-history.json'),JSON.stringify(history));
       const result=spawnSync(process.execPath,[resolve('scripts/build-manifest.mjs')],{cwd:directory,encoding:'utf8'});
       expect(result.status).not.toBe(0);expect(result.stderr).toContain(scenario.error);
       expect(existsSync(join(directory,'agent-manifest.json'))).toBe(false);
     }finally{rmSync(directory,{recursive:true,force:true});}
   }
 });
 it('requires design review for every newly introduced component',()=>{
   for(const record of Object.values(registry.components))if('introduced' in record)expect(record.status).toBe('needs-review');
 });
});
