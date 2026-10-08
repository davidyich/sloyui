import { useState } from 'react';
import * as UI from '../src';
import { moveDemoTask } from './kanban-state';

export function KanbanPlaygroundExample({disabled,add,columnVariant,customCards,dragActivation}:{dragActivation:UI.KanbanBoardProps['dragActivation'];disabled:boolean;add:boolean;columnVariant:UI.KanbanColumnProps['variant'];customCards:boolean}) {
 const t=UI.useTranslate();
 const [items,setItems]=useState<UI.KanbanTask[]>([
  {id:'one',columnId:'todo',title:t('Собрать идеи','Gather ideas')},
  {id:'two',columnId:'todo',title:t('Продумать первую версию','Plan the first version')},
  {id:'three',columnId:'active',title:t('Наметить первый шаг','Outline the first step')},
 ]);
 return <UI.KanbanBoard label={t('Доска в песочнице','Playground board')} disabled={disabled} dragActivation={dragActivation} handlePlacement="custom" columns={[{id:'todo',title:t('Входящие','Inbox'),variant:columnVariant},{id:'active',title:t('В работе','In progress'),variant:columnVariant},{id:'done',title:t('Готово','Done'),variant:columnVariant}]} items={items}
  onMove={(id,columnId,index)=>setItems(current=>moveDemoTask(current,id,columnId,index))}
  onCompletedChange={(id,completed)=>setItems(current=>current.map(item=>item.id===id?{...item,completed}:item))}
  onAdd={add?columnId=>setItems(current=>[...current,{id:crypto.randomUUID(),columnId,title:t('Новая задача','New work item')} ]):undefined}
  renderCard={customCards?(item,{handle,menuItems})=><UI.TaskCard title={item.title} typeLabel={`TASK-${item.id}`} completed={item.completed} dragHandle={handle} menuItems={menuItems} footer={<UI.Tag interactive={false}>{t('Проект','Project')}</UI.Tag>}/>:undefined}/>;
}
