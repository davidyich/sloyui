import {catalogLogin,isDevelop} from './catalog-channel';
import {CatalogPageBoundary} from './CatalogPageBoundary';
import {PublishDevelop} from './PublishDevelop';
import {CatalogMobileControls} from './CatalogMobileControls';
import {useCatalogText} from './catalog-locale';
import {ComponentStatusDot,ComponentStatusTag} from './ComponentStatus';
import { version } from '../package.json';
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Contrast } from 'lucide-react';
import * as UI from '../src';
import { componentCatalog, componentMetadata, componentStatuses, registryGroups, navigationGroups, groupCatalogueComponents, toggleCatalogueGroups, componentNames, filterComponents, type ComponentStatusFilter, overviewPages, foundationPages, isComponentRoute, resolveRoute, type CatalogRoute, type FoundationRoute } from './catalog';
import {CatalogAdminPage,CatalogAdminProvider,useCatalogAdmin} from './CatalogAdmin';
import {useCatalogState,refreshCatalog} from './catalog-state';
import {useAdminHold} from './use-admin-hold';
import {CatalogAnnouncementMessage} from './announcement';
import '../src/styles/styles.css';
import '../src/styles/fonts.css';
import './catalog.css';
import './reference.css';
import './catalog-shell.css';
import './catalog-enhancements.css';
import './catalog-mobile.css';
if (import.meta.env.DEV && new URLSearchParams(location.search).has('audit')) import('./audit');

const favicon=document.querySelector<HTMLLinkElement>('link[rel=icon]');
if(favicon)favicon.href=`${import.meta.env.BASE_URL}${isDevelop()?UI.SLOY_UI.developIconFile:UI.SLOY_UI.iconFile}?v=${version}`;

const AdminPage=memo(CatalogAdminPage);
const InstallationPage=lazy(()=>import('./Installation'));
const OverviewPage=lazy(()=>import('./Overview').then(module=>({default:module.Overview})));
const ChangelogPage=lazy(()=>import('./ComponentHistory').then(module=>({default:module.KitReleaseHistory})));
const ComponentHistory=lazy(()=>import('./ComponentHistory').then(module=>({default:module.ComponentHistory})));
const DocumentsPage=lazy(()=>import('./Documents'));
const ComponentUsage=lazy(()=>import('./ComponentUsage').then(module=>({default:module.ComponentUsage})));
const TokenSystemV4=lazy(()=>import('./TokenSystemV4'));
const GeometryV4=lazy(()=>import('./TokenSystemV4').then(module=>({default:module.GeometryV4})));
const ColorsV2=lazy(()=>import('./ColorsV2'));
const Typography=lazy(()=>import('./Typography'));
const Layers=lazy(()=>import('./Layers'));
const RulesV2=lazy(()=>import('./RulesV2'));
const Playground=lazy(()=>import('./Playground').then(module=>({default:module.Playground})));
const ComponentReference=lazy(()=>import('./ComponentReference').then(module=>({default:module.ComponentReference})));
type Theme = 'light' | 'dark';
type Surface = 'shell' | 'workspace' | 'content' | 'overlay' | 'invert' | 'glass';
const surfaceAliases:Record<string,Surface>={shell:'shell',page:'shell',base:'shell',workspace:'workspace',inset:'workspace',canvas:'workspace',content:'content',panel:'content',raised:'content',overlay:'overlay',floating:'overlay',invert:'invert',glass:'glass'};
type SurfaceScheme = 'standard' | 'dimmed';
type Density = 'default' | 'compact';
function preference<T extends string>(key: string, fallback: T, allowed: readonly T[]): T { try { const value=localStorage.getItem(key) as T; return allowed.includes(value)?value:fallback; } catch { return fallback; } }
function remember(key: string,value: string){try{localStorage.setItem(key,value);}catch{}}
function DesignImage({name}:{name:string}){return <img className="catalog-design-icon" src={`${import.meta.env.BASE_URL}catalog-design/${name}.svg`} alt=""/>;}
const FilterIcon=()=> <DesignImage name="filter"/>;
const CollapseIcon=()=> <DesignImage name="collapse"/>;
const SunIcon=()=> <DesignImage name="sun"/>;
const BorderIcon=()=> <DesignImage name="border"/>;
const GithubIcon=()=> <DesignImage name="github"/>;
const Navigation=memo(function Navigation({route,onNavigate,onSearch}:{route:CatalogRoute;onNavigate:(route:CatalogRoute)=>void;onSearch:()=>void}){
 const c=useCatalogText();useCatalogState();
 const [status,setStatus]=useState<ComponentStatusFilter>('all'),[group,setGroup]=useState('all');
 const [expanded,setExpanded]=useState<string[]>(['foundations',...navigationGroups.map(item=>item.id)]);
 const filtered=status!=='all'||group!=='all';
 const matches=filterComponents({status,group});
 const nodes:UI.TreeNode[]=[...(!filtered?[{id:'foundations',label:c('Основы'),icon:false as const,children:foundationPages.map(page=>({id:page.id,label:c(page.label),href:`#${page.id}`,icon:false as const}))}]:[]),...groupCatalogueComponents(matches).map(item=>({id:item.id,label:c(item.label),icon:false as const,children:item.components.map(name=>{const meta=componentMetadata(name);return {id:name,label:name,href:`#${name}`,icon:false as const,meta:meta.status!=='ready'&&<ComponentStatusDot status={meta.status} title={`${meta.id} · ${c(componentStatuses[meta.status])}`}/>};})}))].map(node=>({...node,meta:<span className="catalog-group-count">{node.children.length}</span>}));
 const visibleGroups=nodes.map(node=>node.id),allCollapsed=visibleGroups.every(id=>!expanded.includes(id));
 const expansionLabel=c(allCollapsed?'Развернуть все':'Свернуть все');
 const hold=useAdminHold(()=>location.assign(catalogLogin()),()=>onNavigate('overview'));
 useEffect(()=>{if(filtered)setExpanded(visibleGroups);},[status,group]);
 return <div className="catalog-navigation"><header className="catalog-sidebar-header"><UI.Button className="catalog-brand" variant="ghost" aria-label={UI.SLOY_UI.name} {...hold}><img src={`${import.meta.env.BASE_URL}${UI.SLOY_UI.wordmarkFile}`} alt=""/></UI.Button><div className="catalog-header-actions" data-surface="raised"><UI.ButtonGroup label={c('Действия каталога')} appearance="framed" attached><UI.Popover label={c('Фильтры компонентов')} triggerIcon={FilterIcon}><div className="catalog-filter-fields"><UI.Select label={c('Статус компонента')} value={status} onValueChange={value=>setStatus(value as ComponentStatusFilter)} options={[{value:'all',label:c('Все статусы')},...Object.entries(componentStatuses).map(([value,label])=>({value,label:c(label)}))]}/><UI.Select label={c('Группа компонентов')} value={group} onValueChange={setGroup} options={[{value:'all',label:c('Все группы')},...registryGroups.map(item=>({value:item.id,label:c(item.label)}))]}/><UI.Button variant="ghost" onClick={()=>{setStatus('all');setGroup('all');}}>{c('Сбросить фильтры')}</UI.Button></div></UI.Popover><UI.Tooltip content={expansionLabel}><UI.IconButton variant="ghost" icon={CollapseIcon} label={expansionLabel} onClick={()=>setExpanded(current=>toggleCatalogueGroups(visibleGroups,current))}/></UI.Tooltip></UI.ButtonGroup><UI.Button className="catalog-search-trigger" variant="secondary" aria-label={c('Поиск')} onClick={onSearch}><DesignImage name="search"/><UI.Kbd>⌘P</UI.Kbd></UI.Button></div></header>{filtered&&<div className="catalog-filter-summary"><span>{matches.length} {c('компонентов')}</span><UI.Button variant="ghost" size="xs" onClick={()=>{setStatus('all');setGroup('all');}}>{c('Сбросить')}</UI.Button></div>}<UI.ScrollArea className="catalog-nav-scroll" viewportClassName="catalog-nav-viewport" label={c('Каталог компонентов')} fade="vertical" fadeSize="var(--cap-space-8)"><nav aria-label={c('Каталог компонентов')}><div className="catalog-doc-links">{overviewPages.map(page=><UI.SidebarItem key={page.id} active={route===page.id} onClick={()=>onNavigate(page.id)}>{c(page.label)}</UI.SidebarItem>)}<UI.SidebarItem onClick={()=>{location.href=`${import.meta.env.BASE_URL}palette-lab/`;}}>Palette Lab</UI.SidebarItem></div><UI.TreeView nodes={nodes} label={c('Компоненты и основы')} selectedId={route} expandedIds={expanded} onExpandedChange={setExpanded} onSelect={node=>onNavigate(node.id as CatalogRoute)}/>{!matches.length&&<p className="catalog-search-empty">{c('Ничего не найдено')}</p>}</nav></UI.ScrollArea></div>;
});
function CatalogFooter({locale,onLocale,onNavigate}:{locale:UI.Locale;onLocale:(locale:UI.Locale)=>void;onNavigate:(route:CatalogRoute)=>void}){
 const c=useCatalogText(),{admin}=useCatalogAdmin();
 return <div className="catalog-sidebar-footer" data-surface="overlay"><div className="catalog-footer-start"><LanguageSwitch locale={locale} onLocale={onLocale}/>{admin&&<UI.IconButton size="xs" variant="ghost" icon="settings" label={c('Управление сайтом')} onClick={()=>onNavigate('admin')}/>}</div><div className="catalog-footer-end"><a className="catalog-version" href="#changelog" onClick={event=>{event.preventDefault();onNavigate('changelog');}} aria-label={`${c('История изменений')} · v${version}`}>v{version}</a><a className="catalog-github" href={UI.SLOY_UI.repository} aria-label="GitHub" target="_blank" rel="noreferrer"><GithubIcon/></a></div></div>;
}
function CatalogAnnouncement(){
 const {settings}=useCatalogState(),item=settings.announcement;
 if(!item.enabled)return null;
 return <UI.AnnouncementBar className="catalog-announcement" surface="overlay" label="Announce Bar" controls={false} autoPlay={false} messages={[{id:item.id,message:<CatalogAnnouncementMessage {...item}/>}]} />;
}
function PreviewControls({theme,onTheme,borders,onBorders,surface,onSurface,surfaceScheme,onSurfaceScheme,accent,onAccent,onMenu,radius,onRadius,density,onDensity}:{density:Density;onDensity:(value:Density)=>void;radius:string;onRadius:(value:string)=>void;theme:Theme;onTheme:(value:Theme)=>void;borders:boolean;onBorders:(value:boolean)=>void;surface:Surface;onSurface:(value:Surface)=>void;surfaceScheme:SurfaceScheme;onSurfaceScheme:(value:SurfaceScheme)=>void;accent:UI.Color;onAccent:(value:UI.Color)=>void;onMenu:()=>void}) {
 const c=useCatalogText(),t=UI.useTranslate();
 const radiusOptions=(['none','compact','default','rounded'] as const).map(value=>{const pixels=`${({none:0,compact:4,default:8,rounded:16})[value]} px`;return {value,label:value==='none'?t('Без скругления','Square'):value==='compact'?t('Малое','Small'):value==='default'?t('Среднее','Medium'):t('Максимальное','Maximum'),meta:pixels,triggerLabel:pixels};});
 const schemeLabel=t('Схема поверхностей','Surface scheme');
 return <UI.FloatingActionBar size="md" position="static" label={c("Параметры превью")} rovingFocus={false} className="catalog-preview-toolbar">
  <UI.IconButton className="catalog-mobile-toggle" icon="menu" label={c("Открыть каталог")} variant="ghost" onClick={onMenu}/>
  <UI.PopupSelect className="catalog-surface-setting" label={c("Поверхность")} side="top" align="center" value={surface} onValueChange={value=>onSurface(value as Surface)} options={[{value:'shell',label:'Shell'},{value:'workspace',label:'Workspace'},{value:'content',label:'Content'},{value:'overlay',label:'Overlay'},{value:'invert',label:'Invert'},{value:'glass',label:'Glass'}]}/>
  <UI.PopupSelect className="catalog-accent-setting" side="top" align="center" label={c("Акцент")} value={accent} onValueChange={v=>onAccent(v as UI.Color)} triggerContent={<span className="catalog-popup-color-dot" data-color={accent} aria-hidden="true"/>} options={UI.colors.map(color=>({value:color,label:color,leading:<span className="catalog-popup-color-dot" data-color={color}/>}))}/>
  <div className="catalog-preview-toggles">
   <UI.PopupSelect className="catalog-density-setting" label={t("Компактность","Density")} side="top" align="center" value={density} onValueChange={value=>onDensity(value as Density)} options={[{value:'default',label:t('Стандартная','Default'),triggerLabel:t('Обычно','Default')},{value:'compact',label:t('Компактная','Compact'),triggerLabel:t('Плотно','Compact')}]} popupClassName="catalog-density-popup"/>
   <UI.PopupSelect className="catalog-radius-setting" label={t("Основное скругление","Base corner radius")} side="top" align="center" value={radius} onValueChange={onRadius} options={radiusOptions} popupClassName="catalog-radius-popup"/>
   <UI.Tooltip content={borders?c('Выключить обводки'):c('Включить обводки')}><UI.IconButton icon={BorderIcon} label={c("Обводки")} aria-pressed={borders} variant="ghost" onClick={()=>onBorders(!borders)}/></UI.Tooltip>
   <span className="catalog-theme-controls">
    <span className="catalog-scheme-toggle" data-visible="true"><UI.Tooltip content={`${schemeLabel}: ${surfaceScheme==='dimmed'?'Dimmed':'Standard'}`}><UI.IconButton icon={Contrast} label={schemeLabel} aria-pressed={surfaceScheme==='dimmed'} variant="ghost" onClick={()=>onSurfaceScheme(surfaceScheme==='standard'?'dimmed':'standard')}/></UI.Tooltip></span>
    <UI.Tooltip content={theme==='dark'?c('Светлая тема'):c('Тёмная тема')}><UI.IconButton icon={theme==='dark'?'moon':SunIcon} label={theme==='dark'?c('Светлая тема'):c('Тёмная тема')} variant="ghost" onClick={()=>onTheme(theme==='dark'?'light':'dark')}/></UI.Tooltip>
   </span>
  </div>
  <PublishDevelop/>
 </UI.FloatingActionBar>;
}
function App({locale,onLocale}:{locale:UI.Locale;onLocale:(locale:UI.Locale)=>void}){
 const c=useCatalogText();
 const state=useCatalogState();
 useEffect(()=>{void refreshCatalog().catch(()=>{});},[]);
  const [route,setRoute]=useState<CatalogRoute>(()=>resolveRoute(location.hash));
  const [theme,setTheme]=useState<Theme>(()=>preference('cap-kit-theme','light',['light','dark']));
  const [borders,setBorders]=useState(()=>preference('cap-kit-borders','off',['off','on'])==='on');
  const [surface,setSurface]=useState<Surface>(()=>surfaceAliases[preference('cap-kit-surface','shell',Object.keys(surfaceAliases))]);
  const [surfaceScheme,setSurfaceScheme]=useState<SurfaceScheme>(()=>preference('cap-kit-surface-scheme','standard',['standard','dimmed','inverted'])==='standard'?'standard':'dimmed');
  const [accent,setAccent]=useState<UI.Color>(()=>preference('cap-kit-accent','neutral',UI.colors));
  const [density,setDensity]=useState<Density>(()=>preference('cap-kit-density','default',['default','compact']));
  const [radius,setRadius]=useState(()=>preference('cap-kit-radius','default',['none','compact','default','rounded']));
  const [mobile,setMobile]=useState(false),[command,setCommand]=useState(false),[notices,setNotices]=useState<UI.ToastStackItem[]>([]);
  const [historyTab,setHistoryTab]=useState<'history'|'instruction'>('history');
  const [narrow,setNarrow]=useState(()=>matchMedia('(max-width:720px)').matches);
  useEffect(()=>{const media=matchMedia('(max-width:720px)');const sync=()=>{setNarrow(media.matches);if(!media.matches)setMobile(false);};media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  const [historyFor,setHistoryFor]=useState<string|null>(null),versionAction=useRef<HTMLButtonElement>(null);
  const main=useRef<HTMLDivElement>(null);
  const component=isComponentRoute(route)?componentCatalog[route]:undefined;
  const title=c(isComponentRoute(route)?route:[...overviewPages,...foundationPages].find(page=>page.id===route)?.label??route);
  const noticeId=useRef(0);
  const notify=useCallback((message:string)=>setNotices(current=>[...current.slice(-3),{id:`notice-${++noticeId.current}`,title:message,duration:4500,contrast:true}]),[]);
  const dismissNotice=useCallback((id:string)=>setNotices(current=>current.filter(item=>item.id!==id)),[]);
  const openSearch=useCallback(()=>setCommand(true),[]);
  const navigate=useCallback((next:CatalogRoute)=>{setRoute(next);setHistoryFor(null);setMobile(false);location.hash=next;main.current?.scrollTo({top:0});},[]);
  useEffect(()=>{const sync=()=>{const next=resolveRoute(location.hash);setRoute(next);setHistoryFor(null);setMobile(false);main.current?.scrollTo({top:0});if(location.hash!==`#${next}`&&!location.hash.startsWith(`#${next}?`))history.replaceState(null,'',`${location.pathname}${location.search}#${next}`);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;remember('cap-kit-theme',theme);},[theme]);
  useEffect(()=>{document.documentElement.dataset.borders=borders?'on':'off';remember('cap-kit-borders',borders?'on':'off');},[borders]);
  useEffect(()=>{document.documentElement.dataset.surface='shell';remember('cap-kit-surface',surface);},[surface]);
  useEffect(()=>{document.documentElement.dataset.surfaceScheme=surfaceScheme;remember('cap-kit-surface-scheme',surfaceScheme);},[surfaceScheme]);
  useEffect(()=>{document.documentElement.dataset.density=density;remember('cap-kit-density',density);},[density]);
  useEffect(()=>{document.documentElement.dataset.radius=radius;remember('cap-kit-radius',radius);},[radius]);
  useEffect(()=>{document.documentElement.dataset.accent=accent;remember('cap-kit-accent',accent);},[accent]);
  useEffect(()=>{document.title=`${title} · ${UI.SLOY_UI.name}${isDevelop()?' · Develop':''}`;},[title]);
  useEffect(()=>{const keydown=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&['k','p'].includes(event.key.toLowerCase())){event.preventDefault();setMobile(false);setCommand(current=>!current);}};window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);},[]);
  const copy=useCallback(async(value:string)=>{try{await navigator.clipboard.writeText(value);notify(c('Скопировано'));}catch{notify(c('Скопируйте текст вручную'));}},[notify,c]);
  const commands=useMemo(()=>[...[...overviewPages,...foundationPages].map(page=>({id:page.id,label:c(page.label),description:overviewPages.some(item=>item.id===page.id)?'Docs':c('Основы'),icon:'layers' as const,onSelect:()=>navigate(page.id)})),...filterComponents().map(name=>({id:name,label:name,description:c(componentCatalog[name].description),icon:'cube' as const,onSelect:()=>navigate(name)}))],[c,state.revision]);
  const Story=component?.render;
  const currentComponent=isComponentRoute(route)?componentMetadata(route):undefined;
  const currentComponentVersion=currentComponent?state.componentVersions?.[currentComponent.id]??currentComponent.version:undefined;
  const closeHistory=()=>{setHistoryFor(null);versionAction.current?.focus();};
  // The catalogue document is always Content; only explicit previews receive Surface.
  const pageContent=useMemo(()=><div className="catalog-page cap-surface" key={route} data-accent={accent} data-surface="content"><CatalogPageBoundary key={route}><Suspense fallback={<div className="catalog-page-loading" role="status"><UI.Spinner/>{c("Загрузка…")}</div>}>
        {Story&&isComponentRoute(route)?<><header className="catalog-page-heading"><div className="catalog-page-title"><h1>{route}</h1><ComponentStatusTag componentId={componentMetadata(route).id} status={componentMetadata(route).status}/></div><div className="catalog-component-release"><UI.Button className="catalog-component-version" ref={versionAction} size="xs" variant="ghost" aria-label={`${c("История изменений")} ${route}`} aria-expanded={historyFor===currentComponent!.id} aria-controls="catalog-component-history" onClick={()=>{setHistoryTab('history');setHistoryFor(current=>current===currentComponent!.id?null:currentComponent!.id);}}><span className="catalog-component-id">{currentComponent!.id}</span><span className="catalog-component-version-number">v{currentComponentVersion}</span></UI.Button></div><p>{c(componentCatalog[route].description)}</p></header><Playground key={route} name={route} notify={notify} surface={surface}/><div className="catalog-preview cap-surface cap-surface-boundary" data-surface={surface} data-accent={accent}><Story notify={notify}/></div><ComponentUsage componentId={currentComponent!.id} componentName={route} onEdit={()=>{setHistoryTab('instruction');setHistoryFor(currentComponent!.id);}}/><ComponentReference name={route}/></>:route==='admin'?<AdminPage/>:route==='overview'?<OverviewPage surface={surface}/>:route==='installation'?<InstallationPage/>:route==='changelog'?<ChangelogPage/>:route==='agents'?<DocumentsPage/>:<FoundationPage surface={surface} route={route as FoundationRoute} accent={accent} radius={radius} density={density} copy={copy}/>}
      </Suspense></CatalogPageBoundary></div>,[route,surface,accent,radius,density,historyFor,copy,notify,c,currentComponent?.status,currentComponentVersion]);
  return <CatalogAdminProvider notify={notify}><div className="catalog-app cap-surface" data-surface="shell"><CatalogAnnouncement/><div className="catalog-workspace"><a className="catalog-skip" href="#catalog-main" onClick={event=>{event.preventDefault();main.current?.focus();}}>{c("К содержимому")}</a>
    <aside data-surface="workspace" className="catalog-sidebar cap-surface" aria-label={c("Библиотека")}><Navigation route={route} onNavigate={navigate} onSearch={openSearch}/><CatalogFooter locale={locale} onLocale={onLocale} onNavigate={navigate}/></aside>
    <div data-surface="content" className="catalog-main-shell cap-surface"><div className="catalog-content-column">
      <UI.ScrollArea ref={main} className="catalog-scroll" viewportClassName="catalog-main" label={title} fade="vertical" fadeSize="var(--cap-space-8)" viewportProps={{id:"catalog-main",role:"main",tabIndex:-1}}>{pageContent}</UI.ScrollArea>
      <aside data-surface="overlay" className="catalog-preview-dock" aria-label={c("Настройки каталога")}><PreviewControls density={density} onDensity={setDensity} radius={radius} onRadius={setRadius} theme={theme} onTheme={setTheme} borders={borders} onBorders={setBorders} surface={surface} onSurface={setSurface} surfaceScheme={surfaceScheme} onSurfaceScheme={setSurfaceScheme} accent={accent} onAccent={setAccent} onMenu={()=>setMobile(true)}/></aside>
      <CatalogMobileControls density={density} onDensity={setDensity} radius={radius} onRadius={setRadius} theme={theme} onTheme={setTheme} borders={borders} onBorders={setBorders} surface={surface} onSurface={setSurface} surfaceScheme={surfaceScheme} onSurfaceScheme={setSurfaceScheme} accent={accent} onAccent={setAccent} onMenu={()=>setMobile(true)} onSearch={openSearch}/></div>
      {currentComponent&&historyFor===currentComponent.id&&(narrow?<UI.Drawer open onOpenChange={open=>{if(!open)closeHistory();}} title={route} side="bottom" variant="edge" className="catalog-history-sheet"><div id="catalog-component-history" className="catalog-history-mobile-content"><Suspense fallback={<UI.Spinner/>}><ComponentHistory componentId={currentComponent.id} componentName={route} initialTab={historyTab} onClose={closeHistory}/></Suspense></div></UI.Drawer>:<aside id="catalog-component-history" className="catalog-history-slot"><Suspense fallback={<div role="status" className="catalog-page-loading"><UI.Spinner/>{c("Загрузка…")}</div>}><ComponentHistory componentId={currentComponent.id} componentName={route} initialTab={historyTab} onClose={closeHistory}/></Suspense></aside>)}
    </div>
    </div><UI.BottomSheet open={mobile} onOpenChange={setMobile} title={c("Компоненты")} variant="edge" snapPoints={[.55,.88]} defaultSnap={1} className="catalog-mobile-drawer"><Navigation route={route} onNavigate={navigate} onSearch={()=>{setMobile(false);setCommand(true);}}/><CatalogFooter locale={locale} onLocale={onLocale} onNavigate={navigate}/></UI.BottomSheet>
    <UI.CommandPalette showTitle={false} open={command} onOpenChange={setCommand} items={commands} placeholder={c("Найти компонент…")}/>
    <UI.ToastStack className="catalog-notifications" items={notices} onDismiss={dismissNotice} position="top-center" limit={4} showExpandHint={false}/>
  </div></CatalogAdminProvider>;
}
function FoundationPage({route,accent,copy,surface}:{route:FoundationRoute;surface:Surface;accent:UI.Color;radius:string;density:Density;copy:(value:string)=>void}){
  if(route==='tokens')return <TokenSystemV4 copy={copy}/>;
  if(route==='layers')return <Layers/>;
  if(route==='colors')return <ColorsV2 accent={accent} copy={copy}/>;
  if(route==='behavior')return <RulesV2 surface={surface}/>;
  if(route==='typography')return <Typography surface={surface}/>;
  if(route==='geometry')return <GeometryV4/>;
  return <DocumentsPage/>;
}

function LanguageSwitch({locale,onLocale}:{locale:UI.Locale;onLocale:(locale:UI.Locale)=>void}) {
 const t=UI.useTranslate();
 const next=locale==='ru'?'en':'ru';
 return <UI.Button className="catalog-language" size="xs" variant="ghost" aria-label={t('Переключить на английский (EN)','Switch to Russian (RU)')} onClick={()=>onLocale(next)}>{next.toUpperCase()}</UI.Button>;
}
function LocalizedCatalogue(){
 const [locale,setLocale]=useState<UI.Locale>(()=>preference('cap-kit-locale','ru',['ru','en']));
 useEffect(()=>{document.documentElement.lang=locale;remember('cap-kit-locale',locale);},[locale]);
 return <UI.LocaleProvider locale={locale}><App locale={locale} onLocale={setLocale}/></UI.LocaleProvider>;
}

const root = createRoot(document.getElementById('root')!);
root.render(<LocalizedCatalogue/>);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
