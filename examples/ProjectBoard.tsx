import { useState } from 'react';
import { Button, Dialog, EmptyState, Field, Input, ObjectCard, CollectionRow, SegmentedControl, Tag } from '@personal/capacities-ui';
import '@personal/capacities-ui/styles.css';

/** Consumer owns storage/networking. This example is intentionally local state only. */
export function ProjectBoard() {
  const [projects, setProjects] = useState([{ id: 'first', title: 'Сад идей' }]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('grid');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const visible = projects.filter(p => p.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  function create() {
    if (!title.trim()) return;
    setProjects(p => editingId ? p.map(project => project.id === editingId ? { ...project, title: title.trim() } : project) : [...p, { id: crypto.randomUUID(), title: title.trim() }]);
    setTitle(''); setOpen(false);
  }
  return <section style={{ display: 'grid', gap: 'var(--cap-space-4)', color: 'var(--cap-text-primary)' }} aria-label="Мои проекты">
    <div style={{ display: 'flex', gap: 'var(--cap-space-3)', flexWrap: 'wrap' }}>
      <Input aria-label="Найти проект" placeholder="Поиск…" value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
      <SegmentedControl label="Представление" value={view} onValueChange={setView} options={[{ value: 'grid', label: 'Карточки' }, { value: 'list', label: 'Список' }]} />
      <Button variant="primary" onClick={() => { setEditingId(null); setTitle(''); setOpen(true); }}>Новый проект</Button>
    </div>
    {visible.length ? <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' : '1fr', gap: 'var(--cap-space-3)' }}>
      {visible.map(project => view === 'grid'
        ? <ObjectCard key={project.id} title={project.title} icon="cube" color="teal" meta={<Tag color="gray">В процессе</Tag>} onClick={() => { setEditingId(project.id); setTitle(project.title); setOpen(true); }} />
        : <CollectionRow key={project.id} title={project.title} icon="cube" color="teal" onClick={() => { setEditingId(project.id); setTitle(project.title); setOpen(true); }} />)}
    </div> : <EmptyState icon="search" title="Ничего не найдено" description="Попробуйте другой запрос или создайте проект." />}
    <Dialog open={open} onOpenChange={setOpen} title={editingId ? 'Редактировать проект' : 'Создать проект'} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button><Button variant="primary" onClick={create} disabled={!title.trim()}>{editingId ? 'Сохранить' : 'Создать'}</Button></>}>
      <Field label="Название проекта" required>{props => <Input {...props} value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) create(); }} />}</Field>
    </Dialog>
  </section>;
}
