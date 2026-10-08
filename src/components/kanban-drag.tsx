import { useEffect, useId, useRef, useState, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { KanbanLane, KanbanTask } from './content.js';
import { useTranslate } from './locale.js';

interface Destination { columnId: string; index: number; top: number }
interface Drag {
  id: string; pointerId: number; handle: HTMLElement;
  originX: number; originY: number; x: number; y: number; width: number;
  active: boolean; target: Destination | null;
}

/** Column indices always exclude the moving task. No data changes occur until drop. */
export function useKanbanDrag(columns: readonly KanbanLane[], items: readonly KanbanTask[], onMove?: (id: string, columnId: string, index: number) => void, dragActivation: 'card' | 'handle' = 'card') {
  const t = useTranslate(), instructions = useId();
  const root = useRef<HTMLDivElement>(null), handles = useRef(new Map<string, HTMLElement>());
  const drag = useRef<Drag | null>(null), frame = useRef(0), focusFrame = useRef(0), suppressClick = useRef(false);
  const [preview, setPreview] = useState<{ id: string; x: number; y: number; width: number; target: Destination | null } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const latest = useRef({ columns, items, onMove }); latest.current = { columns, items, onMove };
  const stop = () => {
    const current = drag.current; if (current?.active) suppressClick.current = true; drag.current = null; cancelAnimationFrame(frame.current); setPreview(null);
    if (current?.handle.hasPointerCapture?.(current.pointerId)) current.handle.releasePointerCapture(current.pointerId);
  };
  const move = (id: string, columnId: string, index: number) => {
    const current = latest.current, item = current.items.find(task => task.id === id), column = current.columns.find(lane => lane.id === columnId);
    if (!current.onMove || !item || !column) return;
    const destination = current.items.filter(task => task.columnId === columnId && task.id !== id), position = Math.max(0, Math.min(destination.length, index));
    if (item.columnId === columnId && current.items.filter(task => task.columnId === columnId).findIndex(task => task.id === id) === position) return;
    current.onMove(id, columnId, position);
    setAnnouncement(`${item.title}. ${column.title}. ${t('Позиция', 'Position')} ${position + 1}.`);
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => handles.current.get(id)?.focus({ preventScroll: true }));
  };
  const updateTarget = () => {
    const state = drag.current, board = root.current; if (!state?.active || !board) return;
    let target: Destination | null = null;
    const boardBox = board.getBoundingClientRect();
    if (state.x >= boardBox.left && state.x <= boardBox.right) {
      for (const lane of board.querySelectorAll<HTMLElement>('[data-kanban-column]')) {
        const bounds = lane.getBoundingClientRect(), body = lane.querySelector<HTMLElement>('.cap-kanban-column-body');
        if (!body || state.x < bounds.left || state.x > bounds.right || state.y < bounds.top || state.y > Math.max(bounds.bottom, boardBox.bottom) + 24) continue;
        const bodyBox = body.getBoundingClientRect();
        const rows = Array.from(body.querySelectorAll<HTMLElement>('[data-kanban-task]')).filter(row => row.dataset.kanbanTask !== state.id);
        let index = rows.findIndex(row => { const box = row.getBoundingClientRect(); return state.y < box.top + box.height / 2; });
        if (index === -1) index = rows.length;
        const before = rows[index]?.getBoundingClientRect(), after = rows[index - 1]?.getBoundingClientRect();
        target = { columnId: lane.dataset.kanbanColumn!, index, top: before ? before.top - bodyBox.top - 6 : after ? after.bottom - bodyBox.top + 6 : 12 };
        break;
      }
    }
    state.target = target;
    setPreview({ id: state.id, x: state.x, y: state.y, width: state.width, target });
  };
  const autoScroll = () => {
    const state = drag.current, board = root.current; if (!state?.active || !board) return;
    const bounds = board.getBoundingClientRect();
    const horizontal = state.x < bounds.left + 36 ? -12 : state.x > bounds.right - 36 ? 12 : 0;
    if (horizontal) board.scrollLeft += horizontal;
    let parent = board.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && /(auto|scroll)/.test(getComputedStyle(parent).overflowY))) parent = parent.parentElement;
    const box = parent?.getBoundingClientRect(), top = box?.top ?? 0, bottom = box?.bottom ?? window.innerHeight;
    const vertical = state.y < top + 36 ? -10 : state.y > bottom - 36 ? 10 : 0;
    if (vertical) { if (parent) parent.scrollTop += vertical; else window.scrollBy(0, vertical); }
    if (horizontal || vertical) updateTarget();
    frame.current = requestAnimationFrame(autoScroll);
  };
  const signature = JSON.stringify([columns.map(column => column.id), items.map(item => [item.id, item.columnId])]);
  useEffect(() => { stop(); }, [signature, !!onMove, dragActivation]);
  useEffect(() => {
    const pointerMove = (event: PointerEvent) => {
      const state = drag.current; if (!state || event.pointerId !== state.pointerId) return;
      state.x = event.clientX; state.y = event.clientY;
      if (!state.active && Math.hypot(state.x - state.originX, state.y - state.originY) >= 5) {
        state.active = true; frame.current = requestAnimationFrame(autoScroll);
      }
      if (state.active) { event.preventDefault(); updateTarget(); }
    };
    const pointerUp = (event: PointerEvent) => {
      const state = drag.current; if (!state || event.pointerId !== state.pointerId) return;
      if (state.active) { updateTarget(); if (state.target) move(state.id, state.target.columnId, state.target.index); }
      stop();
    };
    const pointerCancel = (event: PointerEvent) => { if (drag.current?.pointerId === event.pointerId) stop(); };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) { event.preventDefault(); stop(); setAnnouncement(t('Перенос отменён', 'Move cancelled')); }
    };
    document.addEventListener('pointermove', pointerMove, { passive: false }); document.addEventListener('pointerup', pointerUp);
    document.addEventListener('pointercancel', pointerCancel); document.addEventListener('keydown', keyDown, true);
    return () => {
      document.removeEventListener('pointermove', pointerMove); document.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('pointercancel', pointerCancel); document.removeEventListener('keydown', keyDown, true);
      cancelAnimationFrame(frame.current); cancelAnimationFrame(focusFrame.current); drag.current = null;
    };
  }, []);
  const start = (event: ReactPointerEvent<HTMLElement>, item: KanbanTask, fromCard = false) => {
    suppressClick.current = false;
    if (!latest.current.onMove || event.button !== 0 || drag.current) return;
    if (fromCard && event.target instanceof Element && event.target.closest('button,a,input,select,textarea,label,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="textbox"],[role="checkbox"],[role="combobox"],[data-kanban-no-drag]')) return;
    const width = event.currentTarget.closest<HTMLElement>('[data-kanban-task]')?.getBoundingClientRect().width ?? 240;
    drag.current = { id: item.id, pointerId: event.pointerId, handle: event.currentTarget, originX: event.clientX, originY: event.clientY, x: event.clientX, y: event.clientY, width, active: false, target: null };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const keyboard = (event: ReactKeyboardEvent<HTMLElement>, item: KanbanTask) => {
    if (event.target !== event.currentTarget || drag.current || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = latest.current, index = current.items.filter(task => task.columnId === item.columnId).findIndex(task => task.id === item.id);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const columnIndex = current.columns.findIndex(column => column.id === item.columnId), column = current.columns[columnIndex + (event.key === 'ArrowLeft' ? -1 : 1)];
      if (column) move(item.id, column.id, current.items.filter(task => task.columnId === column.id).length);
    } else move(item.id, item.columnId, event.key === 'Home' ? 0 : event.key === 'End' ? current.items.length : index + (event.key === 'ArrowUp' ? -1 : 1));
  };
  const handle = (item: KanbanTask) => !onMove || dragActivation !== 'handle' ? null : <button type="button" className="cap-kanban-drag-handle"
    ref={element => { if (element) handles.current.set(item.id, element); else handles.current.delete(item.id); }}
    aria-label={`${t('Переместить: ', 'Move: ')}${item.title}`} aria-describedby={instructions}
    onPointerDown={event => start(event,item)} onLostPointerCapture={() => { if (drag.current?.id === item.id) stop(); }}
    onClick={event => event.preventDefault()} onKeyDown={event => keyboard(event,item)}>
    <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">{[5,9,13].flatMap(y => [5,9].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1"/>))}</svg>
  </button>;
  const cardProps = (item: KanbanTask): HTMLAttributes<HTMLDivElement> & { ref?: (element: HTMLDivElement | null) => void } => !onMove || dragActivation !== 'card' ? {} : {
    ref: element => { if(element) handles.current.set(item.id,element); else handles.current.delete(item.id); },
    role: 'group', tabIndex: 0, 'aria-label': `${t('Переместить: ', 'Move: ')}${item.title}`, 'aria-describedby': instructions,
    onPointerDown: event => start(event,item,true), onKeyDown: event => keyboard(event,item),
    onLostPointerCapture: () => { if(drag.current?.id===item.id) stop(); },
    onClickCapture: event => { if(suppressClick.current) { suppressClick.current=false;event.preventDefault();event.stopPropagation(); } },
  };
  return { root, preview, announcement, instructions, handle, cardProps, move };
}
