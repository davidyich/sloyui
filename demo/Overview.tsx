import { useEffect,useRef,useState } from 'react';
import * as UI from '../src';
import {componentCatalog,componentMetadata,componentNames,componentStatuses,registryGroups,type ComponentName} from './catalog';
import changelog from '../CHANGELOG.md?raw';

function Preview({name}:{name:ComponentName}) {
 const ref=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:'120px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const Story=componentCatalog[name].render;
 return <div ref={ref} className="catalog-overview-preview" data-surface="raised" inert aria-hidden="true">{visible&&<div className="catalog-overview-mini"><Story notify={()=>{}}/></div>}</div>;
}
export function Overview(){
 const [query,setQuery]=useState(''),[group,setGroup]=useState('all');
 const names=componentNames.filter(name=>(group==='all'||(componentMetadata(name).groups as string[]).includes(group))&&`${name} ${componentMetadata(name).id} ${componentCatalog[name].description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 return <><header className="page-intro"><h1>Обзор компонентов</h1><p>{componentNames.length} компонентов для личных проектов. Найдите нужный элемент, откройте живой пример и настройте его под свою поверхность.</p></header><div className="catalog-overview-filters"><UI.Input type="search" aria-label="Поиск в обзоре" placeholder="Найти компонент" leading={<UI.Icon name="search"/>} value={query} onChange={e=>setQuery(e.target.value)}/><UI.Select aria-label="Группа в обзоре" value={group} onValueChange={setGroup} options={[{value:'all',label:'Все группы'},...registryGroups.map(item=>({value:item.id,label:item.label}))]}/></div>{registryGroups.filter(item=>group==='all'||item.id===group).map(item=>{const children=names.filter(name=>group!=='all'||componentMetadata(name).primaryGroup===item.id);return children.length>0&&<section key={item.id} className="catalog-overview-group"><h2>{item.label}<span>{children.length}</span></h2><div className="catalog-overview-grid">{children.map(name=>{const record=componentMetadata(name);return <article key={name} className="catalog-overview-card"><Preview name={name}/><a href={`#${name}`}><strong>{name}<UI.Icon name="arrow" size={16}/></strong><p>{componentCatalog[name].description}</p>{record.status!=='ready'&&<small>{componentStatuses[record.status]}</small>}</a></article>;})}</div></section>;})}{!names.length&&<UI.EmptyState title="Ничего не найдено" icon={false} description="Попробуйте другое название или группу."/>}</>;
}
export function Changelog(){return <><header className="page-intro"><h1>Changelog</h1><p>Изменения библиотеки и каталога. Источник этой страницы — CHANGELOG.md в репозитории.</p></header><div className="catalog-changelog"><UI.MarkdownPreview value={changelog.replace(/^# Changelog\s*/,'')}/></div></>;}
