import { useTranslate } from './locale.js';
import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes } from 'react';
import { Card } from './layout.js';
import { cx } from './primitives.js';
import { clampResize, resizeBounds, useFrameResize, useResizeSpace } from './resize-utils.js';

export interface ResizableCardSize { width: number; height: number }
export interface ResizableCardProps extends HTMLAttributes<HTMLDivElement> {
  size?: ResizableCardSize;
  defaultSize?: ResizableCardSize;
  onSizeChange?: (size: ResizableCardSize) => void;
  onSizeCommit?: (size: ResizableCardSize) => void;
  minWidth?: number; maxWidth?: number; minHeight?: number; maxHeight?: number;
  step?: number; resizable?: boolean; disabled?: boolean; label?: string;
  variant?: 'default' | 'subtle' | 'elevated';
}
/** A Card surface with an accessible resize corner. Parent width wins over minWidth. */
export function ResizableCard({ size, defaultSize = { width: 360, height: 240 }, onSizeChange, onSizeCommit, minWidth, maxWidth, minHeight, maxHeight, step = 10, resizable = true, disabled = false, label: suppliedLabel, variant = 'default', children, className, style, ...props }: ResizableCardProps) {
  const t = useTranslate();
  const label = suppliedLabel === undefined ? (t("Карточка", "Card")) : suppliedLabel;

  const frame = useRef<HTMLDivElement>(null), space = useResizeSpace(frame), id = useId();
  const [inner, setInner] = useState(defaultSize), [dragging, setDragging] = useState(false);
  const widthBounds = resizeBounds(minWidth, maxWidth, 160, 800), heightBounds = resizeBounds(minHeight, maxHeight, 120, 800);
  const maxW = Math.min(widthBounds.max, space.width ?? Infinity), minW = Math.min(widthBounds.min, maxW);
  const fit = (next: ResizableCardSize): ResizableCardSize => ({ width: clampResize(next.width, minW, maxW), height: clampResize(next.height, heightBounds.min, heightBounds.max) });
  const desired = size ?? inner, rendered = fit(desired), current = useRef(rendered); current.current = rendered;
  const drag = useRef<{ pointerId: number; x: number; y: number; initial: ResizableCardSize; desired: ResizableCardSize; handle: HTMLButtonElement } | null>(null);
  const enabled = resizable && !disabled && (size === undefined || !!onSizeChange);
  const change = (next: ResizableCardSize) => {
    const fitted = fit(next);
    if (current.current.width === fitted.width && current.current.height === fitted.height) return;
    current.current = fitted;
    if (size === undefined) setInner(fitted);
    onSizeChange?.(fitted);
  };
  const scheduled = useFrameResize(change);
  const finish = (cancel = false) => {
    const active = drag.current; if (!active) return;
    if (cancel) { scheduled.clear(); if (size === undefined) setInner(active.desired); onSizeChange?.(fit(active.desired)); }
    else { scheduled.flush(); if (current.current.width !== active.initial.width || current.current.height !== active.initial.height) onSizeCommit?.(current.current); }
    drag.current = null; setDragging(false);
    if (active.handle.hasPointerCapture?.(active.pointerId)) active.handle.releasePointerCapture?.(active.pointerId);
  };
  useEffect(() => { if (!enabled) { scheduled.clear(); const active = drag.current; drag.current = null; setDragging(false); if (active?.handle.hasPointerCapture?.(active.pointerId)) active.handle.releasePointerCapture?.(active.pointerId); } }, [enabled, scheduled.clear]);
  return <div ref={frame} className="cap-resizable-card-frame"><Card {...props} role={props.role ?? 'group'} aria-label={props['aria-label'] ?? label} variant={variant} className={cx('cap-resizable-card', className)} data-resizing={dragging || undefined} style={{ ...style, width: rendered.width, height: rendered.height } as CSSProperties}>
    <div className="cap-resizable-card-body">{children}</div>
    {resizable && <><span id={`${id}-resize-help`} className="cap-sr-only">{t('Ширина', 'Width')} {rendered.width} {t(" px, высота ", " px, height ")}{rendered.height} {t(" px. Перетащите угол или используйте стрелки. Shift увеличивает шаг. Home задаёт минимальный размер, End — максимальный. Escape отменяет перетаскивание.", " px. Drag the corner or use arrow keys. Shift increases the step. Home sets minimum size, End maximum size. Escape cancels dragging.")}</span><button type="button" className="cap-resizable-card-handle" disabled={!enabled} aria-label={`${t("Изменить размер: ", "Resize: ")}${label}`} aria-describedby={`${id}-resize-help`} onPointerDown={event => {
      if (event.button !== 0 || drag.current || !enabled) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
      drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, initial: rendered, desired, handle: event.currentTarget }; setDragging(true); event.currentTarget.setPointerCapture?.(event.pointerId);
    }} onPointerMove={event => { const active = drag.current; if (active?.pointerId === event.pointerId) scheduled.queue({ width: active.initial.width + event.clientX - active.x, height: active.initial.height + event.clientY - active.y }); }} onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) finish(); }} onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) finish(true); }} onLostPointerCapture={event => { if (drag.current?.pointerId === event.pointerId) finish(true); }} onKeyDown={event => {
      if (event.key === 'Escape' && drag.current) { event.preventDefault(); finish(true); return; }
      if (!enabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const amount = Math.max(1, Number.isFinite(step) ? step : 10) * (event.shiftKey ? 4 : 1);
      const next = event.key === 'Home' ? { width: minW, height: heightBounds.min } : event.key === 'End' ? { width: maxW, height: heightBounds.max } : { width: rendered.width + (event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0), height: rendered.height + (event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0) };
      const fitted = fit(next); change(fitted); if (fitted.width !== rendered.width || fitted.height !== rendered.height) onSizeCommit?.(fitted);
    }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M8 12L12 8M12 12h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button></>}
  </Card></div>;
}
