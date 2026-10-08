import {describe,it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ControlList} from '../demo/ControlList';
import manifest from '../agent-manifest.json';
import {componentNames,resolveRoute} from '../demo/catalog';

describe('Generated reference contract',()=>{
 it('covers every canonical component with API, usage and valid related pages',()=>{
  for(const name of componentNames){
   const record=manifest.components[name];
   expect(record.api.length,name).toBeGreaterThan(0);
   expect(new Set(record.api.map(prop=>prop.name)).size,name).toBe(record.api.length);
   expect(record.usage.length,name).toBeGreaterThan(40);
   expect(record.agentNotes.length,name).toBeGreaterThan(40);
   expect(record.related,name).not.toContain(name);
   expect(new Set(record.related).size,name).toBe(record.related.length);
   for(const target of record.related)expect(componentNames).toContain(target);
  }
 });
 it('extracts actual types and defaults rather than treating demo settings as API',()=>{
  const api=manifest.components.Button.api;
  expect(api.find(prop=>prop.name==='variant')).toMatchObject({required:false,default:"'secondary'"});
  expect(api.find(prop=>prop.name==='size')).toMatchObject({type:'Size',default:"'md'"});
  expect(manifest.components.IconButton.api.find(prop=>prop.name==='label')).toMatchObject({required:true,type:'string'});
  expect(api.some(prop=>prop.name==='onClick')).toBe(true);
  expect(manifest.components.ContentLayout.api.some(prop=>prop.name==='leftWidth')).toBe(false);
 });
 it('resolves catalogue index pages without aliasing them to a component',()=>{
  expect(resolveRoute('#overview')).toBe('overview');expect(resolveRoute('#changelog')).toBe('changelog');
 });
 it('prioritizes size and groups focus geometry at the end',()=>{
  render(<ControlList controls={[{key:'focusWidth'},{key:'label'},{key:'size'},{key:'focusOffset'},{key:'variant'}]} render={control=><span key={control.key}>{control.key}</span>}/>);
  expect([...document.querySelectorAll('span')].map(node=>node.textContent)).toEqual(['size','label','variant','focusWidth','focusOffset']);
  expect(screen.getByRole('group',{name:'Фокус'}).textContent).toBe('ФокусfocusWidthfocusOffset');
 });
});
