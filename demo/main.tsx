import {useCatalogText} from './catalog-locale';
import { ComponentReference } from './ComponentReference';
import { Overview,Changelog } from './Overview';
import { version } from '../package.json';
import { Playground } from './Playground';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as UI from '../src';
import { componentCatalog, componentMetadata, componentStatuses, registryGroups, componentNames, overviewPages, foundationPages, isComponentRoute, resolveRoute, type CatalogRoute, type FoundationRoute } from './catalog';
import ColorsV2 from './ColorsV2';
import { Radius } from 'lucide-react';
import Layers from './Layers';
import Documents from './Documents';
import RulesV2 from './RulesV2';
import '../src/styles/styles.css';
import '../src/styles/fonts.css';
import './catalog.css';
import './reference.css';
if (import.meta.env.DEV && new URLSearchParams(location.search).has('audit')) import('./audit');

type Theme = 'light' | 'dark';
type Surface = 'base' | 'canvas' | 'raised' | 'floating';
function preference<T extends string>(key: string, fallback: T, allowed: readonly T[]): T { try { const value=localStorage.getItem(key) as T; return allowed.includes(value)?value:fallback; } catch { return fallback; } }
function remember(key: string,value: string){try{localStorage.setItem(key,value);}catch{}}
function Navigation({ route, onNavigate }: { route: CatalogRoute; onNavigate: (route: CatalogRoute) => void }) {
 const c=useCatalogText();
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('all'),[group,setGroup]=useState('all');
  const [expanded,setExpanded]=useState<string[]>(['docs','foundations',...registryGroups.map(group=>group.id)]);
  const term=query.trim().toLocaleLowerCase();
  const filtered=status!=='all'||group!=='all'||!!term;
  const matches=componentNames.filter(name=>{
    const metadata=componentMetadata(name);
    return (status==='all'||metadata.status===status)&&(group==='all'||(metadata.groups as string[]).includes(group))&&`${name} ${metadata.id} ${componentCatalog[name].description} ${metadata.groups.join(' ')}`.toLocaleLowerCase().includes(term);
  });
  const groups=registryGroups.filter(item=>group==='all'||item.id===group);
  const nodes:UI.TreeNode[]=[...(!filtered?[{id:'docs',label:'Docs',icon:false as const,children:overviewPages.map(page=>({id:page.id,label:c(page.label),href:`#${page.id}`,icon:page.id==='overview'?'grid' as const:'clock' as const}))},{id:'foundations',label:c('Основы'),icon:false as const,children:foundationPages.map(page=>({id:page.id,label:c(page.label),href:`#${page.id}`,icon:false as const}))}]:[]),...groups.map(item=>({id:item.id,label:c(item.label),icon:false as const,children:matches.filter(name=>group!=='all'||componentMetadata(name).primaryGroup===item.id).map(name=>{
    const meta=componentMetadata(name);return {id:name,label:name,href:`#${name}`,icon:false as const,meta:meta.status!=='ready'&&<span className="catalog-review-dot" data-status={meta.status} role="img" aria-label={c(componentStatuses[meta.status])} title={`${meta.id} · ${c(componentStatuses[meta.status])}`}/>};
  })})).filter(node=>!('children' in node)||node.children.length)].map(node=>({...node,meta:<span className="catalog-group-count">{node.children.length}</span>}));
  return <div className="catalog-navigation"><div className="catalog-search-row"><div className="catalog-search"><UI.Input leading={<UI.Icon name="search" size={15}/>} type="search" aria-label={c("Найти компонент")} placeholder={c("Поиск")} value={query} onChange={event=>setQuery(event.target.value)}/></div><UI.Popover label={c("Фильтры компонентов")} triggerIcon="filter"><div className="catalog-filter-fields"><UI.Select label={c("Статус компонента")} value={status} onValueChange={setStatus} options={[{value:'all',label:c('Все статусы')},...Object.entries(componentStatuses).filter(([key])=>key!=='archived').map(([value,label])=>({value,label:c(label)}))]}/><UI.Select label={c("Группа компонентов")} value={group} onValueChange={setGroup} options={[{value:'all',label:c('Все группы')},...registryGroups.map(item=>({value:item.id,label:c(item.label)}))]}/><UI.Button variant="ghost" onClick={()=>{setStatus('all');setGroup('all');}}>{c("Сбросить фильтры")}</UI.Button></div></UI.Popover></div>{filtered&&<div className="catalog-filter-summary"><span>{matches.length} {c("компонентов")}</span><UI.Button variant="ghost" size="xs" onClick={()=>{setQuery('');setStatus('all');setGroup('all');}}>{c("Сбросить")}</UI.Button></div>}<nav aria-label={c("Каталог компонентов")} className="catalog-nav-scroll"><UI.TreeView showGuides nodes={nodes} label={c("Компоненты и основы")} selectedId={route} expandedIds={filtered?nodes.map(node=>node.id):expanded} onExpandedChange={setExpanded} onSelect={node=>onNavigate(node.id as CatalogRoute)}/>{!matches.length&&<p className="catalog-search-empty">{c("Ничего не найдено")}</p>}</nav></div>;
}
function PreviewControls({theme,onTheme,borders,onBorders,surface,onSurface,accent,onAccent,onMenu,radius,onRadius}:{radius:string;onRadius:(value:string)=>void;theme:Theme;onTheme:(value:Theme)=>void;borders:boolean;onBorders:(value:boolean)=>void;surface:Surface;onSurface:(value:Surface)=>void;accent:UI.Color;onAccent:(value:UI.Color)=>void;onMenu:()=>void}) {
 const c=useCatalogText();
 const [open,setOpen]=useState(false);
 const radiusLabel=radius==='compact'?c('Минимальные'):radius==='rounded'?c('Сильные'):c('Обычные');
 return <UI.FloatingActionBar size="md" position="static" label={c("Параметры превью")} rovingFocus={false} className="catalog-preview-toolbar">
  <UI.IconButton className="catalog-mobile-toggle" icon="menu" label={c("Открыть каталог")} variant="ghost" onClick={onMenu}/>
  <UI.Select aria-label={c("Поверхность")} value={surface} onValueChange={v=>onSurface(v as Surface)} options={[{value:'base',label:'Base'},{value:'canvas',label:'Canvas'},{value:'raised',label:'Raised'},{value:'floating',label:'Floating'}]}/>
  <div className="catalog-accent-setting" data-accent={accent}><UI.Popover side="top" align="center" label={c("Акцент")} triggerContent={<span className="catalog-accent-indicator" aria-hidden="true"/>} open={open} onOpenChange={setOpen} className="catalog-color-popover"><UI.SegmentedControl className="catalog-color-picker" label={c("Акцент")} value={accent} onValueChange={v=>{onAccent(v as UI.Color);setOpen(false);}} options={UI.colors.map(color=>({value:color,label:color,icon:<span className="catalog-color-dot" data-color={color}><UI.Icon name="check" size={13}/></span>}))}/></UI.Popover></div>
  <div className="catalog-preview-toggles"><UI.Tooltip content={`${c('Скругления')}: ${radiusLabel}`}><UI.IconButton icon={Radius} label={`${c('Скругления')}: ${radiusLabel}`} variant="ghost" onClick={()=>onRadius(radius==='compact'?'default':radius==='default'?'rounded':'compact')}/></UI.Tooltip><UI.Tooltip content={theme==='dark'?c('Светлая тема'):c('Тёмная тема')}><UI.IconButton icon={theme==='dark'?'moon':'sun'} label={theme==='dark'?c('Светлая тема'):c('Тёмная тема')} variant="ghost" onClick={()=>onTheme(theme==='dark'?'light':'dark')}/></UI.Tooltip><UI.Tooltip content={borders?c('Выключить обводки'):c('Включить обводки')}><UI.IconButton icon="border" label={c("Обводки")} aria-pressed={borders} variant="ghost" onClick={()=>onBorders(!borders)}/></UI.Tooltip></div>
 </UI.FloatingActionBar>;
}
function App({locale,onLocale}:{locale:UI.Locale;onLocale:(locale:UI.Locale)=>void}){
 const c=useCatalogText();
  const [route,setRoute]=useState<CatalogRoute>(()=>resolveRoute(location.hash));
  const [theme,setTheme]=useState<Theme>(()=>preference('cap-kit-theme','light',['light','dark']));
  const [borders,setBorders]=useState(()=>preference('cap-kit-borders','off',['off','on'])==='on');
  const [surface,setSurface]=useState<Surface>(()=>preference('cap-kit-surface','base',['base','canvas','raised','floating']));
  const [accent,setAccent]=useState<UI.Color>(()=>preference('cap-kit-accent','neutral',UI.colors));
  const [radius,setRadius]=useState(()=>preference('cap-kit-radius','default',['compact','default','rounded']));
  const [mobile,setMobile]=useState(false),[command,setCommand]=useState(false),[notice,setNotice]=useState('');
  const main=useRef<HTMLElement>(null);
  const component=isComponentRoute(route)?componentCatalog[route]:undefined;
  const title=c(isComponentRoute(route)?route:[...overviewPages,...foundationPages].find(page=>page.id===route)?.label??route);
  const notify=(message:string)=>setNotice(message);
  const navigate=(next:CatalogRoute)=>{setRoute(next);setMobile(false);location.hash=next;main.current?.scrollTo({top:0});};
  useEffect(()=>{const sync=()=>{const next=resolveRoute(location.hash);setRoute(next);setMobile(false);main.current?.scrollTo({top:0});if(location.hash!==`#${next}`)history.replaceState(null,'',`${location.pathname}${location.search}#${next}`);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;remember('cap-kit-theme',theme);},[theme]);
  useEffect(()=>{document.documentElement.dataset.borders=borders?'on':'off';remember('cap-kit-borders',borders?'on':'off');},[borders]);
  useEffect(()=>remember('cap-kit-surface',surface),[surface]);
  useEffect(()=>{document.documentElement.dataset.radius=radius;remember('cap-kit-radius',radius);},[radius]);
  useEffect(()=>remember('cap-kit-accent',accent),[accent]);
  useEffect(()=>{document.title=`${title} · Capacities UI`;},[title]);
  useEffect(()=>{const keydown=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setMobile(false);setCommand(current=>!current);}};window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);},[]);
  useEffect(()=>{if(!notice)return;const timeout=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timeout);},[notice]);
  const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);notify(c('Скопировано'));}catch{notify(c('Скопируйте текст вручную'));}};
  const commands=useMemo(()=>[...[...overviewPages,...foundationPages].map(page=>({id:page.id,label:c(page.label),description:c('Основы'),icon:'layers' as const,onSelect:()=>navigate(page.id)})),...componentNames.map(name=>({id:name,label:name,description:c(componentCatalog[name].description),icon:'cube' as const,onSelect:()=>navigate(name)}))],[c]);
  const Story=component?.render;
  return <div className="catalog-app"><a className="catalog-skip" href="#catalog-main" onClick={event=>{event.preventDefault();main.current?.focus();}}>{c("К содержимому")}</a>
    <aside data-surface="canvas" className="catalog-sidebar" aria-label={c("Библиотека")}><a className="catalog-brand" href="#overview" onClick={event=>{event.preventDefault();navigate('overview');}}><UI.Icon name="layers" size={21}/><span>Capacities <strong>UI</strong></span></a><Navigation route={route} onNavigate={navigate}/><div className="catalog-sidebar-footer"><LanguageSwitch locale={locale} onLocale={onLocale}/><a className="catalog-version" href="#changelog" onClick={event=>{event.preventDefault();navigate('changelog');}} aria-label={`${c('История изменений')} · v${version}`}>v{version}</a></div></aside>
    <div data-surface="base" className="catalog-main-shell">
      <main ref={main} id="catalog-main" className="catalog-main" data-surface="base" tabIndex={-1}><div className="catalog-page" key={route} data-accent={accent}>
        {Story&&isComponentRoute(route)?<><header className="catalog-page-heading"><div className="catalog-page-title"><h1>{route}</h1><UI.Tag color="neutral" size="xs" interactive={false}>{c(componentStatuses[componentMetadata(route).status])}</UI.Tag></div><p>{c(componentCatalog[route].description)}</p></header><Playground key={route} name={route} notify={notify} surface={surface}/><div className="catalog-preview cap-surface-boundary" data-surface={surface} data-accent={accent}><Story notify={notify}/></div><ComponentReference name={route} surface={surface}/><footer className="catalog-component-footer"><span className="catalog-component-id" aria-hidden="true">{componentMetadata(route).id}</span></footer></>:route==='overview'?<Overview/>:route==='changelog'?<Changelog/>:<FoundationPage route={route as FoundationRoute} theme={theme} accent={accent} copy={copy}/>}
      </div></main>
      <aside className="catalog-preview-dock" aria-label={c("Настройки каталога")}><PreviewControls radius={radius} onRadius={setRadius} theme={theme} onTheme={setTheme} borders={borders} onBorders={setBorders} surface={surface} onSurface={setSurface} accent={accent} onAccent={setAccent} onMenu={()=>setMobile(true)}/></aside>
    </div>
    <UI.Drawer open={mobile} onOpenChange={setMobile} side="left" title={c("Компоненты")} className="catalog-mobile-drawer"><Navigation route={route} onNavigate={navigate}/><div className="catalog-sidebar-footer"><LanguageSwitch locale={locale} onLocale={onLocale}/><a className="catalog-version" href="#changelog" onClick={event=>{event.preventDefault();navigate('changelog');}} aria-label={`${c('История изменений')} · v${version}`}>v{version}</a></div></UI.Drawer>
    <UI.CommandPalette open={command} onOpenChange={setCommand} items={commands} placeholder={c("Найти компонент…")}/>
    {notice&&<div className="catalog-notice"><UI.Toast title={notice} onDismiss={()=>setNotice('')}/></div>}
  </div>;
}
function FoundationHeader({title,children}:{title:string;children:ReactNode}){return <header className="page-intro"><h1>{title}</h1><p>{children}</p></header>;}
function FoundationPage({route,theme,accent,copy}:{route:FoundationRoute;theme:Theme;accent:UI.Color;copy:(value:string)=>void}){
 const c=useCatalogText();
  if(route==='layers')return <Layers/>;
  if(route==='colors')return <ColorsV2 theme={theme} accent={accent} copy={copy}/>;
  if(route==='behavior')return <RulesV2/>;
  if(route==='typography')return <><FoundationHeader title={c("Типографика")}>{c("Inter для интерфейса, Overpass Mono для кода. Основные веса — 400, 500 и 600.")}</FoundationHeader><div className="catalog-font-samples"><div><span>Inter</span><p>{c("Аа Бб 0123")}</p></div><div className="catalog-mono"><span>Overpass Mono</span><p>{c("Aa Бб 0123")}</p></div></div><div className="catalog-type-scale">{[{name:'3xl',size:'30 / 36',text:c('Место для новых идей')},{name:'2xl',size:'24 / 32',text:c('Структура помогает думать')},{name:'xl',size:'20 / 28',text:c('Заголовок раздела')},{name:'lg',size:'18 / 26',text:c('Детали, к которым возвращаются')},{name:'base',size:'15 / 21',text:c('Содержимое заметки и основной текст интерфейса.')},{name:'sm',size:'13.5 / 19',text:c('Компактные элементы и подписи.')},{name:'xs',size:'12 / 16',text:c('Обновлено сегодня · 12 объектов')},{name:'xxs',size:'11 / 14',text:c('Короткие вспомогательные подписи')}].map(item=><div key={item.name}><span>{item.name}<small>{item.size}</small></span><p style={{fontSize:`var(--cap-font-size-${item.name})`,lineHeight:`var(--cap-line-height-${item.name})`}}>{item.text}</p></div>)}</div></>;
  if(route==='geometry')return <><FoundationHeader title={c("Размеры и форма")}>{c("Базовый шаг 4 px, пять высот контролов и общая шкала скруглений.")}</FoundationHeader><section className="catalog-foundation-section"><h2>{c("Контролы")}</h2><div className="catalog-row">{(['xs','sm','md','lg','xl'] as const).map((size,index)=><div className="catalog-sample" key={size}><UI.Button size={size}>{[22,28,32,36,44][index]} px</UI.Button><span>{size}</span></div>)}</div></section><section className="catalog-foundation-section"><h2>{c("Скругления")}</h2><div className="catalog-row">{[{name:'small',size:'4.8'},{name:'base',size:'8'},{name:'xl',size:'12'},{name:'2xl',size:'16'}].map(item=><div className="catalog-sample" key={item.name}><div className="catalog-radius" style={{borderRadius:`var(--cap-radius-${item.name})`}}/><span>{item.name} · {item.size} px</span></div>)}</div></section><section className="catalog-foundation-section"><h2>{c("Отступы")}</h2><div className="catalog-spacing">{[1,2,3,4,5,6,8,10,12,16].map(step=><div key={step}><code>space-{step}</code><span style={{width:`var(--cap-space-${step})`}}/><small>{step*4} px</small></div>)}</div></section></>;
  return <Documents/>;
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
