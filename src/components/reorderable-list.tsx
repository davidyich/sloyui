import { useEffect, useLayoutEffect, useId, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { cx, IconButton } from './primitives.js';

export interface ReorderableItemContext { index: number; handle: ReactNode; dragging: boolean }
export interface ReorderableListProps<T extends { id: string }> {
  label: string;
  items: readonly T[];
  onOrderChange: (items: T[]) => void;
  getItemLabel: (item: T) => string;
  renderItem: (item: T, context: ReorderableItemContext) => ReactNode;
  /** Use custom to place context.handle inside a card or another compound item. */
  handlePlacement?: 'start' | 'custom';
  disabled?: boolean;
  className?: string;
}
interface RowPosition { x: number; y: number }
interface Drag { id: string; x: number; y: number; originX: number; originY: number; target: number; active: boolean }
/** Controlled vertical reorder. Only the grip starts a drag; item content keeps its native interactions. */
export function ReorderableList<T extends { id: string }>({ label, items, onOrderChange, getItemLabel, renderItem, handlePlacement = 'start', disabled = false, className }: ReorderableListProps<T>) {
  const root = useRef<HTMLOListElement>(null), rows = useRef(new Map<string, HTMLLIElement>()), handles = useRef(new Map<string, HTMLButtonElement>());
  const drag = useRef<Drag | null>(null), frame = useRef(0), suppressClick = useRef(false), restoreFrame = useRef(0);
  const [preview, setPreview] = useState<{id:string;target:number} | null>(null), [actions, setActions] = useState<string | null>(null), [announcement, setAnnouncement] = useState('');
  const instructions = useId();
  const positions = useRef(new Map<string, RowPosition>()), pendingPositions = useRef<Map<string, RowPosition> | null>(null);
  const animations = useRef(new Map<string, Animation>());
  const measurePositions = () => {
    const origin = root.current?.getBoundingClientRect();
    const measured = new Map<string, RowPosition>();
    if (!origin) return measured;
    rows.current.forEach((row, id) => { const bounds = row.getBoundingClientRect(); measured.set(id, { x: bounds.left - origin.left, y: bounds.top - origin.top }); });
    return measured;
  };
  const cancelAnimations = () => { animations.current.forEach(animation => animation.cancel()); animations.current.clear(); };

  const signature = JSON.stringify(items.map(item => item.id));
  useLayoutEffect(() => {
    // Capture the displayed positions before the controlled reorder; stop interrupted
    // transforms before reading the new layout. Only the affected rows animate.
    const before = pendingPositions.current ?? positions.current;
    pendingPositions.current = null;
    cancelAnimations();
    const after = measurePositions(); positions.current = after;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    rows.current.forEach((row, id) => {
      const previous = before.get(id), next = after.get(id);
      if (!previous || !next || typeof row.animate !== 'function') return;
      const x = previous.x - next.x, y = previous.y - next.y;
      if (Math.abs(x) < .5 && Math.abs(y) < .5) return;
      const animation = row.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0px, 0px)' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
      animations.current.set(id, animation);
      animation.finished?.then(() => { if (animations.current.get(id) === animation) animations.current.delete(id); }).catch(() => {});
    });
  }, [signature]);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => { if (preference.matches) cancelAnimations(); };
    preference.addEventListener?.('change', changed); return () => preference.removeEventListener?.('change', changed);
  }, []);
  const stop = () => { cancelAnimationFrame(frame.current); drag.current = null; setPreview(null); };
  useEffect(() => { stop(); if (disabled) setActions(null); }, [signature, disabled]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); cancelAnimationFrame(restoreFrame.current); cancelAnimations(); }, []);
  const move = (id: string, target: number) => {
    const from = items.findIndex(item => item.id === id), to = Math.max(0,Math.min(items.length - 1,target));
    if (disabled || from < 0 || from === to) return;
    const next = [...items], [item] = next.splice(from,1); next.splice(to,0,item);
    pendingPositions.current = measurePositions();
    onOrderChange(next);
    setAnnouncement(`${getItemLabel(item)}. Позиция ${to + 1} из ${items.length}.`);
    restoreFrame.current = requestAnimationFrame(() => handles.current.get(id)?.focus({preventScroll:true}));
  };
  const updateTarget = () => {
    const state = drag.current; if (!state?.active) return;
    let closest = Infinity, target = state.target;
    items.forEach((item,index) => { const bounds = rows.current.get(item.id)?.getBoundingClientRect(); if (!bounds) return; const distance = Math.abs(state.y - (bounds.top + bounds.height / 2)); if (distance < closest) { closest = distance; target = index; } });
    if (target !== state.target) { state.target = target; setPreview({id:state.id,target}); }
  };
  const autoScroll = () => {
    const state = drag.current; if (!state?.active) return;
    let parent = root.current?.parentElement;
    while (parent && !(parent.scrollHeight > parent.clientHeight && /(auto|scroll)/.test(getComputedStyle(parent).overflowY))) parent = parent.parentElement;
    const box = parent?.getBoundingClientRect(), top = box?.top ?? 0, bottom = box?.bottom ?? window.innerHeight;
    const delta = state.y < top + 40 ? -10 : state.y > bottom - 40 ? 10 : 0;
    if (delta) { if (parent) parent.scrollTop += delta; else window.scrollBy(0,delta); updateTarget(); }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const pointerDown = (event: ReactPointerEvent<HTMLButtonElement>, id: string, index: number) => {
    if (disabled || event.button !== 0) return;
    suppressClick.current = false; setActions(null);
    drag.current = {id,x:event.clientX,y:event.clientY,originX:event.clientX,originY:event.clientY,target:index,active:false};
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current; if (!state) return;
    state.x = event.clientX; state.y = event.clientY;
    if (!state.active && Math.hypot(state.x-state.originX,state.y-state.originY) >= 5) {
      state.active = true; setPreview({id:state.id,target:state.target}); frame.current = requestAnimationFrame(autoScroll);
    }
    updateTarget();
  };
  const pointerUp = () => { const state = drag.current; if (state?.active) { suppressClick.current = true; move(state.id,state.target); } stop(); };
  return <div className={cx('cap-reorderable',className)}>
    <span id={instructions} className="cap-sr-only">Перетащите за ручку. Стрелки вверх и вниз меняют позицию. Нажмите на ручку для кнопок перемещения. Escape отменяет перетаскивание.</span>
    <ol ref={root} className="cap-reorderable-list" aria-label={label}>{items.map((item,index) => {
      const dragging = preview?.id === item.id, source = preview ? items.findIndex(entry => entry.id === preview.id) : -1;
      const handle = !disabled && <span className="cap-reorder-handle-wrap">
        <button ref={element => { if (element) handles.current.set(item.id,element); else handles.current.delete(item.id); }} type="button" className="cap-reorder-handle" aria-label={`Переместить: ${getItemLabel(item)}`} aria-describedby={instructions} aria-expanded={actions === item.id} disabled={items.length < 2}
          onPointerDown={event => pointerDown(event,item.id,index)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={stop} onLostPointerCapture={stop}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setActions(actions === item.id ? null : item.id); }}
          onKeyDown={event => { if (event.key === 'Escape') { stop(); setActions(null); } else if (['ArrowUp','ArrowDown','Home','End'].includes(event.key)) { event.preventDefault(); move(item.id,event.key === 'Home' ? 0 : event.key === 'End' ? items.length-1 : index+(event.key === 'ArrowUp' ? -1 : 1)); } }}>
          <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">{[5,9,13].flatMap(y => [5,9].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1"/>))}</svg>
        </button>
        {actions === item.id && <span className="cap-reorder-actions" role="group" aria-label={`Позиция: ${getItemLabel(item)}`} onKeyDown={event => { if (event.key === 'Escape') { setActions(null); handles.current.get(item.id)?.focus(); } }}>
          <IconButton size="xs" variant="ghost" icon="chevron" className="cap-reorder-up" label="Переместить вверх" disabled={index === 0} onClick={() => move(item.id,index-1)}/>
          <IconButton size="xs" variant="ghost" icon="down" label="Переместить вниз" disabled={index === items.length-1} onClick={() => move(item.id,index+1)}/>
        </span>}
      </span>;
      return <li key={item.id} ref={element => { if (element) rows.current.set(item.id,element); else rows.current.delete(item.id); }} className="cap-reorderable-item" data-dragging={dragging || undefined} data-drop={preview?.target === index && source !== index ? (source < index ? 'after' : 'before') : undefined}>
        {handlePlacement === 'start' && handle}<div className="cap-reorderable-content">{renderItem(item,{index,handle,dragging})}</div>
      </li>;
    })}</ol>
    <span className="cap-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </div>;
}
