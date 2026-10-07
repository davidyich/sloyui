import { useEffect, useRef, useState } from 'react';
import * as UI from '../src';
import { preserveMarkdownSourceEdit } from '../src/components/rich-text-markdown';
import { MarkdownRichTextEditor } from '../src/components/markdown-rich-text-editor';
import { documentFiles } from './document-files';
type Doc={path:string;content:string;revision:string};
const draftKey=(path:string)=>'cap-document-draft:'+path;
function draft(path:string){try{return sessionStorage.getItem(draftKey(path));}catch{return null;}}
export default function Documents(){
 const [path,setPath]=useState<string>('docs/overview.md'),[doc,setDoc]=useState<Doc>(),[text,setText]=useState(''),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[discard,setDiscard]=useState(false),[latest,setLatest]=useState<Doc>(),[savedDraft,setSavedDraft]=useState<string|null>(null);
 const [sourceMode,setSourceMode]=useState(false);
 const generation=useRef(0),dirty=!!doc&&text!==doc.content;
 const remember=(value:string)=>{setText(value);setSavedDraft(value);try{sessionStorage.setItem(draftKey(path),value);}catch{}};
 const load=async(file:string)=>{
  const id=++generation.current;setBusy(true);setError('');setMessage('');setLatest(undefined);
  try{let value:Doc;if(import.meta.env.DEV){const response=await fetch('/__docs?path='+encodeURIComponent(file));const data=await response.json();if(!response.ok)throw Error(data.error);value=data;}else{const response=await fetch('./documents.json');const data=await response.json();value=data.files.find((item:Doc)=>item.path===file);}
   if(id!==generation.current)return;setDoc(value);setText(value.content);setSavedDraft(draft(file));setEditing(false);setSourceMode(false);
  }catch(e){if(id===generation.current)setError(String((e as Error).message));}finally{if(id===generation.current)setBusy(false);}
 };
 useEffect(()=>{void load(path);},[path]);
 useEffect(()=>{const leave=(e:BeforeUnloadEvent)=>{if(editing&&dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',leave);return()=>window.removeEventListener('beforeunload',leave);},[editing,dirty]);
 const save=async()=>{
  if(!doc||busy)return;setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/__docs?path='+encodeURIComponent(path),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:text,revision:doc.revision})});const data=await response.json();if(!response.ok)throw Error(data.error);setDoc(data);setEditing(false);setMessage('Сохранено в '+path);setSavedDraft(null);try{sessionStorage.removeItem(draftKey(path));}catch{}
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const cancel=()=>{setText(doc?.content??'');setEditing(false);setDiscard(false);setLatest(undefined);setError('');setSavedDraft(null);try{sessionStorage.removeItem(draftKey(path));}catch{}};
 return <><header className="page-intro"><h1>Инструкции</h1><p>Правила и примеры для использования системы.</p></header><div className="catalog-documents">
  <nav aria-label="Документы" className="catalog-document-nav">{documentFiles.map(file=>{const dot=file.label.lastIndexOf('.');return <UI.Button key={file.path} variant="ghost" size="sm" title={file.label} aria-current={path===file.path?'page':undefined} disabled={editing||busy} onClick={()=>{setDoc(undefined);setPath(file.path);}}><span className="catalog-document-nav-name"><span className="catalog-document-nav-base">{dot>0?file.label.slice(0,dot):file.label}</span>{dot>0&&<span className="catalog-document-nav-ext">{file.label.slice(dot)}</span>}</span></UI.Button>;})}</nav>
  <section className="catalog-document cap-surface-boundary" data-surface="raised" aria-busy={busy}><div className="catalog-document-toolbar"><code>{path}</code><div>{editing?<><UI.Button size="sm" variant="ghost" disabled={busy} onClick={()=>dirty?setDiscard(true):cancel()}>Отмена</UI.Button><UI.Button size="sm" disabled={busy||!dirty} onClick={save}>{busy?'Сохранение…':'Сохранить'}</UI.Button></>:<UI.Button size="sm" disabled={busy||!doc||!import.meta.env.DEV} title={!import.meta.env.DEV?'Редактирование доступно в npm run dev':undefined} onClick={()=>{setEditing(true);setSourceMode(false);setMessage('');}}>Редактировать</UI.Button>}</div></div>
   {error&&<UI.Callout color="red" title={editing?"Не удалось сохранить изменения":"Документ недоступен"}>{error}{editing&&<UI.Button size="sm" variant="ghost" onClick={async()=>{const response=await fetch('/__docs?path='+encodeURIComponent(path));if(response.ok)setLatest(await response.json());}}>Показать версию на диске</UI.Button>}</UI.Callout>}
   {message&&<p role="status" className="catalog-document-status">{message}</p>}
   {doc&&!editing&&savedDraft&&savedDraft!==doc.content&&<UI.Callout title="Есть несохранённый черновик"><UI.Button size="sm" variant="ghost" onClick={()=>{setText(savedDraft!);setSourceMode(false);setEditing(true);}}>Восстановить</UI.Button><UI.Button size="sm" variant="ghost" onClick={cancel}>Удалить черновик</UI.Button></UI.Callout>}
   {!doc&&!error?<p role="status">Загрузка…</p>:editing?<><UI.Tabs label="Режим редактирования инструкций" variant="segment" items={[{value:'rich',label:'Rich edit',content:null},{value:'markdown',label:'Markdown',content:null}]} value={sourceMode?'markdown':'rich'} onValueChange={value=>setSourceMode(value==='markdown')}/>{sourceMode?<UI.Textarea value={text} onChange={event=>remember(preserveMarkdownSourceEdit(text,event.target.value))} label={'Редактор '+path} disabled={busy} rows={24} className="catalog-document-editor"/>:<MarkdownRichTextEditor value={text} onValueChange={remember} label={'Редактор '+path} disabled={busy} className="catalog-document-editor"/>}</>:doc&&<UI.MarkdownPreview value={doc.content}/>}
   {latest&&<section className="catalog-conflict"><h2>Версия на диске</h2><UI.MarkdownPreview value={latest.content}/><UI.Button size="sm" onClick={()=>{setDoc(latest);setLatest(undefined);setError('');setMessage('Актуальная версия прочитана. Проверьте ваш текст перед сохранением.');}}>Продолжить с моим текстом</UI.Button></section>}
  </section></div>
  <UI.Dialog open={discard} onOpenChange={setDiscard} title="Отменить изменения?" footer={<><UI.Button variant="ghost" onClick={()=>setDiscard(false)}>Продолжить редактирование</UI.Button><UI.Button variant="danger" onClick={cancel}>Отменить изменения</UI.Button></>}>Несохранённый черновик этого файла будет удалён.</UI.Dialog>
 </>;
}
