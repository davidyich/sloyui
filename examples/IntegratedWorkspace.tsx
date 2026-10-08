import { useState } from 'react';
import {
  BarChart, ComboBox, ColorPicker, DataTable, MultiSelect, NumberField,
  RadioGroup, RichTextEditor, Select, TagInput, ToastStack, TreeView,
  ValueScrubber, type DataTableColumn, type RichTextDocument,
  type RichTextJson, type ToastStackItem, type TreeNode,
} from 'sloyui';
import 'sloyui/styles.css';

type Task = { id: string; title: string; status: string; estimate: number };
const tasks: Task[] = [
  { id: 'outline', title: 'Собрать план', status: 'В работе', estimate: 3 },
  { id: 'review', title: 'Проверить источники', status: 'Готово', estimate: 5 },
  { id: 'draft', title: 'Подготовить черновик', status: 'В работе', estimate: 2 },
];
const columns: DataTableColumn<Task>[] = [
  { id: 'title', header: 'Задача', value: row => row.title },
  { id: 'status', header: 'Статус', value: row => row.status },
  { id: 'estimate', header: 'Оценка', value: row => row.estimate, numeric: true },
];
const tree: TreeNode[] = [
  { id: 'project', label: 'Проект «Сад идей»', children: [
    { id: 'planning', label: 'Планирование', children: [{ id: 'sources', label: 'Источники', href: '#sources' }, { id: 'outline', label: 'План', href: '#outline' }] },
    { id: 'draft', label: 'Черновик', href: '#draft' },
  ] },
];
const topics = [
  { value: 'research', label: 'Исследование', aliases: ['источники'], group: 'Материалы' },
  { value: 'writing', label: 'Текст', aliases: ['черновик'], group: 'Материалы' },
  { value: 'planning', label: 'Планирование', group: 'Рабочий процесс' },
  { value: 'archive', label: 'Архив', disabled: true, group: 'Рабочий процесс' },
];

const customPresets = [{
  type: 'decision', label: 'Решение', keywords: ['выбор','итог'],
  create: () => ({ data: { text: 'Записать принятое решение' } }),
  render: ({ block, disabled, readOnly, onDataChange }: { block: { data?: RichTextJson }; disabled: boolean; readOnly: boolean; onDataChange: (data: RichTextJson) => void }) => {
    const data = block.data && typeof block.data === 'object' && !Array.isArray(block.data) ? block.data : {};
    const text = typeof data.text === 'string' ? data.text : '';
    return <label style={{ display: 'grid', gap: 6 }}><span>Принятое решение</span><input value={text} disabled={disabled || readOnly} onChange={event => onDataChange({ ...data, text: event.target.value })}/></label>;
  },
}];

const initialNote: RichTextDocument = { blocks: [
  { id: 'intro', type: 'paragraph', content: [{ text: 'Соберите план и сохраните выбранные решения в одном месте.' }] },
  { id: 'decision', type: 'decision', data: { text: 'Сначала уточнить источники, затем писать черновик.' } },
] };

/** End-to-end consumer composition using only the published package surface. */
export function IntegratedWorkspace() {
  const [project, setProject] = useState('garden'), [selectedTopics, setSelectedTopics] = useState(['research']), [tags, setTags] = useState(['На этой неделе']);
  const [layout, setLayout] = useState('list'), [accent, setAccent] = useState('#46A758'), [zoom, setZoom] = useState(100), [note, setNote] = useState(initialNote), [status, setStatus] = useState('active');
  const [treeSelection, setTreeSelection] = useState<string>(), [selectedRows, setSelectedRows] = useState<string[]>(['outline']);
  const [toasts, setToasts] = useState<ToastStackItem[]>([]);
  const [bars, setBars] = useState([{ label: 'План', value: 3 }, { label: 'Текст', value: 2 }, { label: 'Источники', value: 5 }]);
  const notify = (title: string) => setToasts(current => [...current, { id: `${Date.now()}-${current.length}`, title, description: 'Состояние страницы обновлено', duration: 5000 }]);

  return <main data-accent="teal" style={{ display: 'grid', gap: 'var(--cap-space-6)', maxWidth: 1080, margin: '0 auto', padding: 'var(--cap-space-6)', color: 'var(--cap-content-primary)' }}>
    <header><h1>Рабочая область проекта</h1><p>Контролы, данные и редактор работают от состояния приложения.</p></header>
    <section aria-label="Параметры проекта" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'var(--cap-space-4)' }}>
      <ComboBox label="Проект" options={[{ value: 'garden', label: 'Сад идей', aliases: ['личный'] }, { value: 'archive', label: 'Архив', disabled: true }]} value={project} onValueChange={setProject}/>
      <MultiSelect label="Темы" options={topics} value={selectedTopics} onValueChange={setSelectedTopics}/>
      <TagInput label="Метки" value={tags} onValueChange={setTags} placeholder="Добавить метку"/>
      <RadioGroup label="Представление" variant="cards" orientation="horizontal" value={layout} onValueChange={setLayout} options={[{ value: 'list', label: 'Список' }, { value: 'grid', label: 'Карточки' }]}/>
      <ColorPicker label="Акцент" value={accent} onValueChange={setAccent}/>
      <NumberField label="Масштаб" value={zoom} min={50} max={200} step={10} suffix="%" onValueChange={setZoom}/>
      <ValueScrubber label="Масштаб просмотра" value={zoom} min={50} max={200} step={10} onValueChange={setZoom} formatValue={value => `${value}%`}/>
      <Select label="Статус по умолчанию" value={status} options={[{ value: 'active', label: 'В работе' }, { value: 'done', label: 'Готово' }]} onValueChange={value => { setStatus(value); notify(`Статус: ${value}`); }}/>
    </section>
    <section aria-label="Навигация и задачи" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(0, 2fr)', gap: 'var(--cap-space-5)' }}>
      <TreeView label="Структура проекта" nodes={tree} defaultExpandedIds={['project','planning']} selectedId={treeSelection} onSelect={node => { setTreeSelection(node.id); notify(`Открыт раздел «${node.label}»`); }}/>
      <DataTable label="Задачи проекта" rows={tasks} columns={columns} rowId={row => row.id} selectable selectedIds={selectedRows} onSelectedIdsChange={setSelectedRows} defaultSort={{ id: 'title', direction: 'asc' }} pageSize={5}/>
    </section>
    <section aria-label="Заметка и оценка" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(220px, 1fr)', gap: 'var(--cap-space-5)' }}>
      <RichTextEditor label="Заметка проекта" value={note} onValueChange={setNote} presets={customPresets}/>
      <div><BarChart label="Оценка задач" data={bars} onSelect={datum => notify(`${datum.label}: ${datum.value} ч`)}/><button type="button" onClick={() => setBars(current => current.map(item => item.label === 'Текст' ? { ...item, value: item.value + 1 } : item))}>Добавить час к тексту</button></div>
    </section>
    <section aria-label="Уведомления"><button type="button" onClick={() => notify('Изменения сохранены')}>Показать уведомление</button><ToastStack items={toasts} position="inline" onDismiss={id => setToasts(current => current.filter(item => item.id !== id))}/></section>
  </main>;
}
