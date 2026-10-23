import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {ComponentHistory,ReleaseEditor,type HistoryData} from '../demo/ComponentHistory';

vi.mock('../demo/CatalogAdmin',()=>({useCatalogAdmin:()=>({admin:true,notify:vi.fn()})}));
vi.mock('../demo/catalog-state',()=>({refreshCatalog:vi.fn(async()=>{})}));
const entry={version:'0.11.0',kitVersion:'0.11.0',date:'2026-10-09',summary:'# Published release'};
const original:HistoryData={id:'cp-001',version:'0.11.0',revision:'history-one',entries:[entry,{...entry,version:'0.10.0',summary:'# Older release'}],instruction:{path:'docs/components/cp-001.md',content:'# Instruction',revision:'instruction-one'}};
const response=(value:unknown)=>({ok:true,json:async()=>value});
beforeEach(()=>sessionStorage.clear());
afterEach(()=>vi.unstubAllGlobals());
const show=(kind:'component'|'kit')=>render(kind==='component'?<ComponentHistory componentId="cp-001" componentName="Button" onClose={()=>{}}/>:<ReleaseEditor/>);

describe.each(['component','kit'] as const)('%s release editor',kind=>{
 it('restores a draft for an existing entry and keeps its version fixed',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>response(original)));show(kind);
  fireEvent.click(await screen.findByRole('button',{name:'Редактировать версию 0.11.0'}));
  const versionLabel=kind==='component'?'Версия компонента':'Версия кита';
  expect(screen.getByRole('textbox',{name:versionLabel})).toHaveAttribute('readonly');
  fireEvent.change(screen.getByRole('textbox',{name:'Что изменилось'}),{target:{value:'# Unsaved draft'}});
  fireEvent.click(screen.getByRole('button',{name:'Закрыть редактор'}));
  fireEvent.click(screen.getByRole('button',{name:'Редактировать версию 0.11.0'}));
  expect(screen.getByRole('textbox',{name:versionLabel})).toHaveValue('0.11.0');
  expect(screen.getByRole('textbox',{name:'Что изменилось'})).toHaveValue('# Unsaved draft');
 });
 it('does not open another editor while saving an entry',async()=>{
  let finish!:(value:ReturnType<typeof response>)=>void;
  const pending=new Promise<ReturnType<typeof response>>(resolve=>{finish=resolve;});
  const fetch=vi.fn(async(_url:string,options?:RequestInit)=>options?.method==='PUT'?pending:response(original));vi.stubGlobal('fetch',fetch);show(kind);
  fireEvent.click(await screen.findByRole('button',{name:'Редактировать версию 0.11.0'}));
  fireEvent.change(screen.getByRole('textbox',{name:'Что изменилось'}),{target:{value:'# Saved change'}});
  fireEvent.click(screen.getByRole('button',{name:'Сохранить версию'}));
  expect(screen.getByRole('button',{name:'Редактировать версию 0.10.0'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Закрыть редактор'})).toBeDisabled();
  await act(async()=>finish(response({...original,revision:'history-two',entries:[{...entry,summary:'# Saved change'},original.entries[1]]})));
  await screen.findByRole('heading',{name:'Saved change'});
  expect(screen.queryByRole('textbox',{name:'Что изменилось'})).toBeNull();
 });
 it('starts Add with a unique next patch rather than overwriting the latest release',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>response(original)));show(kind);
  await screen.findByRole('button',{name:'Редактировать версию 0.11.0'});
  fireEvent.click(screen.getByRole('button',{name:kind==='component'?'Добавить версию':'Добавить выпуск'}));
  expect(screen.getByRole('textbox',{name:kind==='component'?'Версия компонента':'Версия кита'})).toHaveValue('0.11.1');
  if(kind==='component')expect(screen.getByRole('combobox',{name:'Версия кита'})).toHaveTextContent('v0.11.0');
 });
 it('retains a legacy new-entry draft without reusing a published version',async()=>{
  sessionStorage.setItem(kind==='component'?'sloy-component-release:cp-001':'sloy-kit-release-draft',JSON.stringify({...entry,summary:'# Legacy draft'}));
  vi.stubGlobal('fetch',vi.fn(async()=>response(original)));show(kind);
  await screen.findByRole('button',{name:'Редактировать версию 0.11.0'});
  fireEvent.click(screen.getByRole('button',{name:kind==='component'?'Добавить версию':'Добавить выпуск'}));
  expect(screen.getByRole('textbox',{name:kind==='component'?'Версия компонента':'Версия кита'})).toHaveValue('0.11.1');
  expect(screen.getByRole('textbox',{name:'Что изменилось'})).toHaveValue('# Legacy draft');
 });
 it('keeps a new release draft on closing and saves the next patch with the current revision',async()=>{
  const fetch=vi.fn(async(_url:string,options?:RequestInit)=>{if(options?.method==='PUT'){const saved=JSON.parse(String(options.body));return response({...original,version:saved.version,revision:'history-two',entries:[saved,...original.entries]});}return response(original);});vi.stubGlobal('fetch',fetch);show(kind);
  await screen.findByRole('button',{name:'Редактировать версию 0.11.0'});
  const addLabel=kind==='component'?'Добавить версию':'Добавить выпуск';
  fireEvent.click(screen.getByRole('button',{name:addLabel}));
  fireEvent.change(screen.getByRole('textbox',{name:'Что изменилось'}),{target:{value:'# Next patch draft'}});
  fireEvent.click(screen.getByRole('button',{name:'Закрыть редактор'}));
  fireEvent.click(screen.getByRole('button',{name:addLabel}));
  expect(screen.getByRole('textbox',{name:'Что изменилось'})).toHaveValue('# Next patch draft');
  expect(screen.getByRole('textbox',{name:kind==='component'?'Версия компонента':'Версия кита'})).not.toHaveAttribute('readonly');
  fireEvent.click(screen.getByRole('button',{name:'Сохранить версию'}));
  await screen.findByRole('heading',{name:'Next patch draft'});
  const request=fetch.mock.calls.find(([,options])=>options?.method==='PUT')!;
  expect(JSON.parse(String(request[1]?.body))).toMatchObject({version:'0.11.1',revision:'history-one',summary:'# Next patch draft'});
  if(kind==='component')expect(JSON.parse(String(request[1]?.body)).kitVersion).toBe('0.11.0');
  expect(sessionStorage.getItem(kind==='component'?'sloy-component-release:cp-001':'sloy-kit-release-draft')).toBeNull();
 });
});

it('does not permit creating a kit entry until its current revision is loaded',async()=>{
 let finish!:(value:ReturnType<typeof response>)=>void;
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<ReturnType<typeof response>>(resolve=>{finish=resolve;})));
 show('kit');expect(screen.getByRole('button',{name:'Добавить выпуск'})).toBeDisabled();
 await act(async()=>finish(response(original)));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Добавить выпуск'})).toBeEnabled());
});
