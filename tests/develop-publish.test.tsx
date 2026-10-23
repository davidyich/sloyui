import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {CatalogAdminProvider} from '../demo/CatalogAdmin';
import {PublishDevelop} from '../demo/PublishDevelop';
const state={revision:'reviewed-version',canPublish:true,develop:{version:'0.12.1',release:'develop-reviewed'},production:{version:'0.12.0',release:'production-before'}};
afterEach(()=>{cleanup();history.replaceState({},'','/');vi.unstubAllGlobals();vi.useRealTimers();});
it.each([['/develop/',false],['/',true]])('hides Publish on %s with owner=%s',async(path,admin)=>{
 history.replaceState({},'',path);const fetch=vi.fn(async()=>new Response(JSON.stringify({admin})));vi.stubGlobal('fetch',fetch);
 render(<CatalogAdminProvider notify={()=>{}}><PublishDevelop/></CatalogAdminProvider>);
 await act(async()=>{});expect(screen.queryByRole('button',{name:'Опубликовать'})).toBeNull();expect(fetch).toHaveBeenCalledTimes(1);
});
it('requires explicit confirmation for the reviewed develop revision and reports completed publication',async()=>{
 history.replaceState({},'','/develop/');const notify=vi.fn();let queued=false;
 const fetch=vi.fn(async(url:string,options?:RequestInit)=>{
  if(url.endsWith('/session'))return new Response(JSON.stringify({admin:true}));
  if(options?.method==='POST'){queued=true;return new Response(JSON.stringify({id:'publication-one'}),{status:202});}
  return new Response(JSON.stringify({...state,...(queued?{result:{id:'publication-one',status:'published'}}:{})}));
 });vi.stubGlobal('fetch',fetch);
 render(<CatalogAdminProvider notify={notify}><PublishDevelop/></CatalogAdminProvider>);
 fireEvent.click(await screen.findByRole('button',{name:'Опубликовать'}));
 await screen.findByText('develop-reviewed');expect(fetch.mock.calls.some(([,options])=>options?.method==='POST')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Опубликовать на основном сайте'}));
 await waitFor(()=>expect(fetch.mock.calls.find(([,options])=>options?.method==='POST')?.[1]?.body).toBe(JSON.stringify({revision:'reviewed-version'})));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith('Develop опубликован на основном сайте'),{timeout:2000});
});
