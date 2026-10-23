import type {Plugin} from 'vite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {documentStore} from './document-server';
export function catalogServerPlugin():Plugin{return {name:'catalog-state',configureServer(server){
 if(process.env.CATALOG_API_URL)return;
 server.middlewares.use('/api',async(request,response,next)=>{
  if(request.method==='GET'&&request.url==='/admin/auth/login'){response.writeHead(302,{Location:'https://sloyui.com/api/admin/auth/login'});response.end();return;}
  if(request.url?.startsWith('/catalog/')){
   response.setHeader('Content-Type','application/json');response.setHeader('Cache-Control','no-store');
   if(request.method==='GET'&&request.url==='/catalog/session'){response.end(JSON.stringify({admin:false}));return;}
   if(request.method==='GET'&&request.url==='/catalog/history'){const history=JSON.parse(await readFile('source/component-history.json','utf8'));const entries=history.kit.map((entry:Record<string,unknown>)=>({...entry,kitVersion:entry.version}));response.end(JSON.stringify({id:'',version:entries[0]?.version??'0.10.0',revision:'local',entries}));return;}
   const historyMatch=request.url?.match(/^\/catalog\/components\/(cp-\d+)\/history$/);
   if(request.method==='GET'&&historyMatch){const history=JSON.parse(await readFile('source/component-history.json','utf8')),record=history.components[historyMatch[1]];if(!record){response.statusCode=404;response.end(JSON.stringify({message:'Компонент не найден'}));return;}const path=`docs/components/${historyMatch[1]}.md`;let instruction;try{instruction=await documentStore(server.config.root).read(path);}catch{instruction={path,content:'',revision:createHash('sha256').update('').digest('hex')};}response.end(JSON.stringify({id:historyMatch[1],version:record.version,revision:'local',entries:record.entries,instruction}));return;}
   if(request.method==='GET'&&request.url==='/catalog/state'){
    const registry=JSON.parse(await readFile('source/component-registry.json','utf8')),settings=JSON.parse(await readFile('source/catalog-settings.json','utf8'));
    const history=JSON.parse(await readFile('source/component-history.json','utf8'));
    response.end(JSON.stringify({componentVersions:Object.fromEntries(Object.entries(history.components as Record<string,{version:string}>).map(([id,record])=>[id,record.version])),revision:createHash('sha256').update(JSON.stringify([registry,settings])).digest('hex'),settings,statuses:Object.fromEntries(Object.values(registry.components as Record<string,{id:string;status:string}>).map(record=>[record.id,record.status]))}));return;
   }
   response.statusCode=503;response.end(JSON.stringify({message:'Админский режим доступен на sloyui.com'}));return;
  }
  next();
 });
}};}
