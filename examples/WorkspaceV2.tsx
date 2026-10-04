import { useId, useState } from 'react';
import {
  ActionBar, Button, Calendar, DailyHeader, Dialog, FloatingField, Icon,
  KanbanBoard, MarkdownEditor, ScrollArea, SplitButton, StatusBar, Tag,
  type KanbanTask,
} from '@personal/capacities-ui';
import '@personal/capacities-ui/styles.css';

const columns = [
  { id: 'inbox', title: 'Входящие' },
  { id: 'active', title: 'В работе' },
  { id: 'done', title: 'Готово' },
];

/** The consumer owns persistence. Put data-theme="light" or "dark" on html. */
export function WorkspaceV2() {
  const instanceId = useId();
  const [date, setDate] = useState('2026-09-25');
  const [note, setNote] = useState('## Планы на день\n\n- [ ] Сделать небольшой шаг к своему проекту');
  const [savedNote, setSavedNote] = useState(note);
  const [tasks, setTasks] = useState<KanbanTask[]>([
    { id: `${instanceId}-first`, title: 'Собрать референсы', columnId: 'inbox', color: 'rose' },
    { id: `${instanceId}-second`, title: 'Настроить акцент проекта', columnId: 'active', color: 'teal' },
  ]);
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('Изменения хранятся в памяти этой страницы');

  function startTask(columnId = 'inbox') { setTitle(''); setNewTaskColumn(columnId); }
  function createTask() {
    const cleanTitle = title.trim();
    if (!cleanTitle || !newTaskColumn) return;
    const task: KanbanTask = { id: crypto.randomUUID(), title: cleanTitle, columnId: newTaskColumn, color: 'rose' };
    setTasks(current => [...current, task]);
    setNewTaskColumn(null); setTitle(''); setMessage(`Добавлена задача «${cleanTitle}»`);
  }
  function moveTask(id: string, columnId: string) {
    setTasks(current => current.map(task => task.id === id ? { ...task, columnId, completed: columnId === 'done' } : task));
    setMessage(`Задача перемещена в «${columns.find(column => column.id === columnId)?.title}»`);
  }

  return <section aria-label="Личное рабочее пространство" data-accent="teal" style={{ display: 'grid', gap: 'var(--cap-space-6)', minWidth: 0, color: 'var(--cap-text-primary)' }}>
    <DailyHeader date={date} tags={<Tag>Личный проект</Tag>} />
    <ActionBar label="Действия рабочего пространства">
      <SplitButton label="Новая задача" leading={<Icon name="plus" />} onClick={() => startTask()}
        items={columns.map(column => ({ id: column.id, label: `Добавить в «${column.title}»`, onSelect: () => startTask(column.id) }))} />
      <Button variant="ghost" disabled={!tasks.some(task => task.completed)} onClick={() => {
        setTasks(current => current.filter(task => !task.completed)); setMessage('Завершённые задачи убраны с доски');
      }}>Убрать завершённые</Button>
    </ActionBar>
    <KanbanBoard label="Задачи проекта" columns={columns} items={tasks} onMove={moveTask} onAdd={startTask}
      onCompletedChange={(id, completed) => {
        setTasks(current => current.map(task => task.id === id ? { ...task, completed } : task));
        setMessage(completed ? 'Задача отмечена завершённой' : 'Задача снова открыта');
      }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'var(--cap-space-6)', minWidth: 0 }}>
      <Calendar label="Выбрать день" value={date} onValueChange={setDate} locale="ru-RU" showAgenda
        events={[{ id: `${instanceId}-event`, date: '2026-09-25', title: 'Время для проекта', time: '18:00–19:00', color: 'teal' }]} />
      <ScrollArea label="Заметка проекта" style={{ height: 360 }}>
        <MarkdownEditor label="Заметка проекта" value={note} onValueChange={setNote} defaultMode="split" onSave={() => {
          setSavedNote(note); setMessage('Заметка сохранена в памяти страницы');
        }} />
      </ScrollArea>
    </div>
    <StatusBar tone={note === savedNote ? 'neutral' : 'info'} trailing={<span>{tasks.length} задач</span>}>
      {note === savedNote ? message : 'В заметке есть несохранённые изменения'}
    </StatusBar>
    <Dialog open={newTaskColumn !== null} onOpenChange={open => { if (!open) setNewTaskColumn(null); }} title="Новая задача"
      footer={<><Button variant="ghost" onClick={() => setNewTaskColumn(null)}>Отмена</Button><Button variant="primary" disabled={!title.trim()} onClick={createTask}>Создать</Button></>}>
      <FloatingField label="Название задачи" value={title} onChange={event => setTitle(event.target.value)} required data-autofocus
        onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); createTask(); } }} />
    </Dialog>
  </section>;
}
