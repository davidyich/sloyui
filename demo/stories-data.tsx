import { AdvancedTableExample } from './AdvancedTableExample';
import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useMemo, useState } from 'react';
import { Tag } from '../src';
import { DataTable, FilterToolbar, JsonViewer, type ActiveFilter, type DataTableColumn } from '../src/components/data-table';
import { StorySection } from './stories-controls';

interface Project { id: string; name: string; status: 'active' | 'draft' | 'done'; owner: string; score: number | null }
const projects: Project[] = [
  { id: 'garden', name: 'Сад идей', status: 'active', owner: 'Анна', score: 92 },
  { id: 'archive', name: 'Визуальный архив', status: 'draft', owner: 'Илья', score: 74 },
  { id: 'notes', name: 'Заметки команды', status: 'active', owner: 'Анна', score: 88 },
  { id: 'library', name: 'Библиотека', status: 'done', owner: 'Маша', score: null },
  { id: 'research', name: 'Исследование', status: 'draft', owner: 'Илья', score: 61 },
];
const statusText: Record<Project['status'],string> = { active: 'В работе', draft: 'Черновик', done: 'Готово' };
const columns: DataTableColumn<Project>[] = [
  { id: 'name', header: 'Название', value: row => row.name },
  { id: 'status', header: 'Статус', value: row => statusText[row.status], cell: row => <Tag size="xs" interactive={false} color={row.status==='active'?'blue':row.status==='done'?'green':undefined}>{statusText[row.status]}</Tag> },
  { id: 'owner', header: 'Автор', value: row => row.owner },
  { id: 'score', header: 'Оценка', value: row => row.score, numeric: true },
];
const fields = [
  { id: 'status', label: 'Статус', options: [{ value: 'active', label: 'В работе', count: 2 }, { value: 'draft', label: 'Черновик', count: 2 }, { value: 'done', label: 'Готово', count: 1 }] },
  { id: 'owner', label: 'Автор', options: [{ value: 'Анна', label: 'Анна' }, { value: 'Илья', label: 'Илья' }, { value: 'Маша', label: 'Маша' }] },
];
function DataExample({ labelPrefix }: { labelPrefix: string }) {
 const ct=useCatalogText();

  const [query,setQuery] = useState(''), [filters,setFilters] = useState<ActiveFilter[]>([]), [selection,setSelection] = useState<string[]>([]);
  const rows = useMemo(() => localizeCatalogueFixture(projects,ct).filter(project => project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && filters.every(filter => String(project[filter.fieldId as 'status'|'owner'])===filter.value)), [query,filters]);
  return <div style={{display:'grid',gap:12}}><FilterToolbar label={`${labelPrefix}${ct(": фильтры проектов")}`} fields={localizeCatalogueFixture(fields,ct)} filters={filters} onFiltersChange={setFilters} query={query} onQueryChange={setQuery}/><DataTable label={`${labelPrefix}${ct(": таблица проектов")}`} rows={rows.map(row=>({...row,name:ct(row.name)}))} columns={localizeCatalogueFixture(columns,ct).map(column=>column.id==='status'?{...column,cell:(row:Project)=><Tag size="xs" interactive={false} color={row.status==='active'?'blue':row.status==='done'?'green':undefined}>{ct(statusText[row.status])}</Tag>}:column)} rowId={row=>row.id} selectable selectedIds={selection} onSelectedIdsChange={setSelection} pageSize={3}/></div>;
}
export function DataTableStory() {
 const ct=useCatalogText();
 return <><StorySection title={ct("Закрепление, прокрутка и итоги")}><AdvancedTableExample/></StorySection><StorySection title={ct("Сортировка, выбор и страницы")}><DataExample labelPrefix={ct("История DataTable")}/></StorySection></>; }
export function FilterToolbarStory() {
 const ct=useCatalogText();
 return <StorySection title={ct("Поиск и фильтры")}><DataExample labelPrefix={ct("История FilterToolbar")}/></StorySection>; }
export function JsonViewerStory() {
 const ct=useCatalogText();

  const data = { project: ct('Сад идей'), status: 'active', score: 92, owner: { name: ct('Анна'), team: ct('Дизайн') }, tags: [ct('исследование'),'UI',ct('заметки'),ct('каталог'),ct('проект')], published: false, extra: null };
  return <StorySection title={ct("Дерево данных")}><JsonViewer label={ct("История JsonViewer: данные проекта")} data={data} pageSize={3} maxHeight={360}/></StorySection>;
}
