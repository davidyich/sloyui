import { readFile, realpath, writeFile, rename, unlink, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { documentFiles } from '../demo/document-files';

const limit = 256 * 1024;
export class DocumentError extends Error { constructor(public status:number, message:string){super(message);} }
const revision = (content:string) => createHash('sha256').update(content).digest('hex');
export function documentStore(root:string) {
 const pending = new Map<string,Promise<unknown>>();
 const file = async (path:string) => {
  if (!documentFiles.some(item=>item.path===path)) throw new DocumentError(404,'Документ не найден.');
  const target=resolve(root,path);
  if (await realpath(target)!==target) throw new DocumentError(403,'Ссылки на другие файлы не редактируются.');
  return target;
 };
 const read = async(path:string) => { const content=await readFile(await file(path),'utf8');return {path,content,revision:revision(content)}; };
 const save = (path:string,content:unknown,expected:unknown) => {
  const operation=(pending.get(path)??Promise.resolve()).catch(()=>{}).then(async()=>{
   if(typeof content!=='string'||typeof expected!=='string')throw new DocumentError(400,'Нужны текст и версия документа.');
   if(Buffer.byteLength(content,'utf8')>limit)throw new DocumentError(413,'Документ превышает 256 КБ.');
   const target=await file(path), current=await read(path);
   if(current.revision!==expected)throw new DocumentError(409,'Файл изменён другим редактором. Ваш текст сохранён в черновике; откройте актуальную версию для сравнения.');
   const temp=join(dirname(target),'.'+randomUUID()+'.tmp');
   try {await writeFile(temp,content,{flag:'wx',mode:(await stat(target)).mode});await rename(temp,target);}finally{await unlink(temp).catch(()=>{});}
   return {path,content,revision:revision(content)};
  });
  pending.set(path,operation);void operation.finally(()=>{if(pending.get(path)===operation)pending.delete(path);}).catch(()=>{});return operation;
 };
 return {read,save};
}
export function documentsPlugin():Plugin {
 let root:string;
 return {name:'capacities-documents',configResolved(config){root=config.root;},
  configureServer(server){
   const store=documentStore(root);
   server.middlewares.use('/__docs',async(req,res)=>{
    const send=(status:number,value:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
    try{
     const host=req.headers.host??'';
     if(!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host))throw new DocumentError(403,'Редактор доступен только локально.');
     const url=new URL(req.url??'/',`http://${host}`),path=url.searchParams.get('path');
     if(req.method==='GET'){send(200,path?await store.read(path):{files:documentFiles,writable:true});return;}
     if(req.method!=='PUT'){send(405,{error:'Метод не поддерживается.'});return;}
     if(req.headers.origin!==`http://${host}`||!req.headers['content-type']?.startsWith('application/json'))throw new DocumentError(403,'Сохраняйте документ из локального редактора.');
     let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>limit+4096)throw new DocumentError(413,'Документ превышает 256 КБ.');}
     let data;try{data=JSON.parse(body);}catch{throw new DocumentError(400,'Некорректный запрос.');}
     send(200,await store.save(path??'',data.content,data.revision));
    }catch(error){send(error instanceof DocumentError?error.status:500,{error:error instanceof DocumentError?error.message:'Не удалось прочитать или сохранить файл.'});}
   });
  },
  async generateBundle(){const store=documentStore(root);const files=await Promise.all(documentFiles.map(async item=>({...item,...await store.read(item.path)})));this.emitFile({type:'asset',fileName:'documents.json',source:JSON.stringify({files,writable:false})});},
 };
}
