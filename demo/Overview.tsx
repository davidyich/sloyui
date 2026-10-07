import {useCatalogText,localizedChangelog} from './catalog-locale';
import {OverviewPreview} from './OverviewPreview';
import { useEffect,useRef,useState } from 'react';
import * as UI from '../src';
import {componentCatalog,componentMetadata,componentNames,componentStatuses,registryGroups,type ComponentName} from './catalog';
import changelog from '../CHANGELOG.md?raw';

export function Preview({name}:{name:ComponentName}) {
 const ref=useRef<HTMLDivElement>(null), sample=useRef<HTMLDivElement>(null), [visible,setVisible]=useState(false),[scale,setScale]=useState(1);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:'240px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!visible||!ref.current||!sample.current)return; const frame=ref.current, child=sample.current;
  const measure=()=>setScale(Math.min(1,(frame.clientWidth-48)/Math.max(1,child.offsetWidth),(frame.clientHeight-48)/Math.max(1,child.offsetHeight)));
  const observer=new ResizeObserver(measure);observer.observe(frame);observer.observe(child);measure();return()=>observer.disconnect();
 },[visible]);
 const wide=['ResizablePanelGroup','ContentLayout','KanbanBoard','DataTable','NavigationMenu','FilterToolbar','AnnouncementBar','InlineComments','Toast','SlopeChart'].includes(name);
 return <div ref={ref} className="catalog-overview-preview cap-surface-boundary" data-surface="raised" inert aria-hidden="true">{visible&&<div ref={sample} className="catalog-overview-mini" data-component={name} style={{width:name==='KanbanBoard'?560:wide?460:280,transform:`translate(-50%,-50%) scale(${scale})`}}><OverviewPreview name={name}/></div>}</div>;
}
export function Overview(){
 const c=useCatalogText();
 const [query,setQuery]=useState(''),[group,setGroup]=useState('all');
 const names=componentNames.filter(name=>(group==='all'||(componentMetadata(name).groups as string[]).includes(group))&&`${name} ${componentMetadata(name).id} ${componentCatalog[name].description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <><header className="page-intro"><h1>{c("Обзор компонентов")}</h1><p>{componentNames.length} {c("компонентов для личных проектов. Найдите нужный элемент, откройте живой пример и настройте его под свою поверхность.")}</p></header><div className="catalog-overview-filters"><UI.Input type="search" aria-label={c("Поиск в обзоре")} placeholder={c("Найти компонент")} leading={<UI.Icon name="search"/>} value={query} onChange={e=>setQuery(e.target.value)}/><UI.Select aria-label={c("Группа в обзоре")} value={group} onValueChange={setGroup} options={[{value:'all',label:c('Все группы')},...registryGroups.map(item=>({value:item.id,label:c(item.label)}))]}/></div>{registryGroups.filter(item=>group==='all'||item.id===group).map(item=>{const children=names.filter(name=>group!=='all'||componentMetadata(name).primaryGroup===item.id);return children.length>0&&<section key={item.id} className="catalog-overview-group"><h2>{c(item.label)}<span>{children.length}</span></h2><div className="catalog-overview-grid">{children.map(name=>{const record=componentMetadata(name);return <article key={name} className="catalog-overview-card"><Preview name={name}/><a href={`#${name}`} aria-label={name}><span>{name}</span>{record.status!=='ready'&&<span className="catalog-review-dot" data-status={record.status} aria-label={c(componentStatuses[record.status])} role="img"/>}</a></article>;})}</div></section>;})}{!names.length&&<UI.EmptyState title={c("Ничего не найдено")} icon={false} description={c("Попробуйте другое название или группу.")}/>}</>;
}
export function Changelog(){
 const c=useCatalogText(),locale=UI.useLocale();return <><header className="page-intro"><h1>Changelog</h1><p>{c("Изменения библиотеки и каталога. Источник этой страницы — CHANGELOG.md в репозитории.")}</p></header><div className="catalog-changelog"><UI.MarkdownPreview value={localizedChangelog(changelog,locale).replace(/^# Changelog\s*/,'')}/></div></>;}
