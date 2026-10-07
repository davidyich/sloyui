import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Documents from '../demo/Documents';
import { documentFiles } from '../demo/document-files';
const original={path:'AGENTS.md',content:'# Original',revision:'v1'};
const response=(data:unknown,ok=true)=>Promise.resolve({ok,json:async()=>data});
beforeEach(()=>sessionStorage.clear());
afterEach(()=>vi.unstubAllGlobals());
describe('instruction editor',()=>{
 it('saves the edited text with its revision and returns to the real-file preview',async()=>{
  const fetch=vi.fn().mockImplementationOnce(()=>response({files:documentFiles})).mockImplementationOnce(()=>response(original)).mockImplementationOnce(()=>response({...original,content:'# Updated',revision:'v2'}));vi.stubGlobal('fetch',fetch);
  render(<Documents/>);await screen.findByRole('heading',{name:'Original'});fireEvent.click(screen.getByRole('button',{name:'Редактировать'}));fireEvent.click(screen.getByRole('tab',{name:'Markdown'}));fireEvent.change(screen.getByRole('textbox',{name:'Редактор AGENTS.md'}),{target:{value:'# Updated'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));await screen.findByRole('heading',{name:'Updated'});expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({content:'# Updated',revision:'v1'});expect(sessionStorage.getItem('cap-document-draft:AGENTS.md')).toBeNull();
 });
 it('retains a conflicting draft and requires reviewing the new disk version before retrying',async()=>{
  const fetch=vi.fn().mockImplementationOnce(()=>response({files:documentFiles})).mockImplementationOnce(()=>response(original)).mockImplementationOnce(()=>response({error:'Файл изменён другим редактором'},false)).mockImplementationOnce(()=>response({...original,content:'# External',revision:'v2'})).mockImplementationOnce(()=>response({...original,content:'# My change',revision:'v3'}));vi.stubGlobal('fetch',fetch);
  render(<Documents/>);await screen.findByRole('heading',{name:'Original'});fireEvent.click(screen.getByRole('button',{name:'Редактировать'}));fireEvent.click(screen.getByRole('tab',{name:'Markdown'}));fireEvent.change(screen.getByRole('textbox',{name:'Редактор AGENTS.md'}),{target:{value:'# My change'}});fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));await screen.findByText('Файл изменён другим редактором');expect(screen.getByRole('textbox',{name:'Редактор AGENTS.md'})).toHaveValue('# My change');expect(sessionStorage.getItem('cap-document-draft:AGENTS.md')).toBe('# My change');fireEvent.click(screen.getByRole('button',{name:'Показать версию на диске'}));await screen.findByRole('heading',{name:'External'});fireEvent.click(screen.getByRole('button',{name:'Продолжить с моим текстом'}));fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(5));expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({content:'# My change',revision:'v2'});await screen.findByRole('heading',{name:'My change'});
 });
});

it('starts in Rich edit and changes only the edited block while keeping Markdown source and revision',async()=>{
 const content='# Original\r\n\r\n| A | B |\r\n| --- | --- |\r\n| one | two |\r\n\r\n[ref]: /exact\r\n';
 const next=content.replace('Original','Rich change');
 const fetch=vi.fn().mockImplementationOnce(()=>response({files:documentFiles})).mockImplementationOnce(()=>response({...original,content})).mockImplementationOnce(()=>response({...original,content:next,revision:'v2'}));vi.stubGlobal('fetch',fetch);
 render(<Documents/>);await screen.findByRole('heading',{name:'Original'});fireEvent.click(screen.getByRole('button',{name:'Редактировать'}));
 expect(screen.getByRole('tab',{name:'Форматированный текст'})).toHaveAttribute('aria-selected','true');
 const textbox=screen.getByRole('textbox',{name:'Редактор AGENTS.md, блок 1'});textbox.textContent='Rich change';fireEvent.input(textbox);
 fireEvent.click(screen.getByRole('tab',{name:'Markdown'}));expect(screen.getByRole('textbox',{name:'Редактор AGENTS.md'})).toHaveValue(next.replace(/\r\n/g,'\n'));
 fireEvent.click(screen.getByRole('tab',{name:'Форматированный текст'}));expect(screen.getByRole('textbox',{name:'Редактор AGENTS.md, блок 1'})).toHaveTextContent('Rich change');
 fireEvent.click(screen.getByRole('button',{name:'Сохранить'}));await screen.findByRole('heading',{name:'Rich change'});
 expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({content:next,revision:'v1'});
});

it('does not create a dirty draft merely by switching rich and source modes',async()=>{
 const content='# Exact\n\n[link](/target)\n\n~~~rust\nfn main() {}\n~~~\n';vi.stubGlobal('fetch',vi.fn((url:string)=>response(url==='/__docs'?{files:documentFiles}:{...original,content})));
 render(<Documents/>);await screen.findByRole('heading',{name:'Exact'});fireEvent.click(screen.getByRole('button',{name:'Редактировать'}));
 fireEvent.click(screen.getByRole('tab',{name:'Markdown'}));expect(screen.getByRole('textbox',{name:'Редактор AGENTS.md'})).toHaveValue(content);
 fireEvent.click(screen.getByRole('tab',{name:'Форматированный текст'}));expect(screen.getByRole('button',{name:'Сохранить'})).toBeDisabled();expect(sessionStorage.getItem('cap-document-draft:AGENTS.md')).toBeNull();
});

it('creates and deletes a custom instruction while protecting core files',async()=>{
 let custom:{path:string;content:string;revision:string}|undefined;
 const fetch=vi.fn((url:string,options?:RequestInit)=>{
  if(url==='/__docs')return response({files:[...documentFiles,...(custom?[{path:custom.path,label:'project-rules.md',protected:false}]:[])]});
  const path=new URL(url,'http://localhost').searchParams.get('path');
  if(options?.method==='POST'){custom={path:path!,content:'# Project rules',revision:'custom-v1'};return response(custom);}
  if(options?.method==='DELETE'){expect(JSON.parse(String(options.body))).toEqual({revision:'custom-v1'});custom=undefined;return response({path});}
  return response(path===custom?.path?custom:original);
 });vi.stubGlobal('fetch',fetch);
 render(<Documents/>);await screen.findByRole('heading',{name:'Original'});
 expect(screen.getByRole('button',{name:'Удалить'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Создать файл'}));fireEvent.change(screen.getByRole('textbox',{name:'Имя файла'}),{target:{value:'project-rules.md'}});fireEvent.click(screen.getByRole('button',{name:'Создать'}));
 await screen.findByRole('heading',{name:'Project rules'});expect(screen.getByRole('button',{name:'project-rules.md'})).toHaveAttribute('aria-current','page');
 fireEvent.click(screen.getByRole('button',{name:'Удалить'}));fireEvent.click(screen.getByRole('button',{name:'Удалить файл'}));await screen.findByRole('heading',{name:'Original'});
 expect(screen.queryByRole('button',{name:'project-rules.md'})).not.toBeInTheDocument();
});
