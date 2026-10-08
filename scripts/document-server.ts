import { readFile, realpath, writeFile, rename, unlink, stat, mkdir, readdir, lstat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { documentFiles, type DocumentFile } from '../demo/document-files';

const limit = 256 * 1024;
export class DocumentError extends Error { constructor(public status:number, message:string){super(message);} }
const revision = (content:string) => createHash('sha256').update(content).digest('hex');
/** Decode only after complete UTF-8 byte sequences are collected; HTTP chunks can split any character. */
export async function readDocumentBody(request: AsyncIterable<Uint8Array | string>): Promise<string> {
 const chunks: Buffer[] = [];
 let bytes = 0;
 for await (const chunk of request) {
  const buffer = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : Buffer.from(chunk);
  bytes += buffer.byteLength;
  if (bytes > limit + 4096) throw new DocumentError(413, 'Document exceeds 256 KB.');
  chunks.push(buffer);
 }
 return Buffer.concat(chunks, bytes).toString('utf8');
}

export function documentStore(root:string) {
 const pending = new Map<string,Promise<unknown>>();
 const custom = (path:string) => /^docs\/instructions\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.md$/.test(path);
 const folder = async () => {
  const target=resolve(root,'docs/instructions');
  const parent=resolve(root,'docs');
  if(await realpath(parent)!==parent)throw new DocumentError(403,'Instruction parent cannot be a symbolic link.');
  await mkdir(target,{recursive:true});
  if(await realpath(target)!==target)throw new DocumentError(403,'Instruction directory cannot be a symbolic link.');
  return target;
 };
 const list = async ():Promise<DocumentFile[]> => {
  const directory=await folder(), names=await readdir(directory);
  const extra:DocumentFile[]=[];
  for(const name of names.sort()) {const path='docs/instructions/'+name;if(custom(path)&&(await lstat(join(directory,name))).isFile())extra.push({path,label:name,protected:false});}
  return [...documentFiles,...extra];
 };
 const file = async (path:string) => {
  if (!documentFiles.some(item=>item.path===path)&&!custom(path)) throw new DocumentError(404,'Document not found.');
  if(custom(path))await folder();
  const target=resolve(root,path);
  if (await realpath(target)!==target) throw new DocumentError(403,'Symbolic links cannot be edited.');
  return target;
 };
 const read = async(path:string) => { const content=await readFile(await file(path),'utf8');return {path,content,revision:revision(content)}; };
 const save = (path:string,content:unknown,expected:unknown) => {
  const operation=(pending.get(path)??Promise.resolve()).catch(()=>{}).then(async()=>{
   if(typeof content!=='string'||typeof expected!=='string')throw new DocumentError(400,'Document text and revision are required.');
   if(Buffer.byteLength(content,'utf8')>limit)throw new DocumentError(413,'Document exceeds 256 KB.');
   const target=await file(path), current=await read(path);
   if(current.revision!==expected)throw new DocumentError(409,'The file changed in another editor. Your draft is preserved; compare the current version.');
   const temp=join(dirname(target),'.'+randomUUID()+'.tmp');
   try {await writeFile(temp,content,{flag:'wx',mode:(await stat(target)).mode});await rename(temp,target);}finally{await unlink(temp).catch(()=>{});}
   return {path,content,revision:revision(content)};
  });
  pending.set(path,operation);void operation.finally(()=>{if(pending.get(path)===operation)pending.delete(path);}).catch(()=>{});return operation;
 };
 const create = async(path:string,content:unknown) => {
  if(!custom(path))throw new DocumentError(400,'Use a filename with letters, numbers, hyphens or underscores, ending in .md.');
  if(typeof content!=='string')throw new DocumentError(400,'Document content must be text.');
  if(Buffer.byteLength(content)>limit)throw new DocumentError(413,'Document exceeds 256 KB.');
  const directory=await folder(),target=join(directory,path.split('/').at(-1)!);
  try{await writeFile(target,content,{flag:'wx'});}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw new DocumentError(409,'A file with this name already exists.');throw error;}
  return read(path);
 };
 const remove = (path:string,expected:unknown) => {
  const operation=(pending.get(path)??Promise.resolve()).catch(()=>{}).then(async()=>{
   if(!custom(path))throw new DocumentError(403,'Core instructions cannot be deleted.');
   const current=await read(path);
   if(typeof expected!=='string'||current.revision!==expected)throw new DocumentError(409,'The file changed. Read the current version before deleting.');
   await unlink(await file(path));return {path};
  });
  pending.set(path,operation);void operation.finally(()=>{if(pending.get(path)===operation)pending.delete(path);}).catch(()=>{});return operation;
 };
 return {read,save,list,create,remove};
}
export function documentsPlugin():Plugin {
 let root:string;
 return {name:'sloy-documents',configResolved(config){root=config.root;},
  configureServer(server){
   const store=documentStore(root);
   server.middlewares.use('/__docs',async(req,res)=>{
    const send=(status:number,value:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
    try{
     const host=req.headers.host??'';
     if(!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host))throw new DocumentError(403,'The editor is only available locally.');
     const url=new URL(req.url??'/',`http://${host}`),path=url.searchParams.get('path');
     if(req.method==='GET'){send(200,path?await store.read(path):{files:await store.list(),writable:true});return;}
     if(!['PUT','POST','DELETE'].includes(req.method??'')){send(405,{error:'Method not supported.'});return;}
     if(req.headers.origin!==`http://${host}`||!req.headers['content-type']?.startsWith('application/json'))throw new DocumentError(403,'Use the local editor to save documents.');
     const body = await readDocumentBody(req);
     let data;try{data=JSON.parse(body);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();}catch{throw new DocumentError(400,'Invalid request.');}
     send(req.method==='POST'?201:200,req.method==='POST'?await store.create(path??'',data.content):req.method==='DELETE'?await store.remove(path??'',data.revision):await store.save(path??'',data.content,data.revision));
    }catch(error){send(error instanceof DocumentError?error.status:(error as NodeJS.ErrnoException).code==='ENOENT'?404:500,{error:error instanceof DocumentError?error.message:'Could not read or save the file.'});}
   });
  },
  async generateBundle(){const store=documentStore(root);const files=await Promise.all(documentFiles.map(async item=>({...item,...await store.read(item.path)})));this.emitFile({type:'asset',fileName:'documents.json',source:JSON.stringify({files,writable:false})});},
 };
}
