import {mkdtemp,mkdir,writeFile,symlink,realpath,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {afterEach,expect,it,vi} from 'vitest';
// @ts-expect-error Node service modules are checked by runtime integration tests.
import {createCatalogStore} from '../server/catalog-store.mjs';
// @ts-expect-error Node service modules are checked by runtime integration tests.
import {createPublication,publicationState} from '../server/publication.mjs';
// @ts-expect-error Node service modules are checked by runtime integration tests.
import {processPublication} from '../server/publish-worker.mjs';
// @ts-expect-error Node service modules are checked by runtime integration tests.
import {createCatalogHandler} from '../server/catalog-api.mjs';
const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
async function fixture(){
 const base=await mkdtemp(join(tmpdir(),'sloy-publication-'));roots.push(base);
 await mkdir(join(base,'releases'),{recursive:true});await mkdir(join(base,'publication'));
 for(const [pointer,release,directory,version] of [['current','20261009T100000Z-aaaaaaaaaaaa','source','0.11.0'],['develop','20261009T110000Z-bbbbbbbbbbbb','develop-source','0.12.0']]){
  const path=join(base,'releases',release);await mkdir(path);await writeFile(join(path,'release.json'),JSON.stringify({version}));await symlink(path,join(base,pointer));
  const data=join(base,'data',directory);await mkdir(data,{recursive:true});
  await writeFile(join(data,'component-registry.json'),JSON.stringify({statuses:{ready:'Ready'},components:{Button:{id:'cp-001',status:'ready',groups:['actions']}}}));
  await writeFile(join(data,'catalog-settings.json'),JSON.stringify({announcement:{enabled:true,id:version}}));
  const store=await createCatalogStore(data);store.close();
 }
 return {base,publication:createPublication({base,channel:'develop'})};
}
it('requires an owner and same origin and rejects stale or duplicate publication requests',async()=>{
 const {base,publication}=await fixture();const identity={session:(headers:any)=>headers.cookie==='owner'?{}:null};const handler=createCatalogHandler({store:{},identity,origin:'https://sloyui.com',publication});
 async function request(method:string,body?:object,cookie='owner',origin='https://sloyui.com'){
  let status=0,result:any;await handler(Object.assign(Readable.from(body?[JSON.stringify(body)]:[]),{method,url:'/api/catalog/publication',headers:{cookie,origin,'content-type':'application/json'}}),{writeHead:(value:number)=>{status=value;},end:(value:string)=>{result=JSON.parse(value);}});return {status,result};
 }
 expect((await request('GET',undefined,'')).status).toBe(401);
 expect((await request('POST',{},'')).status).toBe(401);
 expect((await request('POST',{},'owner','https://evil.example')).status).toBe(403);
 expect((await request('POST',{revision:'stale'})).status).toBe(409);
 const state=await publicationState(base);expect((await request('POST',{revision:state.revision})).status).toBe(202);
 expect((await request('POST',{revision:state.revision})).status).toBe(409);
 await expect(createPublication({base,channel:'production'}).state()).rejects.toMatchObject({status:404});
});
it('promotes exact develop code and data while retaining the production backup',async()=>{
 const {base,publication}=await fixture(),before=await publication.state();const queued=await publication.enqueue({revision:before.revision});const service=vi.fn();
 const result=await processPublication(base,{service,health:async()=>{}});
 expect(result).toMatchObject({id:queued.id,status:'published'});expect(service.mock.calls.map(call=>call[0])).toEqual(['stop','restart']);
 expect(await realpath(join(base,'current'))).toBe(await realpath(join(base,'develop')));
 const after=await publicationState(base);expect(after.productionData).toBe(after.developData);
 expect(await readFile(join(base,'backups',`publish-${queued.id}.source/catalog-settings.json`),'utf8')).toContain('0.11.0');
});
it('rejects edits after confirmation and rolls back code and data when health fails',async()=>{
 const {base,publication}=await fixture(),before=await publication.state();await publication.enqueue({revision:before.revision});
 const store=await createCatalogStore(join(base,'data/develop-source'));const snapshot=await store.snapshot();await store.updateAnnouncement({revision:snapshot.revision,message:'changed'});store.close();
 const stale=await processPublication(base,{service:vi.fn(),health:async()=>{}});expect(stale.status).toBe('failed');expect(await realpath(join(base,'current'))).toContain(before.production.release);
 const next=await publication.state();await publication.enqueue({revision:next.revision});
 const failed=await processPublication(base,{service:vi.fn(),health:async()=>{throw Error('API unhealthy');}});expect(failed.status).toBe('failed');
 const restored=await publicationState(base);expect(restored.production).toEqual(before.production);expect(restored.productionData).toBe(before.productionData);
});
