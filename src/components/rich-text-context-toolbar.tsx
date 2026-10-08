import { useState, useRef, useLayoutEffect, type CSSProperties, type ComponentProps, type KeyboardEvent } from 'react';
import { ArrowLeft, Bold, Italic, Underline, Strikethrough, Code2, ChevronDown, Table2, Link, Type, Highlighter, MessageSquare, RemoveFormatting, Check, Pilcrow } from 'lucide-react';
import { IconButton, Button, Icon } from './primitives.js';
import { Tooltip } from './overlays.js';
import { Input } from './forms.js';
import { MovingHighlight } from './moving-highlight.js';
import { useTranslate } from './locale.js';
import type { RichTextMark, RichTextPreset } from './rich-text-editor.js';

function ContextIconButton({ title, ...props }: ComponentProps<typeof IconButton>) { return <Tooltip content={title ?? props.label}><IconButton {...props}/></Tooltip>; }

export function ContextToolbar({ attributes, selectedMarks, presets, blockType, onType, onMark, onAttribute, onTable, onComment, toolbarSize = 'xs' }: {
  toolbarSize?: ComponentProps<typeof IconButton>['size'];
  attributes: { color?: string; highlight?: string }; selectedMarks: RichTextMark[];
  presets: RichTextPreset[]; blockType: string; onType: (type: string) => void; onMark: (mark: RichTextMark) => void;
  onAttribute: (key: 'color' | 'highlight' | 'link' | 'clear', value?: string) => void;
  onTable: (rows: number, columns: number) => void; onComment?: () => void;
}) {
  const t = useTranslate();
  const toolbar = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'main' | 'color' | 'highlight'>('main');
  const [menu, setMenu] = useState<'type' | 'table' | 'link' | null>(null);
  const [size, setSize] = useState([2, 2]);
  const [url, setUrl] = useState('');
  const root = useRef<HTMLDivElement>(null), menuRef = useRef<HTMLElement>(null);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({visibility:'hidden'});
  useLayoutEffect(() => {
    if (!menu) return;
    const update = () => { const anchor = root.current?.getBoundingClientRect(), panel = menuRef.current; if (!anchor || !panel) return; const bounds = panel.getBoundingClientRect(), gap = 6, gutter = 12; const top = anchor.bottom + gap + bounds.height <= window.innerHeight - gutter ? anchor.bottom + gap : Math.max(gutter, anchor.top - gap - bounds.height); setMenuPosition({position:'fixed',left:Math.max(gutter, Math.min(anchor.left, window.innerWidth - bounds.width - gutter)),top,visibility:'visible'}); };
    update(); const panel = menuRef.current; const focus = menu === 'table' ? panel?.querySelector<HTMLElement>('[tabindex="0"]') : panel?.querySelector<HTMLElement>('input,button'); focus?.focus({preventScroll:true});
    window.addEventListener('resize',update); window.addEventListener('scroll',update,true); return () => {window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);};
  }, [menu]);
  const preserve = (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault();
  const colorNames: Record<string, string> = { neutral: t('По умолчанию', 'Default'), red: t('Красный', 'Red'), teal: t('Бирюзовый', 'Teal'), blue: t('Синий', 'Blue'), orange: t('Оранжевый', 'Orange'), green: t('Зелёный', 'Green'), rose: t('Розовый', 'Rose') };
  const gridKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const [r, c] = size;
    const next = event.key === 'ArrowRight' ? [r, Math.min(8, c + 1)] : event.key === 'ArrowLeft' ? [r, Math.max(1, c - 1)] : event.key === 'ArrowDown' ? [Math.min(8, r + 1), c] : event.key === 'ArrowUp' ? [Math.max(1, r - 1), c] : event.key === 'Home' ? [1, 1] : event.key === 'End' ? [8, 8] : null;
    if (next) { event.preventDefault(); setSize(next); const parent = event.currentTarget.parentElement; parent?.querySelector<HTMLButtonElement>(`[data-cell="${next[0]}-${next[1]}"]`)?.focus(); }
  };
  return <div ref={root} className="cap-markdown-v2-context" onKeyDown={event => { if (event.key === 'Escape' && (menu || mode !== 'main')) { event.preventDefault(); event.stopPropagation(); setMenu(null); setMode('main'); } }}>
    <div ref={toolbar} className="cap-markdown-v2-toolbar cap-shared-hover" role="toolbar" aria-label={t('Формат выделенного текста', 'Selected text formatting')} data-theme="dark" data-surface="floating">
      <MovingHighlight root={toolbar} hover target=".cap-button" revision={mode}/>
      {mode === 'main' ? <>
        <Button className="cap-markdown-v2-type" variant="ghost" size={toolbarSize} trailing={<ChevronDown size={12}/>} aria-haspopup="menu" aria-expanded={menu === 'type'} onMouseDown={preserve} onClick={() => setMenu(menu === 'type' ? null : 'type')}>{presets.find(p => p.type === blockType)?.label ?? t('Текст', 'Text')}</Button>
        <ContextIconButton label={t('Вставить таблицу', 'Insert table')} title={t('Вставить таблицу', 'Insert table')} icon={Table2} variant="ghost" size={toolbarSize} aria-expanded={menu === 'table'} onMouseDown={preserve} onClick={() => setMenu(menu === 'table' ? null : 'table')}/>
        <span className="cap-markdown-v2-separator"/>
        {([{ mark: 'bold', icon: Bold, label: t('Полужирный (⌘/Ctrl+B)', 'Bold (⌘/Ctrl+B)') }, { mark: 'italic', icon: Italic, label: t('Курсив (⌘/Ctrl+I)', 'Italic (⌘/Ctrl+I)') }, { mark: 'underline', icon: Underline, label: t('Подчёркнутый (⌘/Ctrl+U)', 'Underline (⌘/Ctrl+U)') }, { mark: 'strike', icon: Strikethrough, label: t('Зачёркнутый', 'Strikethrough') }] as const).map(item => <ContextIconButton key={item.mark} label={item.label} title={item.label} icon={item.icon} aria-pressed={selectedMarks.includes(item.mark)} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={() => onMark(item.mark)}/>)}
        <ContextIconButton label={t('Ссылка', 'Link')} title={t('Ссылка', 'Link')} icon={Link} variant="ghost" size={toolbarSize} aria-expanded={menu === 'link'} onMouseDown={preserve} onClick={() => setMenu(menu === 'link' ? null : 'link')}/>
        <ContextIconButton label={t('Цвет текста', 'Text color')} title={t('Цвет текста', 'Text color')} icon={Type} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={() => {setMenu(null);setMode('color');}}/>
        <ContextIconButton label={t('Цвет фона', 'Highlight color')} title={t('Цвет фона', 'Highlight color')} icon={Highlighter} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={() => {setMenu(null);setMode('highlight');}}/>
        <ContextIconButton label={t('Строчный код', 'Inline code')} title={t('Строчный код', 'Inline code')} icon={Code2} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={() => onMark('code')}/>
        {onComment && <ContextIconButton label={t('Комментировать выделение', 'Comment on selection')} title={t('Комментировать выделение', 'Comment on selection')} icon={MessageSquare} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={onComment}/>}
        <ContextIconButton label={t('Очистить форматирование', 'Clear formatting')} title={t('Очистить форматирование', 'Clear formatting')} icon={RemoveFormatting} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={() => onAttribute('clear')}/>
      </> : <>
        <ContextIconButton label={t('Назад к форматированию', 'Back to formatting')} icon={ArrowLeft} variant="ghost" size={toolbarSize} onMouseDown={preserve} onClick={() => setMode('main')}/>
        {mode === 'color' ? <Type size={16} aria-hidden="true"/> : <Highlighter size={16} aria-hidden="true"/>}
        <span className="cap-markdown-v2-separator"/>
        {(mode === 'color' ? ['neutral', 'red', 'teal', 'blue', 'orange'] : ['neutral', 'blue', 'orange', 'green', 'rose']).map(color => <Tooltip key={color} content={colorNames[color]}><button type="button" className="cap-markdown-v2-swatch" data-accent={color} data-highlight={mode === 'highlight' || undefined} aria-label={`${mode === 'color' ? t('Текст', 'Text') : t('Фон', 'Highlight')}: ${colorNames[color]}`} aria-pressed={(attributes[mode] ?? 'neutral') === color} onMouseDown={preserve} onClick={() => {onAttribute(mode, color === 'neutral' ? undefined : color);}}>{(attributes[mode] ?? 'neutral') === color && <Check size={12}/>}</button></Tooltip>)}
      </>}
    </div>
    {menu === 'type' && <div ref={node => {menuRef.current = node;}} style={menuPosition} className="cap-markdown-v2-menu cap-shared-hover" role="menu" aria-label={t('Тип блока', 'Block type')} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {event.preventDefault();const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button')); const current = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();} }}>
      <MovingHighlight root={menuRef} hover target="[role='menuitemradio']"/>
      {presets.filter(p => p.type !== 'table').map(preset => <Button key={preset.type} variant="ghost" size="sm" leading={<Icon name={preset.icon ?? Pilcrow}/>} trailing={blockType === preset.type ? <Check size={14}/> : undefined} role="menuitemradio" aria-checked={blockType === preset.type} onMouseDown={preserve} onClick={() => {onType(preset.type);setMenu(null);}}>{preset.label}</Button>)}
    </div>}
    {menu === 'table' && <div ref={node => {menuRef.current = node;}} style={menuPosition} className="cap-markdown-v2-menu cap-markdown-v2-table-picker" aria-label={t('Размер таблицы', 'Table size')}>
      <span aria-live="polite">{size[0]} × {size[1]}</span>
      <div className="cap-markdown-v2-grid" role="group" aria-label={t('Выберите строки и столбцы', 'Choose rows and columns')}>{Array.from({length:64}, (_, index) => {const r = Math.floor(index / 8) + 1, c = index % 8 + 1; return <button type="button" key={index} data-cell={`${r}-${c}`} tabIndex={r === size[0] && c === size[1] ? 0 : -1} data-active={r <= size[0] && c <= size[1] || undefined} aria-label={`${r} × ${c}`} onMouseEnter={() => setSize([r,c])} onMouseDown={preserve} onFocus={() => setSize([r,c])} onKeyDown={gridKey} onClick={() => {onTable(r,c);setMenu(null);}}/>;})}</div>
    </div>}
    {menu === 'link' && <form ref={node => {menuRef.current = node;}} style={menuPosition} className="cap-markdown-v2-menu cap-markdown-v2-link" onSubmit={event => {event.preventDefault();if (!url || /^(https?:|mailto:|tel:|\/|#)/i.test(url)) {onAttribute('link', url);setMenu(null);}}}>
      <Input label={t('Адрес ссылки', 'Link URL')} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://" size="sm"/>
      <Button size="sm" type="submit" disabled={Boolean(url) && !/^(https?:|mailto:|tel:|\/|#)/i.test(url)}>{t('Применить', 'Apply')}</Button>
    </form>}
  </div>;
}
