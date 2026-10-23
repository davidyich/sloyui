import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join,dirname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
export async function atomicJSON(path,value){const temporary=`${path}.${randomUUID()}.tmp`;try{await writeFile(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(temporary,path);}finally{await unlink(temporary).catch(()=>{});}}
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const documentLimit=128*1024;
const customDocument=path=>/^docs\/instructions\/[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.md$/.test(path);
const componentDocument=path=>/^docs\/components\/cp-\d+\.md$/.test(path);
const compareVersion=(a,b)=>{const [leftCore,leftPre]=a.split('-',2),[rightCore,rightPre]=b.split('-',2),left=leftCore.split('.').map(Number),right=rightCore.split('.').map(Number);const core=left[0]-right[0]||left[1]-right[1]||left[2]-right[2];if(core)return core;if(leftPre===rightPre)return 0;if(leftPre===undefined)return 1;if(rightPre===undefined)return -1;const l=leftPre.split('.'),r=rightPre.split('.');for(let index=0;index<Math.max(l.length,r.length);index++){if(l[index]===undefined)return -1;if(r[index]===undefined)return 1;if(l[index]===r[index])continue;const ln=/^\d+$/.test(l[index]),rn=/^\d+$/.test(r[index]);return ln&&rn?Number(l[index])-Number(r[index]):ln?-1:rn?1:l[index].localeCompare(r[index]);}return 0;};
const semver=value=>typeof value==='string'&&/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(value)&&value.length<=48;
export function documentLanguage(content){const prose=content.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`]*`|https?:\/\/\S+|[\w/-]+\.(?:md|txt|json|tsx?|css|mjs)\b/g,' ');const russian=(prose.match(/[а-яё]{2,}/gi)??[]).length>=3,english=(prose.match(/\b(?:the|and|with|use|for|from|to|only|keep|when|this|before|after|not|is|are)\b/gi)??[]).length>=3;return russian?english?'RU/EN':'RU':'EN';}
async function optionalJSON(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;return null;}}
/** Small synchronous statements only; network/filesystem work never runs inside a SQL transaction. */
export async function createCatalogStore(directory,{importSources=false}={}){
 await mkdir(directory,{recursive:true,mode:0o700});
 const registryPath=join(directory,'component-registry.json'),settingsPath=join(directory,'catalog-settings.json'),mirror=join(directory,'documents');
 const registry=await optionalJSON(registryPath),settings=await optionalJSON(settingsPath);
 if(!registry||!settings)throw new Error('Missing catalogue source');
 const db=new DatabaseSync(join(directory,'catalog.sqlite'));
 if(Number(db.prepare('PRAGMA user_version').get().user_version)>1){db.close();throw new Error('Catalogue database is newer than this server');}
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
 CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS component_status (id TEXT PRIMARY KEY,status TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS documents (path TEXT PRIMARY KEY,label TEXT NOT NULL,protected INTEGER NOT NULL,content TEXT NOT NULL,revision TEXT NOT NULL,language TEXT NOT NULL,baseline TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS document_revisions (id INTEGER PRIMARY KEY,path TEXT NOT NULL,revision TEXT NOT NULL,content TEXT NOT NULL,created TEXT NOT NULL) STRICT;
 CREATE INDEX IF NOT EXISTS document_revisions_path ON document_revisions(path,id DESC);
 CREATE TABLE IF NOT EXISTS releases (component_id TEXT NOT NULL,version TEXT NOT NULL,kit_version TEXT NOT NULL,date TEXT NOT NULL,summary TEXT NOT NULL,baseline TEXT NOT NULL,PRIMARY KEY(component_id,version)) STRICT;
 CREATE INDEX IF NOT EXISTS releases_component_date ON releases(component_id,date DESC,version DESC);
 CREATE TABLE IF NOT EXISTS component_versions (id TEXT PRIMARY KEY,version TEXT NOT NULL) STRICT;
 PRAGMA user_version=1;`);
 const statements=new Map();const statement=sql=>{let value=statements.get(sql);if(!value){value=db.prepare(sql);statements.set(sql,value);}return value;};
 const getMeta=key=>statement('SELECT value FROM metadata WHERE key=?').get(key)?.value;
 const setMeta=(key,value)=>statement('INSERT INTO metadata VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);
 const componentIDs=new Set(Object.values(registry.components).map(record=>record.id));
 const component=id=>componentIDs.has(id)||fail(404,'Компонент не найден');
 const sourceSignature=hash([registry,settings]);
 // JSON is the deployment merge/rollback source. Changes made by the owner are mirrored there.
 if(!getMeta('settings')||importSources){
  db.exec('BEGIN IMMEDIATE');try{for(const record of Object.values(registry.components))statement('INSERT INTO component_status VALUES(?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status').run(record.id,record.status);setMeta('settings',JSON.stringify(settings));setMeta('source-signature',sourceSignature);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');db.close();throw error;}
 }
 else{
  const persisted=JSON.parse(getMeta('settings')),statuses=new Map(statement('SELECT id,status FROM component_status').all().map(row=>[row.id,row.status]));
  for(const record of Object.values(registry.components)){if(statuses.has(record.id))record.status=statuses.get(record.id);}
  const signature=hash([registry,persisted]);if(signature!==sourceSignature){await atomicJSON(registryPath,registry);await atomicJSON(settingsPath,persisted);}setMeta('source-signature',signature);
 }
 const sourceHistory=await optionalJSON(join(directory,'component-history.json'));
 function importRelease(id,entry){
  if(!semver(entry.version)||!semver(entry.kitVersion??entry.version)||typeof entry.summary!=='string')throw new Error('Invalid release seed');
  const seed={version:entry.version,kitVersion:entry.kitVersion??entry.version,date:entry.date,summary:entry.summary};const baseline=hash(seed),previous=statement('SELECT * FROM releases WHERE component_id=? AND version=?').get(id,entry.version);
  if(!previous||hash({version:previous.version,kitVersion:previous.kit_version,date:previous.date,summary:previous.summary})===previous.baseline)statement('INSERT INTO releases VALUES(?,?,?,?,?,?) ON CONFLICT(component_id,version) DO UPDATE SET kit_version=excluded.kit_version,date=excluded.date,summary=excluded.summary,baseline=excluded.baseline').run(id,seed.version,seed.kitVersion,seed.date,seed.summary,baseline);
 }
 if(sourceHistory){db.exec('BEGIN IMMEDIATE');try{for(const entry of sourceHistory.kit??[])importRelease('',entry);for(const [id,record] of Object.entries(sourceHistory.components??{})){if(!componentIDs.has(id))continue;if(!semver(record.version))throw new Error('Invalid component version seed');for(const entry of record.entries??[])importRelease(id,entry);const previousVersion=statement('SELECT version FROM component_versions WHERE id=?').get(id)?.version;if(!previousVersion||compareVersion(record.version,previousVersion)>0)statement('INSERT INTO component_versions VALUES(?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version').run(id,record.version);setMeta('version-seed:'+id,record.version);}db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');db.close();throw error;}}
 async function mirrorDocument(path,content){const target=join(mirror,path);await mkdir(dirname(target),{recursive:true,mode:0o700});const temporary=`${target}.${randomUUID()}.tmp`;try{await writeFile(temporary,content,{mode:0o600});await rename(temporary,target);}finally{await unlink(temporary).catch(()=>{});}}
 const documentSeed=await optionalJSON(join(directory,'documents-seed.json'));
 if(documentSeed){for(const file of documentSeed.files??[]){if(getMeta('deleted-document:'+file.path))continue;const content=file.content,baseline=hash(content),previous=statement('SELECT * FROM documents WHERE path=?').get(file.path);if(!previous||previous.revision===previous.baseline){statement('INSERT INTO documents VALUES(?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET label=excluded.label,protected=excluded.protected,content=excluded.content,revision=excluded.revision,language=excluded.language,baseline=excluded.baseline').run(file.path,file.label,Number(file.protected),content,baseline,documentLanguage(content),baseline);await mirrorDocument(file.path,content);}}}
 // Reconcile mirrors from committed SQL after an interrupted document save.
 for(const row of statement('SELECT path,content FROM documents').all())await mirrorDocument(row.path,row.content);
 const allStatuses=()=>Object.fromEntries(statement('SELECT id,status FROM component_status').all().filter(row=>componentIDs.has(row.id)).map(row=>[row.id,row.status]));
 const snapshot=async()=>{const currentSettings=JSON.parse(getMeta('settings')),statuses=allStatuses(),componentVersions=Object.fromEntries(statement('SELECT id,version FROM component_versions').all().filter(row=>componentIDs.has(row.id)).map(row=>[row.id,row.version]));return {revision:hash([statuses,currentSettings]),settings:currentSettings,statuses,componentVersions};};
 let pending=Promise.resolve();const serialize=operation=>{const job=pending.then(operation);pending=job.catch(()=>{});return job;};
 const mutate=(body,operation)=>serialize(async()=>{const current=await snapshot();if(body.revision!==current.revision)fail(409,'Каталог изменился. Обновите страницу и повторите.');await operation(current);return snapshot();});
 const history=id=>{if(id)component(id);const entries=statement('SELECT version,kit_version,date,summary FROM releases WHERE component_id=? ORDER BY date DESC,version DESC LIMIT 100').all(id).map(row=>({version:row.version,kitVersion:row.kit_version,date:row.date,summary:row.summary})).sort((a,b)=>b.date.localeCompare(a.date)||compareVersion(b.version,a.version));const version=id?statement('SELECT version FROM component_versions WHERE id=?').get(id)?.version??'0.10.0':entries[0]?.version??'0.10.0';return {id,version,revision:hash([version,entries]),entries};};
 const readDocument=async path=>{const row=statement('SELECT * FROM documents WHERE path=?').get(path);if(!row)fail(404,'Document not found.');return {path:row.path,content:row.content,revision:row.revision};};
 const listDocuments=async()=>statement('SELECT path,label,protected,language FROM documents WHERE path NOT LIKE \'docs/components/%\' ORDER BY rowid').all().map(row=>({...row,protected:!!row.protected}));
 const saveDocument=(path,body,create=false)=>serialize(async()=>{
  if(typeof path!=='string'||(!customDocument(path)&&!componentDocument(path)&&!statement('SELECT path FROM documents WHERE path=?').get(path)))fail(404,'Document not found.');
  if(typeof body.content!=='string')fail(400,'Document content must be text.');if(Buffer.byteLength(body.content)>documentLimit)fail(413,'Document exceeds 128 KB.');
  if(componentDocument(path))component(path.match(/cp-\d+/)[0]);
  const previous=statement('SELECT * FROM documents WHERE path=?').get(path);
  if(create&&(!customDocument(path)||previous))fail(previous?409:400,previous?'A file with this name already exists.':'Use a filename with letters, numbers, hyphens or underscores, ending in .md.');
  if(!create&&body.revision!==(previous?.revision??hash('')))fail(409,'The file changed in another editor. Your draft is preserved; compare the current version.');
  const revision=hash(body.content),row={path,content:body.content,revision};
  await mirrorDocument(path,body.content);
  let transaction=false;try{db.exec('BEGIN IMMEDIATE');transaction=true;if(create)setMeta('deleted-document:'+path,'');if(previous)statement('INSERT INTO document_revisions(path,revision,content,created) VALUES(?,?,?,?)').run(path,previous.revision,previous.content,new Date().toISOString());statement('INSERT INTO documents VALUES(?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET content=excluded.content,revision=excluded.revision,language=excluded.language').run(path,previous?.label??path.split('/').at(-1),previous?.protected??Number(componentDocument(path)),body.content,revision,documentLanguage(body.content),previous?.baseline??hash(''));statement('DELETE FROM document_revisions WHERE path=? AND id NOT IN(SELECT id FROM document_revisions WHERE path=? ORDER BY id DESC LIMIT 20)').run(path,path);db.exec('COMMIT');transaction=false;}catch(error){if(transaction)db.exec('ROLLBACK');if(previous)await mirrorDocument(path,previous.content);else await unlink(join(mirror,path)).catch(()=>{});throw error;}
  return row;
 });
 const removeDocument=(path,body)=>serialize(async()=>{if(!customDocument(path))fail(403,'Core instructions cannot be deleted.');const row=await readDocument(path);if(body.revision!==row.revision)fail(409,'The file changed. Read the current version before deleting.');await unlink(join(mirror,path)).catch(error=>{if(error.code!=='ENOENT')throw error;});let transaction=false;try{db.exec('BEGIN IMMEDIATE');transaction=true;statement('DELETE FROM documents WHERE path=?').run(path);setMeta('deleted-document:'+path,'1');db.exec('COMMIT');transaction=false;}catch(error){if(transaction)db.exec('ROLLBACK');await mirrorDocument(path,row.content);throw error;}return {path};});
 const updateHistory=(id,body)=>serialize(async()=>{
  const current=history(id);if(body.revision!==current.revision)fail(409,'История изменилась. Загрузите актуальную версию; черновик сохранён.');
  if(!semver(body.version)||!semver(body.kitVersion??body.version)||typeof body.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.date)||Number.isNaN(Date.parse(body.date))||new Date(body.date).toISOString().slice(0,10)!==body.date||typeof body.summary!=='string'||!body.summary.trim()||body.summary.length>12000)fail(400,'Укажите версию, дату и описание изменений (до 12000 символов).');
  const kitVersion=id?body.kitVersion:body.version;if(id&&!statement('SELECT version FROM releases WHERE component_id=\'\' AND version=?').get(kitVersion))fail(400,'Сначала создайте версию всего кита.');
  db.exec('BEGIN IMMEDIATE');try{statement('INSERT INTO releases VALUES(?,?,?,?,?,?) ON CONFLICT(component_id,version) DO UPDATE SET kit_version=excluded.kit_version,date=excluded.date,summary=excluded.summary').run(id,body.version,kitVersion,body.date,body.summary.trim(),hash('owner'));if(id&&compareVersion(body.version,current.version)>=0)statement('INSERT INTO component_versions VALUES(?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version').run(id,body.version);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  return history(id);
 });
 return {snapshot,history,updateHistory,readDocument,listDocuments,saveDocument,removeDocument,
  async componentHistory(id){const value=history(id),path=`docs/components/${id}.md`;let instruction;try{instruction=await readDocument(path);}catch(error){if(error.status!==404)throw error;instruction={path,content:'',revision:hash('')};}return {...value,instruction};},
  updateStatus:(id,body)=>mutate(body,async(current)=>{
   const next=structuredClone(registry);for(const record of Object.values(next.components))record.status=current.statuses[record.id]??record.status;const record=Object.values(next.components).find(record=>record.id===id);if(!record||typeof body.status!=='string'||!Object.hasOwn(registry.statuses,body.status))fail(400,'Неверный компонент или статус');record.status=body.status;
   const previousSignature=getMeta('source-signature');db.exec('BEGIN IMMEDIATE');try{statement('UPDATE component_status SET status=? WHERE id=?').run(body.status,id);setMeta('source-signature',hash([next,current.settings]));db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
   try{await atomicJSON(registryPath,next);}catch(error){db.exec('BEGIN IMMEDIATE');try{statement('UPDATE component_status SET status=? WHERE id=?').run(current.statuses[id],id);setMeta('source-signature',previousSignature);db.exec('COMMIT');}catch(rollbackError){db.exec('ROLLBACK');throw rollbackError;}throw error;}registry.components=next.components;
  }),
  updateAnnouncement:body=>mutate(body,async({settings:currentSettings})=>{
   const fields=['enabled','message','actionLabel','href'],changes={};const invalid=message=>fail(400,message);
   if(Object.keys(body).some(key=>key!=='revision'&&!fields.includes(key)))invalid('Неизвестное поле объявления');
   if(Object.hasOwn(body,'enabled')){if(typeof body.enabled!=='boolean')invalid('Неверное значение Announce Bar');changes.enabled=body.enabled;}
   for(const [field,limit,label] of [['message',1600,'Текст анонса'],['actionLabel',64,'Название кнопки'],['href',2048,'Ссылка кнопки']]){if(!Object.hasOwn(body,field))continue;if(typeof body[field]!=='string'||!body[field].trim()||body[field].length>limit)invalid(`${label}: заполните поле, максимум ${limit} символов`);changes[field]=body[field].trim();}
   if(changes.href){const href=changes.href;if(/[\s\u0000-\u001f\u007f\\]/.test(href))invalid('Ссылка должна вести на раздел сайта или HTTPS-страницу');if(href.startsWith('#')){if(href.length===1)invalid('Укажите раздел после #');}else if(href.startsWith('/')&&!href.startsWith('//')){}else{try{const url=new URL(href);if(url.protocol!=='https:'||url.username||url.password)invalid('Ссылка должна вести на раздел сайта или HTTPS-страницу');}catch{invalid('Ссылка должна вести на раздел сайта или HTTPS-страницу');}}}
   if(!Object.keys(changes).length)invalid('Нет изменений объявления');const previous=structuredClone(currentSettings),previousSignature=getMeta('source-signature');Object.assign(currentSettings.announcement,changes);const currentRegistry=structuredClone(registry),statuses=allStatuses();for(const record of Object.values(currentRegistry.components))record.status=statuses[record.id]??record.status;
   db.exec('BEGIN IMMEDIATE');try{setMeta('settings',JSON.stringify(currentSettings));setMeta('source-signature',hash([currentRegistry,currentSettings]));db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
   try{await atomicJSON(settingsPath,currentSettings);}catch(error){db.exec('BEGIN IMMEDIATE');try{setMeta('settings',JSON.stringify(previous));setMeta('source-signature',previousSignature);db.exec('COMMIT');}catch(rollbackError){db.exec('ROLLBACK');throw rollbackError;}throw error;}
  }),
  close(){db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();},
 };
}
