export function sendJSON(response,status,data){response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(data));}
async function readBody(request){const chunks=[];let size=0;for await(const chunk of request){const buffer=typeof chunk==='string'?Buffer.from(chunk):Buffer.from(chunk);size+=buffer.byteLength;if(size>128*1024+4096)throw Object.assign(new Error('Слишком большой запрос'),{status:413});chunks.push(buffer);}try{const body=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));if(!body||Array.isArray(body)||typeof body!=='object')throw new Error();return body;}catch{throw Object.assign(new Error('Неверный JSON'),{status:400});}}
export function createCatalogHandler({store,identity,origin,publication}){
 return async(request,response)=>{
  try{
   const url=new URL(request.url,origin),path=url.pathname,method=request.method;
   if(!['GET','HEAD'].includes(method)&&request.headers.origin!==origin)return sendJSON(response,403,{message:'Недопустимый источник запроса'});
   if(path.startsWith('/api/admin/auth/'))return await identity.handle(request,response,url);
   if(path==='/api/catalog/publication'&&method==='GET'){if(!identity.session(request.headers))return sendJSON(response,401,{message:'Войдите в админский режим'});if(!publication)return sendJSON(response,404,{message:'Публикация недоступна'});return sendJSON(response,200,await publication.state());}
   if(method==='GET'&&path==='/api/catalog/health'){await store.snapshot();return sendJSON(response,200,{status:'ok',storage:'sqlite',schemaVersion:1});}
   if(method==='GET'&&path==='/api/catalog/state')return sendJSON(response,200,await store.snapshot());
   if(method==='GET'&&path==='/api/catalog/session')return sendJSON(response,200,{admin:!!identity.session(request.headers)});
   const historyMatch=path.match(/^\/api\/catalog\/components\/(cp-\d+)\/(history|instruction)$/);
   if(method==='GET'&&path==='/api/catalog/history')return sendJSON(response,200,store.history(''));
   if(method==='GET'&&historyMatch&&historyMatch[2]==='history')return sendJSON(response,200,await store.componentHistory(historyMatch[1]));
   if(method==='GET'&&path==='/api/catalog/documents')return sendJSON(response,200,url.searchParams.has('path')?await store.readDocument(url.searchParams.get('path')):{files:await store.listDocuments(),writable:!!identity.session(request.headers)});
   if(!['PATCH','PUT','POST','DELETE'].includes(method))return sendJSON(response,404,{message:'Не найдено'});
   if(!identity.session(request.headers))return sendJSON(response,401,{message:'Войдите в админский режим'});
   if(!request.headers['content-type']?.startsWith('application/json'))return sendJSON(response,415,{message:'Требуется JSON'});
   const body=await readBody(request);
   if(path==='/api/catalog/publication'&&method==='POST'){if(!publication)return sendJSON(response,404,{message:'Публикация недоступна'});return sendJSON(response,202,await publication.enqueue(body));}
   if(method==='PATCH'&&path==='/api/catalog/announcement')return sendJSON(response,200,await store.updateAnnouncement(body));
   const statusMatch=path.match(/^\/api\/catalog\/components\/(cp-\d+)$/);
   if(method==='PATCH'&&statusMatch)return sendJSON(response,200,await store.updateStatus(statusMatch[1],body));
   if(method==='PUT'&&path==='/api/catalog/history')return sendJSON(response,200,await store.updateHistory('',body));
   if(method==='PUT'&&historyMatch){const id=historyMatch[1];if(historyMatch[2]==='history'){await store.updateHistory(id,body);return sendJSON(response,200,await store.componentHistory(id));}store.history(id);return sendJSON(response,200,await store.saveDocument(`docs/components/${id}.md`,body));}
   if(path==='/api/catalog/documents'){const document=url.searchParams.get('path')??'';if(method==='PUT')return sendJSON(response,200,await store.saveDocument(document,body));if(method==='POST')return sendJSON(response,201,await store.saveDocument(document,body,true));if(method==='DELETE')return sendJSON(response,200,await store.removeDocument(document,body));}
   return sendJSON(response,404,{message:'Не найдено'});
  }catch(error){if(!error.status)console.error('Catalogue request failed:',error.name);const message=error.status?error.message:'Не удалось выполнить запрос';sendJSON(response,error.status??500,{message,error:message});}
 };
}
