import { useState } from 'react';
import { moveDemoTask } from './kanban-state';
import { Button, ButtonGroup, Icon, IconButton, KanbanBoard, Menu, Tabs, Tag, TaskCard, useTranslate, type KanbanTask } from '../src';

/** A working composition for the workspace tab and framed column variants. */
export function TabsGroupsExample() {
  const t = useTranslate();
  const [tab, setTab] = useState('work');
  const [tasks, setTasks] = useState<KanbanTask[]>([
    { id: '21', columnId: 'todo', title: t('События аналитики регистрации', 'Signup analytics events'), completed: false },
    { id: '22', columnId: 'todo', title: t('Финальные тексты тарифов', 'Final pricing page copy'), completed: false },
  ]);
  const add = (columnId = 'todo') => setTasks(current => [...current, { id: String(Math.max(20, ...current.map(task => Number(task.id))) + 1), columnId, title: t('Новая задача', 'New work item'), completed: columnId === 'done' }]);
  const board = <KanbanBoard label={t('Задачи проекта', 'Project work items')} items={tasks} handlePlacement="custom"
    onMove={(id,columnId,index) => setTasks(current => moveDemoTask(current,id,columnId,index))}
    columns={['todo','done'].map(columnId => ({ id:columnId, title:columnId==='done' ? t('Готово','Done') : t('К выполнению','To do'), variant:'framed', icon:columnId==='done'?'check':'clock',
      action:<ButtonGroup appearance="framed" attached={false} label={t('Действия колонки', 'Column actions')} size="sm"><Menu label={t('Меню колонки', 'Column menu')} size="sm" items={[{ id:'add',label:t('Добавить задачу','Add work item'),onSelect:()=>add(columnId) }]}/><IconButton icon="plus" label={t('Добавить задачу','Add work item')} variant="ghost" size="sm" onClick={()=>add(columnId)}/></ButtonGroup>,
      footer:columnId==='todo' ? <Button variant="ghost" size="sm" leading={<Icon name="plus" size={14}/>} onClick={()=>add(columnId)}>{t('Новая задача','New work item')}</Button> : undefined,
    }))}
    renderCard={(task,{handle,menuItems}) => <TaskCard title={task.title} typeLabel={`PROD-${task.id}`} color="blue" completed={task.completed} dragHandle={handle} menuItems={menuItems}
      onCompletedChange={completed => setTasks(current => current.map(item => item.id === task.id ? {...item,completed,columnId:completed?'done':'todo'} : item))}
      footer={<Tag color="neutral" interactive={false}>{t('Разработка','Engineering')}</Tag>}/>} />;
  return <Tabs variant="workspace" label={t('Проект', 'Project')} value={tab} onValueChange={setTab} trailing={<Menu label={t('Ещё разделы', 'More sections')} items={[{ id: 'work', label: t('Задачи', 'Work items'), onSelect: () => setTab('work') }]}/>} items={[
    { value: 'overview', label: t('Обзор', 'Overview'), content: <p>{t('Две группы показывают открытые и завершённые задачи.', 'Two groups show open and completed work items.')}</p> },
    { value: 'work', label: t('Задачи', 'Work items'), count: tasks.length, content: board },
    { value: 'cycles', label: t('Циклы', 'Cycles'), icon: 'calendar', content: <p>{t('Следующий цикл — подготовка релиза.', 'The next cycle prepares the release.')}</p> },
  ]}/>;
}
