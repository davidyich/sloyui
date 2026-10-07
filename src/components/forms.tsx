import { MovingHighlight } from './moving-highlight.js';
import { Children, isValidElement, forwardRef, useEffect, useLayoutEffect, useId, useRef, useState, type OptionHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, type HTMLAttributes, type CSSProperties, type ChangeEvent } from 'react';
import { cx, Icon, IconButton, type Size, type Color } from './primitives.js';
import { useValueScrubber, type ScrubOrientation } from './value-scrubber.js';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlays.js';
export interface FieldLabelProps {
  label?: string;
  variant?: 'surface' | 'ghost';
  labelPlacement?: 'outside' | 'inside';
  hint?: ReactNode;
  error?: string;
}
export interface FocusRing { width?: number; offset?: number }
export function fieldFocusStyle(style?: CSSProperties, focusRing?: FocusRing): CSSProperties {
  return { ...style, ...(focusRing?.width !== undefined ? { '--cap-field-focus-width': `${focusRing.width}px` } : {}), ...(focusRing?.offset !== undefined ? { '--cap-field-focus-offset': `${focusRing.offset}px` } : {}) } as CSSProperties;
}
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, FieldLabelProps {
  size?: Size; leading?: ReactNode; trailing?: ReactNode; focusRing?: FocusRing;
}
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldLabelProps { size?: Size; focusRing?: FocusRing }
const fieldContextAxes = ['data-theme','data-accent','data-color','data-surface','data-borders','data-radius','data-shadow'] as const;
type FieldContext = Partial<Record<typeof fieldContextAxes[number], string>>;
/** Labels and sibling affordances share a context supplied directly to a field. */
export function fieldContext(props: object): FieldContext {
  const attributes = props as Record<string, unknown>;
  return Object.fromEntries(fieldContextAxes.filter(axis => typeof attributes[axis] === 'string').map(axis => [axis, attributes[axis]]));
}
function ControlField({ id, label, labelPlacement = 'outside', hint, error, required, disabled, size = 'md', leading, trailing, children, context }: FieldLabelProps & { id: string; required?: boolean; disabled?: boolean; size?: Size; leading?: ReactNode; trailing?: ReactNode; children: ReactNode; context?: FieldContext }) {
  if (!label && !hint && !error && !leading && !trailing) return children;
  const caption = label && <label id={`${id}-label`} htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>;
  return <span {...context} className="cap-labeled-field" data-label-placement={label ? labelPlacement : undefined} data-size={size} data-disabled={disabled || undefined}>
    {labelPlacement === 'outside' && caption}
    <span className="cap-labeled-control" data-leading={!!leading || undefined} data-trailing={!!trailing || undefined}>
      {leading && <span className="cap-field-leading" aria-hidden="true">{leading}</span>}
      {children}{labelPlacement === 'inside' && caption}
      {trailing && <span className="cap-field-trailing">{trailing}</span>}
    </span>
    {(error || hint) && <span id={`${id}-description`} className={cx('cap-field-hint', !!error && 'cap-error')} role={error ? 'alert' : undefined}>{error || hint}</span>}
  </span>;
}
function descriptionIds(id: string, describedBy: string | undefined, hint: ReactNode, error?: string) {
  return [describedBy, (error || hint) && `${id}-description`].filter(Boolean).join(' ') || undefined;
}
export const Input = /* @__PURE__ */ forwardRef<HTMLInputElement, InputProps>(function Input({ size = 'md', variant = 'surface', label, labelPlacement, hint, error, leading, trailing, focusRing, id: suppliedId, className, type = 'text', value, defaultValue, onChange, onResetCapture, style, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) {
  const generatedId = useId(), id = suppliedId ?? generatedId;
  const input = useRef<HTMLInputElement>(null), [searchInternal, setSearchInternal] = useState(String(defaultValue ?? ''));
  const searchText = String(value ?? searchInternal), showSearchClear = type === 'search' && searchText.length > 0;
  useEffect(() => {
    if (type !== 'search' || value !== undefined) return;
    const form = input.current?.form; if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => { timer = setTimeout(() => { const resetValue = String(defaultValue ?? ''); setSearchInternal(resetValue); if (input.current) input.current.value = resetValue; }, 0); };
    form.addEventListener('reset', reset); return () => { form.removeEventListener('reset', reset); clearTimeout(timer); };
  }, [type, value, defaultValue]);
  const trailingContent = showSearchClear ? <span className="cap-field-trailing-actions">{trailing}<IconButton className="cap-field-clear" size="xs" variant="ghost" icon="close" label="Очистить поиск" disabled={props.disabled || props.readOnly} onMouseDown={event => event.preventDefault()} onClick={() => {
    const element = input.current; if (!element || props.disabled || props.readOnly) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, ''); element.dispatchEvent(new Event('input', { bubbles: true })); element.focus();
  }} /></span> : type === 'search' ? trailing ?? <span className="cap-field-trailing-spacer" aria-hidden="true" /> : trailing;
  const change = (event: ChangeEvent<HTMLInputElement>) => { if (type === 'search' && value === undefined) setSearchInternal(event.currentTarget.value); onChange?.(event); };
  return <ControlField context={fieldContext(props)} {...{id,label,labelPlacement,hint,error,size,leading,trailing:trailingContent}} required={props.required} disabled={props.disabled}><input {...props} ref={element => { input.current = element; if (typeof ref === 'function') ref(element); else if (ref) ref.current = element; }} id={id} type={type} value={type === 'search' && value === undefined ? undefined : type === 'search' ? searchText : value} defaultValue={type === 'search' && value === undefined ? defaultValue : value === undefined ? defaultValue : undefined} onChange={change} onResetCapture={event => { onResetCapture?.(event); }} style={fieldFocusStyle(style, focusRing)} data-variant={variant} data-size={size} aria-describedby={descriptionIds(id,describedBy,hint,error)} aria-invalid={error ? true : invalid} className={cx('cap-input', className)} /></ControlField>;
});
export const Textarea = /* @__PURE__ */ forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ size = 'md', variant = 'surface', label, labelPlacement, hint, error, focusRing, id: suppliedId, className, style, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) {
  const generatedId = useId(), id = suppliedId ?? generatedId;
  return <ControlField context={fieldContext(props)} {...{id,label,labelPlacement,hint,error,size}} required={props.required} disabled={props.disabled}><textarea {...props} ref={ref} id={id} style={fieldFocusStyle(style, focusRing)} data-variant={variant} data-size={size} aria-describedby={descriptionIds(id,describedBy,hint,error)} aria-invalid={error ? true : invalid} className={cx('cap-input','cap-textarea',className)} /></ControlField>;
});
export interface SelectOption { value: string; label: string; disabled?: boolean; group?: string }
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'multiple' | 'value' | 'defaultValue'>, FieldLabelProps { size?: Size; value?: string | number; defaultValue?: string | number; options?: SelectOption[]; onValueChange?: (value: string) => void; placeholder?: string; popupClassName?: string; scrubbable?: boolean; scrubOrientation?: ScrubOrientation; focusRing?: FocusRing }
function optionText(node: ReactNode): string { return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : String(child)).join(''); }
function readOptions(children: ReactNode, group?: string, disabledGroup = false): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement> & { children?: ReactNode; label?: string }>(child)) return;
    if (child.type === 'option') options.push({ value: String(child.props.value ?? optionText(child.props.children)), label: child.props.label ?? optionText(child.props.children), disabled: disabledGroup || child.props.disabled, group });
    else options.push(...readOptions(child.props.children, child.type === 'optgroup' ? child.props.label : group, disabledGroup || !!child.props.disabled));
  });
  return options;
}
/** Custom single-select UI; the hidden select preserves native forms, refs and change events. */
export const Select = /* @__PURE__ */ forwardRef<HTMLSelectElement, SelectProps>(function Select({ size = 'md', variant = 'surface', className, popupClassName, children, options: suppliedOptions, onValueChange, value, defaultValue, onChange, id: suppliedId, disabled, required, autoFocus, placeholder, label, labelPlacement, hint, error, scrubbable = false, scrubOrientation = 'vertical', focusRing, ...props }, ref) {
  const options = suppliedOptions ?? readOptions(children), generatedId = useId(), id = suppliedId ?? generatedId;
  const [pointerFocus, setPointerFocus] = useState(false);
  const native = useRef<HTMLSelectElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState(String(defaultValue ?? options.find(option => !option.disabled)?.value ?? '')), selected = String(value ?? internal);
  const [open, setOpen] = useState(false), [active, setActive] = useState(0), search = useRef(''), searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scope = useOverlayScope(trigger), position = useAnchoredOverlay(open, trigger, panel, { matchWidth: true }), present = useOverlayPresence(open);
  const close = (restore = true) => { setOpen(false); if (restore) trigger.current?.focus(); };
  useOverlayDismiss(open, panel, trigger, close);
  useEffect(() => { if (open) panel.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [active, open]);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const optionSignature = JSON.stringify(options.map(option => [option.value, option.disabled]));
  useLayoutEffect(() => { if (value === undefined && native.current) setInternal(native.current.value); }, [value, optionSignature]);
  useEffect(() => {
    const form = native.current?.form; if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => { timer = setTimeout(() => { if (native.current) { if (value === undefined) setInternal(native.current.value); else native.current.value = String(value); } setOpen(false); }, 0); };
    form.addEventListener('reset', reset); return () => { clearTimeout(timer); form.removeEventListener('reset', reset); };
  }, [value, props.form]);
  const show = () => { const current = options.findIndex(option => option.value === selected && !option.disabled); setActive(current >= 0 ? current : options.findIndex(option => !option.disabled)); setOpen(true); };
  const choose = (option: SelectOption | undefined) => {
    if (!option || option.disabled || !native.current) return;
    native.current.value = option.value;
    native.current.dispatchEvent(new Event('change', { bubbles: true }));
    close(false);
  };
  const scrubOptions = options.filter(option => !option.disabled), currentScrubIndex = Math.max(0, scrubOptions.findIndex(option => option.value === selected));
  const scrubber = useValueScrubber({ value: currentScrubIndex, min: 0, max: Math.max(0, scrubOptions.length - 1), step: 1, orientation: scrubOrientation, disabled: !scrubbable || disabled || scrubOptions.length < 2, keyboard: true, altKeyRequired: true, onValueChange: index => {
    const option = scrubOptions[Math.round(index)]; if (!option || !native.current) return;
    native.current.value = option.value; native.current.dispatchEvent(new Event('change', { bubbles: true }));
  } });
  const current = options.find(option => option.value === selected);
  return <ControlField context={fieldContext(props)} {...{id,label,labelPlacement,hint,error,size,disabled,required}}><span {...fieldContext(props)} className="cap-select-root"><select {...props} ref={element => { native.current = element; if (typeof ref === 'function') ref(element); else if (ref) ref.current = element; }} id={`${id}-native`} className="cap-select-native" tabIndex={-1} aria-hidden="true" value={value} defaultValue={defaultValue} disabled={disabled} required={required} onInvalid={event => { event.preventDefault(); trigger.current?.focus(); props.onInvalid?.(event); }} onChange={event => { if (value === undefined) setInternal(event.target.value); onChange?.(event); onValueChange?.(event.target.value); }}>{suppliedOptions ? options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>) : children}</select><button {...scrubber} onPointerDown={event => { setPointerFocus(true); scrubber.onPointerDown?.(event); }} data-pointer-focus={pointerFocus || undefined} ref={trigger} id={id} type="button" role="combobox" className={cx('cap-input', 'cap-select-trigger', className)} data-variant={variant} data-size={size} data-scrubbable={scrubbable && !disabled && scrubOptions.length > 1 || undefined} data-scrub-orientation={scrubOrientation} disabled={disabled} autoFocus={autoFocus} tabIndex={props.tabIndex} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? `${id}-listbox` : undefined} aria-activedescendant={open && options[active] ? `${id}-option-${active}` : undefined} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby'] ?? (label ? `${id}-label` : undefined)} aria-describedby={descriptionIds(id,props['aria-describedby'],hint,error)} aria-invalid={error ? true : props['aria-invalid']} aria-required={required || undefined} title={props.title} onClick={() => open ? close() : show()} onBlur={event => { setPointerFocus(false); if (!panel.current?.contains(event.relatedTarget)) close(false); native.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: event.relatedTarget })); }} onFocus={event => { native.current?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: event.relatedTarget })); }} onKeyDown={event => {
    setPointerFocus(false); scrubber.onKeyDown(event); if (event.defaultPrevented) return;
    if (event.key === 'Tab') { close(false); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (open) choose(options[active]); else show(); return; }
    const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { show(); if (event.key === 'Home') setActive(enabled[0] ?? 0); else if (event.key === 'End') setActive(enabled.at(-1) ?? 0); return; }
      const index = enabled.indexOf(active), step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(event.key === 'Home' ? enabled[0] ?? 0 : event.key === 'End' ? enabled.at(-1) ?? 0 : enabled[(index + step + enabled.length) % enabled.length] ?? 0);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); clearTimeout(searchTimer.current); search.current += event.key.toLocaleLowerCase();
      const term = [...search.current].every(char => char === search.current[0]) ? search.current[0] : search.current;
      const ordered = [...enabled.filter(index => index > active), ...enabled.filter(index => index <= active)], match = ordered.find(index => options[index].label.toLocaleLowerCase().startsWith(term));
      if (!open) show(); if (match !== undefined) setActive(match);
      searchTimer.current = setTimeout(() => { search.current = ''; }, 600);
    }
  }} style={fieldFocusStyle(props.style, focusRing)}><span data-placeholder={!current || !selected || undefined}>{current?.label ?? placeholder ?? 'Выберите…'}</span><Icon name="down" size={14} /></button>{present && <OverlayPortal anchor={trigger} panel={panel}><div role="region" aria-label={`Варианты: ${label ?? props['aria-label'] ?? 'выбор'}`} aria-hidden={!open || undefined} inert={!open}><div ref={panel} id={`${id}-listbox`} role="listbox" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={props['aria-label'] ?? (typeof document !== 'undefined' ? trigger.current?.labels?.[0]?.textContent ?? 'Варианты' : 'Варианты')} aria-labelledby={props['aria-labelledby'] ?? (label ? `${id}-label` : undefined)} className={cx('cap-select-popup','cap-shared-hover',popupClassName)} style={position} {...scope}><MovingHighlight root={panel} hover target=".cap-select-option:not([aria-disabled=true])"/>{options.map((option, index) => <div key={`${option.value}-${index}`} role="none">{option.group && option.group !== options[index - 1]?.group && <div className="cap-select-group" aria-hidden="true">{option.group}</div>}<div id={`${id}-option-${index}`} role="option" aria-selected={option.value === selected} aria-disabled={option.disabled || undefined} data-active={active === index || undefined} className="cap-select-option" onPointerMove={() => { if (!option.disabled) setActive(index); }} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}><span>{option.label}</span>{option.value === selected && <Icon name="check" size={14} />}</div></div>)}</div></div></OverlayPortal>}</span></ControlField>;
});
export function Field({ label, hint, error, required, children, className }: { label: string; hint?: string; error?: string; required?: boolean; className?: string; children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true; required?: boolean }) => ReactNode }) {
  const id = useId(), description = error || hint;
  return <div className={cx('cap-field', className)}><label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{children({ id, 'aria-describedby': description ? `${id}-hint` : undefined, 'aria-invalid': error ? true : undefined, required })}{description && <span id={`${id}-hint`} className={cx('cap-field-hint', error && 'cap-error')} role={error ? 'alert' : undefined}>{description}</span>}</div>;
}
export function Checkbox({ label, indeterminate, size = 'md', contrast = true, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & { contrast?: boolean; label: ReactNode; indeterminate?: boolean; size?: Size }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return <label {...fieldContext(props)} className={cx('cap-check-label', className)} data-size={size} data-contrast={contrast}><input ref={ref} data-size={size} type="checkbox" className="cap-checkbox" {...props} /><span>{label}</span></label>;
}
export function Radio({ label, size = 'md', contrast = true, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & { contrast?: boolean; label: ReactNode; size?: Size }) {
  return <label {...fieldContext(props)} className={cx('cap-check-label', className)} data-size={size} data-contrast={contrast}><input type="radio" data-size={size} className="cap-radio" {...props} /><span>{label}</span></label>;
}
export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'color'> { label: ReactNode; size?: Size; color?: Color; variant?: 'accent' | 'neutral'; contrast?: boolean }
export function Switch({ label, size = 'md', color, variant = 'accent', contrast = true, className, ...props }: SwitchProps) {
  const context = fieldContext(props);
  return <label {...context} className={cx('cap-switch-label', className)} data-size={size} data-color={color ?? context['data-color']} data-accent={color ? undefined : context['data-accent']} data-variant={variant} data-contrast={contrast}><input type="checkbox" role="switch" className="cap-switch" {...props} /><span>{label}</span></label>;
}
export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string;
  size?: Size;
  showValue?: boolean;
  contrast?: boolean;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  formatValue?: (value: number) => string;
  focusRing?: FocusRing;
}
/** Native range semantics with a consistent visual rail and a separate focusable hit area. */
export function Slider({ label, size = 'md', contrast = false, showValue = true, className, value, defaultValue = 50, min = 0, max = 100, onChange, onValueChange, onValueCommit, formatValue, focusRing, style, id: suppliedId, onPointerUp, onKeyUp, ...props }: SliderProps) {
  const generatedId = useId(), id = suppliedId ?? generatedId, input = useRef<HTMLInputElement>(null);
  const [internal, setInternal] = useState(Number(defaultValue));
  const start = Number.isFinite(Number(min)) ? Number(min) : 0, end = Math.max(start, Number.isFinite(Number(max)) ? Number(max) : 100);
  const raw = Number(value ?? internal), current = Math.min(end, Math.max(start, Number.isFinite(raw) ? raw : start));
  useLayoutEffect(() => { if (value === undefined && input.current) setInternal(Number(input.current.value)); }, [min, max, props.step, defaultValue, value]);
  const progress = end > start ? (current - start) / (end - start) * 100 : 0;
  useEffect(() => {
    const form = input.current?.form; if (!form) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => { timer = setTimeout(() => { if (value === undefined) setInternal(Number(input.current?.value ?? defaultValue)); }, 0); };
    form.addEventListener('reset', reset); return () => { form.removeEventListener('reset', reset); clearTimeout(timer); };
  }, [defaultValue, value, props.form]);
  const visualStyle = { ...fieldFocusStyle(style, focusRing), '--cap-slider-progress': `${progress}%` } as CSSProperties;
  const commit = () => { if (!props.disabled && input.current) onValueCommit?.(Number(input.current.value)); };
  return <div {...fieldContext(props)} className={cx('cap-field', 'cap-slider-field', className)} data-size={size} data-contrast={contrast} data-disabled={props.disabled || undefined} style={visualStyle}>
    <div className="cap-slider-heading"><label htmlFor={id}>{label}</label>{showValue && <output htmlFor={id} aria-hidden="true">{formatValue?.(current) ?? current}</output>}</div>
    <div className="cap-slider-control"><span className="cap-slider-rail" aria-hidden="true"><span className="cap-slider-fill" /><span className="cap-slider-thumb" /></span><input {...props} ref={input} id={id} type="range" data-size={size} className="cap-slider" min={start} max={end} value={value === undefined ? undefined : current} defaultValue={value === undefined ? defaultValue : undefined} aria-valuetext={props['aria-valuetext'] ?? formatValue?.(current)} style={visualStyle} onChange={event => { if (props.disabled) return; const next = Number(event.currentTarget.value); if (value === undefined) setInternal(next); onChange?.(event); onValueChange?.(next); }} onPointerUp={event => { onPointerUp?.(event); if (!event.defaultPrevented) commit(); }} onKeyUp={event => { onKeyUp?.(event); if (!event.defaultPrevented && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)) commit(); }} /></div>
  </div>;
}

export interface Choice { value: string; label: string; disabled?: boolean; icon?: ReactNode }
export interface SegmentedControlProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> { options: Choice[]; value: string; onValueChange: (value: string) => void; label: string; size?: Size; variant?: 'surface' | 'outline' | 'accent' | 'ghost'; fullWidth?: boolean }
export function SegmentedControl({ options, value, onValueChange, label, className, size = 'md', variant = 'surface', fullWidth = false, ...props }: SegmentedControlProps) {
  const name = useId(), root = useRef<HTMLDivElement>(null), [mounted,setMounted] = useState(false);
  const attach = useRef((node: HTMLDivElement | null) => { root.current = node; if (node) setMounted(true); });
  return <div ref={attach.current} data-size={size} data-variant={variant} data-full-width={fullWidth||undefined} className={cx('cap-segmented', className)} role="radiogroup" aria-label={label} {...props}><MovingHighlight revision={`${value}:${mounted}`} root={root} selected=".cap-segment:has(input:checked)"/>{options.map(option => <label className="cap-segment" key={option.value}><input type="radio" name={name} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onValueChange(option.value)} /><span>{option.icon}{option.label}</span></label>)}</div>;
}
