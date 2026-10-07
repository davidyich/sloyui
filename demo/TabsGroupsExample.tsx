import { useState } from 'react';
import { Button, ButtonGroup, Icon, IconButton, KanbanColumn, Menu, Tabs, Tag, TaskCard, useTranslate } from '../src';

/** A working composition for the workspace tab and framed column variants. */
export function TabsGroupsExample() {
  const t = useTranslate();
  const [tab, setTab] = useState('work');
  const [tasks, setTasks] = useState([{ id: 21, title: t('События аналитики регистрации', 'Signup analytics events'), done: false }, { id: 22, title: t('Финальные тексты тарифов', 'Final pricing page copy'), done: false }]);
  const add = () => setTasks(current => [...current, { id: Math.max(20, ...current.map(task => task.id)) + 1, title: t('Новая задача', 'New work item'), done: false }]);
  const board = <div className="cap-kanban-board" role="region" tabIndex={0} aria-label={t('Задачи проекта', 'Project work items')}>
    {[false, true].map(done => {
      const items = tasks.filter(task => task.done === done);
      const title = done ? t('Готово', 'Done') : t('К выполнению', 'To do');
      return <KanbanColumn key={String(done)} variant="framed" title={title} icon={done ? 'check' : 'clock'} count={items.length} action={<ButtonGroup appearance="framed" attached={false} label={t('Действия колонки', 'Column actions')} size="sm"><Menu label={t('Меню колонки', 'Column menu')} size="sm" items={[{ id: 'add', label: t('Добавить задачу', 'Add work item'), onSelect: add }]}/><IconButton icon="plus" label={t('Добавить задачу', 'Add work item')} variant="ghost" size="sm" onClick={add}/></ButtonGroup>} footer={!done && <Button variant="ghost" size="sm" leading={<Icon name="plus" size={14}/>} onClick={add}>{t('Новая задача', 'New work item')}</Button>}>
        {items.map(task => <TaskCard key={task.id} title={task.title} typeLabel={`PROD-${task.id}`} color="blue" completed={task.done} onCompletedChange={completed => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: completed } : item))} footer={<Tag color="neutral" interactive={false}>{t('Разработка', 'Engineering')}</Tag>}/>) }
      </KanbanColumn>;
    })}
  </div>;
  return <Tabs variant="workspace" label={t('Проект', 'Project')} value={tab} onValueChange={setTab} trailing={<Menu label={t('Ещё разделы', 'More sections')} items={[{ id: 'work', label: t('Задачи', 'Work items'), onSelect: () => setTab('work') }]}/>} items={[
    { value: 'overview', label: t('Обзор', 'Overview'), content: <p>{t('Две группы показывают открытые и завершённые задачи.', 'Two groups show open and completed work items.')}</p> },
    { value: 'work', label: t('Задачи', 'Work items'), count: tasks.length, content: board },
    { value: 'cycles', label: t('Циклы', 'Cycles'), icon: 'calendar', content: <p>{t('Следующий цикл — подготовка релиза.', 'The next cycle prepares the release.')}</p> },
  ]}/>;
}
