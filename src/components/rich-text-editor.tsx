import { createElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type ClipboardEvent, type RefObject } from 'react';
import { Bold, Italic, Strikethrough, Code2, Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Plus, ArrowUp, ArrowDown, Trash2, Undo2, Redo2, GripVertical } from 'lucide-react';
import { Button, Icon, IconButton, type IconSource } from './primitives.js';
import { CodeBlock, type CodeLanguage } from './code-block.js';
import type { RichTextMarkdownSource } from './rich-text-markdown.js';
import { useTranslate } from './locale.js';
import { FloatingActionBar } from './workbench.js';
import { flushSync } from 'react-dom';
import { ContextToolbar } from './rich-text-context-toolbar.js';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlays.js';

export type RichTextMark = 'bold' | 'italic' | 'strike' | 'code' | 'underline';
export interface RichTextRun { text: string; marks?: RichTextMark[]; color?: string; highlight?: string; link?: string }
export type RichTextBlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'quote' | 'code' | (string & {});
export type RichTextJson = null | boolean | number | string | RichTextJson[] | { [key: string]: RichTextJson };
export interface RichTextBlock { id: string; type: RichTextBlockType; content?: RichTextRun[]; data?: RichTextJson; markdown?: RichTextMarkdownSource }
export interface RichTextDocument { blocks: RichTextBlock[] }
export interface RichTextPreset {
  type: string;
  label: string;
  keywords?: string[];
  icon?: IconSource;
  create?: () => Pick<RichTextBlock, 'content' | 'data'>;
  render?: (context: { block: RichTextBlock; disabled: boolean; readOnly: boolean; onDataChange: (data: RichTextJson) => void }) => ReactNode;
}
export interface RichTextEditorProps {
  label: string;
  value: RichTextDocument;
  onValueChange: (value: RichTextDocument) => void;
  presets?: RichTextPreset[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  showToolbar?: boolean;
  uiVariant?: 'classic' | 'context';
  onCommentRequest?: (text: string) => void;
  toolbarSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const builtins = (t: (ru: string, en: string) => string): RichTextPreset[] => [
  { type: 'paragraph', label: t('Текст', 'Text'), keywords: ['paragraph', 'text'], icon: Pilcrow },
  { type: 'heading1', label: t('Заголовок 1', 'Heading 1'), keywords: ['h1', 'heading'], icon: Heading1 },
  { type: 'heading2', label: t('Заголовок 2', 'Heading 2'), keywords: ['h2', 'heading'], icon: Heading2 },
  { type: 'heading3', label: t('Заголовок 3', 'Heading 3'), keywords: ['h3', 'heading'], icon: Heading3 },
  { type: 'bullet', label: t('Маркированный список', 'Bullet list'), keywords: ['list', 'bullet'], icon: List },
  { type: 'numbered', label: t('Нумерованный список', 'Numbered list'), keywords: ['list', 'ordered'], icon: ListOrdered },
  { type: 'quote', label: t('Цитата', 'Quote'), keywords: ['blockquote'], icon: Quote },
  { type: 'code', label: t('Код', 'Code'), keywords: ['pre', 'code'], icon: Code2 },
];
const marks: RichTextMark[] = ['bold', 'italic', 'strike', 'code', 'underline'];
const markTags: Record<RichTextMark, string> = { bold: 'STRONG', italic: 'EM', strike: 'S', code: 'CODE', underline: 'U' };
let nextId = 0;
export function createRichTextBlock(type: RichTextBlockType = 'paragraph', content: RichTextRun[] = []): RichTextBlock {
  return { id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cap-rich-${++nextId}`, type, content };
}
export function richTextPlainText(value: RichTextDocument): string {
  return value.blocks.map(block => (block.content ?? []).map(run => run.text).join('')).join('\n');
}
function normalizeRuns(runs: RichTextRun[]): RichTextRun[] {
  const result: RichTextRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const sorted = marks.filter(mark => run.marks?.includes(mark));
    const last = result[result.length - 1];
    if (last && JSON.stringify([last.marks ?? [], last.color, last.highlight, last.link]) === JSON.stringify([sorted, run.color, run.highlight, run.link])) last.text += run.text;
    else result.push({ ...run, ...(sorted.length ? { marks: sorted } : { marks: undefined }) });
  }
  return result;
}
function readRuns(root: HTMLElement): RichTextRun[] {
  const found: RichTextRun[] = [];
  const visit = (node: Node, active: RichTextMark[], attrs: Pick<RichTextRun, 'color' | 'highlight' | 'link'> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) { found.push({ text: node.textContent ?? '', marks: active, ...attrs }); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (element.tagName === 'BR') { found.push({ text: '\n', marks: active, ...attrs }); return; }
    const added = marks.find(mark => markTags[mark] === element.tagName)
      ?? (element.tagName === 'B' ? 'bold' : element.tagName === 'I' ? 'italic' : element.tagName === 'DEL' ? 'strike' : undefined);
    const next = added ? [...active, added] : active;
    const nextAttrs = { ...attrs, ...(element.dataset.capColor ? { color: element.dataset.capColor } : {}), ...(element.dataset.capHighlight ? { highlight: element.dataset.capHighlight } : {}), ...(element.tagName === 'A' ? { link: element.getAttribute('href') ?? undefined } : {}) };
    element.childNodes.forEach(child => visit(child, next, nextAttrs));
  };
  root.childNodes.forEach(child => visit(child, []));
  return normalizeRuns(found);
}
function writeRuns(root: HTMLElement, runs: RichTextRun[]) {
  root.replaceChildren();
  for (const run of runs) {
    let node: Node = document.createTextNode(run.text);
    for (const mark of run.marks ?? []) {
      if (!marks.includes(mark)) continue;
      const wrapper = document.createElement(markTags[mark].toLowerCase());
      wrapper.append(node);
      node = wrapper;
    }
    for (const [key, attr] of [['color', 'capColor'], ['highlight', 'capHighlight']] as const) {
      if (run[key]) { const wrapper = document.createElement('span'); wrapper.dataset[attr] = run[key]; wrapper.dataset.accent = run[key]; wrapper.append(node); node = wrapper; }
    }
    if (run.link) { const wrapper = document.createElement('a'); wrapper.setAttribute('href', run.link); wrapper.append(node); node = wrapper; }
    root.append(node);
  }
}
function offsets(root: HTMLElement): [number, number] | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const start = range.cloneRange(); start.selectNodeContents(root); start.setEnd(range.startContainer, range.startOffset);
  const end = range.cloneRange(); end.selectNodeContents(root); end.setEnd(range.endContainer, range.endOffset);
  return [start.toString().length, end.toString().length];
}
function setCaret(root: HTMLElement, start: number, end = start) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  const locate = (target: number): [Node, number] => {
    let remaining = target;
    for (const text of textNodes) {
      if (remaining <= text.length) return [text, remaining];
      remaining -= text.length;
    }
    const last = textNodes.at(-1);
    return last ? [last, last.length] : [root, 0];
  };
  const a = locate(start), b = locate(end);
  range.setStart(a[0], a[1]); range.setEnd(b[0], b[1]);
  selection.removeAllRanges(); selection.addRange(range);
}
function splitRuns(runs: RichTextRun[], point: number): [RichTextRun[], RichTextRun[]] {
  const before: RichTextRun[] = [], after: RichTextRun[] = [];
  let count = 0;
  for (const run of runs) {
    const cut = Math.max(0, Math.min(run.text.length, point - count));
    if (cut) before.push({ ...run, text: run.text.slice(0, cut) });
    if (cut < run.text.length) after.push({ ...run, text: run.text.slice(cut) });
    count += run.text.length;
  }
  return [normalizeRuns(before), normalizeRuns(after)];
}
function sameRuns(a: RichTextRun[], b: RichTextRun[]) { return JSON.stringify(normalizeRuns(a)) === JSON.stringify(normalizeRuns(b)); }
function renderStaticRuns(runs: RichTextRun[]): ReactNode {
  return runs.map((run, index) => {
    let content: ReactNode = run.text;
    for (const mark of run.marks ?? []) content = createElement(markTags[mark].toLowerCase(), null, content);
    if (run.color) content = <span data-cap-color={run.color} data-accent={run.color}>{content}</span>;
    if (run.highlight) content = <span data-cap-highlight={run.highlight} data-accent={run.highlight}>{content}</span>;
    return <span key={index}>{run.link ? <a href={run.link}>{content}</a> : content}</span>;
  });
}

function Editable({ block, label, placeholder, disabled, readOnly, slashListId, activeOptionId, onInput, onKeyDown, onPaste, onFocus }: {
  block: RichTextBlock; label: string; placeholder?: string; disabled: boolean; readOnly: boolean;
  slashListId?: string; activeOptionId?: string;
  onInput: (element: HTMLElement) => void; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLElement>) => void; onFocus: (element: HTMLElement) => void;
}) {
  const t = useTranslate();
  const ref = useRef<HTMLElement>(null);
  const editing = !disabled && !readOnly;
  useLayoutEffect(() => {
    const element = ref.current;
    if (editing && element && !sameRuns(readRuns(element), block.content ?? [])) {
      const caret = document.activeElement === element ? offsets(element) : null;
      writeRuns(element, block.content ?? []);
      if (caret) setCaret(element, caret[0], caret[1]);
    }
  }, [block.content, editing]);
  const editProps = {
    ref: (node: HTMLElement | null) => { ref.current = node; }, contentEditable: true, suppressContentEditableWarning: true,
    role: 'textbox', 'aria-label': label, 'aria-multiline': ['code', 'markdown-source'].includes(block.type) ? true : undefined,
    'aria-controls': slashListId, 'aria-activedescendant': activeOptionId, 'aria-autocomplete': slashListId ? 'list' as const : undefined,
    'data-block-type': block.type,
    'data-placeholder': placeholder, spellCheck: !['code', 'markdown-source'].includes(block.type),
    onInput: (event: React.FormEvent<HTMLElement>) => onInput(event.currentTarget),
    onKeyDown, onPaste, onFocus: (event: React.FocusEvent<HTMLElement>) => onFocus(event.currentTarget),
  } as const;
  const tag = block.type === 'heading1' ? 'h1' : block.type === 'heading2' ? 'h2' : block.type === 'heading3' ? 'h3' : block.type === 'quote' ? 'blockquote' : block.type === 'code' ? 'pre' : 'p';
  if (editing) {
    const textbox = <div {...editProps}/>;
    if (block.type === 'bullet') return <ul><li>{textbox}</li></ul>;
    if (block.type === 'numbered') return <ol><li>{textbox}</li></ol>;
    if (block.type === 'toggle') return <details open className="cap-markdown-v2-toggle"><summary>{t('Сворачиваемый блок', 'Toggle')}</summary>{textbox}</details>;
    return textbox;
  }
  const content = renderStaticRuns(block.content ?? []), disabledProps = disabled ? { 'aria-disabled': true } : {};
  if (block.type === 'toggle') return <details open className="cap-markdown-v2-toggle"><summary>{t('Сворачиваемый блок', 'Toggle')}</summary><p {...disabledProps}>{content}</p></details>;
  if (block.type === 'bullet') return <ul><li data-block-type={block.type} {...disabledProps}>{content}</li></ul>;
  if (block.type === 'numbered') return <ol><li data-block-type={block.type} {...disabledProps}>{content}</li></ol>;
  return createElement(tag, { 'data-block-type': block.type, ...disabledProps }, content);
}

function SlashMenuOverlay({ anchor, panel, open, id, options, activeIndex, onSelect, onClose }: {
  anchor: RefObject<HTMLElement | null>; panel: RefObject<HTMLDivElement | null>; open: boolean; id: string;
  options: RichTextPreset[]; activeIndex: number; onSelect: (type: string) => void; onClose: () => void;
}) {
  const t = useTranslate();
  const scopeAnchor = useMemo(() => ({ get current() { return anchor.current; } }), [anchor, open]);
  const scope = useOverlayScope(scopeAnchor), position = useAnchoredOverlay(open, anchor, panel, { side: 'bottom' }), present = useOverlayPresence(open);
  useOverlayDismiss(open, panel, anchor, restore => { onClose(); if (restore) requestAnimationFrame(() => anchor.current?.focus()); });
  if (!present) return null;
  return <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={id} className="cap-rich-editor-slash" role="listbox" aria-label={t('Тип блока', 'Block type')} data-state={open ? 'open' : 'closed'} aria-hidden={!open || undefined} inert={!open} style={position} {...scope}>
    {options.length ? options.map((item, index) => <button key={item.type} id={`${id}-${index}`} type="button" role="option" aria-selected={index === activeIndex} className="cap-rich-editor-option" onMouseDown={event => event.preventDefault()} onClick={() => onSelect(item.type)}>
      {item.icon && <span className="cap-rich-editor-option-icon"><Icon name={item.icon} /></span>}<span>{item.label}</span>
    </button>) : <div className="cap-rich-editor-no-results">{t('Ничего не найдено', 'No results')}</div>}
  </div></OverlayPortal>;
}

interface BlockMenuAction { id: string; label: string; icon?: IconSource; checked?: boolean; disabled?: boolean; danger?: boolean; onSelect: () => void; children?: BlockMenuAction[] }
function BlockMenuOverlay({ anchor, open, id, groups, onClose }: {
  anchor: RefObject<HTMLButtonElement | null>; open: boolean; id: string;
  groups: { label: string; items: BlockMenuAction[] }[]; onClose: (restore?: boolean) => void;
}) {
  const t = useTranslate();
  const [submenu, setSubmenu] = useState<BlockMenuAction | null>(null);
  const panel = useRef<HTMLDivElement>(null), search = useRef(''), searchedAt = useRef(0);
  const lastGroups = useRef(groups);
  if (open) lastGroups.current = groups;
  const scopeAnchor = useMemo(() => ({ get current() { return anchor.current; } }), [anchor, open]);
  const scope = useOverlayScope(scopeAnchor), position = useAnchoredOverlay(open, anchor, panel, { align: 'start' }), present = useOverlayPresence(open);
  const buttons = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? []);
  useOverlayDismiss(open, panel, anchor, onClose);
  useEffect(() => { if (!open) setSubmenu(null); }, [open]);
  useEffect(() => { if (open && position.visibility === 'visible') buttons()[0]?.focus({ preventScroll: true }); }, [open, position.visibility, submenu]);
  if (!present) return null;
  return <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={id} role="menu" tabIndex={0} aria-label={t('Действия с блоком', 'Block actions')} className="cap-rich-editor-slash cap-rich-editor-menu" data-state={open ? 'open' : 'closed'} aria-hidden={!open || undefined} inert={!open} style={position} {...scope}
    onFocus={event => { if (event.target === event.currentTarget) buttons()[0]?.focus(); }}
    onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== anchor.current) onClose(false); }}
    onKeyDown={event => {
      const choices = buttons(), current = choices.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'ArrowLeft' && submenu) { event.preventDefault(); setSubmenu(null); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); const item = document.activeElement as HTMLButtonElement | null; if (item?.getAttribute('aria-haspopup') === 'menu') item.click(); return; }
      if (event.key === 'Tab') { event.preventDefault(); onClose(); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); choices[event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length]?.focus();
      } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); search.current = (Date.now() - searchedAt.current < 600 ? search.current : '') + event.key.toLocaleLowerCase(); searchedAt.current = Date.now();
        const term = [...search.current].every(char => char === search.current[0]) ? search.current[0] : search.current;
        [...choices.slice(current + 1), ...choices.slice(0, current + 1)].find(button => button.textContent?.toLocaleLowerCase().startsWith(term))?.focus();
      }
    }}>
    {submenu && <button type="button" role="menuitem" className="cap-rich-editor-option" onClick={() => setSubmenu(null)}>← {t('Назад', 'Back')}</button>}
    {(submenu ? [{ label: submenu.label, items: submenu.children ?? [] }] : lastGroups.current).map(group => <div role="group" className="cap-rich-editor-menu-group" aria-label={group.label} key={group.label}>{submenu && <div className="cap-rich-editor-menu-caption">{group.label}</div>}{group.items.map(item => <button key={item.id} type="button" role={item.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={item.checked} tabIndex={-1} aria-haspopup={item.children ? 'menu' : undefined} disabled={item.disabled} data-danger={item.danger || undefined} className="cap-rich-editor-option" onClick={() => { if (item.children) setSubmenu(item); else { onClose(false); item.onSelect(); } }}>
      {item.icon && <span className="cap-rich-editor-option-icon"><Icon name={item.icon}/></span>}<span>{item.label}</span>{item.children && <span className="cap-rich-editor-menu-check" aria-hidden="true">›</span>}{item.checked && <span className="cap-rich-editor-menu-check" aria-hidden="true">✓</span>}
    </button>)}</div>)}
  </div></OverlayPortal>;
}

interface BlockDrag {
  id: string; pointerId: number; x: number; y: number; startX: number; startY: number; started: boolean;
  beforeId: string | null; selection: { id: string; start: number; end: number } | null; handle: HTMLButtonElement;
}

export function RichTextEditor({ label, value, onValueChange, presets = [], placeholder, disabled = false, readOnly = false, toolbarSize = 'sm', showToolbar = false, uiVariant = 'classic', onCommentRequest, className }: RichTextEditorProps) {
  const t = useTranslate();
  const uid = useId();
  const valueRef = useRef(value);
  const history = useRef<RichTextDocument[]>([]);
  const future = useRef<RichTextDocument[]>([]);
  const savedSelection = useRef<{ id: string; start: number; end: number } | null>(null);
  const lastInput = useRef<{ id: string; at: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [slash, setSlash] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [revision, setRevision] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null), menuAnchor = useRef<HTMLButtonElement>(null);
  const [dragView, setDragView] = useState<{ id: string; beforeId: string | null } | null>(null), drag = useRef<BlockDrag | null>(null);
  const suppressClick = useRef(false), [announcement, setAnnouncement] = useState('');
  const emptyBlock = useRef<RichTextBlock>(createRichTextBlock());
  const editorRoot = useRef<HTMLElement | null>(null), slashAnchor = useRef<HTMLElement | null>(null), slashPanel = useRef<HTMLDivElement | null>(null);
  const selectionAnchor = useRef<HTMLSpanElement | null>(null), selectionPanel = useRef<HTMLDivElement | null>(null);
  const pointerSelection = useRef<{ pointerId: number; node: Node; offset: number; blockId: string } | null>(null);
  const multiSelection = useRef<{ startId: string; endId: string; start: number; end: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionToolbar, setSelectionToolbar] = useState<{ id: string; left: number; top: number } | null>(null);
  valueRef.current = value;
  const allPresets = useMemo(() => [...builtins(t), ...presets.filter(preset => !builtins(t).some(item => item.type === preset.type))], [presets, t]);
  const filtered = useMemo(() => slash === null ? [] : allPresets.filter(preset => `${preset.label} ${preset.type} ${(preset.keywords ?? []).join(' ')}`.toLocaleLowerCase().includes(slash.toLocaleLowerCase())), [allPresets, slash]);
  const active = value.blocks.find(block => block.id === activeId) ?? value.blocks[0];
  const editable = !disabled && !readOnly;
  const elementFor = (id: string) => Array.from(document.querySelectorAll<HTMLElement>('[data-rich-editor] [data-block-id]')).find(row => row.dataset.blockId === id && row.closest('[data-rich-editor]')?.getAttribute('data-rich-editor') === uid)?.querySelector<HTMLElement>('[contenteditable]') ?? null;
  const handleFor = (id: string) => Array.from(editorRoot.current?.querySelectorAll<HTMLElement>('[data-block-id]') ?? []).find(row => row.dataset.blockId === id)?.querySelector<HTMLButtonElement>('.cap-rich-editor-handle');
  const captureSelection = () => {
    for (const block of valueRef.current.blocks) {
      const element = elementFor(block.id), range = element && offsets(element);
      if (range) return { id: block.id, start: range[0], end: range[1] };
    }
    return null;
  };
  const restoreSelection = (selection: BlockDrag['selection']) => {
    const element = selection && elementFor(selection.id);
    if (element) { element.focus({ preventScroll: true }); setCaret(element, selection!.start, selection!.end); }
  };
  const closeMenu = (restore = true) => { setMenuId(null); if (restore) menuAnchor.current?.focus({ preventScroll: true }); };
  const syncSelection = () => {
    const selection = window.getSelection(), root = editorRoot.current;
    if (uiVariant === 'context' && selectionPanel.current?.contains(document.activeElement)) return;
    if (!editable || !root || !selection?.rangeCount || selection.isCollapsed) { multiSelection.current = null; setSelectedIds(previous => previous.length ? [] : previous); setSelectionToolbar(null); return; }
    const range = selection.getRangeAt(0), start = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as Element : range.startContainer.parentElement;
    const end = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer as Element : range.endContainer.parentElement;
    const element = start?.closest<HTMLElement>('[contenteditable]');
    const endElement = end?.closest<HTMLElement>('[contenteditable]');
    if (element && endElement && element !== endElement && root.contains(element) && root.contains(endElement)) {
      const startId = element.closest<HTMLElement>('[data-block-id]')?.dataset.blockId, endId = endElement.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
      if (startId && endId) {
        const prefix = range.cloneRange(); prefix.selectNodeContents(element); prefix.setEnd(range.startContainer, range.startOffset);
        const suffix = range.cloneRange(); suffix.selectNodeContents(endElement); suffix.setEnd(range.endContainer, range.endOffset);
        multiSelection.current = { startId, endId, start: prefix.toString().length, end: suffix.toString().length };
        const blocks = valueRef.current.blocks, a = blocks.findIndex(block => block.id === startId), b = blocks.findIndex(block => block.id === endId);
        const ids = blocks.slice(a, b + 1).map(block => block.id);
        setSelectedIds(previous => previous.join() === ids.join() ? previous : ids);
      }
      if (uiVariant === 'context' && startId) { const rect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : element.getBoundingClientRect(); setSelectionToolbar({ id: startId, left: rect.left + rect.width / 2, top: rect.bottom }); } else setSelectionToolbar(null); return;
    }
    multiSelection.current = null; setSelectedIds(previous => previous.length ? [] : previous);
    if (!element || !root.contains(element) || !element.contains(end) || !offsets(element)) { setSelectionToolbar(null); return; }
    const rangeOffsets = offsets(element), block = element.closest<HTMLElement>('[data-block-id]');
    if (['code', 'markdown-source'].includes(block?.dataset.blockType ?? '')) { setSelectionToolbar(null); return; }
    if (!rangeOffsets || rangeOffsets[0] === rangeOffsets[1] || !block?.dataset.blockId) { setSelectionToolbar(null); return; }
    const rect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : element.getBoundingClientRect();
    savedSelection.current = { id: block.dataset.blockId, start: rangeOffsets[0], end: rangeOffsets[1] };
    setActiveId(block.dataset.blockId);
    const next = { id: block.dataset.blockId, left: rect.left + rect.width / 2, top: uiVariant === 'context' ? rect.bottom : rect.top };
    setSelectionToolbar(previous => previous && previous.id === next.id && Math.abs(previous.left - next.left) < 1 && Math.abs(previous.top - next.top) < 1 ? previous : next);
  };
  useEffect(() => {
    document.addEventListener('selectionchange', syncSelection);
    window.addEventListener('scroll', syncSelection, true);
    window.addEventListener('resize', syncSelection);
    syncSelection();
    return () => { document.removeEventListener('selectionchange', syncSelection); window.removeEventListener('scroll', syncSelection, true); window.removeEventListener('resize', syncSelection); };
  }, [editable, uiVariant]);
  const caretAtPoint = (x: number, y: number) => {
    const owner = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
    const position = owner.caretPositionFromPoint?.(x, y);
    if (position) return { node: position.offsetNode, offset: position.offset };
    const range = owner.caretRangeFromPoint?.(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  };
  const extendPointerSelection = (event: React.PointerEvent<HTMLElement>) => {
    const anchor = pointerSelection.current, point = caretAtPoint(event.clientX, event.clientY), root = editorRoot.current;
    if (!anchor || anchor.pointerId !== event.pointerId || !point || !root?.contains(point.node) || !root.contains(anchor.node)) return;
    const element = point.node.nodeType === Node.ELEMENT_NODE ? point.node as Element : point.node.parentElement;
    if (!element?.closest('[contenteditable]') || element.closest<HTMLElement>('[data-block-id]')?.dataset.blockId === anchor.blockId) return;
    const apply = () => {
      if (!root.contains(anchor.node) || !root.contains(point.node)) return;
      window.getSelection()?.setBaseAndExtent(anchor.node, anchor.offset, point.node, point.offset);
      syncSelection();
    };
    apply();
    // Browser selection normally stays inside its first editing host. Apply after its native drag step too.
    requestAnimationFrame(() => { if (event.type === 'pointerup' || pointerSelection.current === anchor) apply(); });
  };
  useEffect(() => {
    const clear = () => { pointerSelection.current = null; };
    document.addEventListener('pointerup', clear); document.addEventListener('pointercancel', clear);
    return () => { document.removeEventListener('pointerup', clear); document.removeEventListener('pointercancel', clear); };
  }, []);
  const focusBlock = (id: string, point = 0) => { const element = elementFor(id); if (element) { element.focus(); setCaret(element, point); } else handleFor(id)?.focus(); };
  const commit = (next: RichTextDocument, record: boolean | string = true) => {
    if (JSON.stringify(next) === JSON.stringify(valueRef.current)) return;
    const now = Date.now(), mergeInput = typeof record === 'string' && lastInput.current?.id === record && now - lastInput.current.at < 800;
    if (record && !mergeInput) { history.current.push(valueRef.current); if (history.current.length > 100) history.current.shift(); future.current = []; }
    lastInput.current = typeof record === 'string' ? { id: record, at: now } : null;
    valueRef.current = next; flushSync(() => { onValueChange(next); setRevision(item => item + 1); });
  };
  const replace = (id: string, edit: (block: RichTextBlock) => RichTextBlock, record: boolean | string = true) => commit({ blocks: (valueRef.current.blocks.length ? valueRef.current.blocks : [emptyBlock.current]).map(block => block.id === id ? edit(block) : block) }, record);
  const insert = (afterId: string | null, type: string = 'paragraph') => {
    const preset = allPresets.find(item => item.type === type), seed = preset?.create?.() ?? {};
    const block = { ...createRichTextBlock(type), ...seed };
    const blocks = [...valueRef.current.blocks], index = afterId ? blocks.findIndex(item => item.id === afterId) + 1 : blocks.length;
    blocks.splice(index, 0, block); commit({ blocks }); setActiveId(block.id); setSlash(null); focusBlock(block.id);
  };
  const changeType = (type: string, id = active?.id, fromSlash = false) => {
    if (!id) { insert(null, type); return; }
    const current = valueRef.current.blocks.find(item => item.id === id) ?? (!valueRef.current.blocks.length && emptyBlock.current.id === id ? emptyBlock.current : undefined);
    if (!current) return;
    const text = (current.content ?? []).map(run => run.text).join('');
    const selection = captureSelection() ?? savedSelection.current;
    if (current.type === type && !fromSlash) { if (selection?.id === id && elementFor(id)) restoreSelection(selection); else handleFor(id)?.focus(); return; }
    const preset = allPresets.find(item => item.type === type), seed = preset?.create?.() ?? {};
    replace(id, block => ({ ...block, type, content: fromSlash && text.startsWith('/') ? seed.content ?? [] : block.content ?? seed.content, data: seed.data ?? block.data }));
    setSlash(null);
    if (!fromSlash && selection?.id === id && elementFor(id)) restoreSelection(selection);
    else if (elementFor(id)) focusBlock(id);
    else handleFor(id)?.focus();
  };
  const remove = (id: string) => {
    const blocks = valueRef.current.blocks, index = blocks.findIndex(item => item.id === id);
    if (index < 0) return;
    const next = blocks.filter(item => item.id !== id);
    if (!next.length) next.push(createRichTextBlock());
    commit({ blocks: next }); setActiveId(next[Math.max(0, index - 1)].id); focusBlock(next[Math.max(0, index - 1)].id, 99999);
  };
  const move = (id: string, delta: number, focusHandle = false) => {
    const blocks = [...valueRef.current.blocks], index = blocks.findIndex(item => item.id === id), target = index + delta;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    const selection = captureSelection() ?? savedSelection.current;
    const [block] = blocks.splice(index, 1); blocks.splice(target, 0, block);
    commit({ blocks });
    if (focusHandle) { restoreSelection(selection); handleFor(id)?.focus({ preventScroll: true }); }
    else if (selection) restoreSelection(selection); else focusBlock(id);
    setAnnouncement(`${t('Блок перемещён', 'Block moved')}: ${target + 1} ${t('из', 'of')} ${blocks.length}`);
  };
  const finishDrag = (cancel = false) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null; setDragView(null);
    if (current.handle.hasPointerCapture?.(current.pointerId)) current.handle.releasePointerCapture(current.pointerId);
    if (!current.started) return;
    suppressClick.current = true;
    if (!cancel && editable) {
      const blocks = [...valueRef.current.blocks], index = blocks.findIndex(block => block.id === current.id);
      if (index >= 0 && current.beforeId !== current.id) {
        const [block] = blocks.splice(index, 1), target = current.beforeId === null ? blocks.length : blocks.findIndex(item => item.id === current.beforeId);
        if (target >= 0) { blocks.splice(target, 0, block); commit({ blocks }); setAnnouncement(`${t('Блок перемещён', 'Block moved')}: ${target + 1} ${t('из', 'of')} ${blocks.length}`); }
      }
    } else setAnnouncement(t('Перемещение отменено', 'Move cancelled'));
    current.handle.focus({ preventScroll: true });
    restoreSelection(current.selection);
  };
  const updateDrag = () => {
    const current = drag.current, root = editorRoot.current;
    if (!current?.started || !root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>('.cap-rich-editor-document > [data-block-id]'));
    current.beforeId = rows.find(row => { const rect = row.getBoundingClientRect(); return current.y < rect.top + rect.height / 2; })?.dataset.blockId ?? null;
    setDragView(previous => previous?.id === current.id && previous.beforeId === current.beforeId ? previous : { id: current.id, beforeId: current.beforeId });
  };
  useEffect(() => {
    if (!dragView) return;
    let frame = 0;
    const tick = () => {
      const current = drag.current;
      if (!current?.started) return;
      let scroller = editorRoot.current?.parentElement;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
      const rect = scroller?.getBoundingClientRect(), top = Math.max(0, rect?.top ?? 0), bottom = Math.min(window.innerHeight, rect?.bottom ?? window.innerHeight);
      const amount = current.y < top + 40 ? -10 : current.y > bottom - 40 ? 10 : 0;
      if (amount) { if (scroller) scroller.scrollTop += amount; else window.scrollBy(0, amount); updateDrag(); }
      frame = requestAnimationFrame(tick);
    };
    const cancel = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finishDrag(true); } };
    const blur = () => finishDrag(true);
    frame = requestAnimationFrame(tick); document.addEventListener('keydown', cancel, true); window.addEventListener('blur', blur);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', cancel, true); window.removeEventListener('blur', blur); };
  }, [Boolean(dragView)]);
  useEffect(() => {
    if (!editable || (drag.current && !value.blocks.some(block => block.id === drag.current?.id))) finishDrag(true);
    if (!editable || (menuId && !(value.blocks.length ? value.blocks : [emptyBlock.current]).some(block => block.id === menuId))) setMenuId(null);
  }, [editable, value.blocks, menuId]);
  const undo = () => { const previous = history.current.pop(); if (!previous) return; future.current.push(valueRef.current); commit(previous, false); setSlash(null); };
  const redo = () => { const next = future.current.pop(); if (!next) return; history.current.push(valueRef.current); commit(next, false); setSlash(null); };
  const editSelected = (edit: (run: RichTextRun) => RichTextRun) => {
    if (!editable) return;
    const multi = multiSelection.current, single = captureSelection() ?? savedSelection.current;
    if (!multi && (!single || single.start === single.end)) return;
    const blocks = valueRef.current.blocks, startId = multi?.startId ?? single!.id, endId = multi?.endId ?? single!.id;
    const a = blocks.findIndex(block => block.id === startId), b = blocks.findIndex(block => block.id === endId);
    const selection = window.getSelection();
    const next = blocks.map((block, index) => {
      if (index < a || index > b || ['code', 'markdown-source'].includes(block.type)) return block;
      const start = index === a ? multi?.start ?? single!.start : 0;
      const end = index === b ? multi?.end ?? single!.end : (block.content ?? []).reduce((n, run) => n + run.text.length, 0);
      const [left, tail] = splitRuns(block.content ?? [], start), [middle, right] = splitRuns(tail, end - start);
      return { ...block, content: normalizeRuns([...left, ...middle.map(edit), ...right]) };
    });
    commit({ blocks: next });
    if (multi) { const first = elementFor(startId), last = elementFor(endId); if (first && last) { setCaret(first, multi.start); const start = window.getSelection()?.getRangeAt(0).cloneRange(); setCaret(last, multi.end); const finish = window.getSelection()?.getRangeAt(0); if (start && finish && selection) { start.setEnd(finish.endContainer, finish.endOffset); selection.removeAllRanges(); selection.addRange(start); } } }
    else restoreSelection(single);
  };
  const selectedRuns = () => {
    const multi = multiSelection.current, single = captureSelection() ?? savedSelection.current;
    if (!multi && (!single || single.start === single.end)) return [];
    const blocks = valueRef.current.blocks, a = blocks.findIndex(b => b.id === (multi?.startId ?? single!.id)), b = blocks.findIndex(b => b.id === (multi?.endId ?? single!.id));
    return blocks.slice(a, b + 1).flatMap((block, index) => { const start = index === 0 ? multi?.start ?? single!.start : 0; const end = index === b - a ? multi?.end ?? single!.end : (block.content ?? []).reduce((n, run) => n + run.text.length, 0); const [, tail] = splitRuns(block.content ?? [], start); return splitRuns(tail, end - start)[0]; });
  };
  const contextRuns = uiVariant === 'context' && selectionToolbar ? selectedRuns() : [];
  const selectedAttributes = { color: contextRuns.every(run => run.color === contextRuns[0]?.color) ? contextRuns[0]?.color : undefined, highlight: contextRuns.every(run => run.highlight === contextRuns[0]?.highlight) ? contextRuns[0]?.highlight : undefined };
  const selectedMarks = marks.filter(mark => contextRuns.length > 0 && contextRuns.every(run => run.marks?.includes(mark)));
  const format = (mark: RichTextMark) => {
    if (uiVariant === 'context') {
      const runs = selectedRuns(), remove = runs.length > 0 && runs.every(run => run.marks?.includes(mark));
      editSelected(run => ({ ...run, marks: marks.filter(item => item === mark ? !remove : run.marks?.includes(item)) })); return;
    }
    if (!active || !editable || ['code', 'markdown-source'].includes(active.type)) return;
    const element = elementFor(active.id), live = element && offsets(element);
    const selection = live?.[0] !== live?.[1] ? live : savedSelection.current?.id === active.id ? [savedSelection.current.start, savedSelection.current.end] as [number,number] : live;
    if (!element || !selection || selection[0] === selection[1]) return;
    const source = readRuns(element), [left, tail] = splitRuns(source, selection[0]), [middle, right] = splitRuns(tail, selection[1] - selection[0]);
    const removeMark = middle.every(run => run.marks?.includes(mark));
    const changed = middle.map(run => ({ ...run, marks: marks.filter(item => item !== mark && run.marks?.includes(item) || item === mark && !removeMark) }));
    const result = normalizeRuns([...left, ...changed, ...right]);
    writeRuns(element, result); setCaret(element, selection[0], selection[1]);
    replace(active.id, block => ({ ...block, content: result }));
    savedSelection.current = null;
  };
  const formatBlock = (id: string, mark: RichTextMark) => {
    const block = valueRef.current.blocks.find(item => item.id === id), element = elementFor(id);
    if (!block || !element || !editable) return;
    const source = block.content ?? [], selected = savedSelection.current;
    const start = selected?.id === id && selected.start !== selected.end ? selected.start : 0;
    const end = selected?.id === id && selected.start !== selected.end ? selected.end : source.reduce((length, run) => length + run.text.length, 0);
    const [left, tail] = splitRuns(source, start), [middle, right] = splitRuns(tail, end - start);
    const removeMark = middle.every(run => run.marks?.includes(mark));
    const content = normalizeRuns([...left, ...middle.map(run => ({ ...run, marks: marks.filter(item => item === mark ? !removeMark : run.marks?.includes(item)) })), ...right]);
    replace(id, current => ({ ...current, content })); restoreSelection({ id, start, end });
    savedSelection.current = null;
  };
  const preserveSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    const node = active && elementFor(active.id), range = node && offsets(node);
    if (active && range) savedSelection.current = { id: active.id, start: range[0], end: range[1] };
    event.preventDefault();
  };
  const selectionToolbarOpen = selectionToolbar !== null && editable && !menuId && !dragView;
  const selectionScopeAnchor = useMemo(() => ({ get current() { return selectionAnchor.current; } }), [selectionToolbarOpen]);
  const selectionScope = useOverlayScope(selectionScopeAnchor), selectionPosition = useAnchoredOverlay(selectionToolbarOpen, selectionAnchor, selectionPanel, { align: 'center', side: uiVariant === 'context' ? 'bottom' : 'top' });
  useOverlayDismiss(selectionToolbarOpen, selectionPanel, selectionAnchor, restore => {
    const selectedId = selectionToolbar?.id;
    setSelectionToolbar(null);
    if (restore && selectedId) requestAnimationFrame(() => focusBlock(selectedId, savedSelection.current?.start ?? 0));
  });
  const multiSelectionText = () => {
    const selected = multiSelection.current;
    if (!selected) return null;
    const source = valueRef.current.blocks, a = source.findIndex(block => block.id === selected.startId), b = source.findIndex(block => block.id === selected.endId);
    if (a < 0 || b < a) return null;
    return source.slice(a, b + 1).map((block, index) => {
      const text = (block.content ?? []).map(run => run.text).join('');
      return text.slice(index === 0 ? selected.start : 0, index === b - a ? selected.end : undefined);
    }).join('\n');
  };
  const replaceMultiSelection = (text: string) => {
    const selected = multiSelection.current;
    if (!selected) return false;
    const blocks = [...valueRef.current.blocks], a = blocks.findIndex(block => block.id === selected.startId), b = blocks.findIndex(block => block.id === selected.endId);
    if (a < 0 || b <= a) return false;
    const [before] = splitRuns(blocks[a].content ?? [], selected.start), [, after] = splitRuns(blocks[b].content ?? [], selected.end);
    const content = normalizeRuns([...before, { text }, ...after]);
    blocks.splice(a, b - a + 1, { ...blocks[a], content });
    multiSelection.current = null; setSelectedIds([]); window.getSelection()?.removeAllRanges();
    commit({ blocks }); focusBlock(selected.startId, selected.start + text.length); return true;
  };
  useEffect(() => {
    const root = editorRoot.current;
    const beforeInput = (event: InputEvent) => {
      if (!editable || event.isComposing || !multiSelection.current) return;
      if (event.inputType.startsWith('insert') && event.data !== null) { event.preventDefault(); replaceMultiSelection(event.data); }
      else if (event.inputType.startsWith('delete')) { event.preventDefault(); replaceMultiSelection(''); }
    };
    root?.addEventListener('beforeinput', beforeInput);
    return () => root?.removeEventListener('beforeinput', beforeInput);
  });
  const paste = (event: ClipboardEvent<HTMLElement>) => {
    if (!editable) return;
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    if (replaceMultiSelection(text)) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents(); const node = document.createTextNode(text); range.insertNode(node);
    range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
    event.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const keydown = (event: KeyboardEvent<HTMLElement>, block: RichTextBlock) => {
    if (!editable) return;
    if (event.nativeEvent.isComposing) return;
    const key = event.key.toLowerCase(), mod = event.metaKey || event.ctrlKey;
    if (multiSelection.current && ['Backspace', 'Delete', 'Enter'].includes(event.key)) { event.preventDefault(); replaceMultiSelection(event.key === 'Enter' ? '\n' : ''); return; }
    if (multiSelection.current && event.key === 'Escape') { event.preventDefault(); const id = multiSelection.current.startId; multiSelection.current = null; setSelectedIds([]); focusBlock(id); return; }
    if (slash !== null && block.id === activeId) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSlashIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % Math.max(filtered.length, 1)); return; }
      if (event.key === 'Escape') { event.preventDefault(); setSlash(null); return; }
      if ((event.key === 'Enter' || event.key === 'Tab') && filtered.length) { event.preventDefault(); changeType(filtered[Math.min(slashIndex, filtered.length - 1)].type, block.id, true); return; }
    }
    if (mod && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
    if (mod && key === 'y') { event.preventDefault(); redo(); return; }
    if (uiVariant === 'context' && mod && key === 'u') { event.preventDefault(); format('underline'); return; }
    if (mod && ['b', 'i'].includes(key) && !['code', 'markdown-source'].includes(block.type)) { event.preventDefault(); format(key === 'b' ? 'bold' : 'italic'); return; }
    if (mod && event.shiftKey && ['arrowup', 'arrowdown'].includes(key)) { event.preventDefault(); move(block.id, key === 'arrowup' ? -1 : 1); return; }
    const element = event.currentTarget, position = offsets(element);
    if (event.shiftKey && !mod && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const selection = window.getSelection(), source = valueRef.current.blocks;
      const focusElement = selection?.focusNode?.nodeType === Node.ELEMENT_NODE ? selection.focusNode as Element : selection?.focusNode?.parentElement;
      const focusId = focusElement?.closest<HTMLElement>('[data-block-id]')?.dataset.blockId ?? block.id;
      const index = source.findIndex(item => item.id === focusId);
      const direction = ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1;
      const length = (block.content ?? []).reduce((count, run) => count + run.text.length, 0);
      const crosses = ['ArrowUp', 'ArrowDown'].includes(event.key) || (direction < 0 ? position?.[0] === 0 : position?.[1] === length);
      const target = crosses && source[index + direction] && elementFor(source[index + direction].id);
      if (target && selection?.anchorNode) {
        event.preventDefault();
        const anchorNode = selection.anchorNode, anchorOffset = selection.anchorOffset;
        const targetPoint = direction < 0 ? target.textContent?.length ?? 0 : 0;
        setCaret(target, targetPoint);
        const focusNode = selection.focusNode, focusOffset = selection.focusOffset;
        if (focusNode) selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
        syncSelection(); return;
      }
    }

    if (event.key === 'Enter' && (['code', 'markdown-source'].includes(block.type) ? mod : !event.shiftKey)) {
      event.preventDefault();
      const current = readRuns(element), start = position?.[0] ?? current.map(run => run.text.length).reduce((a,b)=>a+b,0), end = position?.[1] ?? start;
      const [before, tail] = splitRuns(current, start), [, after] = splitRuns(tail, end-start);
      const newBlock = createRichTextBlock(block.type.startsWith('heading') || block.type === 'quote' ? 'paragraph' : block.type, after);
      const blocks = [...valueRef.current.blocks], index = blocks.findIndex(item => item.id === block.id);
      blocks.splice(index, 1, { ...block, content: before }, newBlock);
      commit({ blocks }); setActiveId(newBlock.id); setSlash(null); focusBlock(newBlock.id);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const current = readRuns(element), start = position?.[0] ?? current.reduce((length, run) => length + run.text.length, 0), end = position?.[1] ?? start;
      const [before, tail] = splitRuns(current, start), [, after] = splitRuns(tail, end - start);
      const content = normalizeRuns([...before, { text: '\n' }, ...after]);
      writeRuns(element, content); setCaret(element, start + 1);
      replace(block.id, item => ({ ...item, content }));
      return;
    }
    if (event.key === 'Backspace' && position?.[0] === 0 && position[1] === 0 && !readRuns(element).length) {
      if (block.type !== 'paragraph') { event.preventDefault(); changeType('paragraph', block.id); }
      else if (valueRef.current.blocks.length > 1) { event.preventDefault(); remove(block.id); }
    }
  };
  const blocks = value.blocks.length ? value.blocks : [emptyBlock.current];
  const menuBlock = blocks.find(block => block.id === menuId), menuIndex = blocks.findIndex(block => block.id === menuId);
  const menuGroups = menuBlock ? [
    { label: t('Тип блока', 'Block type'), items: [{ id: 'hierarchy', label: t('Иерархия', 'Hierarchy'), icon: Pilcrow, children: allPresets.filter(preset => ['paragraph', 'heading1', 'heading2', 'heading3'].includes(preset.type)).map(preset => ({ id: preset.type, label: preset.label, icon: preset.icon, checked: preset.type === menuBlock.type, onSelect: () => changeType(preset.type, menuBlock.id) })), onSelect: () => {} }, { id: 'lists', label: t('Список', 'List'), icon: List, children: allPresets.filter(preset => ['bullet', 'numbered'].includes(preset.type)).map(preset => ({ id: preset.type, label: preset.label, icon: preset.icon, checked: preset.type === menuBlock.type, onSelect: () => changeType(preset.type, menuBlock.id) })), onSelect: () => {} }, ...allPresets.filter(preset => !['paragraph', 'heading1', 'heading2', 'heading3', 'bullet', 'numbered'].includes(preset.type)).map(preset => ({ id: preset.type, label: preset.label, icon: preset.icon, checked: preset.type === menuBlock.type, onSelect: () => changeType(preset.type, menuBlock.id) }))] },
    { label: savedSelection.current?.id === menuId && savedSelection.current.start !== savedSelection.current.end ? t('Формат выделения', 'Selection format') : t('Формат блока', 'Block format'), items: [{ id: 'format', label: t('Формат', 'Format'), icon: Bold, onSelect: () => {}, children: [
      { id: 'bold', label: t('Полужирный', 'Bold'), icon: Bold }, { id: 'italic', label: t('Курсив', 'Italic'), icon: Italic }, { id: 'strike', label: t('Зачёркнутый', 'Strikethrough'), icon: Strikethrough }, { id: 'code', label: t('Строчный код', 'Inline code'), icon: Code2 },
    ].map(item => ({ ...item, disabled: ['code', 'markdown-source'].includes(menuBlock.type) || Boolean(allPresets.find(preset => preset.type === menuBlock.type)?.render) || !menuBlock.content?.some(run => run.text), onSelect: () => formatBlock(menuBlock.id, item.id as RichTextMark) })) }] },
    { label: t('Действия', 'Actions'), items: [
      { id: 'copy', label: t('Копировать', 'Copy'), icon: Code2, onSelect: () => { void navigator.clipboard?.writeText((menuBlock.content ?? []).map(run => run.text).join('')); } },
      { id: 'duplicate', label: t('Дублировать', 'Duplicate'), icon: Plus, onSelect: () => { const next = [...valueRef.current.blocks], copy = { ...menuBlock, id: createRichTextBlock().id }; next.splice(menuIndex + 1, 0, copy); commit({ blocks: next }); focusBlock(copy.id); } },
      { id: 'up', label: t('Переместить вверх', 'Move up'), icon: ArrowUp, disabled: menuIndex === 0, onSelect: () => move(menuBlock.id, -1, true) },
      { id: 'down', label: t('Переместить вниз', 'Move down'), icon: ArrowDown, disabled: menuIndex === blocks.length - 1, onSelect: () => move(menuBlock.id, 1, true) },
      { id: 'remove', label: t('Удалить блок', 'Delete block'), icon: Trash2, danger: true, onSelect: () => remove(menuBlock.id) },
    ] },
  ] : [];
  return <section ref={editorRoot} className={`cap-rich-editor${uiVariant === 'context' ? ' cap-markdown-v2' : ''}${className ? ` ${className}` : ''}`} data-rich-editor={uid} data-disabled={disabled || undefined} aria-label={label} onPointerDownCapture={event => {
      const target = event.target as Element, block = target.closest<HTMLElement>('[contenteditable]')?.closest<HTMLElement>('[data-block-id]');
      const point = editable && event.button === 0 && block?.dataset.blockId ? caretAtPoint(event.clientX, event.clientY) : null;
      if (point && block?.dataset.blockId) pointerSelection.current = { pointerId: event.pointerId, ...point, blockId: block.dataset.blockId };
    }} onPointerMove={extendPointerSelection} onPointerUp={extendPointerSelection} onBeforeInput={event => { const native = event.nativeEvent as InputEvent; if (!native.isComposing && multiSelection.current && native.inputType?.startsWith('insert') && native.data !== null) { event.preventDefault(); replaceMultiSelection(native.data); } }} onCopy={event => { const text = multiSelectionText(); if (text === null) return; event.preventDefault(); event.clipboardData.setData('text/plain', text); }} onCut={event => { if (!editable) return; const text = multiSelectionText(); if (text === null) return; event.preventDefault(); event.clipboardData.setData('text/plain', text); replaceMultiSelection(''); }} onBlurCapture={event => { const target = event.relatedTarget as Node | null; if (!event.currentTarget.contains(target) && !slashPanel.current?.contains(target)) setSlash(null); }}>
    {showToolbar && uiVariant === 'classic' && <div className="cap-rich-editor-tools">
      <FloatingActionBar label={`${label}: ${t('форматирование', 'formatting')}`} position="static" size={toolbarSize} rovingFocus={false}>
        <IconButton label={t('Отменить', 'Undo')} icon={Undo2} variant="ghost" size="sm" disabled={!editable || !history.current.length} onClick={undo}/>
        <IconButton label={t('Повторить', 'Redo')} icon={Redo2} variant="ghost" size="sm" disabled={!editable || !future.current.length} onClick={redo}/>
        <span className="cap-rich-editor-divider" aria-hidden="true"/>
        <IconButton label={t('Полужирный', 'Bold')} icon={Bold} variant="ghost" size="sm" disabled={!editable} onMouseDown={preserveSelection} onClick={()=>format('bold')}/>
        <IconButton label={t('Курсив', 'Italic')} icon={Italic} variant="ghost" size="sm" disabled={!editable} onMouseDown={preserveSelection} onClick={()=>format('italic')}/>
        <IconButton label={t('Зачёркнутый', 'Strikethrough')} icon={Strikethrough} variant="ghost" size="sm" disabled={!editable} onMouseDown={preserveSelection} onClick={()=>format('strike')}/>
        <IconButton label={t('Строчный код', 'Inline code')} icon={Code2} variant="ghost" size="sm" disabled={!editable} onMouseDown={preserveSelection} onClick={()=>format('code')}/>
        <span className="cap-rich-editor-divider" aria-hidden="true"/>
        <IconButton label={t('Новый блок', 'New block')} icon={Plus} variant="ghost" size="sm" disabled={!editable} onClick={()=>insert(active?.id ?? null)}/>
      </FloatingActionBar>
    </div>}
    <span className="cap-sr-only" id={`${uid}-handle-help`}>{t('Перетащите для перемещения. Нажмите для меню. Alt+↑/↓ перемещает блок, Escape отменяет перетаскивание.', 'Drag to move. Click for menu. Alt+↑/↓ moves the block, Escape cancels dragging.')}</span>
    <span className="cap-sr-only" role="status" aria-live="polite">{announcement}</span>
    <div className="cap-rich-editor-document" data-revision={revision} data-dragging={Boolean(dragView) || undefined}>
      {blocks.map((block, index) => {
        const preset = allPresets.find(item => item.type === block.type);
        const custom = preset?.render;
        const sourceBlock = ['code', 'markdown-source'].includes(block.type);
        const codeText = (block.content ?? []).map(run => run.text).join('');
        const codeData = block.data as { codeLanguage?: string } | undefined;
        const rawLanguage = codeData?.codeLanguage ?? block.markdown?.language ?? 'text';
        const codeLanguage = ['text', 'js', 'ts', 'tsx', 'json', 'css', 'bash'].includes(rawLanguage) ? rawLanguage as CodeLanguage : 'text';
        const editor = <Editable block={block} label={`${label}, ${t('блок', 'block')} ${index+1}`} placeholder={index===0?(placeholder ?? t('Начните писать или введите /', 'Start writing or type /')):t('Введите / для выбора блока', 'Type / to choose a block')} disabled={disabled} readOnly={readOnly}
          slashListId={slash !== null && activeId === block.id ? `${uid}-slash` : undefined} activeOptionId={slash !== null && activeId === block.id && filtered.length ? `${uid}-slash-${Math.min(slashIndex, filtered.length - 1)}` : undefined}
          onInput={element => { const content = sourceBlock ? [{ text: readRuns(element).map(run => run.text).join('') }] : readRuns(element); replace(block.id, current => ({ ...current, content }), block.id); const text = content.map(run=>run.text).join(''); setActiveId(block.id); setSlash(!sourceBlock && text.startsWith('/') && text.length <= 65 ? text.slice(1) : null); setSlashIndex(0); }}
          onKeyDown={event=>keydown(event,block)} onPaste={paste} onFocus={element=>{slashAnchor.current=element;setActiveId(block.id)}}/>;
        return <div className="cap-rich-editor-row" data-block-id={block.id} data-block-type={block.type} data-selected={selectedIds.includes(block.id) || undefined} data-dragging={dragView?.id === block.id || undefined} data-menu-open={menuId === block.id || undefined} key={block.id}>
          {dragView?.beforeId === block.id && <span className="cap-rich-editor-drop-marker" data-testid="block-drop-marker" aria-hidden="true"/>}
          {editable && <div className="cap-rich-editor-row-actions">
            <IconButton className="cap-rich-editor-handle" label={`${t('Действия с блоком', 'Block actions')} ${index+1}`} icon={GripVertical} size="xs" variant="ghost" aria-describedby={`${uid}-handle-help`} aria-haspopup="menu" aria-expanded={menuId === block.id} aria-controls={menuId === block.id ? `${uid}-block-menu` : undefined}
              onPointerDown={event => {
                if (event.button !== 0 || event.isPrimary === false) return;
                const selection = captureSelection(); savedSelection.current = selection;
                event.preventDefault(); suppressClick.current = false;
                drag.current = { id: block.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, started: false, beforeId: block.id, selection, handle: event.currentTarget };
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={event => {
                const current = drag.current; if (!current || current.pointerId !== event.pointerId) return;
                current.x = event.clientX; current.y = event.clientY;
                if (!current.started && Math.hypot(current.x - current.startX, current.y - current.startY) >= 6) { current.started = true; setMenuId(null); setSlash(null); setAnnouncement(t('Перемещение блока. Escape — отмена.', 'Moving block. Escape cancels.')); }
                updateDrag();
              }}
              onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) finishDrag(); }}
              onPointerCancel={() => finishDrag(true)} onLostPointerCapture={() => finishDrag(true)}
              onClick={event => {
                if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
                savedSelection.current = captureSelection() ?? savedSelection.current;
                menuAnchor.current = event.currentTarget; setActiveId(block.id); setSlash(null); setMenuId(current => current === block.id ? null : block.id);
              }}
              onKeyDown={event => {
                if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); move(block.id, event.key === 'ArrowUp' ? -1 : 1, true); }
                else if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); savedSelection.current = captureSelection(); menuAnchor.current = event.currentTarget; setActiveId(block.id); setSlash(null); setMenuId(block.id); }
              }}/>
          </div>}
          <div className="cap-rich-editor-block">
            {custom ? custom({ block, disabled, readOnly, onDataChange: data => editable && replace(block.id, current => ({ ...current, data })) }) : sourceBlock ?
              <CodeBlock label={block.type === 'markdown-source' ? t('Markdown · исходный блок', 'Markdown · source block') : undefined} language={codeLanguage} showLanguageSelector={block.type === 'code' && editable} onLanguageChange={language => replace(block.id, current => ({ ...current, data: { ...(current.data && typeof current.data === 'object' && !Array.isArray(current.data) ? current.data : {}), codeLanguage: language } }))} editor={editable ? editor : undefined} variant="surface">{codeText}</CodeBlock> : editor}

          </div>
          {dragView && dragView.beforeId === null && index === blocks.length - 1 && <span className="cap-rich-editor-drop-marker" data-position="end" data-testid="block-drop-marker" aria-hidden="true"/>}
        </div>;
      })}
    </div>
    <SlashMenuOverlay anchor={slashAnchor} panel={slashPanel} open={slash !== null && Boolean(activeId)} id={`${uid}-slash`} options={slash === null ? [] : filtered} activeIndex={slashIndex} onSelect={type=>{if(activeId)changeType(type,activeId,true)}} onClose={()=>setSlash(null)}/>
    <BlockMenuOverlay anchor={menuAnchor} open={Boolean(menuId) && editable} id={`${uid}-block-menu`} groups={menuGroups} onClose={closeMenu}/>
    {selectionToolbarOpen && selectionToolbar && <>
      <span ref={selectionAnchor} className="cap-rich-editor-selection-anchor" aria-hidden="true" style={{ left: selectionToolbar.left, top: selectionToolbar.top }}/>
      <OverlayPortal anchor={selectionAnchor} panel={selectionPanel}><div ref={selectionPanel} className={`cap-rich-editor-selection-toolbar${uiVariant === 'context' ? ' cap-markdown-v2-overlay' : ''}`} data-state="open" style={selectionPosition} {...selectionScope}>
        {uiVariant === 'context' ? <ContextToolbar toolbarSize={toolbarSize} attributes={selectedAttributes} selectedMarks={selectedMarks} presets={allPresets} blockType={active?.type ?? 'paragraph'} onType={type => { const ids = multiSelection.current ? selectedIds : [savedSelection.current?.id ?? active?.id].filter(Boolean) as string[]; if (ids.length === 1) changeType(type, ids[0]); else commit({ blocks: valueRef.current.blocks.map(block => ids.includes(block.id) ? { ...block, type } : block) }); }} onMark={format} onAttribute={(key, val) => editSelected(run => key === 'clear' ? { text: run.text } : { ...run, [key]: val || undefined })} onTable={(rows, columns) => { const block = { ...createRichTextBlock('table'), data: { rows: Array.from({ length: rows }, () => Array(columns).fill('')) } }; const blocks = [...valueRef.current.blocks]; blocks.splice(Math.max(0, blocks.findIndex(b => b.id === active?.id) + 1), 0, block); commit({ blocks }); setSelectionToolbar(null); }} onComment={onCommentRequest ? () => onCommentRequest(multiSelectionText() ?? window.getSelection()?.toString() ?? '') : undefined} /> : <FloatingActionBar label={`${label}: ${t('выделенный текст', 'selected text')}`} position="static" size={toolbarSize} rovingFocus={false}>
          <IconButton label={t('Полужирный', 'Bold')} icon={Bold} variant="ghost" size="sm" onMouseDown={preserveSelection} onClick={()=>format('bold')}/>
          <IconButton label={t('Курсив', 'Italic')} icon={Italic} variant="ghost" size="sm" onMouseDown={preserveSelection} onClick={()=>format('italic')}/>
          <IconButton label={t('Зачёркнутый', 'Strikethrough')} icon={Strikethrough} variant="ghost" size="sm" onMouseDown={preserveSelection} onClick={()=>format('strike')}/>
          <IconButton label={t('Строчный код', 'Inline code')} icon={Code2} variant="ghost" size="sm" onMouseDown={preserveSelection} onClick={()=>format('code')}/>
        </FloatingActionBar>}
      </div></OverlayPortal>
    </>}
    {editable && uiVariant === 'classic' && <div className="cap-rich-editor-footer"><Button variant="ghost" size="sm" leading={<Plus size={15}/>} onClick={()=>insert(blocks.at(-1)?.id ?? null)}>{t('Добавить блок', 'Add block')}</Button><span className="cap-rich-editor-hint">{t('/ — тип блока · ⌘/Ctrl+B/I — формат', '/ — block type · ⌘/Ctrl+B/I — format')}</span></div>}
  </section>;
}
