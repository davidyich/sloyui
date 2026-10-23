import {render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import Documents from '../demo/Documents';
import {CatalogAdminProvider} from '../demo/CatalogAdmin';
import {documentLanguage} from '../demo/document-files';
afterEach(()=>vi.unstubAllGlobals());
function documentFetch(admin:boolean){
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,json:async()=>url.endsWith('/session')?{admin}:url.includes('?path=')?{path:'AGENTS.md',content:'# Instructions\nUse the existing system and keep the rules.',revision:'one'}:{files:[{path:'AGENTS.md',label:'AGENTS.md',protected:true,language:'EN'}]}})));
}
it('shows file language but removes editing and saved-draft actions for guests',async()=>{
 documentFetch(false);sessionStorage.setItem('cap-document-draft:AGENTS.md','private draft');
 render(<CatalogAdminProvider notify={()=>{}}><Documents/></CatalogAdminProvider>);
 await screen.findByRole('heading',{name:'Instructions'});
 expect(screen.getByText('EN')).toBeVisible();
 expect(screen.queryByRole('button',{name:'Редактировать'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Восстановить'})).toBeNull();
 sessionStorage.removeItem('cap-document-draft:AGENTS.md');
});
it('retains local editing for an authenticated owner',async()=>{
 documentFetch(true);render(<CatalogAdminProvider notify={()=>{}}><Documents/></CatalogAdminProvider>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Редактировать'})).toBeEnabled());
});
it('marks prose language without treating English code examples as translated prose',()=>{
 expect(documentLanguage('# Правила\nИспользуйте компоненты для форм и сохраняйте общий контекст.\n```tsx\nconst example = the.and.with.use;\n```')).toBe('RU');
 expect(documentLanguage('# Instructions\nUse the system and keep the rules.')).toBe('EN');
 expect(documentLanguage('# Правила\nИспользуйте компоненты для форм.\nUse the system and keep the rules.')).toBe('RU/EN');
});
