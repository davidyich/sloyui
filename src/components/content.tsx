import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Button, Icon, IconButton, TypeLabel, cx, type Color } from './primitives.js';
import { Select, SegmentedControl } from './forms.js';
import { EmptyState } from './layout.js';
import { Menu, Popover, type MenuItem } from './overlays.js';

// Calendar values are local calendar dates, never UTC timestamps.
function parseDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function addDays(date: Date, amount: number) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12); }
function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function addMonths(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  return new Date(next.getFullYear(), next.getMonth(), Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()), 12);
}
function mondayIndex(date: Date) { return (date.getDay() + 6) % 7; }
export interface CalendarEvent { id: string; date: string; title: string; time?: string; color?: Color }
export interface CalendarProps {
  value?: string;
  onValueChange: (value: string) => void;
  defaultMonth?: string;
  today?: string;
  min?: string;
  max?: string;
  isDateUnavailable?: (date: string) => boolean;
  locale?: string;
  events?: CalendarEvent[];
  showAgenda?: boolean;
  yearRange?: readonly [number, number];
  className?: string;
  label?: string;
}
export function Calendar({ value, onValueChange, defaultMonth, today, min, max, isDateUnavailable, locale = 'ru-RU', events = [], showAgenda = false, yearRange, className, label = 'Календарь' }: CalendarProps) {
  const todayDate = parseDate(today) ?? new Date(), selected = parseDate(value);
  const initial = parseDate(defaultMonth?.length === 7 ? `${defaultMonth}-01` : defaultMonth) ?? selected ?? todayDate;
  const [month, setMonth] = useState(() => monthStart(initial));
  const [focused, setFocused] = useState(() => dateKey(selected ?? initial));
  const grid = useRef<HTMLDivElement>(null), pendingFocus = useRef(false), id = useId();
  const isDisabled = (key: string) => !!((min && key < min) || (max && key > max) || isDateUnavailable?.(key));
  const first = addDays(month, -mondayIndex(month));
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index));
  const currentKey = days.some(date => dateKey(date) === focused && !isDisabled(focused)) ? focused : days.map(dateKey).find(key => !isDisabled(key));
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);
  const longDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekDay = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const agenda = events.filter(event => event.date === (value ?? currentKey));
  useEffect(() => { const next = parseDate(value); if (next) { setMonth(monthStart(next)); setFocused(dateKey(next)); } }, [value]);
  useLayoutEffect(() => { if (pendingFocus.current) { grid.current?.querySelector<HTMLButtonElement>(`[data-date="${currentKey}"]`)?.focus(); pendingFocus.current = false; } }, [month, focused, currentKey]);
  const changeMonth = (next: Date) => { setMonth(monthStart(next)); setFocused(dateKey(next)); };
  const moveFocus = (next: Date, direction: number) => {
    let key = dateKey(next);
    for (let attempts = 0; isDisabled(key) && attempts < 366; attempts++) { next = addDays(next, direction); key = dateKey(next); }
    if (isDisabled(key)) return;
    pendingFocus.current = true; setFocused(key); setMonth(monthStart(next));
  };
  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let next: Date | undefined, direction = 1;
    if (event.key === 'ArrowRight') next = addDays(date, 1);
    if (event.key === 'ArrowLeft') { next = addDays(date, -1); direction = -1; }
    if (event.key === 'ArrowDown') next = addDays(date, 7);
    if (event.key === 'ArrowUp') { next = addDays(date, -7); direction = -1; }
    if (event.key === 'Home') { next = addDays(date, -mondayIndex(date)); direction = 1; }
    if (event.key === 'End') { next = addDays(date, 6 - mondayIndex(date)); direction = -1; }
    if (event.key === 'PageDown') next = addMonths(date, event.shiftKey ? 12 : 1);
    if (event.key === 'PageUp') { next = addMonths(date, event.shiftKey ? -12 : -1); direction = -1; }
    if (next) { event.preventDefault(); moveFocus(next, direction); }
  };
  const fromYear = Math.min(yearRange?.[0] ?? todayDate.getFullYear() - 10, month.getFullYear());
  const toYear = Math.max(yearRange?.[1] ?? todayDate.getFullYear() + 10, month.getFullYear());
  return <section className={cx('cap-calendar', className)} aria-label={label}>
    <div className="cap-calendar-toolbar"><IconButton label="Предыдущий месяц" icon="chevron" variant="outline" className="cap-calendar-prev" onClick={() => changeMonth(addMonths(month, -1))} /><div className="cap-calendar-period"><Select aria-label="Месяц" size="sm" value={month.getMonth()} onChange={event => changeMonth(new Date(month.getFullYear(), Number(event.target.value), 1, 12))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2026, index, 1))}</option>)}</Select><Select aria-label="Год" size="sm" value={month.getFullYear()} onChange={event => changeMonth(new Date(Number(event.target.value), month.getMonth(), 1, 12))}>{Array.from({ length: toYear - fromYear + 1 }, (_, index) => fromYear + index).map(year => <option key={year} value={year}>{year}</option>)}</Select></div><IconButton label="Следующий месяц" icon="chevron" variant="outline" onClick={() => changeMonth(addMonths(month, 1))} /></div>
    <span id={`${id}-month`} className="cap-sr-only" aria-live="polite">{monthLabel}</span>
    <div className="cap-calendar-grid" role="grid" aria-labelledby={`${id}-month`} ref={grid}>
      <div role="row" className="cap-calendar-week">{days.slice(0, 7).map(day => <span role="columnheader" key={dateKey(day)}>{weekDay.format(day)}</span>)}</div>
      {Array.from({ length: 6 }, (_, week) => <div role="row" className="cap-calendar-week" key={week}>{days.slice(week * 7, week * 7 + 7).map(date => {
        const key = dateKey(date), eventCount = events.filter(event => event.date === key).length;
        return <div role="gridcell" aria-selected={key === value} key={key}><button type="button" className="cap-calendar-day" data-date={key} data-outside={date.getMonth() !== month.getMonth() || undefined} data-selected={key === value || undefined} aria-current={key === dateKey(todayDate) ? 'date' : undefined} aria-label={`${longDate.format(date)}${eventCount ? ` · ${eventCount} событий` : ''}`} tabIndex={key === currentKey ? 0 : -1} disabled={isDisabled(key)} onFocus={() => setFocused(key)} onKeyDown={event => onDayKeyDown(event, date)} onClick={() => { setFocused(key); setMonth(monthStart(date)); onValueChange(key); }}>{date.getDate()}{eventCount > 0 && <span className="cap-calendar-dot" aria-hidden="true" />}</button></div>;
      })}</div>)}
    </div>
    <div className="cap-calendar-footer"><Button variant="ghost" size="sm" disabled={isDisabled(dateKey(todayDate))} onClick={() => { const key = dateKey(todayDate); setMonth(monthStart(todayDate)); setFocused(key); onValueChange(key); }}>Сегодня</Button><span>{value ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(selected ?? todayDate) : 'Выберите дату'}</span></div>
    {showAgenda && <div className="cap-calendar-agenda" aria-label="События выбранного дня">{agenda.length ? <ul>{agenda.map(event => <li key={event.id} data-color={event.color ?? 'teal'}><span className="cap-calendar-event-line" /><strong>{event.title}</strong>{event.time && <span>{event.time}</span>}</li>)}</ul> : <p>На этот день событий нет</p>}</div>}
  </section>;
}
export function DatePicker({ label = 'Выбрать дату', value, onValueChange, locale = 'ru-RU', ...props }: CalendarProps) {
  const [open, setOpen] = useState(false);
  const date = parseDate(value);
  return <Popover label={date ? `${label}: ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date)}` : label} open={open} onOpenChange={setOpen} className="cap-datepicker-popover"><Calendar {...props} locale={locale} value={value} onValueChange={next => { onValueChange(next); setOpen(false); }} /></Popover>;
}

function safeHref(value: string) { const href = value.trim(); return /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(href) && !/[\u0000-\u0020]/.test(href) ? href : undefined; }
function inlineMarkdown(text: string): ReactNode[] {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) { const href = safeHref(link[2]); return href ? <a key={index} href={href}>{link[1]}</a> : <Fragment key={index}>{link[1]}</Fragment>; }
    return part;
  });
}
export interface MarkdownPreviewProps extends HTMLAttributes<HTMLDivElement> { value: string; headingOffset?: 0 | 1 | 2 | 3 }
export function MarkdownPreview({ value, headingOffset = 1, className, ...props }: MarkdownPreviewProps) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n'), nodes: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index], key = index;
    if (!line.trim()) { index++; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim(), code: string[] = []; index++;
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      if (index < lines.length) index++;
      nodes.push(<pre key={key} tabIndex={0} aria-label={language ? `Код: ${language}` : 'Блок кода'}><code>{code.join('\n')}</code></pre>); continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { const Heading = `h${Math.min(6, heading[1].length + headingOffset)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; nodes.push(<Heading key={key}>{inlineMarkdown(heading[2])}</Heading>); index++; continue; }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) { nodes.push(<hr key={key} />); index++; continue; }
    if (/^>\s?/.test(line)) { const quote: string[] = []; while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, '')); nodes.push(<blockquote key={key}>{inlineMarkdown(quote.join('\n'))}</blockquote>); continue; }
    const ordered = /^\d+\.\s+/.test(line), unordered = /^[-*+]\s+/.test(line);
    if (ordered || unordered) {
      const items: ReactNode[] = [], pattern = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/;
      while (index < lines.length && pattern.test(lines[index])) {
        const content = lines[index++].replace(pattern, ''), task = /^\[([ xX])\]\s+(.+)$/.exec(content);
        items.push(<li key={index} className={task ? 'cap-markdown-task' : undefined}>{task ? <><span role="checkbox" aria-readonly="true" aria-checked={task[1].toLowerCase() === 'x'} aria-label={task[2]} className="cap-markdown-task-icon">{task[1].toLowerCase() === 'x' && <Icon name="check" size={12} />}</span>{inlineMarkdown(task[2])}</> : inlineMarkdown(content)}</li>);
      }
      const List = ordered ? 'ol' : 'ul'; nodes.push(<List key={key}>{items}</List>); continue;
    }
    const paragraph = [line]; index++;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6}\s|```|>\s?|[-*+]\s|\d+\.\s|\s*([-*_])(?:\s*\2){2,}\s*$)/.test(lines[index])) paragraph.push(lines[index++]);
    nodes.push(<p key={key}>{inlineMarkdown(paragraph.join('\n'))}</p>);
  }
  return <div className={cx('cap-markdown', className)} {...props}>{nodes.length ? nodes : <p className="cap-markdown-placeholder">Здесь появится ваша заметка</p>}</div>;
}
export interface MarkdownEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  defaultMode?: 'edit' | 'preview' | 'split';
  onSave?: () => void;
  className?: string;
}
export function MarkdownEditor({ value, onValueChange, label, placeholder = 'Начните писать…', disabled, readOnly, defaultMode = 'edit', onSave, className }: MarkdownEditorProps) {
  const [mode, setMode] = useState(defaultMode), textarea = useRef<HTMLTextAreaElement>(null), id = useId();
  const selection = useRef<readonly [number, number] | null>(null);
  useLayoutEffect(() => { if (selection.current && textarea.current) { textarea.current.focus(); textarea.current.setSelectionRange(...selection.current); selection.current = null; } }, [value, mode]);
  const format = (before: string, after = before, fallback = 'текст') => {
    if (disabled || readOnly) return;
    const start = textarea.current?.selectionStart ?? value.length, end = textarea.current?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    selection.current = [start + before.length, start + before.length + selected.length];
    onValueChange(value.slice(0, start) + before + selected + after + value.slice(end));
    if (mode === 'preview') setMode('edit');
  };
  const toolsDisabled = disabled || readOnly || mode === 'preview';
  return <div className={cx('cap-markdown-editor', className)} data-surface="raised" data-mode={mode} data-disabled={disabled || undefined}>
    <div className="cap-markdown-toolbar" data-surface="canvas"><div role="group" aria-label="Форматирование Markdown"><Button size="sm" variant="ghost" aria-label="Жирный текст" disabled={toolsDisabled} onClick={() => format('**')}><strong>B</strong></Button><Button size="sm" variant="ghost" aria-label="Курсив" disabled={toolsDisabled} onClick={() => format('*')}><em>I</em></Button><Button size="sm" variant="ghost" aria-label="Заголовок" disabled={toolsDisabled} onClick={() => format('\n## ', '\n', 'Заголовок')}>H</Button><IconButton size="sm" variant="ghost" label="Маркированный список" icon="list" disabled={toolsDisabled} onClick={() => format('\n- ', '\n', 'Пункт списка')} /><IconButton size="sm" variant="ghost" label="Код" icon="code" disabled={toolsDisabled} onClick={() => format('`', '`', 'code')} /><IconButton size="sm" variant="ghost" label="Ссылка" icon="external" disabled={toolsDisabled} onClick={() => format('[', '](https://example.com)', 'Название ссылки')} /></div><SegmentedControl label="Режим редактора" value={mode} onValueChange={next => setMode(next as typeof mode)} options={[{ value: 'edit', label: 'Текст' }, { value: 'preview', label: 'Просмотр' }, { value: 'split', label: 'Рядом' }]} /></div>
    <div className="cap-markdown-editor-body">{mode !== 'preview' && <div className="cap-markdown-input"><label htmlFor={id} className="cap-sr-only">{label}</label><textarea ref={textarea} id={id} value={value} placeholder={placeholder} disabled={disabled} readOnly={readOnly} spellCheck onChange={event => onValueChange(event.target.value)} onKeyDown={event => { if (!(event.metaKey || event.ctrlKey) || event.altKey || event.nativeEvent.isComposing) return; if (event.key.toLowerCase() === 'b') { event.preventDefault(); format('**'); } else if (event.key.toLowerCase() === 'i') { event.preventDefault(); format('*'); } else if (event.key === 'Enter' && onSave && !disabled && !readOnly) { event.preventDefault(); onSave(); } }} /></div>}{mode !== 'edit' && <MarkdownPreview value={value} className="cap-markdown-editor-preview" role="region" aria-label={`Просмотр: ${label}`} />}</div>
    <div className="cap-markdown-status"><span>Markdown · {value.length.toLocaleString()} символов</span>{onSave ? <Button variant="ghost" size="xs" onClick={onSave} disabled={disabled || readOnly}>Сохранить</Button> : <span>Текст · ссылки · списки · код</span>}</div>
  </div>;
}

export interface ContentCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'onSelect'> {
  title: ReactNode; description?: ReactNode; header?: ReactNode; metadata?: ReactNode; footer?: ReactNode; cover?: ReactNode; actions?: ReactNode;
  onOpen?: () => void; selected?: boolean; onSelectedChange?: (selected: boolean) => void; selectionLabel?: string;
  density?: 'compact' | 'comfortable'; orientation?: 'vertical' | 'horizontal'; headingLevel?: 2 | 3 | 4;
}
export function ContentCard({ title, description, header, metadata, footer, cover, actions, onOpen, selected, onSelectedChange, selectionLabel, density = 'comfortable', orientation = 'vertical', headingLevel = 3, children, className, ...props }: ContentCardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  return <article className={cx('cap-content-card', className)} data-surface="raised" data-density={density} data-orientation={orientation} data-selected={selected || undefined} {...props}>{cover && <div className="cap-content-card-cover">{cover}</div>}<div className="cap-content-card-body">{(header || actions || onSelectedChange) && <div className="cap-content-card-header">{onSelectedChange && <input className="cap-checkbox" type="checkbox" aria-label={selectionLabel ?? `Выбрать ${typeof title === 'string' ? title : 'карточку'}`} checked={!!selected} onChange={event => onSelectedChange(event.target.checked)} />}<div className="cap-content-card-header-content">{header}</div>{actions && <div className="cap-content-card-actions">{actions}</div>}</div>}<Heading className="cap-content-card-title">{onOpen ? <button type="button" className="cap-content-card-open" onClick={onOpen}>{title}</button> : title}</Heading>{description && <div className="cap-content-card-description">{description}</div>}{children}{metadata && <div className="cap-content-card-metadata">{metadata}</div>}{footer && <div className="cap-content-card-footer">{footer}</div>}</div></article>;
}
export interface TaskCardProps extends Omit<ContentCardProps, 'title' | 'header' | 'actions'> {
  title: string; typeLabel?: string; color?: Color; completed?: boolean; onCompletedChange?: (completed: boolean) => void; menuItems?: MenuItem[];
}
export function TaskCard({ title, typeLabel = 'Задача', color = 'rose', completed, onCompletedChange, menuItems, onOpen, className, ...props }: TaskCardProps) {
  return <ContentCard {...props} className={cx('cap-task-card', className)} data-accent={color} data-completed={completed || undefined} header={<TypeLabel color={color} icon="check">{typeLabel}</TypeLabel>} actions={menuItems?.length ? <Menu label={`Действия: ${title}`} items={menuItems} /> : undefined} title={<span className="cap-task-title-row">{onCompletedChange && <input className="cap-task-checkbox" type="checkbox" aria-label={`Завершить: ${title}`} checked={!!completed} onChange={event => onCompletedChange(event.target.checked)} />}{onOpen ? <button type="button" className="cap-content-card-open" onClick={onOpen}>{title}</button> : <span>{title}</span>}</span>} />;
}
export interface KanbanColumnProps extends HTMLAttributes<HTMLElement> { title: string; count?: number; action?: ReactNode; emptyState?: ReactNode }
export function KanbanColumn({ title, count, action, emptyState, children, className, ...props }: KanbanColumnProps) {
  const id = useId();
  return <section className={cx('cap-kanban-column', className)} aria-labelledby={id} {...props}><header className="cap-kanban-column-header"><h3 id={id}>{title}</h3>{count !== undefined && <span className="cap-count">{count}</span>}{action}</header><div className="cap-kanban-column-body">{count === 0 ? emptyState ?? <EmptyState title="Здесь пока пусто" description="Переместите сюда карточку" /> : children}</div></section>;
}
export interface KanbanLane { id: string; title: string; emptyMessage?: string }
export interface KanbanTask { id: string; columnId: string; title: string; description?: string; completed?: boolean; color?: Color; metadata?: ReactNode; footer?: ReactNode }
export interface KanbanBoardProps {
  label: string; columns: KanbanLane[]; items: KanbanTask[]; onMove?: (id: string, columnId: string) => void; onCompletedChange?: (id: string, completed: boolean) => void;
  onOpen?: (id: string) => void; onAdd?: (columnId: string) => void; renderCard?: (item: KanbanTask) => ReactNode; className?: string;
}
export function KanbanBoard({ label, columns, items, onMove, onCompletedChange, onOpen, onAdd, renderCard, className }: KanbanBoardProps) {
  return <div className={cx('cap-kanban-board', className)} role="region" aria-label={label} tabIndex={0}>{columns.map(column => {
    const columnItems = items.filter(item => item.columnId === column.id);
    return <KanbanColumn key={column.id} title={column.title} count={columnItems.length} action={onAdd && <IconButton label={`Добавить в ${column.title}`} icon="plus" size="sm" variant="ghost" onClick={() => onAdd(column.id)} />} emptyState={<EmptyState title={column.emptyMessage ?? 'Пока нет задач'} description={onMove ? 'В меню карточки выберите эту колонку' : undefined} />}>{columnItems.map(item => <Fragment key={item.id}>{renderCard ? renderCard(item) : <TaskCard title={item.title} description={item.description} completed={item.completed} color={item.color} metadata={item.metadata} footer={item.footer} onOpen={onOpen ? () => onOpen(item.id) : undefined} onCompletedChange={onCompletedChange ? completed => onCompletedChange(item.id, completed) : undefined} menuItems={onMove ? columns.filter(target => target.id !== column.id).map(target => ({ id: target.id, label: `В ${target.title}`, icon: 'arrow', onSelect: () => onMove(item.id, target.id) })) : undefined} />}</Fragment>)}</KanbanColumn>;
  })}</div>;
}
export interface DailyHeaderProps extends HTMLAttributes<HTMLElement> { date: string; locale?: string; showWeek?: boolean; tags?: ReactNode; actions?: ReactNode; headingLevel?: 1 | 2 | 3 }
export function DailyHeader({ date, locale = 'ru-RU', showWeek = true, tags, actions, headingLevel = 2, className, children, ...props }: DailyHeaderProps) {
  const parsed = parseDate(date) ?? new Date(), Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  const thursday = addDays(parsed, 3 - mondayIndex(parsed)), yearStart = new Date(thursday.getFullYear(), 0, 1, 12);
  const week = Math.ceil(((Date.UTC(thursday.getFullYear(), thursday.getMonth(), thursday.getDate()) - Date.UTC(yearStart.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return <header className={cx('cap-daily-header', className)} {...props}><div className="cap-daily-header-top"><div><div className="cap-daily-weekday">{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(parsed)}</div><div className="cap-daily-date"><Heading><time dateTime={dateKey(parsed)}>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)}</time></Heading>{showWeek && <span>Неделя {week}</span>}</div></div>{actions && <div className="cap-daily-actions">{actions}</div>}</div>{tags && <div className="cap-daily-tags">{tags}</div>}{children}</header>;
}
