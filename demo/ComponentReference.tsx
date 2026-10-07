import {useEffect,useState} from 'react';
import * as UI from '../src';
import { componentCatalog, componentMetadata, componentReference, type ComponentName } from './catalog';

export function ComponentReference({name,surface}:{name:ComponentName;surface:'base'|'canvas'|'raised'|'floating'}) {
 const record=componentReference(name);
 const [copyStatus,setCopyStatus]=useState('');
 useEffect(()=>{if(!copyStatus)return;const timer=setTimeout(()=>setCopyStatus(''),2400);return()=>clearTimeout(timer);},[copyStatus]);
 const code=`import { ${name} } from '@personal/capacities-ui';\nimport '@personal/capacities-ui/styles.css';\n\n${record.example}`;
 const copy=async()=>{try{await navigator.clipboard.writeText(JSON.stringify({name,...record},null,2));setCopyStatus('Скопировано');}catch{setCopyStatus('Не удалось скопировать');}};
 return <>
  <section className="catalog-reference-section" aria-labelledby={`${name}-usage`}><h2 id={`${name}-usage`}>Использование</h2><p>{record.usage}</p><UI.CodeBlock label={`${name}.tsx`} defaultLanguage="tsx" showLanguageSelector={false} variant="surface" lineNumbers>{code}</UI.CodeBlock></section>
  <section className="catalog-reference-section" aria-labelledby={`${name}-api`}><h2 id={`${name}-api`}>API Reference</h2><div className="catalog-api-table-wrap" data-surface={surface}><table className="catalog-api-table"><caption className="cap-sr-only">Публичные параметры {name}</caption><thead><tr><th scope="col">Параметр</th><th scope="col">Тип</th><th scope="col">По умолчанию</th><th scope="col">Описание</th></tr></thead><tbody>{record.api.map(prop=><tr key={prop.name}><th scope="row"><code>{prop.name}{prop.required||prop.name==='…props'?'':'?'}</code></th><td data-label="Тип"><code>{prop.type}</code></td><td data-label="По умолчанию">{prop.default===null?<span className="catalog-api-none">—</span>:<code>{prop.default}</code>}</td><td data-label="Описание">{prop.description}</td></tr>)}</tbody></table></div><p className="catalog-reference-note">Типы и явные значения по умолчанию извлекаются из исходников. «—» означает, что явное значение в сигнатуре не задано; ? — необязательный параметр.</p></section>
  <section className="catalog-agent-guide" data-surface="canvas" aria-labelledby={`${name}-agent`}><header><h2 id={`${name}-agent`}>Для агентов</h2><UI.Button size="sm" variant="ghost" leading={<UI.Icon name="copy" size={14}/>} onClick={()=>{void copy();}}>{copyStatus||'Копировать контракт'}</UI.Button></header><p>{record.agentNotes}</p><span className="cap-sr-only" role="status">{copyStatus}</span><small><code>{record.id}</code> · <code>{record.source}</code> · запись <code>{name}</code> в agent-manifest.json</small></section>
  <section className="catalog-reference-section" aria-labelledby={`${name}-related`}><h2 id={`${name}-related`}>Связанные компоненты</h2><div className="catalog-related">{record.related.map(related=>{const key=related as ComponentName;return <a key={key} href={`#${key}`} className="catalog-related-card" data-surface="canvas"><span>{key}<UI.Icon name="arrow" size={16}/></span><p>{componentCatalog[key].description}</p><small aria-hidden="true">{componentMetadata(key).id}</small></a>;})}</div></section>
 </>;
}
