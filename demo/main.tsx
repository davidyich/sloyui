import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as UI from '../src';
import { componentCatalog, componentGroups, componentNames, componentReference, foundationPages, isComponentRoute, resolveRoute, type CatalogRoute, type ComponentGroup, type FoundationRoute } from './catalog';
import ColorsV2 from './ColorsV2';
import RulesV2 from './RulesV2';
import '../src/styles/styles.css';
import '../src/styles/fonts.css';
import './catalog.css';
if (import.meta.env.DEV && new URLSearchParams(location.search).has('audit')) import('./audit');

type Theme = 'light' | 'dark';
type Surface = 'base' | 'canvas' | 'raised';
function preference<T extends string>(key: string, fallback: T, allowed: readonly T[]): T { try { const value=localStorage.getItem(key) as T; return allowed.includes(value)?value:fallback; } catch { return fallback; } }
function remember(key: string,value: string){try{localStorage.setItem(key,value);}catch{}}
function Navigation({ route, onNavigate }: { route: CatalogRoute; onNavigate: (route: CatalogRoute) => void }) {
  const [query,setQuery]=useState('');
  const [expanded,setExpanded]=useState<Record<ComponentGroup,boolean>>(()=>Object.fromEntries(componentGroups.map(group=>[group,true])) as Record<ComponentGroup,boolean>);
  const term=query.trim().toLocaleLowerCase();
  const matches=componentNames.filter(name=>`${name} ${componentCatalog[name].description} ${componentCatalog[name].group}`.toLocaleLowerCase().includes(term));
  return <div className="catalog-navigation"><div className="catalog-search"><UI.Icon name="search" size={15}/><UI.Input type="search" aria-label="Найти компонент" placeholder="Найти компонент…" value={query} onChange={event=>setQuery(event.target.value)}/></div><nav aria-label="Каталог компонентов" className="catalog-nav-scroll">
    {!term&&<div className="catalog-nav-section"><div className="catalog-nav-heading">Основы</div>{foundationPages.map(page=><a key={page.id} href={`#${page.id}`} aria-current={route===page.id?'page':undefined} onClick={event=>{event.preventDefault();onNavigate(page.id);}}>{page.label}</a>)}</div>}
    {componentGroups.map(group=>{const names=matches.filter(name=>componentCatalog[name].group===group);if(!names.length)return null;const open=!!term||expanded[group];return <div className="catalog-nav-section" key={group}><button className="catalog-nav-group" type="button" aria-expanded={open} onClick={()=>setExpanded(current=>({...current,[group]:!current[group]}))}><UI.Icon name="chevron" size={12}/><span>{group}</span></button>{open&&<div className="catalog-nav-items">{names.map(name=><a key={name} href={`#${name}`} aria-current={route===name?'page':undefined} onClick={event=>{event.preventDefault();onNavigate(name);}}>{name}</a>)}</div>}</div>;})}
    {term&&!matches.length&&<p className="catalog-search-empty">Ничего не найдено</p>}
  </nav></div>;
}
function App(){
  const [route,setRoute]=useState<CatalogRoute>(()=>resolveRoute(location.hash));
  const [theme,setTheme]=useState<Theme>(()=>preference('cap-kit-theme','light',['light','dark']));
  const [borders,setBorders]=useState(()=>preference('cap-kit-borders','off',['off','on'])==='on');
  const [surface,setSurface]=useState<Surface>(()=>preference('cap-kit-surface','base',['base','canvas','raised']));
  const [accent,setAccent]=useState<UI.Color>(()=>preference('cap-kit-accent','neutral',UI.colors));
  const [mobile,setMobile]=useState(false),[command,setCommand]=useState(false),[notice,setNotice]=useState('');
  const main=useRef<HTMLElement>(null);
  const component=isComponentRoute(route)?componentCatalog[route]:undefined;
  const title=isComponentRoute(route)?route:foundationPages.find(page=>page.id===route)?.label??route;
  const notify=(message:string)=>setNotice(message);
  const navigate=(next:CatalogRoute)=>{setRoute(next);setMobile(false);location.hash=next;main.current?.scrollTo({top:0});};
  useEffect(()=>{const sync=()=>{const next=resolveRoute(location.hash);setRoute(next);setMobile(false);main.current?.scrollTo({top:0});if(location.hash!==`#${next}`)history.replaceState(null,'',`${location.pathname}${location.search}#${next}`);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme;remember('cap-kit-theme',theme);},[theme]);
  useEffect(()=>{document.documentElement.dataset.borders=borders?'on':'off';remember('cap-kit-borders',borders?'on':'off');},[borders]);
  useEffect(()=>remember('cap-kit-surface',surface),[surface]);
  useEffect(()=>remember('cap-kit-accent',accent),[accent]);
  useEffect(()=>{document.title=`${title} · Capacities UI`;},[title]);
  useEffect(()=>{const keydown=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setMobile(false);setCommand(current=>!current);}};window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);},[]);
  useEffect(()=>{if(!notice)return;const timeout=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timeout);},[notice]);
  const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);notify('Скопировано');}catch{notify('Скопируйте текст вручную');}};
  const commands=useMemo(()=>[...foundationPages.map(page=>({id:page.id,label:page.label,description:'Основы',icon:'layers' as const,onSelect:()=>navigate(page.id)})),...componentNames.map(name=>({id:name,label:name,description:componentCatalog[name].description,icon:'cube' as const,onSelect:()=>navigate(name)}))],[]);
  const Story=component?.render;
  return <div className="catalog-app"><a className="catalog-skip" href="#catalog-main" onClick={event=>{event.preventDefault();main.current?.focus();}}>К содержимому</a>
    <aside data-surface="canvas" className="catalog-sidebar" aria-label="Библиотека"><a className="catalog-brand" href="#Button" onClick={event=>{event.preventDefault();navigate('Button');}}><UI.Icon name="layers" size={21}/><span>Capacities <strong>UI</strong></span></a><Navigation route={route} onNavigate={navigate}/><div className="catalog-sidebar-footer"><span>v0.3.0</span><UI.Tooltip content="Найти компонент" shortcut={['⌘','K']}><UI.IconButton icon="search" label="Поиск по каталогу" variant="ghost" onClick={()=>setCommand(true)}/></UI.Tooltip></div></aside>
    <div data-surface="raised" className="catalog-main-shell"><header className="catalog-topbar"><div className="catalog-topbar-start"><UI.IconButton className="catalog-mobile-toggle" icon="menu" label="Открыть каталог" variant="ghost" onClick={()=>setMobile(true)}/><span className="catalog-current-group">{component?.group??'Основы'}</span></div><div className="catalog-global-controls"><UI.Select aria-label="Тема" value={theme} onValueChange={value=>setTheme(value as Theme)} options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}/><UI.Switch label="Обводки" checked={borders} onChange={event=>setBorders(event.target.checked)}/></div></header>
      <main ref={main} id="catalog-main" className="catalog-main" tabIndex={-1}><div className="catalog-page" key={route}>
        {Story&&isComponentRoute(route)?<><header className="catalog-page-heading"><h1>{route}</h1><p>{componentCatalog[route].description}</p></header><div className="catalog-preview-controls"><label>Поверхность<UI.Select aria-label="Поверхность" value={surface} onValueChange={value=>setSurface(value as Surface)} options={[{value:'base',label:'Base'},{value:'canvas',label:'Canvas'},{value:'raised',label:'Raised'}]}/></label><label>Акцент<UI.Select aria-label="Акцент" value={accent} onValueChange={value=>setAccent(value as UI.Color)} options={UI.colors.map(color=>({value:color,label:color}))}/></label></div><div className="catalog-preview" data-surface={surface} data-accent={accent}><Story notify={notify}/></div><ComponentAPI name={route}/></>:<FoundationPage route={route as FoundationRoute} theme={theme} copy={copy}/>}
      </div></main>
    </div>
    <UI.Drawer open={mobile} onOpenChange={setMobile} side="left" title="Компоненты" className="catalog-mobile-drawer"><Navigation route={route} onNavigate={navigate}/></UI.Drawer>
    <UI.CommandPalette open={command} onOpenChange={setCommand} items={commands} placeholder="Найти компонент…"/>
    {notice&&<div className="catalog-notice"><UI.Toast title={notice} onDismiss={()=>setNotice('')}/></div>}
  </div>;
}
function ComponentAPI({name}:{name:keyof typeof componentCatalog}){const reference=componentReference(name);return <details className="catalog-api"><summary>API и пример <UI.Icon name="down" size={14}/></summary><div><p className="catalog-api-props">{reference.props}</p><UI.CodeBlock label={`${name}.tsx`}>{`import { ${name} } from '@personal/capacities-ui';\n\n${reference.example}`}</UI.CodeBlock></div></details>;}
function FoundationHeader({title,children}:{title:string;children:ReactNode}){return <header className="page-intro"><h1>{title}</h1><p>{children}</p></header>;}
function FoundationPage({route,theme,copy}:{route:FoundationRoute;theme:Theme;copy:(value:string)=>void}){
  if(route==='colors')return <ColorsV2 theme={theme} copy={copy}/>;
  if(route==='behavior')return <RulesV2/>;
  if(route==='typography')return <><FoundationHeader title="Типографика">Inter для интерфейса, Overpass Mono для кода. Основные веса — 400, 500 и 600.</FoundationHeader><div className="catalog-font-samples"><div><span>Inter</span><p>Аа Бб 0123</p></div><div className="catalog-mono"><span>Overpass Mono</span><p>Aa Бб 0123</p></div></div><div className="catalog-type-scale">{[{name:'3xl',size:'30 / 36',text:'Место для новых идей'},{name:'2xl',size:'24 / 32',text:'Структура помогает думать'},{name:'xl',size:'20 / 28',text:'Заголовок раздела'},{name:'lg',size:'18 / 26',text:'Детали, к которым возвращаются'},{name:'base',size:'15 / 21',text:'Содержимое заметки и основной текст интерфейса.'},{name:'sm',size:'13.5 / 19',text:'Компактные элементы и подписи.'},{name:'xs',size:'12 / 16',text:'Обновлено сегодня · 12 объектов'},{name:'xxs',size:'11 / 14',text:'Короткие вспомогательные подписи'}].map(item=><div key={item.name}><span>{item.name}<small>{item.size}</small></span><p style={{fontSize:`var(--cap-font-size-${item.name})`,lineHeight:`var(--cap-line-height-${item.name})`}}>{item.text}</p></div>)}</div></>;
  if(route==='geometry')return <><FoundationHeader title="Размеры и форма">Базовый шаг 4 px, четыре высоты контролов и общая шкала скруглений.</FoundationHeader><section className="catalog-foundation-section"><h2>Контролы</h2><div className="catalog-row">{(['xs','sm','md','lg'] as const).map((size,index)=><div className="catalog-sample" key={size}><UI.Button size={size}>{[22,28,32,36][index]} px</UI.Button><span>{size}</span></div>)}</div></section><section className="catalog-foundation-section"><h2>Скругления</h2><div className="catalog-row">{[{name:'small',size:'4.8'},{name:'base',size:'8'},{name:'xl',size:'12'},{name:'2xl',size:'16'}].map(item=><div className="catalog-sample" key={item.name}><div className="catalog-radius" style={{borderRadius:`var(--cap-radius-${item.name})`}}/><span>{item.name} · {item.size} px</span></div>)}</div></section><section className="catalog-foundation-section"><h2>Отступы</h2><div className="catalog-spacing">{[1,2,3,4,5,6,8,10,12,16].map(step=><div key={step}><code>space-{step}</code><span style={{width:`var(--cap-space-${step})`}}/><small>{step*4} px</small></div>)}</div></section></>;
  return <><FoundationHeader title="Подключение">Компоненты React, обычный CSS и короткий контракт для агента.</FoundationHeader><UI.CodeBlock label="App.tsx">{'import { Button, Field, Input } from "@personal/capacities-ui";\nimport "@personal/capacities-ui/styles.css";\n// Необязательно: локальные variable-шрифты\nimport "@personal/capacities-ui/fonts.css";\n\n// На html: data-theme="light" data-borders="off"\n// На контейнере: data-accent="teal"\n\nexport function App() {\n  return <Button variant="accent">Создать</Button>;\n}'}</UI.CodeBlock><section className="catalog-foundation-section"><h2>Что читать агенту</h2><dl className="catalog-doc-list"><dt>llms.txt</dt><dd>Карта набора и точки входа.</dd><dt>AGENTS.md</dt><dd>Правила использования и разработки.</dd><dt>agent-manifest.json</dt><dd>Выбранные компоненты: API, варианты и примеры.</dd><dt>docs/recipes.md</dt><dd>Композиции форм и коллекций.</dd><dt>docs/content-guide.md</dt><dd>Календарь, редактор, карточки и канбан.</dd></dl></section><section className="catalog-foundation-section"><h2>Стартовый запрос</h2><p className="catalog-reading">Собери личный трекер проектов с @personal/capacities-ui. Сначала прочитай llms.txt и нужные записи agent-manifest.json. Используй готовые компоненты, семантические токены и обе темы. Добавь пустые состояния и подписи полей.</p><UI.Button variant="outline" leading={<UI.Icon name="copy"/>} onClick={()=>copy('Собери личный трекер проектов с @personal/capacities-ui. Сначала прочитай llms.txt и нужные записи agent-manifest.json. Используй готовые компоненты, семантические токены и обе темы. Добавь пустые состояния и подписи полей.')}>Скопировать запрос</UI.Button></section></>;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App/>);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
