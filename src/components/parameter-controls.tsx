import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx, type Size } from './primitives.js';
import { fieldContext, fieldFocusStyle, type FocusRing } from './forms.js';
import { NumberField } from './selection.js';
import { useTranslate } from './locale.js';

export interface ParameterSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value' | 'defaultValue' | 'onChange' | 'prefix'> {
  label: string; value?: number; defaultValue?: number; min?: number; max?: number; step?: number;
  onValueChange?: (value: number) => void; onValueCommit?: (value: number) => void;
  icon?: ReactNode; /** Show a moving grip at the filled row boundary. */ showHandle?: boolean; /** Show marks at each step when there are at most 21. */ showTicks?: boolean; showValue?: boolean; suffix?: string;
  formatValue?: (value: number) => string; size?: Size; focusRing?: FocusRing;
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const safeNumber = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const compactNumber = (value: number) => String(Number(value.toFixed(6)));

/** Filled parameter row. The native range owns keyboard, form and assistive semantics. */
export function ParameterSlider({ label, value, defaultValue = 50, min = 0, max = 100, step = 1, onValueChange, onValueCommit, icon, showHandle = false, showTicks = false, showValue = true, suffix = '', formatValue, size = 'md', focusRing, className, style, id: suppliedId, disabled, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onKeyDown, onKeyUp, ...props }: ParameterSliderProps) {
  const generatedId = useId(), id = suppliedId ?? generatedId, input = useRef<HTMLInputElement>(null), handleSlot = useRef<HTMLSpanElement>(null);
  const rangeDrag = useRef<{ pointerId: number; x: number; value: number; width: number } | null>(null);
  const [internal, setInternal] = useState(defaultValue), gesture = useRef<number | null>(null), cancelled = useRef(false);
  const start = safeNumber(min, 0), end = Math.max(start, safeNumber(max, 100)), current = clamp(safeNumber(value ?? internal, start), start, end);
  const blocked = disabled || props.readOnly || start === end, rangeStep = step > 0 && Number.isFinite(step) ? step : 1;
  const pointerValue = (clientX: number) => {
    const drag = rangeDrag.current; if (!drag) return current;
    const raw = clamp(drag.value + (clientX - drag.x) / drag.width * (end - start), start, end);
    const index = clamp(Math.round((raw - start) / rangeStep), 0, Math.floor((end - start) / rangeStep + 1e-9));
    return Number((start + index * rangeStep).toFixed(10));
  };
  const update = (next: number) => { if (blocked) return; if (value === undefined) setInternal(next); onValueChange?.(next); };
  const cancel = () => { rangeDrag.current = null; if (gesture.current !== null) { const initial = gesture.current; gesture.current = null; cancelled.current = true; update(initial); } };
  useEffect(() => {
    const form = input.current?.form; if (!form) return;
    const reset = () => { if (value === undefined) setInternal(defaultValue); gesture.current = null; rangeDrag.current = null; };
    form.addEventListener('reset', reset); return () => form.removeEventListener('reset', reset);
  }, [value, defaultValue, props.form]);
  // Paint the short grip below the text instead of cutting a text-shaped hole in it.
  const display = formatValue?.(current) ?? compactNumber(current);
  const tickCount = end > start ? Math.floor((end - start) / rangeStep + 1e-9) + 1 : 0;
  const ticks = showTicks && tickCount >= 2 && tickCount <= 21 ? Array.from({length: tickCount}, (_, index) => (index * rangeStep / (end - start)) * 100) : [];
  return <div {...fieldContext(props)} className={cx('cap-parameter-slider', className)} data-size={size} data-disabled={blocked || undefined} data-with-handle={showHandle || undefined} data-handle-position={current === start ? 'start' : current === end ? 'end' : undefined} style={{ ...fieldFocusStyle(style, focusRing), '--cap-parameter-progress': `${end > start ? (current - start) / (end - start) * 100 : 0}%` } as CSSProperties}>
    <span className="cap-parameter-fill" aria-hidden="true" />
    {ticks.length > 0 && <span className="cap-parameter-ticks" aria-hidden="true">{ticks.map((position,index)=><span key={index} style={{'--cap-tick-position':`${position}%`} as CSSProperties}/>)}</span>}
    {showHandle && <span className="cap-parameter-handle-layer" aria-hidden="true"><span ref={handleSlot} className="cap-parameter-handle-slot"><span className="cap-parameter-handle" /></span></span>}
    <div className="cap-parameter-content"><label htmlFor={id}><span className="cap-parameter-label-ink">{icon && <span className="cap-parameter-icon" aria-hidden="true">{icon}</span>}<span className="cap-parameter-label-text">{label}</span></span></label>{showValue && <output htmlFor={id} aria-hidden="true"><span>{display}</span>{suffix && <span className="cap-parameter-unit">{suffix}</span>}</output>}</div>

    <input {...props} id={id} ref={input} type="range" className="cap-parameter-input" min={start} max={end} step={rangeStep} value={current} disabled={blocked} aria-valuetext={props['aria-valuetext'] ?? `${display}${suffix}`} onChange={event => { if (!cancelled.current && !rangeDrag.current) update(Number(event.currentTarget.value)); }} onPointerDown={event => {
      onPointerDown?.(event);
      if (event.defaultPrevented || blocked || event.button !== 0) return;
      cancelled.current = false; gesture.current = current;
      const slot = handleSlot.current?.getBoundingClientRect(), trackElement = handleSlot.current?.parentElement;
      const track = trackElement?.getBoundingClientRect();
      const onGrip = slot && slot.width > 0 && event.clientX >= slot.left && event.clientX <= slot.right && event.clientY >= slot.top && event.clientY <= slot.bottom;
      if (onGrip) {
        event.preventDefault();
        rangeDrag.current = { pointerId: event.pointerId, x: event.clientX, value: current, width: Math.max(1, track?.width || event.currentTarget.getBoundingClientRect().width) };
        event.currentTarget.focus({ preventScroll: true });
      }
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }} onPointerMove={event => {
      onPointerMove?.(event);
      if (event.defaultPrevented || blocked || !rangeDrag.current || rangeDrag.current.pointerId !== event.pointerId) return;
      event.preventDefault(); update(pointerValue(event.clientX));
    }} onPointerUp={event => {
      onPointerUp?.(event); cancelled.current = false;
      if (event.defaultPrevented || blocked || gesture.current === null) return;
      if (rangeDrag.current && rangeDrag.current.pointerId !== event.pointerId) return;
      const scrubbing = !!rangeDrag.current, next = scrubbing ? pointerValue(event.clientX) : Number(event.currentTarget.value);
      rangeDrag.current = null; gesture.current = null; if (scrubbing) update(next); onValueCommit?.(next);
    }} onPointerCancel={event => { onPointerCancel?.(event); cancel(); }} onLostPointerCapture={event => { onLostPointerCapture?.(event); cancel(); }} onKeyDown={event => { onKeyDown?.(event); if (event.key !== 'Escape') cancelled.current = false; if (!event.defaultPrevented && event.key === 'Escape' && gesture.current !== null) { event.preventDefault(); cancel(); } }} onKeyUp={event => { onKeyUp?.(event); if (!event.defaultPrevented && !blocked && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)) onValueCommit?.(current); }} />
  </div>;
}

export interface Slider2DValue { x: number; y: number }
export interface Slider2DAxis {
  label: string; min?: number; max?: number; step?: number; fineStep?: number;
  /** Labels at minimum and maximum. Y increases upward unless reversed. */
  startLabel?: string; endLabel?: string; reversed?: boolean; suffix?: string;
  formatValue?: (value: number) => string;
}
export interface Slider2DProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  label: string; value?: Slider2DValue; defaultValue?: Slider2DValue;
  x: Slider2DAxis; y: Slider2DAxis;
  onValueChange?: (value: Slider2DValue) => void; onValueCommit?: (value: Slider2DValue) => void;
  disabled?: boolean; showFields?: boolean; showGrid?: boolean; size?: Size; focusRing?: FocusRing;
}
function axisRange(axis: Slider2DAxis) {
  const min = safeNumber(axis.min ?? 0, 0), max = Math.max(min, safeNumber(axis.max ?? 1, 1));
  const step = axis.step && Number.isFinite(axis.step) && axis.step > 0 ? axis.step : (max - min) / 100 || .01;
  return { min, max, step, fineStep: axis.fineStep && axis.fineStep > 0 ? axis.fineStep : step / 10 };
}
function snap(value: number, range: ReturnType<typeof axisRange>, fine = false) {
  const step = fine ? range.fineStep : range.step;
  return Number(clamp(range.min + Math.round((value - range.min) / step) * step, range.min, range.max).toFixed(10));
}

/** Two independent numeric axes with a shared direct-manipulation pad. */
export function Slider2D({ label, value, defaultValue = { x: .5, y: .5 }, x, y, onValueChange, onValueCommit, disabled = false, showFields = false, showGrid = true, size = 'md', focusRing, className, style, ...props }: Slider2DProps) {
  const t = useTranslate(), id = useId(), xr = axisRange(x), yr = axisRange(y);
  const [internal, setInternal] = useState(defaultValue), drag = useRef<{ id: number; initial: Slider2DValue; rect: DOMRect; element: HTMLDivElement } | null>(null);
  const frame = useRef<number | null>(null), pending = useRef<Slider2DValue | null>(null), latest = useRef(value ?? internal);
  const current = { x: clamp(safeNumber((value ?? internal).x, xr.min), xr.min, xr.max), y: clamp(safeNumber((value ?? internal).y, yr.min), yr.min, yr.max) };
  latest.current = current;
  const updateRef = useRef((next: Slider2DValue) => {});
  const update = (next: Slider2DValue) => { if (disabled) return; latest.current = next; if (value === undefined) setInternal(next); onValueChange?.(next); };
  updateRef.current = update;
  const stopFrame = () => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  useEffect(() => () => { stopFrame(); }, []);
  const queue = (next: Slider2DValue) => { pending.current = next; if (frame.current === null) frame.current = requestAnimationFrame(() => { frame.current = null; const next = pending.current; pending.current = null; if (next) updateRef.current(next); }); };
  const finish = (cancel: boolean) => {
    const gesture = drag.current; if (!gesture) return;
    stopFrame(); drag.current = null;
    const next = cancel ? gesture.initial : pending.current ?? latest.current; pending.current = null;
    updateRef.current(next); if (!cancel) onValueCommit?.(next);
    if (gesture.element.hasPointerCapture?.(gesture.id)) gesture.element.releasePointerCapture(gesture.id);
  };
  useEffect(() => { if (disabled) { stopFrame(); pending.current = null; drag.current = null; } }, [disabled]);
  const position = (clientX: number, clientY: number, rect: DOMRect, fine: boolean) => {
    const px = clamp((clientX - rect.left - 24) / Math.max(1, rect.width - 48), 0, 1), py = clamp((clientY - rect.top - 24) / Math.max(1, rect.height - 48), 0, 1);
    return { x: snap(xr.min + (x.reversed ? 1 - px : px) * (xr.max - xr.min), xr, fine), y: snap(yr.min + (y.reversed ? py : 1 - py) * (yr.max - yr.min), yr, fine) };
  };
  const xp = xr.max > xr.min ? (current.x - xr.min) / (xr.max - xr.min) : .5, yp = yr.max > yr.min ? (current.y - yr.min) / (yr.max - yr.min) : .5;
  const description = `${x.label}: ${x.formatValue?.(current.x) ?? compactNumber(current.x)}${x.suffix ?? ''}; ${y.label}: ${y.formatValue?.(current.y) ?? compactNumber(current.y)}${y.suffix ?? ''}`;
  return <div {...props} className={cx('cap-slider-2d', className)} data-size={size} data-disabled={disabled || undefined} style={fieldFocusStyle(style, focusRing)}>
    <div className="cap-slider-2d-pad" role="group" tabIndex={disabled ? -1 : 0} aria-label={`${label}. ${description}`} aria-describedby={`${id}-help`} aria-disabled={disabled || undefined} data-grid={showGrid || undefined} onPointerDown={event => { if (disabled || event.button !== 0 || drag.current) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); drag.current = { id: event.pointerId, initial: current, rect: event.currentTarget.getBoundingClientRect(), element: event.currentTarget }; event.currentTarget.setPointerCapture?.(event.pointerId); update(position(event.clientX, event.clientY, drag.current.rect, event.shiftKey)); }} onPointerMove={event => { if (drag.current?.id === event.pointerId) queue(position(event.clientX, event.clientY, drag.current.rect, event.shiftKey)); }} onPointerUp={event => { if (drag.current?.id === event.pointerId) { pending.current = position(event.clientX, event.clientY, drag.current.rect, event.shiftKey); finish(false); } }} onPointerCancel={event => { if (drag.current?.id === event.pointerId) finish(true); }} onLostPointerCapture={() => finish(true)} onKeyDown={event => {
      if (disabled || event.target !== event.currentTarget) return;
      if (event.key === 'Escape' && drag.current) { event.preventDefault(); finish(true); return; }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault(); if (drag.current) finish(true);
      const next = { ...current }, xs = event.shiftKey ? xr.fineStep : xr.step, ys = event.shiftKey ? yr.fineStep : yr.step;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next.x = snap(current.x + (event.key === 'ArrowRight' ? 1 : -1) * (x.reversed ? -1 : 1) * xs, xr, event.shiftKey);
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') next.y = snap(current.y + (event.key === 'ArrowUp' ? 1 : -1) * (y.reversed ? -1 : 1) * ys, yr, event.shiftKey);
      if (event.key === 'Home' || event.key === 'End') { next.x = event.key === 'Home' ? xr.min : xr.max; next.y = event.key === 'Home' ? yr.min : yr.max; }
      update(next); onValueCommit?.(next);
    }}>
      <span className="cap-slider-2d-top" aria-hidden="true">{y.reversed ? y.startLabel : y.endLabel}</span><span className="cap-slider-2d-left" aria-hidden="true">{x.reversed ? x.endLabel : x.startLabel}</span><span className="cap-slider-2d-right" aria-hidden="true">{x.reversed ? x.startLabel : x.endLabel}</span><span className="cap-slider-2d-bottom" aria-hidden="true">{y.reversed ? y.endLabel : y.startLabel}</span>
      <span className="cap-slider-2d-point" aria-hidden="true" style={{ '--cap-pad-x': x.reversed ? 1 - xp : xp, '--cap-pad-y': y.reversed ? yp : 1 - yp } as CSSProperties} />
      {!showFields && (['x','y'] as const).map(axis => { const config = axis === 'x' ? x : y, range = axis === 'x' ? xr : yr; return <input key={axis} className="cap-sr-only" type="range" aria-label={config.label} aria-valuetext={`${config.formatValue?.(current[axis]) ?? compactNumber(current[axis])}${config.suffix ?? ''}`} min={range.min} max={range.max} step={range.step} value={current[axis]} disabled={disabled} onChange={event => { const next = { ...current, [axis]: Number(event.currentTarget.value) }; update(next); onValueCommit?.(next); }} />; })}
    </div>
    <span className="cap-sr-only" id={`${id}-help`}>{t('Стрелки меняют обе оси. Shift уменьшает шаг. Home и End задают границы. Escape отменяет перетаскивание.', 'Arrow keys adjust both axes. Shift uses a finer step. Home and End set the limits. Escape cancels dragging.')}</span>
    {showFields && <div className="cap-slider-2d-fields">{(['x','y'] as const).map(axis => { const config = axis === 'x' ? x : y, range = axis === 'x' ? xr : yr; return <NumberField key={axis} label={config.label} value={current[axis]} min={range.min} max={range.max} step={range.step} suffix={config.suffix} size={size} compact disabled={disabled} onValueChange={number => { const next = { ...current, [axis]: number }; update(next); onValueCommit?.(next); }} />; })}</div>}
  </div>;
}
