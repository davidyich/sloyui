import {readFile,writeFile,rename,symlink,unlink,cp,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {publicationState} from './publication.mjs';
const service=action=>execFileSync('sudo',['-n','systemctl',action,'sloyui-admin','sloyui-develop'],{stdio:'inherit'});
async function health(){
 for(const port of [4318,4319]){let healthy=false;for(let attempt=0;attempt<20;attempt++){try{const response=await fetch(`http://127.0.0.1:${port}/api/catalog/health`,{signal:AbortSignal.timeout(2000)});if(response.ok){healthy=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}if(!healthy)throw Error('Новая версия не прошла проверку API.');}
}
export async function processPublication(base,adapters={service,health}){
 const {service,health}=adapters;
 const directory=join(base,'publication'),requestPath=join(directory,'request.json');
 let request;try{request=JSON.parse(await readFile(requestPath,'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
 if(!/^[a-f0-9-]{36}$/.test(request.id)||!/^[a-f0-9]{64}$/.test(request.revision))throw Error('Invalid publication request');
 const id=`publish-${request.id}`,backup=join(base,'backups',id),data=join(base,'data/source'),incoming=join(base,'data',`${id}.source`);
 let previous,backedUp=false,switched=false,stopped=false;
 const point=async(target)=>{const next=join(base,'current.publish-next');await unlink(next).catch(error=>{if(error.code!=='ENOENT')throw error;});await symlink(target,next);await rename(next,join(base,'current'));};
 let result;
 try{
  const before=await publicationState(base);if(before.revision!==request.revision)throw Error('Версии изменились. Публикация отменена.');
  stopped=true;service('stop');
  const state=await publicationState(base);if(state.revision!==request.revision)throw Error('Данные изменились. Публикация отменена.');
  previous=join(base,'releases',state.production.release);
  await mkdir(join(base,'backups'),{recursive:true});
  await writeFile(`${backup}.json`,JSON.stringify({previous,develop:state.develop,revision:state.revision}),{mode:0o600});
  await cp(join(base,'data/develop-source'),incoming,{recursive:true,errorOnExist:true,force:false});
  await rename(data,`${backup}.source`);backedUp=true;await rename(incoming,data);
  await point(join(base,'releases',state.develop.release));switched=true;
  service('restart');
  await health();
  result={id:request.id,status:'published',release:state.develop.release,finished:new Date().toISOString()};
 }catch(error){
  if(backedUp){service('stop');await rename(data,`${backup}.failed-source`).catch(failure=>{if(failure.code!=='ENOENT')throw failure;});await rename(`${backup}.source`,data);}
  if(switched)await point(previous);
  if(stopped)service('restart');
  result={id:request.id,status:'failed',message:error.message,finished:new Date().toISOString()};
 }
 await writeFile(join(directory,'result.next.json'),JSON.stringify(result),{mode:0o600});await rename(join(directory,'result.next.json'),join(directory,'result.json'));await unlink(requestPath);
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const base=process.env.SLOY_BASE??'/srv/sloyui';
 if(process.argv.includes('--locked'))await processPublication(base);
 else execFileSync('flock',['-w','60',join(base,'.release.lock'),process.execPath,fileURLToPath(import.meta.url),'--locked'],{stdio:'inherit'});
}
