import { useTranslate, useLocale } from './locale.js';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Copy, Link2, Search } from 'lucide-react';
import { Button, Icon, IconButton, Tag, type IconSource } from './primitives.js';
import { Checkbox, Input } from './forms.js';
import { Popover } from './overlays.js';
import { useDisclosurePresence } from './disclosure.js';

export interface DataTableSort { id: string; direction: 'asc' | 'desc' }
export interface DataTableColumn<T> {
  id: string;
  header: string;
  value: (row: T) => string | number | Date | null | undefined;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  numeric?: boolean;
  width?: string | number;
}
export interface DataTableProps<T> {
  label: string;
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  rowId: (row: T) => string;
  sort?: DataTableSort | null;
  defaultSort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
  selectable?: boolean;
  selectedIds?: readonly string[];
  defaultSelectedIds?: readonly string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  page?: number;
  defaultPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  className?: string;
  /** Omit to inherit the composition's painted surface. */
  surface?: 'base' | 'canvas' | 'raised' | 'floating';
}
function compareValues(a: string | number | Date | null | undefined, b: string | number | Date | null | undefined, direction: 'asc' | 'desc', collator: Intl.Collator) {
  const emptyA = a === null || a === undefined || a === '', emptyB = b === null || b === undefined || b === '';
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
  const left = a instanceof Date ? a.getTime() : a, right = b instanceof Date ? b.getTime() : b;
  const result = typeof left === 'number' && typeof right === 'number' ? left - right : collator.compare(String(left), String(right));
  return direction === 'asc' ? result : -result;
}
export function DataTable<T>({ label, rows, columns, rowId, sort: controlledSort, defaultSort = null, onSortChange, selectable = false, selectedIds, defaultSelectedIds = [], onSelectedIdsChange, page: controlledPage, defaultPage = 1, pageSize, onPageChange, emptyMessage: suppliedEmptyMessage, className, surface }: DataTableProps<T>) {
  const locale = useLocale();
  const collator = useMemo(() => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }), [locale]);
  const t = useTranslate();
  const emptyMessage = suppliedEmptyMessage === undefined ? (t("Нет данных", "No data")) : suppliedEmptyMessage;

  const [internalSort, setInternalSort] = useState<DataTableSort | null>(defaultSort);
  const [internalSelected, setInternalSelected] = useState<string[]>([...defaultSelectedIds]);
  const [internalPage, setInternalPage] = useState(defaultPage);
  const anchor = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const sort = controlledSort === undefined ? internalSort : controlledSort;
  const selection = new Set(selectedIds ?? internalSelected);
  const sorted = useMemo(() => {
    const column = sort && columns.find(item => item.id === sort.id && item.sortable !== false);
    if (!column || !sort) return [...rows];
    return rows.map((row, index) => ({ row, index })).sort((a, b) => compareValues(column.value(a.row), column.value(b.row), sort.direction, collator) || a.index - b.index).map(entry => entry.row);
  }, [rows, columns, sort, collator]);
  const size = pageSize && pageSize > 0 ? Math.max(1, Math.floor(pageSize)) : 0;
  const pages = size ? Math.max(1, Math.ceil(sorted.length / size)) : 1;
  const page = Math.min(pages, Math.max(1, controlledPage ?? internalPage));
  const visible = size ? sorted.slice((page - 1) * size, page * size) : sorted;
  const visibleIds = visible.map(rowId);
  const selectedVisible = visibleIds.filter(id => selection.has(id)).length;
  const allVisible = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  const applySelection = (next: Set<string>) => {
    const ordered = [...rows.map(rowId).filter(id => next.has(id)), ...[...next].filter(id => !rows.some(row => rowId(row) === id))];
    if (selectedIds === undefined) setInternalSelected(ordered);
    onSelectedIdsChange?.(ordered);
    setAnnouncement(`${ordered.length}${t(" выбрано", " selected")}`);
  };
  const toggleRow = (id: string, extend: boolean) => {
    const next = new Set(selection);
    if (extend && anchor.current && visibleIds.includes(anchor.current)) {
      const a = visibleIds.indexOf(anchor.current), b = visibleIds.indexOf(id), range = visibleIds.slice(Math.min(a,b), Math.max(a,b)+1);
      const checked = !next.has(id); range.forEach(key => checked ? next.add(key) : next.delete(key));
    } else { next.has(id) ? next.delete(id) : next.add(id); anchor.current = id; }
    applySelection(next);
  };
  const setSort = (column: DataTableColumn<T>) => {
    const next: DataTableSort = { id: column.id, direction: sort?.id === column.id && sort.direction === 'asc' ? 'desc' : 'asc' };
    if (controlledSort === undefined) setInternalSort(next);
    onSortChange?.(next);
    setAnnouncement(`${column.header}: ${next.direction === 'asc' ? t("по возрастанию", "ascending") : t("по убыванию", "descending")}`);
  };
  const setPage = (next: number) => { const clamped = Math.min(pages, Math.max(1, next)); if (controlledPage === undefined) setInternalPage(clamped); onPageChange?.(clamped); };
  return <div className={`cap-data-table${className ? ` ${className}` : ''}`} data-surface={surface}>
    <div className="cap-data-table-scroll cap-surface-boundary" role="region" aria-label={label} tabIndex={0}>
      <table><caption className="cap-sr-only">{label}</caption><thead><tr>
        {selectable && <th className="cap-data-table-select" scope="col"><span className="cap-sr-only">{t("Выбор строк", "Row selection")}</span><Checkbox label={t("Выбрать все строки на странице", "Select all rows on this page")} aria-label={t("Выбрать все строки на странице", "Select all rows on this page")} size="sm" checked={allVisible} indeterminate={selectedVisible > 0 && !allVisible} disabled={!visible.length} onChange={() => { const next = new Set(selection); visibleIds.forEach(id => allVisible ? next.delete(id) : next.add(id)); applySelection(next); }}/></th>}
        {columns.map(column => <th key={column.id} scope="col" style={{ width: column.width }} aria-sort={sort?.id === column.id ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'} data-numeric={column.numeric || undefined}>
          {column.sortable === false ? column.header : <button type="button" className="cap-data-table-sort" onClick={() => setSort(column)}>{column.header}{sort?.id === column.id ? sort.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/> : <span className="cap-data-table-sort-hint" aria-hidden="true">↕</span>}</button>}
        </th>)}
      </tr></thead><tbody>
        {visible.map(row => { const id = rowId(row); return <tr key={id} data-selected={selection.has(id) || undefined}>
          {selectable && <td className="cap-data-table-select"><Checkbox label={`${t("Выбрать строку ", "Select row ")}${id}`} aria-label={`${t("Выбрать строку ", "Select row ")}${id}`} size="sm" checked={selection.has(id)} onChange={event => toggleRow(id, (event.nativeEvent as MouseEvent).shiftKey === true)}/></td>}
          {columns.map(column => <td key={column.id} data-numeric={column.numeric || undefined}>{column.cell ? column.cell(row) : String(column.value(row) ?? '')}</td>)}
        </tr>; })}
        {!visible.length && <tr><td colSpan={columns.length + Number(selectable)} className="cap-data-table-empty">{emptyMessage}</td></tr>}
      </tbody></table>
    </div>
    <div className="cap-data-table-footer"><span>{rows.length ? `${size ? (page-1)*size+1 : 1}–${size ? Math.min(page*size,sorted.length) : sorted.length}${t(" из ", " of ")}${sorted.length}` : t("0 строк", "0 rows")}{selectable && selection.size ? ` · ${selection.size}${t(" выбрано", " selected")}` : ''}</span>
      {size > 0 && pages > 1 && <nav aria-label={`${label}${t(": страницы", ": pages")}`} className="cap-data-table-pagination"><IconButton label={t("Предыдущая страница", "Previous page")} icon={ChevronLeft} size="sm" variant="ghost" disabled={page===1} onClick={()=>setPage(page-1)}/><span>{t("Страница", "Page")} {page} {t("из", "of")} {pages}</span><IconButton label={t("Следующая страница", "Next page")} icon={ChevronRight} size="sm" variant="ghost" disabled={page===pages} onClick={()=>setPage(page+1)}/></nav>}
    </div>
    <span className="cap-sr-only" role="status">{announcement}</span>
  </div>;
}

export interface FilterOption { value: string; label: string; count?: number }
export interface FilterField { id: string; label: string; options: readonly FilterOption[]; icon?: IconSource }
export interface ActiveFilter { fieldId: string; value: string }
export interface FilterToolbarProps {
  label: string;
  fields: readonly FilterField[];
  filters: readonly ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  className?: string;
}
export function FilterToolbar({ label, fields, filters, onFiltersChange, query, onQueryChange, className }: FilterToolbarProps) {
  const t = useTranslate();

  const [open, setOpen] = useState(false), [fieldId, setFieldId] = useState<string | null>(null), [optionQuery, setOptionQuery] = useState('');
  const field = fields.find(item => item.id === fieldId);
  const select = (value: string) => { if (!field) return; onFiltersChange([...filters.filter(item => item.fieldId !== field.id), { fieldId: field.id, value }]); setOpen(false); setFieldId(null); setOptionQuery(''); };
  return <div className={`cap-filter-toolbar${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
    {onQueryChange && <Input label={t("Поиск", "Search")} size="sm" leading={<Search size={15}/>} value={query ?? ''} onChange={event=>onQueryChange(event.target.value)}/>}
    <Popover label={t("Добавить фильтр", "Add filter")} open={open} onOpenChange={next => { setOpen(next); if (!next) { setFieldId(null); setOptionQuery(''); } }} triggerContent={t("Фильтр", "Filter")} size="sm">
      <div className="cap-filter-menu">
        {field ? <><div className="cap-filter-menu-heading"><Button size="xs" variant="ghost" onClick={()=>{setFieldId(null);setOptionQuery('');}}>{t("← Поля", "← Fields")}</Button><strong>{field.label}</strong></div>
          {field.options.length > 8 && <Input label={t("Найти значение", "Find a value")} size="sm" value={optionQuery} onChange={event=>setOptionQuery(event.target.value)}/>}
          <div className="cap-filter-options">{field.options.filter(option=>`${option.label} ${option.value}`.toLocaleLowerCase().includes(optionQuery.toLocaleLowerCase())).map(option=><button type="button" key={option.value} onClick={()=>select(option.value)} aria-pressed={filters.some(item=>item.fieldId===field.id&&item.value===option.value)}>{option.label}{option.count!==undefined&&<small>{option.count}</small>}</button>)}</div>
          {!field.options.some(option=>`${option.label} ${option.value}`.toLocaleLowerCase().includes(optionQuery.toLocaleLowerCase()))&&<p className="cap-filter-empty">{t("Ничего не найдено", "No results")}</p>}</>
        : <div className="cap-filter-options">{fields.map(item=><button type="button" key={item.id} onClick={()=>setFieldId(item.id)}><span className="cap-filter-field-label">{item.icon&&<Icon name={item.icon} size={15}/>}{item.label}</span><ChevronRight size={14}/></button>)}{!fields.length&&<p className="cap-filter-empty">{t("Нет доступных фильтров", "No filters available")}</p>}</div>}
      </div>
    </Popover>
    {filters.map(filter => { const selectedField=fields.find(item=>item.id===filter.fieldId), option=selectedField?.options.find(item=>item.value===filter.value), text=`${selectedField?.label ?? filter.fieldId}: ${option?.label ?? filter.value}`; return <Tag key={filter.fieldId} size="sm" action={{ icon: 'close', label: `${t("Удалить фильтр ", "Remove filter ")}${text}`, onClick: ()=>onFiltersChange(filters.filter(item=>item.fieldId!==filter.fieldId)) }}>{text}</Tag>; })}
    {filters.length>1&&<Button size="sm" variant="ghost" onClick={()=>onFiltersChange([])}>{t("Сбросить", "Reset")}</Button>}
  </div>;
}

export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'other';
export interface JsonViewerCopyDetail { kind: 'path' | 'value'; path: string; text: string }
export interface JsonViewerProps {
  label: string;
  data: unknown;
  rootName?: string;
  expanded?: readonly string[];
  defaultExpanded?: readonly string[];
  defaultExpandDepth?: number;
  onExpandedChange?: (paths: string[]) => void;
  searchable?: boolean;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  pageSize?: number;
  maxHeight?: number | string;
  copyable?: boolean;
  onCopy?: (detail: JsonViewerCopyDetail) => void;
  onSelect?: (detail: { path: string; value: unknown; type: JsonValueType }) => void;
  showPath?: boolean;
  className?: string;
}
interface JsonRow { path: string; name: string; value: unknown; type: JsonValueType; depth: number; parent?: string; count: number; branch: boolean; cycle: boolean; more?: boolean; remaining?: number }
const identifier = /^[A-Za-z_$][\w$]*$/;
function jsonType(value: unknown): JsonValueType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'other';
  if (typeof value === 'object') return 'object';
  if (['string','number','boolean','undefined'].includes(typeof value)) return typeof value as JsonValueType;
  return 'other';
}
function jsonEntries(value: unknown): [string | number, unknown][] {
  if (Array.isArray(value)) return Array.from({ length: value.length }, (_, index) => [index, value[index]]);
  if (!value || typeof value !== 'object') return [];
  try { return Object.keys(value).map(key => { try { return [key, (value as Record<string, unknown>)[key]]; } catch { return [key, '[unavailable]']; } }); }
  catch { return []; }
}
function jsonPath(parent: string, key: string | number) { return typeof key === 'number' ? `${parent}[${key}]` : identifier.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`; }
function jsonPrimitive(value: unknown, type = jsonType(value)): string {
  if (type === 'string') return JSON.stringify(value);
  if (type === 'undefined') return 'undefined';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function') return '[function]';
  if (typeof value === 'symbol') return String(value);
  return String(value);
}
export function stringifyJsonViewerValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return `${value}n`;
  const ancestors: object[] = [];
  try {
    const serialized = JSON.stringify(value, function (this: unknown, _key, item: unknown) {
      if (typeof item === 'bigint') return `${item}n`;
      if (typeof item === 'function') return '[function]';
      if (typeof item === 'symbol') return String(item);
      if (item && typeof item === 'object') {
        while (ancestors.length && ancestors.at(-1) !== this) ancestors.pop();
        if (ancestors.includes(item)) return '[Circular]';
        ancestors.push(item);
      }
      return item;
    }, 2);
    return serialized ?? jsonPrimitive(value);
  } catch { return '[unavailable]'; }
}
function jsonMatches(data: unknown, root: string, needle: string): Set<string> {
  const included = new Set<string>();
  if (!needle) return included;
  let visited = 0;
  const visit = (value: unknown, path: string, name: string, ancestors: string[], objects: Set<object>, includeDescendants = false) => {
    if (++visited > 20000) return;
    const type = jsonType(value), branch = type === 'object' || type === 'array';
    const hit = name.toLocaleLowerCase().includes(needle) || !branch && jsonPrimitive(value, type).toLocaleLowerCase().includes(needle);
    if (hit || includeDescendants) { included.add(path); ancestors.forEach(item => included.add(item)); }
    if (!branch || objects.has(value as object)) return;
    const next = new Set(objects); next.add(value as object);
    jsonEntries(value).forEach(([key, child]) => visit(child, jsonPath(path,key), String(key), [...ancestors,path], next, includeDescendants || hit));
  };
  visit(data, root, root, [], new Set());
  return included;
}
function initialJsonExpanded(data: unknown, rootName: string, depth: number): string[] {
  const result: string[] = []; let visited = 0;
  const walk = (value: unknown, path: string, level: number, ancestors: Set<object>) => {
    if (++visited > 20000 || !value || typeof value !== 'object' || level >= depth || ancestors.has(value)) return;
    const next = new Set(ancestors); next.add(value); result.push(path);
    jsonEntries(value).forEach(([key, child]) => walk(child, jsonPath(path, key), level+1, next));
  };
  walk(data, rootName, 0, new Set());
  return result;
}
export function JsonViewer({ label, data, rootName = 'root', expanded: controlledExpanded, defaultExpanded, defaultExpandDepth = 1, onExpandedChange, searchable = true, query: controlledQuery, defaultQuery = '', onQueryChange, pageSize = 50, maxHeight = 420, copyable = true, onCopy, onSelect, showPath = true, className }: JsonViewerProps) {
  const t = useTranslate();

  const [internalExpanded, setInternalExpanded] = useState<string[]>(() => [...(defaultExpanded ?? initialJsonExpanded(data, rootName, Math.max(0, defaultExpandDepth)))]);
  const [internalQuery, setInternalQuery] = useState(defaultQuery);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState(rootName);
  const [status, setStatus] = useState('');
  const tree = useRef<HTMLDivElement>(null);
  const expanded = new Set(controlledExpanded ?? internalExpanded), query = controlledQuery ?? internalQuery;
  const needle = query.trim().toLocaleLowerCase();
  const matching = useMemo(() => jsonMatches(data, rootName, needle), [data, rootName, needle]);
  const size = Math.max(1, Math.floor(pageSize));
  const rows = useMemo(() => {
    const result: JsonRow[] = [];
    const walk = (value: unknown, path: string, name: string, depth: number, parent: string | undefined, ancestors: Set<object>) => {
      if (needle && !matching.has(path)) return;
      const type = jsonType(value), branch = type === 'object' || type === 'array';
      const cycle = branch && ancestors.has(value as object), children = branch && !cycle ? jsonEntries(value) : [];
      result.push({ path, name, value, type, depth, parent, count: children.length, branch: branch && !cycle, cycle });
      if (!branch || cycle || !(needle || expanded.has(path))) return;
      const next = new Set(ancestors); next.add(value as object);
      const visible = needle ? children.filter(([key]) => matching.has(jsonPath(path,key))) : children.slice(0, limits[path] ?? size);
      visible.forEach(([key, child]) => walk(child, jsonPath(path,key), String(key), depth+1, path, next));
      if (!needle && children.length > visible.length) result.push({ path: `${path}#more`, name: 'more', value: null, type: 'other', depth: depth+1, parent: path, count: 0, branch: false, cycle: false, more: true, remaining: children.length-visible.length });
    };
    walk(data, rootName, rootName, 0, undefined, new Set());
    return result;
  }, [data, rootName, needle, matching, expanded, limits, size]);
  const presentRows = useDisclosurePresence(rows, row => row.path);
  const presenceSignature = presentRows.map(row => `${row.key}:${row.phase}`).join('|');
  const current = rows.some(row => row.path === selected) ? selected : rows.find(row => !row.more)?.path;
  useLayoutEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || !tree.current?.contains(active) || !active.closest('[data-presence="exit"]')) return;
    const old = presentRows.find(row => row.item.path === active.closest<HTMLElement>('[data-path]')?.dataset.path)?.item;
    const destination = rows.find(row => row.path === old?.parent)?.path ?? current;
    Array.from(tree.current.querySelectorAll<HTMLElement>('[role="treeitem"]')).find(node => node.dataset.path === destination)?.focus();
  }, [presenceSignature, current]);
  const updateExpanded = (path: string, open: boolean) => {
    const next = new Set(expanded); open ? next.add(path) : next.delete(path);
    const list = [...next]; if (controlledExpanded === undefined) setInternalExpanded(list); onExpandedChange?.(list);
  };
  const focusRow = (path: string) => {
    setSelected(path);
    const row = rows.find(item => item.path === path);
    if (row && !row.more) onSelect?.({ path: row.path, value: row.value, type: row.type });
    requestAnimationFrame(() => Array.from(tree.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? []).find(node=>node.dataset.path===path)?.focus());
  };
  const showMore = (row: JsonRow) => { if (!row.more || !row.parent) return; setLimits(current=>({...current,[row.parent!]: (current[row.parent!]??size)+size})); };
  const copy = async (row: JsonRow, kind: 'path' | 'value') => {
    const text = kind === 'path' ? row.path : stringifyJsonViewerValue(row.value);
    try { await navigator.clipboard.writeText(text); onCopy?.({ kind, path: row.path, text }); setStatus(`${kind === 'path' ? t("Путь", "Path") : t("Значение", "Value")}${t(" скопировано", " copied")}`); }
    catch { setStatus(t("Не удалось скопировать", "Could not copy")); }
  };
  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!target || target.dataset.presence === 'exit') return;
    const index = rows.findIndex(row => row.path === target.dataset.path), row = rows[index];
    if (!row) return;
    if (row.more) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showMore(row); } return; }
    if (copyable && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); void copy(row, event.shiftKey ? 'path' : 'value'); return; }
    if (event.target !== target) return;
    const navigate = (next: JsonRow | undefined) => { if (!next) return; event.preventDefault(); focusRow(next.path); };
    if (event.key === 'ArrowDown') { navigate(rows[index+1]); return; }
    if (event.key === 'ArrowUp') { navigate(rows[index-1]); return; }
    if (event.key === 'Home') { navigate(rows[0]); return; }
    if (event.key === 'End') { navigate(rows.at(-1)); return; }
    if (event.key === 'ArrowRight' && row.branch) { event.preventDefault(); if (!expanded.has(row.path)) updateExpanded(row.path,true); else navigate(rows[index+1]); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); if (row.branch && expanded.has(row.path)) updateExpanded(row.path,false); else if(row.parent) focusRow(row.parent); return; }
    if ((event.key === 'Enter' || event.key === ' ') && row.branch) { event.preventDefault(); updateExpanded(row.path,!expanded.has(row.path)); }
  };
  return <section className={`cap-json-viewer cap-surface-boundary${className ? ` ${className}` : ''}`} aria-label={label}>
    {searchable&&<Input label={t("Поиск в JSON", "Search JSON")} size="sm" leading={<Search size={15}/>} value={query} onChange={event=>{ const next=event.target.value; if(controlledQuery===undefined)setInternalQuery(next); onQueryChange?.(next); }} />}
    {rows.length ? <div ref={tree} className="cap-json-tree" role="tree" aria-label={label} style={{ maxHeight }} onKeyDown={keydown}>
      {presentRows.map(({item:row,phase}) => row.more ? <div key={row.path} role="treeitem" tabIndex={phase!=='exit'&&row.path===current?0:-1} data-path={row.path} data-presence={phase} aria-hidden={phase==='exit'||undefined} inert={phase==='exit'||undefined} aria-level={row.depth+1} aria-selected={row.path===current} className="cap-json-row cap-json-more" style={{paddingInlineStart:8+row.depth*18}} onFocus={()=>{if(phase!=='exit')setSelected(row.path)}} onClick={()=>{if(phase!=='exit')showMore(row)}}>{t("Показать ещё", "Show more")} {Math.min(size,row.remaining??0)} {t("из", "of")} {row.remaining}</div>
      : <div key={row.path} role="treeitem" tabIndex={phase!=='exit'&&row.path===current?0:-1} data-path={row.path} data-presence={phase} aria-hidden={phase==='exit'||undefined} inert={phase==='exit'||undefined} aria-level={row.depth+1} aria-expanded={row.branch ? needle ? true : expanded.has(row.path) : undefined} className="cap-json-row" style={{paddingInlineStart:8+row.depth*18}} onFocus={()=>{if(phase!=='exit')setSelected(row.path)}} onClick={()=>{if(phase==='exit')return;setSelected(row.path);onSelect?.({path:row.path,value:row.value,type:row.type}); if(row.branch)updateExpanded(row.path,!expanded.has(row.path));}}>
        <span className="cap-json-disclosure" aria-hidden="true">{row.branch ? needle || expanded.has(row.path) ? <ChevronDown size={14}/> : <ChevronRight size={14}/> : null}</span>
        <span className="cap-json-key">{row.name}</span><span className="cap-json-colon">:</span>
        <span className="cap-json-value" data-type={row.type}>{row.cycle ? t("[Циклическая ссылка]", "[Circular]") : row.branch ? row.type === 'array' ? `[${row.count}${t(" элементов]", " items]")}` : `{${row.count}${t(" ключей}", " keys}")}` : jsonPrimitive(row.value,row.type)}</span>
        {copyable&&<span className="cap-json-actions"><IconButton label={`${t("Копировать значение ", "Copy value ")}${row.path}`} icon={Copy} size="xs" variant="ghost" onClick={event=>{event.stopPropagation();void copy(row,'value');}}/><IconButton label={`${t("Копировать путь ", "Copy path ")}${row.path}`} icon={Link2} size="xs" variant="ghost" onClick={event=>{event.stopPropagation();void copy(row,'path');}}/></span>}
      </div>)}
    </div> : <div className="cap-json-empty" role="status">{t("Ничего не найдено", "No results")}</div>}
    <div className="cap-json-footer"><span>{rows.filter(row=>!row.more).length} {t("узлов показано", "nodes shown")}</span>{showPath&&<span className="cap-json-path">{current}</span>}</div>
    <span role="status" className="cap-sr-only">{status}</span>
  </section>;
}
