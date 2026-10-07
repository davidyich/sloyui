import { useTranslate } from './locale.js';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Drawer, type DrawerProps } from './overlays.js';
import { cx } from './primitives.js';

export interface BottomSheetProps extends Omit<DrawerProps, 'side' | 'variant' | 'children'> {
  children?: ReactNode;
  variant?: 'inset' | 'edge';
  edgeGap?: number;
  /** Ordered viewport-height fractions; normalized to ascending values in 0.1–0.95. */
  snapPoints?: readonly number[];
  snap?: number;
  defaultSnap?: number;
  onSnapChange?: (index: number) => void;
  dismissThreshold?: number;
  draggable?: boolean;
  handleLabel?: string;
}
type Gesture = { id: number; y: number; lastY: number; lastAt: number; velocity: number; height: number; delta: number };
const defaultPoints = [0.5, 0.85];

/** Drawer supplies the only portal, modal focus trap, inert background and scroll lock. */
export function BottomSheet({ open, onOpenChange, title, children, className, variant = 'inset', edgeGap = 12, snapPoints = defaultPoints, snap, defaultSnap = 0, onSnapChange, dismissThreshold = 120, draggable = true, handleLabel: suppliedHandleLabel, ...props }: BottomSheetProps) {
  const t = useTranslate();
  const handleLabel = suppliedHandleLabel === undefined ? (t("Высота панели. Стрелки вверх и вниз изменяют высоту", "Panel height. Up and down arrow keys change height")) : suppliedHandleLabel;

  const points = [...new Set(snapPoints.filter(Number.isFinite).map(point => Math.max(0.1, Math.min(0.95, point))))].sort((a, b) => a - b);
  if (!points.length) points.push(0.5);
  const [internal, setInternal] = useState(defaultSnap);
  const requestedSnap = snap ?? internal;
  const index = Math.max(0, Math.min(points.length - 1, Number.isFinite(requestedSnap) ? Math.trunc(requestedSnap) : 0));
  const handle = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement | null>(null), gesture = useRef<Gesture | null>(null), settle = useRef<Animation | null>(null), previousHeight = useRef<number | null>(null), wasOpen = useRef(false);
  const gap = variant === 'edge' ? 0 : Number.isFinite(edgeGap) ? Math.max(0, edgeGap) : 12;
  const setSnap = (next: number) => {
    const bounded = Math.max(0, Math.min(points.length - 1, next));
    if (snap === undefined) setInternal(bounded);
    onSnapChange?.(bounded);
  };
  useEffect(() => {
    if (open && !wasOpen.current && snap === undefined) setInternal(defaultSnap);
    wasOpen.current = open;
    if (!open) { gesture.current = null; settle.current?.cancel(); }
  }, [open, defaultSnap, snap]);
  useLayoutEffect(() => {
    const sheet = handle.current?.closest<HTMLElement>('.cap-bottom-sheet');
    if (!sheet) return;
    panel.current = sheet;
    const layer = sheet.closest<HTMLElement>('.cap-modal-layer');
    layer?.style.setProperty('--cap-overlay-gutter', `${gap}px`);
    sheet.style.setProperty('--cap-bottom-sheet-gap', `${gap}px`);
    const nextHeight = Math.min(window.innerHeight * points[index], window.innerHeight - gap * 2);
    const from = previousHeight.current;
    previousHeight.current = nextHeight;
    settle.current?.cancel();
    sheet.style.height = `${points[index] * 100}dvh`;
    sheet.style.maxHeight = `calc(100dvh - ${gap * 2}px)`;
    sheet.style.transform = '';
    sheet.removeAttribute('data-dragging');
    if (from !== null && from !== nextHeight && sheet.animate && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      settle.current = sheet.animate([{ transform: `translateY(${nextHeight - from}px)` }, { transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    return () => settle.current?.cancel();
  }, [open, index, gap, points.join(',')]);
  useEffect(() => () => { settle.current?.cancel(); gesture.current = null; }, []);
  const resetDrag = () => {
    const sheet = panel.current;
    if (!sheet) return;
    const offset = gesture.current?.delta ?? 0;
    gesture.current = null;
    sheet.removeAttribute('data-dragging');
    sheet.style.transform = '';
    if (offset && sheet.animate && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      settle.current?.cancel();
      settle.current = sheet.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  };
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggable || !open || event.button !== 0) return;
    const sheet = panel.current;
    if (!sheet) return;
    settle.current?.cancel();
    const height = sheet.getBoundingClientRect().height;
    gesture.current = { id: event.pointerId, y: event.clientY, lastY: event.clientY, lastAt: event.timeStamp, velocity: 0, height, delta: 0 };
    sheet.setAttribute('data-dragging', 'true');
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* A stale pointer needs no capture. */ }
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = gesture.current, sheet = panel.current;
    if (!drag || drag.id !== event.pointerId || !sheet) return;
    const elapsed = event.timeStamp - drag.lastAt;
    if (elapsed > 0) drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY; drag.lastAt = event.timeStamp;
    const distance = event.clientY - drag.y;
    drag.delta = distance < 0 ? Math.max(-28, distance * 0.15) : distance;
    sheet.style.transform = `translate3d(0,${drag.delta}px,0)`;
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const distance = event.clientY - drag.y;
    const velocity = event.timeStamp - drag.lastAt > 100 ? 0 : drag.velocity;
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Already released by the browser. */ }
    if (distance > dismissThreshold * 1.6 || (index === 0 && (distance > dismissThreshold || velocity > 0.8))) {
      gesture.current = null;
      onOpenChange(false);
      return;
    }
    if ((distance > 64 || velocity > 0.65) && index > 0) { resetDrag(); setSnap(index - 1); }
    else if ((distance < -64 || velocity < -0.65) && index < points.length - 1) { resetDrag(); setSnap(index + 1); }
    else resetDrag();
  };
  return <Drawer {...props} open={open} onOpenChange={onOpenChange} title={title} side="bottom" variant={variant} className={cx('cap-bottom-sheet', className)}>
    <button ref={handle} type="button" role={points.length > 1 ? 'slider' : undefined} className="cap-bottom-sheet-handle" aria-label={handleLabel} aria-orientation={points.length > 1 ? 'vertical' : undefined} aria-valuemin={points.length > 1 ? 1 : undefined} aria-valuemax={points.length > 1 ? points.length : undefined} aria-valuenow={points.length > 1 ? index + 1 : undefined} aria-valuetext={points.length > 1 ? `${Math.round(points[index] * 100)}%` : undefined} disabled={!draggable && points.length === 1} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={resetDrag} onLostPointerCapture={() => { if (gesture.current) resetDrag(); }} onKeyDown={event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setSnap(event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : index + (event.key === 'ArrowUp' ? 1 : -1));
      }
    }}><span aria-hidden="true"/></button>
    {children ?? <p className="cap-bottom-sheet-empty">{t("Нет содержимого", "No content")}</p>}
  </Drawer>;
}
