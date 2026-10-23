import {useEffect,useRef,useState} from 'react';
import * as UI from '../src';
import {useCatalogAdmin} from './CatalogAdmin';
import {catalogAPI,isDevelop} from './catalog-channel';
type Publication={revision:string;develop:{release:string;version:string};production:{release:string;version:string};canPublish:boolean;result?:{id:string;status:'published'|'failed';message?:string}};
export function PublishDevelop(){
 const {admin,notify}=useCatalogAdmin(),t=UI.useTranslate();
 const [open,setOpen]=useState(false),[state,setState]=useState<Publication>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController>(undefined);
 useEffect(()=>()=>controller.current?.abort(),[]);
 if(!admin||!isDevelop())return null;
 const read=async(signal?:AbortSignal)=>{const response=await fetch(catalogAPI('/api/catalog/publication'),{cache:'no-store',signal});const value=await response.json();if(!response.ok)throw Error(value.message);return value as Publication;};
 const show=async()=>{setOpen(true);setError('');setState(undefined);try{setState(await read());}catch(reason){setError((reason as Error).message);}};
 const publish=async()=>{
  if(!state||busy)return;setBusy(true);setError('');controller.current?.abort();const abort=new AbortController();controller.current=abort;
  try{
   const response=await fetch(catalogAPI('/api/catalog/publication'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state.revision}),signal:abort.signal});const value=await response.json();if(!response.ok)throw Error(value.message);
   const deadline=Date.now()+90000;
   while(Date.now()<deadline){
    await new Promise<void>((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(new Error('Aborted'));};const timer=setTimeout(()=>{abort.signal.removeEventListener('abort',cancel);resolve();},1000);abort.signal.addEventListener('abort',cancel,{once:true});});
    let next:Publication;try{next=await read(abort.signal);}catch(reason){if(abort.signal.aborted)throw reason;continue;}
    const result=next.result;if(!result||result.id!==value.id)continue;
    if(result.status==='failed')throw Error(result.message||t('Публикация не выполнена','Publication failed'));
    setOpen(false);notify(t('Develop опубликован на основном сайте','Develop published to the main site'));return;
   }
   throw Error(t('Публикация ещё выполняется. Обновите страницу и проверьте состояние.','Publication is still running. Reload and check its status.'));
  }catch(reason){if(!abort.signal.aborted)setError((reason as Error).message);}finally{setBusy(false);}
 };
 return <><UI.Button size="sm" variant="primary" onClick={()=>void show()}>{t('Опубликовать','Publish')}</UI.Button><UI.Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}} title={t('Опубликовать Develop?','Publish Develop?')} description={t('Текущая сборка и сохранённые данные Develop заменят основной сайт. Перед переключением будет создана резервная копия.','The current Develop build and saved data will replace the main site. A backup will be created before switching.')}>
  {state?<p>{t('Версия','Version')}: <strong>{state.develop.version}</strong> · <code>{state.develop.release}</code></p>:!error&&<p role="status">{t('Загрузка версии…','Loading version…')}</p>}
  {state&&!state.canPublish&&<p>{t('Основной сайт уже соответствует Develop.','The main site already matches Develop.')}</p>}
  {error&&<p role="alert">{error}</p>}
  <div className="catalog-dialog-actions"><UI.Button variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>{t('Отмена','Cancel')}</UI.Button><UI.Button variant="primary" loading={busy} disabled={!state?.canPublish||busy} onClick={()=>void publish()}>{t('Опубликовать на основном сайте','Publish to the main site')}</UI.Button></div>
 </UI.Dialog></>;
}
