import { describe,expect,it } from 'vitest';
import registry from '../source/component-registry.json';
import manifest from '../agent-manifest.json';
import { componentNames,filterComponents,resolveRoute } from '../demo/catalog';
import { documentFiles } from '../demo/document-files';
import { existsSync } from 'node:fs';

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
 it('keeps a minimal canonical editable instruction set',()=>{
   expect(documentFiles).toHaveLength(6);
   expect(new Set(documentFiles.map(file=>file.path)).size).toBe(documentFiles.length);
   for(const file of documentFiles){expect(existsSync(file.path),file.path).toBe(true);expect(file.protected).toBe(true);}
   expect(documentFiles.map(file=>file.path)).toContain('docs/component-guidelines.md');
   expect(documentFiles.some(file=>file.path.endsWith('-revision.md'))).toBe(false);
 });
 it('requires design review for every newly introduced component',()=>{
   for(const record of Object.values(registry.components))if('introduced' in record)expect(record.status).toBe('needs-review');
 });
});
