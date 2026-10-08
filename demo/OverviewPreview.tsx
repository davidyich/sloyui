import {ResizableExample} from './ResizableExample';
import {useCatalogText} from './catalog-locale';
import {useId, type ReactNode} from 'react';
import * as UI from '../src';
import {playgrounds} from './Playground';
import {arcPlaygrounds} from './PlaygroundArc';
import type {ComponentName} from './catalog';

/** A single default example, shared with the typed playground, never a cropped story page. */
export function OverviewPreview({name}:{name:ComponentName}) {
 const id=useId(), t=UI.useTranslate(), c=useCatalogText();
 const noop=()=>{};
 const title=t('Сад идей','Idea garden');
 const note=t('Следующий шаг','Next step');
 const compact:Partial<Record<ComponentName,()=>ReactNode>>={
  FileCard:()=> <UI.FileCard name="brand-guidelines.pdf" sizeLabel="248 KB"/>,
  ToastStack:()=> <UI.ToastStack position="inline" expandDirection="down" label={t('Уведомления','Notifications')} items={[{id:'one',title:t('Сборка готова','Build ready'),duration:Infinity},{id:'two',title:t('Изменения сохранены','Changes saved'),duration:Infinity},{id:'three',title:t('Публикуем проект…','Deploying to production…'),description:t('Собираем страницы проекта.','Building project pages.'),loading:true}]} onDismiss={noop}/>,
  ResizablePanelGroup:()=> <ResizableExample nested={false}/>,
  Button:()=> <UI.Button variant="primary" leading={<UI.Icon name="plus"/>}>{t('Создать','Create')}</UI.Button>,
  FloatingActionBar:()=> <UI.FloatingActionBar size="sm" position="static" label={t('Действия','Actions')} leading={<UI.Counter value={2}/>} trailing={<UI.Button variant="primary">{t('Готово','Done')}</UI.Button>}><UI.IconButton icon="list" label={t('Список','List')} variant="ghost"/><UI.IconButton icon="sliders" label={t('Параметры','Settings')} variant="ghost"/></UI.FloatingActionBar>,
  Calendar:()=> <UI.Calendar label={t('Календарь','Calendar')} defaultMonth="2026-10" today="2026-10-08" value="2026-10-08" onValueChange={noop} showAgenda={false}/>,
  ContentCard:()=> <UI.ContentCard title={title} description={t('Наблюдения и заметки проекта.','Project observations and notes.')} metadata={<UI.Tag interactive={false}>{t('Проект','Project')}</UI.Tag>}/>,
  ReorderableList:()=> <UI.ReorderableList<{id:string;text:string}> label={t('Порядок заметок','Note order')} items={[{id:'one',text:title},{id:'two',text:note}]} getItemLabel={item=>item.text} onOrderChange={noop} renderItem={item=>item.text}/>,
  ResizableCard:()=> <UI.ResizableCard label={title} defaultSize={{width:280,height:150}}><h3>{title}</h3><p>{t('Место для новых идей.','A place for new ideas.')}</p></UI.ResizableCard>,
  ContentLayout:()=> <UI.ContentLayout collapseAt={0} minContentSize={120} left={{label:t('Заметки','Notes'),defaultWidth:140,minWidth:100,content:<UI.SidebarItem active>{title}</UI.SidebarItem>}} style={{height:280}}><UI.ContentCard title={note}/></UI.ContentLayout>,
  KanbanColumn:()=> <UI.KanbanColumn title={t('В работе','In progress')} count={1}><UI.TaskCard title={note}/></UI.KanbanColumn>,
  SidebarPanel:()=> <UI.SidebarPanel label={t('Навигация','Navigation')} width={240} surface="raised"><UI.SidebarItem icon="folder" active>{t('Проекты','Projects')}</UI.SidebarItem><UI.SidebarItem icon="book">{t('Заметки','Notes')}</UI.SidebarItem></UI.SidebarPanel>,
  MarkdownEditorV2:()=> <UI.MarkdownEditorV2 label={t('Заметка','Note')} value={`## ${title}\n\n${note}`} onValueChange={noop} readOnly/>,
  RichTextEditor:()=> <UI.RichTextEditor label={t('Заметка','Note')} readOnly onValueChange={noop} value={{blocks:[UI.createRichTextBlock('heading1',[{text:title}]),UI.createRichTextBlock('paragraph',[{text:t('Запишите мысль и вернитесь к ней позже.','Capture an idea and return to it later.')}])]}}/>,
  ScrollArea:()=> <UI.ScrollArea label={t('Список заметок','Notes list')} style={{height:140,width:250}}>{[title,note,t('Визуальный архив','Visual archive'),t('Коллекция','Collection')].map((text,i)=><UI.CollectionRow key={i} title={text} icon="page"/>)}</UI.ScrollArea>,
  CodeBlock:()=> <UI.CodeBlock filename="example.tsx" language="tsx" showLanguageSelector={false} lineNumbers>{'<Button variant="primary">\n  Save changes\n</Button>'}</UI.CodeBlock>,
 };
 if(compact[name])return <>{compact[name]!()}</>;
 const spec=(playgrounds as Record<string, typeof playgrounds.Button>)[name] ?? (arcPlaygrounds as Record<string, typeof arcPlaygrounds.ComboBox>)[name];
 const values=Object.fromEntries(spec.controls.map(control=>[control.key,typeof control.initial==='string'&&!control.options?c(control.initial):control.initial]));
 // Small, representative values keep the whole example visible without hiding its content.
 Object.assign(values,{height:180,rows:2,count:2,months:'1',showAgenda:false,points:10,events:false,header:false,footer:false});
 return <>{spec.render(values,{set:noop,notify:noop,id,icons:[],t:c})}</>;
}
