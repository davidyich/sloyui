import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,realpath,writeFile,mkdir,link,unlink} from 'node:fs/promises';
import {join,basename,dirname} from 'node:path';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function databaseRevision(directory){
 const db=new DatabaseSync(join(directory,'catalog.sqlite'),{readOnly:true});
 try{db.exec('BEGIN');const tables=db.prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();return hash(tables.map(({name,sql})=>({name,sql,rows:db.prepare(`SELECT * FROM "${name.replaceAll('"','""')}" ORDER BY rowid`).all()})));}finally{db.close();}
}
export async function publicationState(base){
 const releases=await realpath(join(base,'releases'));
 async function release(pointer){const path=await realpath(join(base,pointer));if(dirname(path)!==releases||!/^\d{8}T\d{6}Z-[a-f0-9]{12}$/.test(basename(path)))fail(503,'Версия сайта недоступна');const metadata=JSON.parse(await readFile(join(path,'release.json'),'utf8'));return {release:basename(path),version:metadata.version};}
 const production=await release('current'),develop=await release('develop');
 const productionData=databaseRevision(join(base,'data/source')),developData=databaseRevision(join(base,'data/develop-source'));
 let result;try{result=JSON.parse(await readFile(join(base,'publication/result.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 return {production,develop,productionData,developData,revision:hash([production,develop,productionData,developData]),canPublish:production.release!==develop.release||productionData!==developData,result};
}
export function createPublication({base='/srv/sloyui',channel='production'}={}){
 return {async state(){if(channel!=='develop')fail(404,'Публикация доступна в Develop');return publicationState(base);},async enqueue(body){
  const state=await this.state();if(body.revision!==state.revision)fail(409,'Версии изменились. Закройте подтверждение и проверьте Develop заново.');if(!state.canPublish)fail(409,'Основной сайт уже соответствует Develop.');
  const id=randomUUID(),directory=join(base,'publication');await mkdir(directory,{recursive:true,mode:0o700});
  const temporary=join(directory,`${id}.json`);
  try{await writeFile(temporary,JSON.stringify({id,revision:state.revision,created:new Date().toISOString()}),{flag:'wx',mode:0o600});await link(temporary,join(directory,'request.json'));}catch(error){if(error.code==='EEXIST')fail(409,'Публикация уже выполняется.');throw error;}finally{await unlink(temporary).catch(()=>{});}
  return {id,status:'queued'};
 }};
}
