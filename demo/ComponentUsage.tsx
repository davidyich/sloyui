import {useEffect,useId,useState} from 'react';
import * as UI from '../src';
import {catalogAPI} from './catalog-channel';
import {useCatalogAdmin} from './CatalogAdmin';
import './component-usage.css';

const bundledInstructions=import.meta.glob<string>('../docs/components/cp-*.md',{query:'?raw',import:'default'});
export const COMPONENT_INSTRUCTION_SAVED='sloy-component-instruction-saved';

/** Present the canonical Markdown; owner headings and unstructured drafts remain readable. */
export function parseComponentUsage(content:string){
 const sections:{title:string;content:string}[]=[];
 let current={title:'',content:''};
 let fence=false;
 for(const line of content.split('\n')){
  if(/^\s*(```|~~~)/.test(line))fence=!fence;
  const heading=!fence?/^##\s+(.+?)\s*$/.exec(line):null;
  if(heading){if(current.content.trim())sections.push({...current,content:current.content.trim()});current={title:heading[1],content:''};}
  else current.content+=line+'\n';
 }
 if(current.content.trim())sections.push({...current,content:current.content.trim()});
 // Hide only the standard component heading/ID, leaving arbitrary owner introductions intact.
 if(sections[0]?.title===''){
  sections[0].content=sections[0].content.replace(/^# [^\n]+\n+cp-\d+ · Индивидуальная инструкция\s*/,'').trim();
  if(!sections[0].content)sections.shift();
 }
 return sections;
}

/** Keep custom Markdown intact and compare the paired guidance in a semantic table. */
export function ComponentInstruction({content}:{content:string}){
 const t=UI.useTranslate(),sections=parseComponentUsage(content);
 const isDo=(title:string)=>/^(делать|do|doing)$/i.test(title.trim());
 const isDont=(title:string)=>/^(не делать|don[’']?t|dont)$/i.test(title.trim());
 const guidance=sections.filter(section=>isDo(section.title)||isDont(section.title));
 const paired=guidance.some(section=>isDo(section.title))&&guidance.some(section=>isDont(section.title));
 const first=sections.findIndex(section=>guidance.includes(section));
 return <div className="catalog-usage-sections">{sections.map((section,index)=>{
  if(paired&&guidance.includes(section)){
   if(index!==first)return null;
   return <div key={index} className="catalog-usage-guidance"><table aria-label={t('Рекомендации по применению','Usage recommendations')}><thead><tr><th scope="col"><h3>{t('Делать','Do')}</h3></th><th scope="col"><h3>{t('Не делать','Don’t')}</h3></th></tr></thead><tbody><tr>{[isDo,isDont].map((matches,column)=><td key={column}>{guidance.filter(item=>matches(item.title)).map((item,itemIndex)=><UI.MarkdownPreview key={itemIndex} value={item.content} headingOffset={2}/>)}</td>)}</tr></tbody></table></div>;
  }
  return <div key={index} className="catalog-usage-section">{section.title&&<h3>{section.title}</h3>}<UI.MarkdownPreview value={section.content} headingOffset={2}/></div>;
 })}</div>;
}

export function ComponentUsage({componentId,componentName,onEdit}:{componentId:string;componentName:string;onEdit?:()=>void}){
 const t=UI.useTranslate(),{admin}=useCatalogAdmin(),headingId=useId();
 const [document,setDocument]=useState<{id:string;content:string;fallback:boolean}>(),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{const saved=(event:Event)=>{if((event as CustomEvent<string>).detail===componentId)setRevision(value=>value+1);};window.addEventListener(COMPONENT_INSTRUCTION_SAVED,saved);return()=>window.removeEventListener(COMPONENT_INSTRUCTION_SAVED,saved);},[componentId]);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  void (async()=>{
   try{
    const response=await fetch(catalogAPI(`/api/catalog/components/${componentId}/history`),{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('Instruction unavailable');
    const value=await response.json();
    if(typeof value.instruction?.content!=='string')throw Error('Invalid instruction');
    if(!controller.signal.aborted)setDocument({id:componentId,content:value.instruction.content,fallback:false});
   }catch{
    if(controller.signal.aborted)return;
    try{const load=bundledInstructions[`../docs/components/${componentId}.md`];if(!load)throw Error('Missing bundled instruction');const content=await load();if(!controller.signal.aborted)setDocument({id:componentId,content,fallback:true});}
    catch{if(!controller.signal.aborted){setDocument(undefined);setError(t('Не удалось загрузить инструкцию.','Could not load instruction.'));}}
   }finally{if(!controller.signal.aborted)setLoading(false);}
  })();return()=>controller.abort();
 },[componentId,revision,t]);
 const content=document?.id===componentId?document.content:'';
 return <section className="catalog-component-usage" aria-labelledby={headingId} aria-busy={loading||undefined}>
  <header className="catalog-usage-heading"><h2 id={headingId}>{t('Применение ','Usage ')}{componentName}</h2>{admin&&onEdit&&<UI.Button size="sm" variant="ghost" onClick={onEdit}>{t('Редактировать инструкцию','Edit instruction')}</UI.Button>}</header>
  {loading?<p role="status" className="catalog-muted">{t('Загрузка инструкции…','Loading instruction…')}</p>:error?<UI.Callout title={error}><UI.Button size="sm" variant="ghost" onClick={()=>setRevision(value=>value+1)}>{t('Повторить','Retry')}</UI.Button></UI.Callout>:<>
   {document?.fallback&&<p className="catalog-muted">{t('Показана инструкция из сборки. Сохранённая на сайте версия временно недоступна.','Showing the bundled instruction. The saved site version is temporarily unavailable.')}</p>}
   {content.trim()?<ComponentInstruction content={content}/>:<p className="catalog-muted">{t('Отдельная инструкция пока не добавлена.','No component instruction has been added yet.')}</p>}
  </>}
 </section>;
}
