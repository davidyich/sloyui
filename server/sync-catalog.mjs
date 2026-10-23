import {readFile,mkdir,copyFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJSON,createCatalogStore} from './catalog-store.mjs';
const [incoming,directory]=process.argv.slice(2);
if(!incoming||!directory)throw new Error('Usage: sync-catalog incoming-source persistent-source');
await mkdir(directory,{recursive:true,mode:0o700});
try{await access(join(directory,'catalog.sqlite'));const current=await createCatalogStore(directory);current.close();}catch(error){if(error.code!=='ENOENT')throw error;}
async function optional(path){try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;return null;}}
const registry=await optional(join(incoming,'component-registry.json')),settings=await optional(join(incoming,'catalog-settings.json'));
if(!registry||!settings)throw new Error('Missing catalogue source');
const live=await optional(join(directory,'component-registry.json')),baseline=await optional(join(directory,'baseline-registry.json'));
const incomingBaseline=structuredClone(registry);
if(live&&baseline){const previous=new Map(Object.values(baseline.components).map(record=>[record.id,record.status])),edited=new Map(Object.values(live.components).map(record=>[record.id,record.status]));for(const record of Object.values(registry.components)){if(edited.has(record.id)&&edited.get(record.id)!==previous.get(record.id)&&Object.hasOwn(registry.statuses,edited.get(record.id)))record.status=edited.get(record.id);}}
const liveSettings=await optional(join(directory,'catalog-settings.json')),oldSettings=await optional(join(directory,'baseline-settings.json')),incomingSettings=structuredClone(settings);
if(liveSettings&&oldSettings){for(const field of ['enabled','message','actionLabel','href']){if(Object.hasOwn(liveSettings.announcement,field)&&liveSettings.announcement[field]!==oldSettings.announcement[field])settings.announcement[field]=liveSettings.announcement[field];}}
await atomicJSON(join(directory,'component-registry.json'),registry);await atomicJSON(join(directory,'catalog-settings.json'),settings);
await atomicJSON(join(directory,'baseline-registry.json'),incomingBaseline);await atomicJSON(join(directory,'baseline-settings.json'),incomingSettings);
console.log('Catalogue source synchronized; admin edits preserved by stable ID');

for(const name of ['component-history.json','documents-seed.json']){try{await copyFile(join(incoming,name),join(directory,name));}catch(error){if(error.code!=='ENOENT')throw error;}}
const store=await createCatalogStore(directory,{importSources:true});store.close();
console.log('SQLite imported source revisions; owner histories and documents preserved');
