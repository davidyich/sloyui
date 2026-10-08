import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useState } from 'react';
import { Button, Input } from '../src';
import { CommentThread, InlineComments, type InlineCommentAnchor, type ThreadComment } from '../src/components/comments';
import { StorySection } from './stories-controls';

const me={id:'me',name:'Mina Park'},alex={id:'alex',name:'Alex Chen'},sam={id:'sam',name:'Sam Rivera'};
const sample:ThreadComment[]=[{id:'c1',author:alex,body:'Could we make the title a little clearer for first-time readers?',createdAt:'12 min ago',reactions:[{emoji:'👍',users:['alex','me']}],replies:[{id:'c2',author:sam,body:'Maybe add a short description below it.',createdAt:'8 min ago'}]}];
export function CommentThreadStory(){
 const ct=useCatalogText();
const [resolved,setResolved]=useState(false);return <StorySection><div className="catalog-narrow"><CommentThread currentUser={me} people={[alex,sam]} defaultComments={sample} resolved={resolved} onResolvedChange={setResolved} title="Page title"/></div></StorySection>}
export function InlineCommentsStory(){
 const ct=useCatalogText();
const [anchors,setAnchors]=useState<InlineCommentAnchor[]>([{id:'pin-1',x:.34,y:.3,title:'Cover image',comments:[{id:'inline-1',author:alex,body:'This image crop feels a little tight on mobile.',createdAt:'5 min ago'}]}]),[title,setTitle]=useState('Project overview'),[draft,setDraft]=useState(title),[editing,setEditing]=useState(false);const save=()=>{setTitle(draft.trim()||title);setEditing(false)};return <StorySection><InlineComments currentUser={me} people={[alex,sam]} anchors={anchors} onAnchorsChange={setAnchors}><article className="cap-inline-demo-canvas"><div className="catalog-row" style={{alignItems:'center',justifyContent:'space-between'}}>{editing?<><Input label={ct("Название страницы")} size="sm" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')save();if(event.key==='Escape'){setDraft(title);setEditing(false)}}}/><Button size="sm" onClick={save}>{ct("Сохранить")}</Button></>:<><h2>{title}</h2><Button size="sm" variant="ghost" onClick={()=>{setDraft(title);setEditing(true)}}>{ct("Изменить заголовок")}</Button></>}</div><p>Ideas, references, decisions and notes for the next release.</p><div className="cap-inline-demo-image">Cover image</div></article></InlineComments></StorySection>}
