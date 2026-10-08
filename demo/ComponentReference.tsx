import {useCatalogText} from './catalog-locale';
import {useEffect,useState} from 'react';
import * as UI from '../src';
import { componentCatalog, componentMetadata, componentReference, type ComponentName } from './catalog';

export function ComponentReference({name,surface}:{name:ComponentName;surface:'base'|'canvas'|'raised'|'floating'}) {
 const c=useCatalogText();
 const record=componentReference(name);
 const composition='composition' in record?record.composition:[];
 const [copyStatus,setCopyStatus]=useState('');
 useEffect(()=>{if(!copyStatus)return;const timer=setTimeout(()=>setCopyStatus(''),2400);return()=>clearTimeout(timer);},[copyStatus]);
 const code=`import { ${[name,...composition.map(part=>part.name)].join(', ')} } from '${UI.SLOY_UI.packageName}';\nimport '${UI.SLOY_UI.packageName}/styles.css';\n\n${record.example}`;
 const copy=async()=>{try{await navigator.clipboard.writeText(JSON.stringify({name,...record},null,2));setCopyStatus(c('Скопировано'));}catch{setCopyStatus(c('Не удалось скопировать'));}};
 return <>
  <section className="catalog-reference-section" aria-labelledby={`${name}-usage`}><h2 id={`${name}-usage`}>{c("Использование")}</h2><p>{c(record.usage)}</p><UI.CodeBlock label={`${name}.tsx`} defaultLanguage="tsx" showLanguageSelector={false} variant="surface" lineNumbers>{code}</UI.CodeBlock></section>
  <section className="catalog-reference-section" aria-labelledby={`${name}-api`}><h2 id={`${name}-api`}>API Reference</h2><ApiTable name={name} api={record.api} surface={surface}/>{composition.map(part=><div className="catalog-composition-api" key={part.name}><h3>{part.name}</h3><ApiTable name={part.name} api={part.api} surface={surface}/></div>)}<p className="catalog-reference-note">{c("Типы и явные значения по умолчанию извлекаются из исходников. «—» означает, что явное значение в сигнатуре не задано; ? — необязательный параметр.")}</p></section>
  <section className="catalog-agent-guide cap-surface-boundary" data-surface="raised" aria-labelledby={`${name}-agent`}><header><h2 id={`${name}-agent`}>{c("Для агентов")}</h2><UI.Button size="sm" variant="ghost" leading={<UI.Icon name="copy" size={14}/>} onClick={()=>{void copy();}}>{copyStatus||c('Копировать контракт')}</UI.Button></header><p>{record.agentNotes}</p><span className="cap-sr-only" role="status">{copyStatus}</span><small><code>{record.id}</code> · <code>{record.source}</code> {c("· запись")} <code>{name}</code> {c("в agent-manifest.json")}</small></section>
  <section className="catalog-reference-section" aria-labelledby={`${name}-related`}><h2 id={`${name}-related`}>{c("Связанные компоненты")}</h2><div className="catalog-related">{record.related.map(related=>{const key=related as ComponentName;return <a key={key} href={`#${key}`} className="catalog-related-card cap-surface-boundary" data-surface="raised"><span>{key}<UI.Icon name="arrow" size={16}/></span><p>{c(componentCatalog[key].description)}</p><small aria-hidden="true">{componentMetadata(key).id}</small></a>;})}</div></section>
 </>;
}


type ApiRow={name:string;type:string;required:boolean;default:string|null;description:string};
function ApiTable({name,api,surface}:{name:string;api:ApiRow[];surface:'base'|'canvas'|'raised'|'floating'}){
 const c=useCatalogText();
 return <div className="catalog-api-table-wrap cap-surface-boundary" data-surface={surface}><table className="catalog-api-table"><caption className="cap-sr-only">{c('Публичные параметры')} {name}</caption><thead><tr><th scope="col">{c('Параметр')}</th><th scope="col">{c('Тип')}</th><th scope="col">{c('По умолчанию')}</th><th scope="col">{c('Описание')}</th></tr></thead><tbody>{api.map(prop=><tr key={prop.name}><th scope="row"><code>{prop.name}{prop.required||prop.name==='…props'?'':'?'}</code></th><td data-label={c('Тип')}><code>{prop.type}</code></td><td data-label={c('По умолчанию')}>{prop.default===null?<span className="catalog-api-none">—</span>:<code>{prop.default}</code>}</td><td data-label={c('Описание')}>{c(prop.description)}</td></tr>)}</tbody></table></div>;
}
