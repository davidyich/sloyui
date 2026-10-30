import {catalogAPI,catalogLogin} from './catalog-channel';
import {createContext,lazy,Suspense,useContext,useMemo,useEffect,useState,type ReactNode} from 'react';
import * as UI from '../src';
import {useCatalogState,saveCatalog} from './catalog-state';
import {announcementDraft,sameAnnouncement,validAnnouncementHref,CatalogAnnouncementMessage} from './announcement';
const ReleaseEditor=lazy(()=>import('./ComponentHistory').then(module=>({default:module.ReleaseEditor})));
const PublishDevelop=lazy(()=>import('./PublishDevelop').then(module=>({default:module.PublishDevelop})));
const AdminContext=createContext({admin:false,refresh:async()=>{},notify:(_message:string)=>{}});
export const useCatalogAdmin=()=>useContext(AdminContext);
export function CatalogAdminProvider({children,notify}:{children:ReactNode;notify:(message:string)=>void}){
 const [admin,setAdmin]=useState(false);
 const refresh=async()=>{try{const response=await fetch(catalogAPI('/api/catalog/session'),{cache:'no-store'});setAdmin(response.ok&&(await response.json()).admin===true);}catch{setAdmin(false);}};
 useEffect(()=>{void refresh();const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[]);
 const value=useMemo(()=>({admin,refresh,notify}),[admin,notify]);
 return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
function AnnouncementEditor(){
 const {settings,revision}=useCatalogState(),{notify}=useCatalogAdmin(),t=UI.useTranslate();
 const published=announcementDraft(settings.announcement);
 const [draft,setDraft]=useState(published),[baseline,setBaseline]=useState({fields:published,revision});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[visibilityBusy,setVisibilityBusy]=useState(false);
 const dirty=!sameAnnouncement(draft,baseline.fields),conflict=dirty&&!sameAnnouncement(published,baseline.fields);
 useEffect(()=>{
  if(!dirty){setDraft(published);setBaseline({fields:published,revision});}
  else if(sameAnnouncement(published,baseline.fields)&&revision!==baseline.revision)setBaseline({fields:published,revision});
 },[revision,published.message,published.actionLabel,published.href,dirty]);
 const loadSaved=()=>{setDraft(published);setBaseline({fields:published,revision});setError('');};
 const toggle=async(enabled:boolean)=>{setVisibilityBusy(true);setError('');try{await saveCatalog('announcement',{enabled});notify(t('Announce Bar сохранён','Announce Bar saved'));}catch(reason){setError((reason as Error).message);}finally{setVisibilityBusy(false);}};
 const save=async()=>{
  setBusy(true);setError('');
  try{const result=await saveCatalog('announcement',draft,baseline.revision);const fields=announcementDraft(result.settings.announcement);setDraft(fields);setBaseline({fields,revision:result.revision});notify(t('Анонс сохранён','Announcement saved'));}
  catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 };
 return <UI.Card className="catalog-announcement-editor">
  <div className="catalog-announcement-editor-header"><h2>{t('Сообщение анонса','Announcement message')}</h2><UI.Switch label="Announce Bar" checked={settings.announcement.enabled} onChange={event=>void toggle(event.target.checked)} disabled={busy||visibilityBusy}/></div>
  <div className="catalog-announcement-visibility"><p className="catalog-muted">{t('Показывать объявление над каталогом всем посетителям.','Show the announcement above the catalogue to all visitors.')}</p><UI.Button size="sm" variant="ghost" onClick={()=>{UI.clearAnnouncementDismissal(`catalog-${settings.announcement.id}`);location.reload();}}>{t('Показать скрытое объявление','Show dismissed announcement')}</UI.Button></div>
  <form onSubmit={event=>{event.preventDefault();void save();}}>
   <UI.Textarea labelPlacement="inside" label={t('Текст анонса','Announcement text')} hint={t('Выделите фрагмент квадратными скобками: [Code Block]. Скобки не показываются.','Highlight a fragment with square brackets: [Code Block]. The brackets are hidden.')} value={draft.message} onChange={event=>setDraft(current=>({...current,message:event.target.value}))} rows={4} maxLength={1600} required disabled={busy}/>
   <div className="catalog-announcement-action-fields">
    <UI.Input labelPlacement="inside" label={t('Название кнопки','Button label')} value={draft.actionLabel} onChange={event=>setDraft(current=>({...current,actionLabel:event.target.value}))} maxLength={64} required disabled={busy}/>
    <UI.Input labelPlacement="inside" label={t('Ссылка кнопки','Button link')} hint={t('Раздел сайта (#changelog), путь (/…) или https://…','A section (#changelog), site path (/…) or https://…')} error={draft.href&&!validAnnouncementHref(draft.href)?t('Укажите раздел сайта или HTTPS-ссылку','Enter a site section or HTTPS link'):undefined} value={draft.href} onChange={event=>setDraft(current=>({...current,href:event.target.value}))} inputMode="url" maxLength={2048} required disabled={busy}/>
   </div>
   <div className="catalog-announcement-preview" role="region" aria-label={t('Предпросмотр анонса','Announcement preview')}>
    <h3>{t('Предпросмотр','Preview')}</h3>
    <UI.AnnouncementBar className="catalog-announcement" surface="raised" dismissible={false} controls={false} autoPlay={false} label={t('Черновик анонса','Announcement draft')} messages={[{id:'draft',message:<CatalogAnnouncementMessage {...draft}/>}]} />
   </div>
   {conflict&&<p role="status">{t('Сохранённый анонс изменился. Загрузите актуальную версию перед сохранением.','The saved announcement changed. Load the current version before saving.')}</p>}
   {error&&<p role="alert" className="catalog-auth-error">{error}</p>}
   <div className="catalog-announcement-editor-actions"><UI.Button type="submit" variant="primary" disabled={busy||visibilityBusy||!dirty||conflict||!validAnnouncementHref(draft.href)} loading={busy}>{t('Сохранить анонс','Save announcement')}</UI.Button><UI.Button variant="ghost" disabled={busy||!dirty} onClick={loadSaved}>{t('Загрузить сохранённое','Load saved')}</UI.Button>{dirty&&<span className="catalog-muted">{t('Есть несохранённые изменения','Unsaved changes')}</span>}</div>
  </form>
 </UI.Card>;
}
export function CatalogAdminPage(){
 const {admin}=useCatalogAdmin(),t=UI.useTranslate();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const logout=async()=>{setBusy(true);try{const response=await fetch('/api/admin/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok)throw new Error(t('Не удалось выйти','Unable to sign out'));const data=await response.json();location.assign(data.url);}catch(reason){setError((reason as Error).message);setBusy(false);}};
 if(admin)return <><header className="page-intro"><h1>{t('Управление сайтом','Site settings')}</h1><p>{t('Нажмите на тег статуса компонента, чтобы изменить его в каталоге.','Click a component status tag to change its status in the catalogue.')}</p></header><div className="catalog-admin-layout"><UI.Card><h2>{t('Тестовая версия','Test version')}</h2><div className="catalog-admin-release-actions"><a href="/develop/" target="_blank" rel="noreferrer">{t('Посмотреть Develop','View Develop')}</a><Suspense fallback={null}><PublishDevelop/></Suspense></div></UI.Card><AnnouncementEditor/><Suspense fallback={<p role="status">{t("Загрузка…","Loading…")}</p>}><ReleaseEditor/></Suspense><div className="catalog-admin-exit">{error&&<p role="alert">{error}</p>}<UI.Button variant="ghost" disabled={busy} onClick={()=>void logout()}>{t('Выйти из админского режима','Sign out')}</UI.Button></div></div></>;
 return <div className="catalog-auth"><UI.Card className="catalog-auth-card"><h1>{t('Вход в Sloy UI','Sign in to Sloy UI')}</h1><p className="catalog-muted">{t('Используйте почту, пароль и код из аутентификатора вашей учётной записи Refletica.','Use the email, password and authenticator of your Refletica account.')}</p><UI.Button variant="primary" onClick={()=>location.assign(catalogLogin())}>{t('Войти через Devos','Sign in with Devos')}</UI.Button><UI.Button variant="ghost" onClick={()=>{location.hash='overview';}}>{t('Вернуться в каталог','Back to catalogue')}</UI.Button></UI.Card></div>;
}
