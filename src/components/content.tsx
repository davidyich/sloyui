import { ButtonGroup } from './workbench.js';
import { CodeBlock, type CodeBlockProps } from './code-block.js';
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Counter, TextAction, Button, Icon, IconButton, Tag, cx, type Color } from './primitives.js';
import { Select, SegmentedControl } from './forms.js';
import { ComboBox } from './selection.js';
import { MovingHighlight } from './moving-highlight.js';
import { EmptyState } from './layout.js';
import { Menu, Popover, Tooltip, type MenuItem } from './overlays.js';

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
export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  time?: string;
  description?: string;
  color?: Color;
  /** Overrides the calendar's default event hierarchy. */
  emphasis?: 'title' | 'time';
}
export interface CalendarRange { start: string; end?: string }
export interface CalendarDateHighlight { date: string; label?: string; color?: Color }
export interface CalendarBaseProps {
  defaultMonth?: string;
  today?: string;
  min?: string;
  max?: string;
  isDateUnavailable?: (date: string) => boolean;
  locale?: string;
  events?: readonly CalendarEvent[];
  showAgenda?: boolean;
  agendaPosition?: 'bottom' | 'side';
  eventEmphasis?: 'title' | 'time';
  showEventPreview?: boolean;
  highlightedDates?: readonly (string | CalendarDateHighlight)[];
  numberOfMonths?: 1 | 2;
  yearRange?: readonly [number, number];
  className?: string;
  label?: string;
}
/** Remains an interface so existing single-date consumers can extend it. */
export interface CalendarProps extends CalendarBaseProps {
  mode?: 'single';
  value?: string;
  onValueChange: (value: string) => void;
  range?: never;
  onRangeChange?: never;
}
export interface CalendarRangeProps extends CalendarBaseProps {
  mode: 'range';
  range?: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  value?: never;
  onValueChange?: never;
}
export type CalendarSelectionProps = CalendarProps | CalendarRangeProps;
function CalendarEventList({ events, emphasis }: { events: readonly CalendarEvent[]; emphasis: 'title' | 'time' }) {
  return <ul className="cap-calendar-events">{events.map(event => {
    const timeFirst = (event.emphasis ?? emphasis) === 'time' && !!event.time;
    return <li key={event.id} data-accent={event.color}>
      <span className="cap-calendar-event-line" aria-hidden="true" />
      <div className="cap-calendar-event-copy"><div className="cap-calendar-event-heading" data-emphasis={timeFirst ? 'time' : 'title'}>
        <strong>{timeFirst ? event.time : event.title}</strong>
        {event.time && <span>{timeFirst ? event.title : event.time}</span>}
      </div>{event.description && <p>{event.description}</p>}</div>
    </li>;
  })}</ul>;
}
export function Calendar(props: CalendarSelectionProps) {
  const { value, onValueChange, range, onRangeChange, mode = 'single', defaultMonth, today, min, max, isDateUnavailable, locale = 'ru-RU', events = [], showAgenda = false, agendaPosition = 'bottom', eventEmphasis = 'title', showEventPreview = true, highlightedDates = [], numberOfMonths = mode === 'range' ? 2 : 1, yearRange, className, label = 'Календарь' } = props;
  const todayDate = parseDate(today) ?? new Date(), todayKey = dateKey(todayDate);
  const selectionKey = mode === 'range' ? range?.start : value, selected = parseDate(selectionKey);
  const initial = parseDate(defaultMonth?.length === 7 ? `${defaultMonth}-01` : defaultMonth) ?? selected ?? todayDate;
  const [month, setMonth] = useState(() => monthStart(initial));
  const [focused, setFocused] = useState(() => dateKey(selected ?? initial));
  const [preview, setPreview] = useState<string>(), [notice, setNotice] = useState('');
  const grids = useRef<HTMLDivElement>(null), pendingFocus = useRef(false), previousMonth = useRef(dateKey(month)), id = useId();
  const isDisabled = (key: string) => !!((min && key < min) || (max && key > max) || isDateUnavailable?.(key));
  const visibleMonths = Array.from({ length: numberOfMonths }, (_, index) => addMonths(month, index));
  const isVisibleMonth = (date: Date) => date >= month && date < addMonths(month, numberOfMonths);
  const monthDays = visibleMonths.map(current => {
    const first = addDays(current, -mondayIndex(current));
    return Array.from({ length: 42 }, (_, index) => addDays(first, index));
  });
  const focusableKeys = monthDays.flatMap((days, index) => days.filter(date => numberOfMonths === 1 || date.getMonth() === visibleMonths[index].getMonth()).map(dateKey)).filter(key => !isDisabled(key));
  const currentKey = focusableKeys.includes(focused) ? focused : focusableKeys.find(key => key.slice(0, 7) === dateKey(month).slice(0, 7)) ?? focusableKeys[0];
  const monthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const longDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const weekDay = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach(event => eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event]));
  const highlights = new Map(highlightedDates.map(item => typeof item === 'string' ? [item, { date: item }] : [item.date, item]));
  const agendaKey = mode === 'range' ? currentKey ?? range?.end ?? range?.start : value ?? currentKey;
  const agenda = eventsByDate.get(agendaKey ?? '') ?? [];
  const start = parseDate(range?.start) ? range!.start : undefined;
  const end = start && parseDate(range?.end) && range!.end! >= start ? range!.end : undefined;
  const crossesUnavailable = (from: string, to: string) => {
    if (!isDateUnavailable) return false;
    for (let date = parseDate(from)!; dateKey(date) <= to; date = addDays(date, 1)) if (isDisabled(dateKey(date))) return true;
    return false;
  };
  const previewStart = start && !end && preview ? (preview < start ? preview : start) : undefined;
  const previewEnd = start && !end && preview ? (preview > start ? preview : start) : undefined;
  const validPreview = previewStart && previewEnd && !isDisabled(preview!) && !crossesUnavailable(previewStart, previewEnd);
  useEffect(() => {
    const next = parseDate(selectionKey);
    if (next) {
      setMonth(current => next >= current && next < addMonths(current, numberOfMonths) ? current : monthStart(next));
      setFocused(dateKey(next));
    }
  }, [selectionKey, numberOfMonths]);
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      grids.current?.querySelector<HTMLButtonElement>(`[data-date="${currentKey}"]`)?.focus();
      pendingFocus.current = false;
    }
  }, [month, focused, currentKey]);
  useLayoutEffect(() => {
    const nextKey = dateKey(month), previous = previousMonth.current;
    previousMonth.current = nextKey;
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (nextKey === previous || media?.matches || !grids.current?.animate) return;
    const styles = getComputedStyle(grids.current), duration = parseFloat(styles.getPropertyValue('--cap-duration-normal')) || 180;
    const animation = grids.current.animate([{ opacity: .4, transform: `translateX(${nextKey > previous ? 8 : -8}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration, easing: styles.getPropertyValue('--cap-ease-standard').trim() || 'ease-out' });
    const stop = () => { if (media?.matches) animation.cancel(); };
    media?.addEventListener?.('change', stop);
    return () => { animation.cancel(); media?.removeEventListener?.('change', stop); };
  }, [month]);
  const revealDate = (date: Date) => { if (!isVisibleMonth(date)) setMonth(monthStart(date)); };
  const changeMonth = (next: Date) => { setMonth(monthStart(next)); setFocused(dateKey(next)); setPreview(undefined); };
  const selectDate = (key: string) => {
    if (isDisabled(key)) return;
    setFocused(key); revealDate(parseDate(key)!); setPreview(undefined); setNotice('');
    if (mode === 'range') {
      if (!start || end) onRangeChange?.({ start: key });
      else {
        const from = key < start ? key : start, to = key > start ? key : start;
        if (crossesUnavailable(from, to)) { onRangeChange?.({ start: key }); setNotice('Период не может включать недоступные дни. Выбрано новое начало.'); }
        else onRangeChange?.({ start: from, end: to });
      }
    } else onValueChange?.(key);
  };
  const moveFocus = (next: Date, direction: number) => {
    let key = dateKey(next);
    for (let attempts = 0; isDisabled(key) && attempts < 366; attempts++) { next = addDays(next, direction); key = dateKey(next); }
    if (isDisabled(key)) return;
    pendingFocus.current = true; setFocused(key); setPreview(key); revealDate(next);
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
  const rangePrompt = end ? 'Период выбран. Выберите новое начало.' : start ? 'Выберите конец периода' : 'Выберите начало периода';
  const selectionLabel = mode === 'range' ? start ? `${shortDate.format(parseDate(start)!)}${end ? ` — ${shortDate.format(parseDate(end)!)}` : ' — …'}` : 'Выберите период' : selected ? shortDate.format(selected) : 'Выберите дату';
  return <section className={cx('cap-calendar', className)} aria-label={label} data-months={numberOfMonths} data-mode={mode} data-agenda-position={showAgenda ? agendaPosition : undefined}>
    <div className="cap-calendar-body">
      <div className="cap-calendar-toolbar">
        <IconButton label="Предыдущий месяц" icon="chevron" variant="outline" className="cap-calendar-prev" onClick={() => changeMonth(addMonths(month, -1))} />
        <ButtonGroup label="Месяц и год" className="cap-calendar-period" size="md">
          <Select aria-label="Месяц" variant="ghost" popupClassName="cap-calendar-period-popup" size="md" value={month.getMonth()} onChange={event => changeMonth(new Date(month.getFullYear(), Number(event.target.value), 1, 12))}>{Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2026, index, 1))}</option>)}</Select>
          <span className="cap-calendar-period-divider" aria-hidden="true" />
          <ComboBox label="Год" className="cap-calendar-year" variant="ghost" size="md" clearable={false} value={String(month.getFullYear())} options={Array.from({ length: toYear - fromYear + 1 }, (_, index) => ({ value: String(fromYear + index), label: String(fromYear + index) }))} onValueChange={year => changeMonth(new Date(Number(year), month.getMonth(), 1, 12))} />
        </ButtonGroup>
        <IconButton label="Следующий месяц" icon="chevron" variant="outline" onClick={() => changeMonth(addMonths(month, 1))} />
      </div>
      <span className="cap-sr-only" aria-live="polite">{visibleMonths.map(date => monthFormat.format(date)).join(' — ')}</span>
      {mode === 'range' && <p id={`${id}-instruction`} className="cap-calendar-instruction" aria-live="polite">{notice || rangePrompt}</p>}
      <div className="cap-calendar-months" ref={grids} onMouseLeave={() => setPreview(undefined)}>
        {mode === 'single' && <MovingHighlight root={grids} selected={value ? `[data-date="${value}"]` : undefined} revision={dateKey(month)} />}
        {visibleMonths.map((currentMonth, index) => <div className="cap-calendar-month" key={index}>
          <div id={`${id}-month-${index}`} className={numberOfMonths === 1 ? 'cap-sr-only' : 'cap-calendar-month-title'}>{monthFormat.format(currentMonth)}</div>
          <div className="cap-calendar-grid" role="grid" aria-labelledby={`${id}-month-${index}`} aria-describedby={mode === 'range' ? `${id}-instruction` : undefined} aria-multiselectable={mode === 'range' || undefined}>
            <div role="row" className="cap-calendar-week">{monthDays[index].slice(0, 7).map(day => <span role="columnheader" key={dateKey(day)}>{weekDay.format(day)}</span>)}</div>
            {Array.from({ length: 6 }, (_, week) => <div role="row" className="cap-calendar-week" key={week}>{monthDays[index].slice(week * 7, week * 7 + 7).map(date => {
              const key = dateKey(date), outside = date.getMonth() !== currentMonth.getMonth();
              if (numberOfMonths === 2 && outside) return <div role="gridcell" key={key} />;
              const dayEvents = eventsByDate.get(key) ?? [], highlight = highlights.get(key);
              const inRange = mode === 'range' && !!start && !!end && key >= start && key <= end;
              const endpoint = mode === 'range' ? key === start || key === end : key === value;
              const inPreview = !!validPreview && key >= previewStart! && key <= previewEnd!;
              const button = <button type="button" className="cap-calendar-day" data-date={key} data-outside={outside || undefined} data-selected={endpoint || undefined} data-highlighted={!!highlight || undefined} data-accent={highlight?.color} aria-current={key === todayKey ? 'date' : undefined} aria-label={`${longDate.format(date)}${highlight ? ` · ${highlight.label ?? 'Отмеченная дата'}` : ''}${dayEvents.length ? ` · ${dayEvents.length} событий` : ''}`} tabIndex={key === currentKey ? 0 : -1} disabled={isDisabled(key)} onMouseEnter={() => setPreview(key)} onFocus={() => { setFocused(key); setPreview(key); }} onKeyDown={event => onDayKeyDown(event, date)} onClick={() => selectDate(key)}>{date.getDate()}{dayEvents.length > 0 && <span className="cap-calendar-dot" aria-hidden="true" />}{highlight && <span className="cap-calendar-date-mark" aria-hidden="true" />}</button>;
              return <div role="gridcell" aria-selected={inRange || endpoint} key={key} data-in-range={inRange || undefined} data-preview={inPreview || undefined}>
                {showEventPreview && dayEvents.length ? <Tooltip content={<div className="cap-calendar-event-preview"><strong className="cap-calendar-preview-date">{longDate.format(date)}</strong><CalendarEventList events={dayEvents} emphasis={eventEmphasis} /></div>}>{button}</Tooltip> : button}
              </div>;
            })}</div>)}
          </div>
        </div>)}
      </div>
      <div className="cap-calendar-footer"><Button variant="ghost" size="sm" disabled={isDisabled(todayKey)} onClick={() => selectDate(todayKey)}>Сегодня</Button><span aria-live="polite">{selectionLabel}</span></div>
    </div>
    {showAgenda && <div className="cap-calendar-agenda" role="region" aria-label={`${label}: события выбранного дня`}><div className="cap-calendar-agenda-date">{agendaKey && parseDate(agendaKey) ? shortDate.format(parseDate(agendaKey)!) : 'События дня'}</div>{agenda.length ? <CalendarEventList events={agenda} emphasis={eventEmphasis} /> : <p>На этот день событий нет</p>}</div>}
  </section>;
}
export function DatePicker(props: CalendarSelectionProps) {
  const [open, setOpen] = useState(false);
  const { label = props.mode === 'range' ? 'Выбрать период' : 'Выбрать дату', locale = 'ru-RU' } = props;
  const format = (value?: string) => { const date = parseDate(value); return date ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : ''; };
  const selection = props.mode === 'range' ? props.range ? `${format(props.range.start)} — ${format(props.range.end) || '…'}` : '' : format(props.value);
  const months = props.numberOfMonths ?? (props.mode === 'range' ? 2 : 1);
  return <Popover label={selection ? `${label}: ${selection}` : label} open={open} onOpenChange={setOpen} className={cx('cap-datepicker-popover', months === 2 && 'cap-datepicker-wide', props.showAgenda && props.agendaPosition === 'side' && 'cap-datepicker-agenda-side')}>
    {props.mode === 'range' ? <Calendar {...props} locale={locale} onRangeChange={(next: CalendarRange) => { props.onRangeChange(next); if (next.end) setOpen(false); }} /> : <Calendar {...props} locale={locale} onValueChange={next => { props.onValueChange(next); setOpen(false); }} />}
  </Popover>;
}

function safeHref(value: string) { const href = value.trim(); return /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(href) && !/[\u0000-\u0020]/.test(href) ? href : undefined; }
function inlineMarkdown(text: string): ReactNode[] {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\))/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) { const href = safeHref(link[2]); return href ? <TextAction key={index} href={href}>{link[1]}</TextAction> : <Fragment key={index}>{link[1]}</Fragment>; }
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
      nodes.push(<CodeBlock key={key} label={language || 'Code'} language={(['tsx','ts','js','json','css','bash'].includes(language) ? language : 'text') as CodeBlockProps['language']}>{code.join('\n')}</CodeBlock>); continue;
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
/** @deprecated Use RichTextEditor for new editors; keep MarkdownEditor for Markdown-string compatibility. */
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
/** @deprecated Use RichTextEditor (./rich-text-editor.js). See docs/content-revision.md for the compatibility bridge. */
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

export interface ContentCardBlock { id: string; content: ReactNode; kind?: 'content' | 'metadata' | 'footer'; hidden?: boolean }
export interface ContentCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'onSelect'> {
  title: ReactNode; description?: ReactNode; header?: ReactNode; metadata?: ReactNode; footer?: ReactNode; cover?: ReactNode; actions?: ReactNode;
  /** Additional blocks; a matching ID replaces a built-in block. Stable IDs survive reordering. */
  blocks?: readonly ContentCardBlock[];
  blockOrder?: readonly string[];
  hiddenBlocks?: readonly string[];
  dragHandle?: ReactNode;
  onOpen?: () => void; selectable?: boolean; selected?: boolean; onSelectedChange?: (selected: boolean) => void; selectionLabel?: string;
  selectionPosition?: 'top-start' | 'top-end';
  density?: 'compact' | 'comfortable'; orientation?: 'vertical' | 'horizontal'; headingLevel?: 2 | 3 | 4;
}
export function ContentCard({ title, description, header, metadata, footer, cover, actions, blocks = [], blockOrder = [], hiddenBlocks = [], dragHandle, onOpen, selectable, selected, onSelectedChange, selectionLabel, selectionPosition = 'top-start', density = 'comfortable', orientation = 'vertical', headingLevel = 3, children, className, ...props }: ContentCardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const selectionEnabled = selectable ?? !!onSelectedChange;
  const [internalSelected, setInternalSelected] = useState(false);
  const currentSelected = selectionEnabled && (selected ?? internalSelected);
  const defaults: ContentCardBlock[] = [
    {id:'cover',content:cover},
    {id:'header',content:(header || actions || dragHandle) && <div className="cap-content-card-header">{dragHandle}<div className="cap-content-card-header-content">{header}</div>{actions && <div className="cap-content-card-actions">{actions}</div>}</div>},
    {id:'title',content:<Heading className="cap-content-card-title">{onOpen ? <button type="button" className="cap-content-card-open" onClick={onOpen}>{title}</button> : title}</Heading>},
    {id:'description',content:description && <div className="cap-content-card-description">{description}</div>},
    {id:'content',content:children},
    {id:'metadata',kind:'metadata',content:metadata},
    {id:'footer',kind:'footer',content:footer},
  ];
  const available = new Map([...defaults,...blocks].map(block => [block.id,block]));
  const ordered = [...new Set([...blockOrder,...available.keys()])].map(id => available.get(id)).filter((block): block is ContentCardBlock => !!block && !block.hidden && !hiddenBlocks.includes(block.id) && block.content !== undefined && block.content !== null && block.content !== false);
  // A leading cover can occupy a side column; a reordered cover becomes an inline block.
  const leadingCover = ordered[0]?.id === 'cover' ? ordered[0] : undefined;
  const renderBlock = (block: ContentCardBlock) => <div key={block.id} data-card-block={block.id} className={cx('cap-content-card-block',block.id === 'cover' && 'cap-content-card-cover',block.kind === 'metadata' && 'cap-content-card-metadata',block.kind === 'footer' && 'cap-content-card-footer')}>{block.content}</div>;
  return <article className={cx('cap-content-card','cap-surface-boundary', className)} data-surface="raised" data-density={density} data-orientation={orientation} data-selected={currentSelected || undefined} data-selectable={selectionEnabled || undefined} data-leading-cover={!!leadingCover || undefined} {...props}>
    {selectionEnabled && <label className="cap-content-card-selection" data-position={selectionPosition} data-contrast="true"><input className="cap-checkbox" data-size="sm" type="checkbox" aria-label={selectionLabel ?? `Выбрать ${typeof title === 'string' ? title : 'карточку'}`} checked={currentSelected} onChange={event => { if (selected === undefined) setInternalSelected(event.target.checked); onSelectedChange?.(event.target.checked); }} /></label>}
    {leadingCover && renderBlock(leadingCover)}<div className="cap-content-card-body">{ordered.filter(block => block !== leadingCover).map(renderBlock)}</div>
  </article>;
}
export interface TaskCardProps extends Omit<ContentCardProps, 'title' | 'header' | 'actions'> {
  title: string; typeLabel?: string; color?: Color; completed?: boolean; onCompletedChange?: (completed: boolean) => void; menuItems?: MenuItem[];
}
export function TaskCard({ title, typeLabel = 'Задача', color = 'rose', completed, onCompletedChange, menuItems, onOpen, className, ...props }: TaskCardProps) {
  return <ContentCard {...props} className={cx('cap-task-card', className)} selectionLabel={props.selectionLabel ?? `Выбрать ${title}`} data-accent={color} data-completed={completed || undefined} header={<Tag color={color} icon="check">{typeLabel}</Tag>} actions={menuItems?.length ? <Menu label={`Действия: ${title}`} items={menuItems} /> : undefined} title={<span className="cap-task-title-row">{onCompletedChange && <input className="cap-task-checkbox" type="checkbox" aria-label={`Завершить: ${title}`} checked={!!completed} onChange={event => onCompletedChange(event.target.checked)} />}{onOpen ? <button type="button" className="cap-content-card-open" onClick={onOpen}>{title}</button> : <span>{title}</span>}</span>} />;
}
export interface KanbanColumnProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> { title: string; count?: number; action?: ReactNode; emptyState?: ReactNode; color?: Color | 'inherit' }
export function KanbanColumn({ title, count, action, emptyState, color = 'neutral', children, className, ...props }: KanbanColumnProps) {
  const id = useId();
  return <section role="group" className={cx('cap-kanban-column', className)} aria-labelledby={id} {...props}><header className="cap-kanban-column-header"><h3 id={id} className="cap-kanban-column-title" data-accent={color === 'inherit' ? undefined : color}><span>{title}</span>{count !== undefined && <Counter value={count} size="xs" variant="translucent"/>}</h3>{action && <div className="cap-kanban-column-actions">{action}</div>}</header><div className="cap-kanban-column-body">{count === 0 ? emptyState ?? <EmptyState title="Здесь пока пусто" description="Переместите сюда карточку" /> : children}</div></section>;
}
export interface KanbanLane { id: string; title: string; emptyMessage?: string; color?: Color | 'inherit' }
export interface KanbanTask { id: string; columnId: string; title: string; description?: string; completed?: boolean; color?: Color; metadata?: ReactNode; footer?: ReactNode }
export interface KanbanBoardProps {
  label: string; columns: KanbanLane[]; items: KanbanTask[]; onMove?: (id: string, columnId: string) => void; onCompletedChange?: (id: string, completed: boolean) => void;
  onOpen?: (id: string) => void; onAdd?: (columnId: string) => void; renderCard?: (item: KanbanTask) => ReactNode; className?: string;
}
export function KanbanBoard({ label, columns, items, onMove, onCompletedChange, onOpen, onAdd, renderCard, className }: KanbanBoardProps) {
  return <div className={cx('cap-kanban-board', className)} role="region" aria-label={label} tabIndex={0}>{columns.map(column => {
    const columnItems = items.filter(item => item.columnId === column.id);
    return <KanbanColumn key={column.id} title={column.title} color={column.color} count={columnItems.length} action={onAdd && <IconButton label={`Добавить в ${column.title}`} icon="plus" size="sm" variant="ghost" onClick={() => onAdd(column.id)} />} emptyState={<EmptyState title={column.emptyMessage ?? 'Пока нет задач'} description={onMove ? 'В меню карточки выберите эту колонку' : undefined} />}>{columnItems.map(item => <Fragment key={item.id}>{renderCard ? renderCard(item) : <TaskCard title={item.title} description={item.description} completed={item.completed} color={item.color} metadata={item.metadata} footer={item.footer} onOpen={onOpen ? () => onOpen(item.id) : undefined} onCompletedChange={onCompletedChange ? completed => onCompletedChange(item.id, completed) : undefined} menuItems={onMove ? columns.filter(target => target.id !== column.id).map(target => ({ id: target.id, label: `В ${target.title}`, icon: 'arrow', onSelect: () => onMove(item.id, target.id) })) : undefined} />}</Fragment>)}</KanbanColumn>;
  })}</div>;
}
export interface DailyHeaderProps extends HTMLAttributes<HTMLElement> { date: string; locale?: string; showWeek?: boolean; tags?: ReactNode; actions?: ReactNode; headingLevel?: 1 | 2 | 3 }
export function DailyHeader({ date, locale = 'ru-RU', showWeek = true, tags, actions, headingLevel = 2, className, children, ...props }: DailyHeaderProps) {
  const parsed = parseDate(date) ?? new Date(), Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  const thursday = addDays(parsed, 3 - mondayIndex(parsed)), yearStart = new Date(thursday.getFullYear(), 0, 1, 12);
  const week = Math.ceil(((Date.UTC(thursday.getFullYear(), thursday.getMonth(), thursday.getDate()) - Date.UTC(yearStart.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return <header className={cx('cap-daily-header', className)} {...props}><div className="cap-daily-header-top"><div><div className="cap-daily-weekday">{new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(parsed)}</div><div className="cap-daily-date"><Heading><time dateTime={dateKey(parsed)}>{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)}</time></Heading>{showWeek && <span>Неделя {week}</span>}</div></div>{actions && <div className="cap-daily-actions">{actions}</div>}</div>{tags && <div className="cap-daily-tags">{tags}</div>}{children}</header>;
}
