import { useState } from 'react';
import { Button, Tag } from '../src/components/primitives';
import { BottomSheet } from '../src/components/bottom-sheet';
import { FileTree, type FileTreeNode } from '../src/components/file-tree';
import { PreviewRail, type PreviewRailItem } from '../src/components/preview-rail';
import { CodeBlock } from '../src/components/code-block';
import { StorySection } from './stories-controls';

export const revisionFiles: FileTreeNode[] = [
  { id:'app', name:'app', type:'folder', children:[
    { id:'components',name:'components',type:'folder',children:[
      { id:'button',name:'Button.tsx',type:'file',description:'Основное действие с доступным состоянием loading.',preview:<CodeBlock language="tsx" children={'export function SaveButton() {\n  return <Button>Сохранить</Button>;\n}'}/> },
      { id:'sheet',name:'BottomSheet.tsx',type:'file',description:'Нижняя панель с уровнями высоты и ручкой.',preview:<p>Панель открывается в отдельном слое, а её содержимое остаётся доступно с клавиатуры.</p> },
    ]},
    { id:'styles',name:'styles.css',type:'file',description:'Семантические поверхности и состояния.',preview:<CodeBlock language="css" children={'.surface {\n  background: var(--cap-surface-current);\n  color: var(--cap-content-primary);\n}'}/> },
  ]},
  { id:'assets',name:'assets',type:'folder',children:[] },
  { id:'package',name:'package.json',type:'file',description:'Состав пакета и команды проверки.',preview:<CodeBlock language="json" children={'{\n  "name": "@personal/capacities-ui",\n  "version": "0.4.0"\n}'}/> },
  { id:'archive',name:'archive.zip',type:'file',disabled:true,description:'Архив недоступен в этом примере.' },
];
export const revisionRailItems: PreviewRailItem[] = [
  {id:'overview',label:'Обзор',description:'Компоненты, поверхности и состояния для новых экранов.',href:'#Button'},
  {id:'actions',label:'Действия',description:'Кнопки и компактные панели управления.',href:'#Button'},
  {id:'fields',label:'Поля',description:'Ввод, выбор и проверка данных.',href:'#Input'},
  {id:'navigation',label:'Навигация',description:'Вкладки, деревья и меню.',href:'#NavigationMenu'},
  {id:'layers',label:'Слои',description:'Панели и всплывающие поверхности.',href:'#BottomSheet'},
  {id:'tokens',label:'Цвета',description:'Локальные акценты и семантические поверхности.',href:'#colors'},
  {id:'type',label:'Типографика',description:'Масштабы текста и иерархия.',href:'#typography'},
  {id:'rules',label:'Инструкции',description:'Правила использования компонентов.',href:'#agents'},
  {id:'disabled',label:'Недоступный раздел',description:'Этот раздел отключён.',disabled:true},
];
export function BottomSheetStory() {
  const [open,setOpen]=useState(false),[saved,setSaved]=useState(false),[snap,setSnap]=useState(0);
  return <StorySection title="Панель с ручкой и уровнями высоты"><div style={{display:'grid',gap:12}}><Button onClick={()=>setOpen(true)}>Открыть нижнюю панель</Button>{saved&&<Tag interactive={false} color="green">Изменения сохранены</Tag>}</div><BottomSheet open={open} onOpenChange={setOpen} title="Быстрые действия" description="Потяните ручку, используйте стрелки или Escape." snapPoints={[.45,.8]} snap={snap} onSnapChange={setSnap} footer={<Button onClick={()=>{setSaved(true);setOpen(false);}}>Сохранить и закрыть</Button>}><div style={{display:'grid',gap:12}}><p>Содержимое прокручивается независимо от ручки. Текст можно выделять, а действия доступны с клавиатуры.</p><Button variant="ghost" onClick={()=>setSnap(snap===0?1:0)}>Изменить высоту</Button>{Array.from({length:5},(_,index)=><p key={index}>Заметка {index+1}: проверьте тексты, владельцев и сроки перед сохранением.</p>)}</div></BottomSheet></StorySection>;
}
export function FileTreeStory() {
  const [selected,setSelected]=useState('button'),[notice,setNotice]=useState('');
  const actions = (nodes: FileTreeNode[]): FileTreeNode[] => nodes.map(node=>({...node,children:node.children?actions(node.children):undefined,actions:node.type==='file'&&!node.disabled?[{id:'open',label:'Открыть файл',icon:'external',onSelect:file=>setNotice(`Открыт ${file.name}`)},{id:'copy',label:'Копировать имя',icon:'copy',onSelect:async file=>{try { if (!navigator.clipboard) { setNotice('Буфер обмена недоступен'); return; } await navigator.clipboard.writeText(file.name); setNotice(`Скопировано имя ${file.name}`); } catch { setNotice('Не удалось скопировать имя файла'); }}}]:undefined}));
  return <StorySection title="Файлы, ветви и предпросмотр"><FileTree label="Пример файлов проекта" nodes={actions(revisionFiles)} selectedId={selected} onSelect={node=>setSelected(node.id)} defaultExpandedIds={['app','components']}/>{notice&&<p role="status">{notice}</p>}</StorySection>;
}
export function PreviewRailStory() {
  const [selected,setSelected]=useState('navigation');
  return <StorySection title="Рейка предпросмотра"><p>Наведите на деление или перемещайтесь стрелками. На сенсорном экране первый тап показывает карточку, второй открывает раздел.</p><PreviewRail label="Разделы каталога" items={revisionRailItems} value={selected} onValueChange={setSelected}/><PreviewRail label="Горизонтальные разделы" items={revisionRailItems} orientation="horizontal" previewSide="before" defaultValue="fields"/></StorySection>;
}
