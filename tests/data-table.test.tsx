import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { DataTable, FilterToolbar, JsonViewer, stringifyJsonViewerValue, type ActiveFilter } from '../src/components/data-table';
import { DataTableStory, FilterToolbarStory, JsonViewerStory } from '../demo/stories-data';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const rows = [{ id: 'a', name: 'Alpha', score: 10 }, { id: 'b', name: 'Beta', score: 2 }, { id: 'c', name: 'Gamma', score: null }];
const columns = [
  { id: 'name', header: 'Имя', value: (row: typeof rows[number]) => row.name },
  { id: 'score', header: 'Баллы', value: (row: typeof rows[number]) => row.score, numeric: true },
];
const names = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell').at(-2)?.textContent);

it('sorts numbers stably and keeps empty values last in both directions', async () => {
  const user = userEvent.setup(); render(<DataTable label="Scores" rows={rows} columns={columns} rowId={row=>row.id}/>);
  await user.click(screen.getByRole('button', { name: /Баллы/ }));
  expect(names()).toEqual(['Beta', 'Alpha', 'Gamma']);
  expect(screen.getByRole('columnheader', { name: /Баллы/ })).toHaveAttribute('aria-sort', 'ascending');
  await user.click(screen.getByRole('button', { name: /Баллы/ }));
  expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
});

it('selects only the visible page, preserves off-page IDs and paginates', async () => {
  const user = userEvent.setup();
  function Controlled() { const [selected, setSelected] = useState<string[]>([]); return <><DataTable label="Scores" rows={rows} columns={columns} rowId={row=>row.id} selectable selectedIds={selected} onSelectedIdsChange={setSelected} pageSize={2}/><output data-testid="selected">{selected.join(',')}</output></>; }
  render(<Controlled/>);
  await user.click(screen.getByRole('checkbox', { name: 'Выбрать все строки на странице' }));
  expect(screen.getByTestId('selected')).toHaveTextContent('a,b');
  await user.click(screen.getByRole('button', { name: 'Следующая страница' }));
  expect(screen.getByRole('checkbox', { name: 'Выбрать все строки на странице' })).not.toBeChecked();
  await user.click(screen.getByRole('checkbox', { name: 'Выбрать строку c' }));
  expect(screen.getByTestId('selected')).toHaveTextContent('a,b,c');
  expect(screen.getByText('Страница 2 из 2')).toBeInTheDocument();
});

it('extends a checkbox selection with Shift within the visible page', () => {
  render(<DataTable label="Scores" rows={rows} columns={columns} rowId={row=>row.id} selectable/>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Выбрать строку a'}));
  fireEvent.click(screen.getByRole('checkbox',{name:'Выбрать строку c'}),{shiftKey:true});
  expect(screen.getByRole('checkbox',{name:'Выбрать строку b'})).toBeChecked();
});

it('adds and removes a controlled filter, with distinct search state', async () => {
  const user = userEvent.setup();
  function Filters() { const [filters,setFilters]=useState<ActiveFilter[]>([]), [query,setQuery]=useState(''); return <><FilterToolbar label="Фильтры" fields={[{id:'status',label:'Статус',options:[{value:'active',label:'Активен'},{value:'draft',label:'Черновик'}]}]} filters={filters} onFiltersChange={setFilters} query={query} onQueryChange={setQuery}/><output data-testid="filters">{JSON.stringify({filters,query})}</output></>; }
  render(<Filters/>);
  await user.type(screen.getByRole('textbox', { name: 'Поиск' }), 'Alpha');
  await user.click(screen.getByRole('button', { name: 'Добавить фильтр' }));
  await user.click(screen.getByRole('button', { name: 'Статус' }));
  await user.click(screen.getByRole('button', { name: 'Активен' }));
  expect(screen.getByTestId('filters')).toHaveTextContent('"fieldId":"status","value":"active"');
  expect(screen.getByTestId('filters')).toHaveTextContent('"query":"Alpha"');
  await user.click(screen.getByRole('button', { name: /Удалить фильтр Статус/ }));
  expect(screen.getByTestId('filters')).toHaveTextContent('"filters":[]');
});

it('renders cyclic and undefined data, searches deep keys, pages children and copies paths', async () => {
  const user = userEvent.setup();
  const data: { items: unknown[]; self?: unknown; absent?: unknown } = { items: [{ name: 'first' }, { name: 'target' }, undefined], absent: undefined };
  data.self = data;
  const copy = vi.fn(); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy.mockResolvedValue(undefined) } });
  render(<JsonViewer label="JSON details" data={data} pageSize={1}/>);
  expect(screen.getByRole('treeitem', { name: /root/ })).toBeInTheDocument();
  expect(screen.getByText(/Показать ещё 1 из/)).toBeInTheDocument();
  await user.click(screen.getByRole('treeitem', { name: /Показать ещё/ }));
  await user.click(screen.getByRole('treeitem', { name: /Показать ещё/ }));
  expect(screen.getByRole('treeitem', { name: /self/ })).toHaveTextContent('[Circular]');
  await user.type(screen.getByRole('textbox', { name: 'Поиск в JSON' }), 'target');
  expect(screen.getByRole('treeitem', { name: /target/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Копировать путь root.items[1].name' }));
  await waitFor(() => expect(copy).toHaveBeenCalledWith('root.items[1].name'));
  expect(stringifyJsonViewerValue(data)).toContain('[Circular]');
  expect(stringifyJsonViewerValue(undefined)).toBe('undefined');
});

it('distinguishes shared JSON references from cycles and expands a matched branch', async () => {
  const shared={name:'shared'};
  expect(stringifyJsonViewerValue({first:shared,second:shared})).toContain('"second": {\n    "name": "shared"');
  const user=userEvent.setup();
  render(<JsonViewer label="Shared data" data={{owner:{name:'Анна',team:'Дизайн'},other:'value'}}/>);
  await user.type(screen.getByRole('textbox',{name:'Поиск в JSON'}),'owner');
  expect(screen.getByRole('treeitem',{name:/owner/})).toBeInTheDocument();
  expect(screen.getByRole('treeitem',{name:/name : "Анна"/})).toBeInTheDocument();
  expect(screen.getByRole('treeitem',{name:/team : "Дизайн"/})).toBeInTheDocument();
});

it('configures initial JSON depth and optional search/copy/path controls', async () => {
  const selected=vi.fn(),user=userEvent.setup();
  render(<JsonViewer label="Compact data" data={{owner:{name:'Анна'}}} defaultExpandDepth={2} searchable={false} copyable={false} showPath={false} onSelect={selected}/>);
  expect(screen.getByRole('treeitem',{name:/name : "Анна"/})).toBeInTheDocument();
  expect(screen.queryByRole('textbox',{name:'Поиск в JSON'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Копировать/})).not.toBeInTheDocument();
  expect(document.querySelector('.cap-json-path')).not.toBeInTheDocument();
  await user.click(screen.getByRole('treeitem',{name:/name : "Анна"/}));
  expect(selected).toHaveBeenCalledWith({path:'root.owner.name',value:'Анна',type:'string'});
});

it('keeps selectable table headers and checkboxes accessible with empty and populated data', async () => {
  const { container, rerender } = render(<DataTable label="Selection check" rows={[]} columns={columns} rowId={row => row.id} selectable/>);
  expect(screen.getByRole('columnheader', { name: /Выбор строк/ })).toBeInTheDocument();
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);

  rerender(<DataTable label="Selection check" rows={rows} columns={columns} rowId={row => row.id} selectable/>);
  expect(screen.getAllByRole('checkbox').map(input => input.getAttribute('aria-label'))).toEqual([
    'Выбрать все строки на странице', 'Выбрать строку a', 'Выбрать строку b', 'Выбрать строку c',
  ]);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});

it('keeps the JSON tree children valid and supports keyboard paging', async () => {
  const user = userEvent.setup();
  const data = { items: ['one', 'two', 'three'] };
  const { container, rerender } = render(<JsonViewer label="Tree check" data={data} pageSize={1} defaultExpanded={['root', 'root.items']}/>);
  const tree = screen.getByRole('tree');
  expect(Array.from(tree.children).every(child => child.getAttribute('role') === 'treeitem')).toBe(true);
  const more = screen.getByRole('treeitem', { name: /Показать ещё/ });
  more.focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('treeitem', { name: /1 : "two"/ })).toBeInTheDocument();
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);

  rerender(<JsonViewer label="Tree check" data={data} pageSize={1} query="no match"/>);
  expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});

it('keeps collapsing JSON rows inert and returns focus to their parent', () => {
  const { rerender } = render(<JsonViewer label="JSON disclosure" data={{items:['one']}} expanded={['root','root.items']}/>);
  const item=screen.getByRole('treeitem',{name:/0 : "one"/});
  item.focus();
  rerender(<JsonViewer label="JSON disclosure" data={{items:['one']}} expanded={['root']}/>);
  expect(item).toHaveAttribute('aria-hidden','true');
  expect(item).toHaveAttribute('inert');
  expect(screen.getByRole('treeitem',{name:/items/})).toHaveFocus();
  rerender(<JsonViewer label="JSON disclosure" data={{items:['one']}} expanded={['root','root.items']}/>);
  expect(screen.getByRole('treeitem',{name:/0 : "one"/})).not.toHaveAttribute('inert');
});

it('uses distinct story region labels for table, filter, and JSON examples', async () => {
  const { container, rerender } = render(<DataTableStory/>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  rerender(<FilterToolbarStory/>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  rerender(<JsonViewerStory/>);
  expect((await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});
