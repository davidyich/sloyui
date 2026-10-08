import { useTranslate } from './locale.js';
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cx } from './primitives.js';

export type ScrubOrientation = 'horizontal' | 'vertical';
export interface ValueScrubberOptions {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: ScrubOrientation;
  /** Disable keyboard handling when attaching the pointer gesture to a native control. */
  keyboard?: boolean;
  /** Require Alt for keyboard changes when the trigger already owns arrow keys. */
  altKeyRequired?: boolean;
  onValueChange: (value: number) => void;
}
export interface ValueScrubberBindings {
  /** Live modifier state lets the cursor update without pointer movement. */
  'data-scrub-alt'?: true;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: React.MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

type Drag = { pointerId: number; initial: number; x: number; y: number; changed: boolean };
const finiteOr = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value as number : fallback;
const decimals = (value: number) => { const text = String(value).toLowerCase(), exponent = Number(text.split('e')[1] ?? 0), fraction = (text.split('e')[0].split('.')[1] ?? '').length; return Math.max(0, Math.min(12, fraction - exponent)); };
const precisionRound = (value: number, step: number) => Number(value.toFixed(Math.max(decimals(value), decimals(step))));

/** Adds an Alt + pointer scrub gesture and optional slider keyboard behavior to an existing element. */
export function useValueScrubber({ value, min = -Infinity, max = Infinity, step = 1, disabled = false, orientation = 'horizontal', keyboard = false, altKeyRequired = false, onValueChange }: ValueScrubberOptions): ValueScrubberBindings {
  const drag = useRef<Drag | null>(null), suppressClick = useRef(false), clearSuppression = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [altKeyDown, setAltKeyDown] = useState(false);
  useEffect(()=>()=>clearTimeout(clearSuppression.current),[]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => setAltKeyDown(event.altKey || event.key === 'Alt');
    const up = (event: KeyboardEvent) => setAltKeyDown(event.key === 'Alt' ? false : event.altKey);
    const blur = () => setAltKeyDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1, bounds = [finiteOr(min, -Infinity),finiteOr(max, Infinity)].sort((a,b)=>a-b), low = bounds[0], high = bounds[1];
  const clamp = (number: number, precisionStep = safeStep) => precisionRound(Math.min(high, Math.max(low, number)), precisionStep);
  const release = (event: PointerEvent<HTMLElement>) => { try { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Browser may release capture while cancelling. */ } };
  const finish = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const active = drag.current; if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null; release(event); suppressClick.current = true; clearTimeout(clearSuppression.current);
    clearSuppression.current = setTimeout(() => { suppressClick.current = false; }, 0);
    if (cancelled && active.changed) onValueChange(active.initial);
  };
  const updateByKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!keyboard || disabled || (altKeyRequired && !event.altKey)) return false;
    const precision = event.shiftKey ? .1 : 1, delta = safeStep * precision; let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = clamp(value + delta,delta);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = clamp(value - delta,delta);
    else if (event.key === 'Home') { event.preventDefault(); if (!Number.isFinite(low)) return true; next = clamp(low); }
    else if (event.key === 'End') { event.preventDefault(); if (!Number.isFinite(high)) return true; next = clamp(high); }
    else return false;
    event.preventDefault(); if (next !== value) onValueChange(next); return true;
  };
  return {
    'data-scrub-alt': altKeyDown && !disabled ? true : undefined,
    onPointerDown(event) {
      if (!event.altKey || disabled || !Number.isFinite(value) || event.button !== 0) return;
      event.preventDefault(); clearTimeout(clearSuppression.current); suppressClick.current = false;
      drag.current = { pointerId: event.pointerId, initial: value, x: event.clientX, y: event.clientY, changed: false };
      try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Pointer capture can be unavailable in embedded browsers. */ }
    },
    onPointerMove(event) {
      const active = drag.current; if (!active || active.pointerId !== event.pointerId) return;
      if (disabled) { finish(event,true); return; }
      const delta = orientation === 'horizontal' ? event.clientX - active.x : active.y - event.clientY;
      if (Math.abs(delta) < 2) return;
      const multiplier = event.shiftKey ? .1 : 1, adjustedStep = safeStep * multiplier, steps = Math.trunc(delta / 8), next = clamp(active.initial + steps * adjustedStep,adjustedStep);
      if (next !== value) { active.changed = true; onValueChange(next); }
    },
    onPointerUp(event) { finish(event, disabled); },
    onPointerCancel(event) { finish(event, true); },
    onLostPointerCapture(event) { finish(event, true); },
    onClickCapture(event) { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; clearTimeout(clearSuppression.current); } },
    onKeyDown(event) { updateByKey(event); },
  };
}

export interface ValueScrubberProps extends Omit<ValueScrubberOptions, 'keyboard' | 'altKeyRequired'> {
  label: string;
  formatValue?: (value: number) => ReactNode;
  className?: string;
  orientation?: ScrubOrientation;
}
/** Standalone accessible value control. Alt-drag scrubs; arrows and Home/End work without a pointer. */
export function ValueScrubber({ label, value, min = 0, max = 100, step = 1, disabled, orientation = 'horizontal', onValueChange, formatValue, className }: ValueScrubberProps) {
  const t = useTranslate();

  const id=useId(),bindings = useValueScrubber({ value, min, max, step, disabled, orientation, keyboard: true, onValueChange });
  const low = finiteOr(min, 0), high = finiteOr(max, 100), now = Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
  return <div className={cx('cap-value-scrubber',className)} data-orientation={orientation}>
    <span className="cap-value-scrubber-label">{label}</span>
    <span className="cap-sr-only" id={`${id}-hint`}>{t("Удерживайте Alt и перемещайте указатель, чтобы изменить значение. Стрелки меняют значение на один шаг; Shift уменьшает шаг в десять раз. Home и End устанавливают границы.", "Hold Alt and move the pointer to change the value. Arrow keys change it by one step; Shift reduces the step tenfold. Home and End set the limits.")}</span>
    <div {...bindings} className="cap-value-scrubber-control" role="slider" aria-label={label} aria-describedby={`${id}-hint`} aria-orientation={orientation} aria-valuemin={Number.isFinite(low)?low:undefined} aria-valuemax={Number.isFinite(high)?high:undefined} aria-valuenow={now} aria-valuetext={formatValue ? String(formatValue(now)) : String(now)} aria-disabled={disabled||undefined} tabIndex={disabled?-1:0} data-disabled={disabled||undefined}>
      <span>{formatValue ? formatValue(now) : now}</span>
    </div>
  </div>;
}
