import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Readable} from 'node:stream';
import {afterEach,expect,it} from 'vitest';
// The deployed Node service has no browser bundle dependencies.
// @ts-expect-error JavaScript service is validated at runtime.
import {createCatalogStore} from '../server/catalog-store.mjs';
// @ts-expect-error JavaScript service is validated at runtime.
import {createCatalogHandler} from '../server/catalog-api.mjs';
const directories:string[]=[];
afterEach(async()=>{await Promise.all(directories.splice(0).map(directory=>rm(directory,{recursive:true,force:true})));});
async function fixture(){
 const directory=await mkdtemp(join(tmpdir(),'sloy-admin-'));directories.push(directory);
 await writeFile(join(directory,'component-registry.json'),JSON.stringify({statuses:{ready:'Ready',archived:'Archive'},components:{Button:{id:'cp-001',status:'ready',groups:['actions']}}}));
 await writeFile(join(directory,'catalog-settings.json'),JSON.stringify({announcement:{enabled:true,id:'news'}}));
 const store=await createCatalogStore(directory),handler=createCatalogHandler({store,origin:'https://sloyui.com',identity:{session:(headers:Record<string,string>)=>headers.cookie==='owner'?{subject:'owner'}:null}});
 async function request(path:string,body?:object,cookie='owner',origin='https://sloyui.com'){
  const request=Object.assign(Readable.from(body?[JSON.stringify(body)]:[]),{url:path,method:body?'PATCH':'GET',headers:{cookie,origin,'content-type':'application/json'}});
  let status=0,result:any;await handler(request,{writeHead:(code:number)=>{status=code;},end:(data:string)=>{result=JSON.parse(data);}});return {status,result};
 }
 return {directory,store,request};
}
it('blocks anonymous and cross-origin mutations and rejects stale edits',async()=>{
 const {store,request}=await fixture(),{revision}=await store.snapshot();
 expect((await request('/api/catalog/components/cp-001',{revision,status:'archived'},'')).status).toBe(401);
 expect((await request('/api/catalog/components/cp-001',{revision,status:'archived'},'owner','https://other.example')).status).toBe(403);
 expect((await request('/api/catalog/components/cp-001',{revision:'stale',status:'archived'})).status).toBe(409);
 expect((await store.snapshot()).statuses['cp-001']).toBe('ready');
});
it('persists status by stable ID, preserves memberships and saves the announcement setting',async()=>{
 const {store,request,directory}=await fixture();let state=await store.snapshot();
 const updated=await request('/api/catalog/components/cp-001',{revision:state.revision,status:'archived'});expect(updated.status).toBe(200);state=updated.result;
 const registry=JSON.parse(await readFile(join(directory,'component-registry.json'),'utf8'));expect(registry.components.Button).toEqual({id:'cp-001',status:'archived',groups:['actions']});
 expect((await request('/api/catalog/announcement',{revision:state.revision,enabled:false})).status).toBe(200);
 const restarted=await createCatalogStore(directory);expect((await restarted.snapshot()).settings.announcement.enabled).toBe(false);expect((await restarted.snapshot()).statuses['cp-001']).toBe('archived');
});
it('serializes concurrent edits and validates component, status and boolean inputs',async()=>{
 const {store,request}=await fixture(),{revision}=await store.snapshot();
 expect((await request('/api/catalog/components/cp-999',{revision,status:'ready'})).status).toBe(400);
 expect((await request('/api/catalog/components/cp-001',{revision,status:'invalid'})).status).toBe(400);
 expect((await request('/api/catalog/components/cp-001',{revision,status:['ready']})).status).toBe(400);
 expect((await request('/api/catalog/components/cp-001',{revision,status:{toString:'ready'}})).status).toBe(400);
 expect((await request('/api/catalog/announcement',{revision,enabled:'false'})).status).toBe(400);
 const responses=await Promise.all([request('/api/catalog/announcement',{revision,enabled:false}),request('/api/catalog/components/cp-001',{revision,status:'archived'})]);expect(responses.map(response=>response.status).sort()).toEqual([200,409]);
});
it('saves editable announcement fields atomically and retains them after restart',async()=>{
 const {store,request,directory}=await fixture(),{revision}=await store.snapshot();
 const fields={message:'New [Code Block]',actionLabel:'Read more',href:'https://example.com/updates'};
 const saved=await request('/api/catalog/announcement',{revision,...fields});expect(saved.status).toBe(200);
 expect((await (await createCatalogStore(directory)).snapshot()).settings.announcement).toEqual({enabled:true,id:'news',...fields});
 expect((await request('/api/catalog/announcement',{revision,...fields,message:'Stale edit'})).status).toBe(409);
});
it('rejects invalid message and link edits without partially changing the announcement',async()=>{
 const {store,request}=await fixture(),initial=await store.snapshot();
 for(const fields of [{message:''},{message:'x'.repeat(1601)},{actionLabel:' '},{href:'javascript:alert(1)'},{href:'//other.example'},{href:'/\\other.example'},{href:'https://owner:password@example.com'},{id:'changed'}]){
  expect((await request('/api/catalog/announcement',{revision:initial.revision,enabled:false,...fields})).status).toBe(400);
  expect((await store.snapshot()).settings).toEqual(initial.settings);
 }
 expect((await request('/api/catalog/announcement',{revision:initial.revision})).status).toBe(400);
});
it('preserves edited message, action and visibility across a deployment source sync',async()=>{
 const {directory,store,request}=await fixture();
 const baseline=JSON.parse(await readFile(join(directory,'catalog-settings.json'),'utf8'));
 await writeFile(join(directory,'baseline-settings.json'),JSON.stringify(baseline));
 await writeFile(join(directory,'baseline-registry.json'),await readFile(join(directory,'component-registry.json')));
 const {revision}=await store.snapshot();const fields={enabled:false,message:'Owner [message]',actionLabel:'Open',href:'#overview'};
 expect((await request('/api/catalog/announcement',{revision,...fields})).status).toBe(200);
 const incoming=await mkdtemp(join(tmpdir(),'sloy-incoming-'));directories.push(incoming);
 await writeFile(join(incoming,'component-registry.json'),await readFile(join(directory,'component-registry.json')));
 await writeFile(join(incoming,'catalog-settings.json'),JSON.stringify({announcement:{enabled:true,id:'new-release',message:'Incoming',actionLabel:'View',href:'#changelog'}}));
 execFileSync(process.execPath,[resolve('server/sync-catalog.mjs'),incoming,directory]);
 const updated=(await store.snapshot()).settings.announcement;expect(updated).toEqual({id:'new-release',...fields});
});
