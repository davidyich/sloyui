import {catalogAPI} from './catalog-channel';
import {useSyncExternalStore} from 'react';
import settings from '../source/catalog-settings.json';
export type CatalogStatus = 'ready'|'needs-review'|'not-ready'|'archived';
export type CatalogState = {revision:string; statuses:Record<string,CatalogStatus>; componentVersions?:Record<string,string>; settings:typeof settings};
let state:CatalogState={revision:'local',statuses:{},settings};
const listeners=new Set<()=>void>();
export function catalogSnapshot(){return state;}
export function setCatalogState(next:CatalogState){state=next;listeners.forEach(listener=>listener());}
export function useCatalogState(){return useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},catalogSnapshot,catalogSnapshot);}
export async function refreshCatalog(){
 const response=await fetch(catalogAPI('/api/catalog/state'),{cache:'no-store'});
 if(response.ok)setCatalogState(await response.json());
}
export async function saveCatalog(path:string,body:Record<string,unknown>,revision=state.revision){
 const response=await fetch(catalogAPI(`/api/catalog/${path}`),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,revision})});
 const result=await response.json();
 if(!response.ok){if(response.status===409)await refreshCatalog();throw new Error(result.message??'Не удалось сохранить изменения');}
 setCatalogState(result);
 return result as CatalogState;
}
