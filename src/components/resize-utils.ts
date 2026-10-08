import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function resizeBounds(min: number | undefined, max: number | undefined, fallbackMin: number, fallbackMax: number) {
  const low = Math.max(0, Number.isFinite(min) ? min! : fallbackMin);
  return { min: low, max: Math.max(low, Number.isFinite(max) ? max! : fallbackMax) };
}
export function clampResize(value: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, Number.isFinite(value) ? value : min)));
}
/** Measure outside pointermove; parent padding is unavailable space. */
export function useResizeSpace(ref: RefObject<HTMLElement | null>, parent = false) {
  const [space, setSpace] = useState<{ width: number | null; height: number | null }>({ width: null, height: null });
  useLayoutEffect(() => {
    const element = parent ? ref.current?.parentElement : ref.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const typed = (element as HTMLElement & { computedStyleMap?: () => { get: (key: string) => { toString: () => string } | undefined } }).computedStyleMap?.().get('height')?.toString();
      const boundedHeight = (typed ? typed !== 'auto' : !!element.style.height && element.style.height !== 'auto') || style.maxHeight !== 'none' && !!style.maxHeight;
      const width = element.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const height = element.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
      const next = { width: width > 0 ? width : null, height: boundedHeight && height > 0 ? height : null };
      setSpace(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') { const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect(); }
    window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure);
  }, [ref, parent]);
  return space;
}
/** At most one state write per frame; pointerup synchronously flushes the final value. */
export function useFrameResize<T>(apply: (value: T) => void) {
  const callback = useRef(apply); callback.current = apply;
  const pending = useRef<{ value: T } | null>(null), frame = useRef<number | null>(null);
  const clear = useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; pending.current = null; }, []);
  const flush = useCallback(() => { const latest = pending.current; clear(); if (latest) callback.current(latest.value); }, [clear]);
  const queue = useCallback((value: T) => { pending.current = { value }; if (frame.current === null) frame.current = requestAnimationFrame(flush); }, [flush]);
  useEffect(() => clear, [clear]);
  return { queue, flush, clear };
}
