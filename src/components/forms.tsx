import { Children, isValidElement, forwardRef, useEffect, useLayoutEffect, useId, useRef, useState, type OptionHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, type HTMLAttributes } from 'react';
import { cx, Icon, type Size } from './primitives.js';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlays.js';
export const Input = /* @__PURE__ */ forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: Size }>(function Input({ size = 'md', className, ...props }, ref) {
  return <input ref={ref} data-size={size} className={cx('cap-input', className)} {...props} />;
});
export const Textarea = /* @__PURE__ */ forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) { return <textarea ref={ref} className={cx('cap-input', 'cap-textarea', className)} {...props} />; });
export interface SelectOption { value: string; label: string; disabled?: boolean; group?: string }
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'multiple' | 'value' | 'defaultValue'> { size?: Size; value?: string | number; defaultValue?: string | number; options?: SelectOption[]; onValueChange?: (value: string) => void; placeholder?: string }
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
export const Select = /* @__PURE__ */ forwardRef<HTMLSelectElement, SelectProps>(function Select({ size = 'md', className, children, options: suppliedOptions, onValueChange, value, defaultValue, onChange, id: suppliedId, disabled, required, autoFocus, placeholder, ...props }, ref) {
  const options = suppliedOptions ?? readOptions(children), generatedId = useId(), id = suppliedId ?? generatedId;
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
    close();
  };
  const current = options.find(option => option.value === selected);
  return <span className="cap-select-root"><select {...props} ref={element => { native.current = element; if (typeof ref === 'function') ref(element); else if (ref) ref.current = element; }} id={`${id}-native`} className="cap-select-native" tabIndex={-1} aria-hidden="true" value={value} defaultValue={defaultValue} disabled={disabled} required={required} onInvalid={event => { event.preventDefault(); trigger.current?.focus(); props.onInvalid?.(event); }} onChange={event => { if (value === undefined) setInternal(event.target.value); onChange?.(event); onValueChange?.(event.target.value); }}>{suppliedOptions ? options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>) : children}</select><button ref={trigger} id={id} type="button" role="combobox" className={cx('cap-input', 'cap-select-trigger', className)} data-size={size} disabled={disabled} autoFocus={autoFocus} tabIndex={props.tabIndex} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? `${id}-listbox` : undefined} aria-activedescendant={open && options[active] ? `${id}-option-${active}` : undefined} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} aria-invalid={props['aria-invalid']} aria-required={required || undefined} title={props.title} style={props.style} onClick={() => open ? close() : show()} onBlur={event => { if (!panel.current?.contains(event.relatedTarget)) close(false); native.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: event.relatedTarget })); }} onFocus={event => { native.current?.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: event.relatedTarget })); }} onKeyDown={event => {
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
  }}><span data-placeholder={!current || !selected || undefined}>{current?.label ?? placeholder ?? 'Выберите…'}</span><Icon name="down" size={14} /></button>{present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} id={`${id}-listbox`} role="listbox" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={props['aria-label'] ?? (typeof document !== 'undefined' ? trigger.current?.labels?.[0]?.textContent ?? 'Варианты' : 'Варианты')} aria-labelledby={props['aria-labelledby']} className="cap-select-popup" style={position} {...scope}>{options.map((option, index) => <div key={`${option.value}-${index}`} role="none">{option.group && option.group !== options[index - 1]?.group && <div className="cap-select-group" aria-hidden="true">{option.group}</div>}<div id={`${id}-option-${index}`} role="option" aria-selected={option.value === selected} aria-disabled={option.disabled || undefined} data-active={active === index || undefined} className="cap-select-option" onPointerMove={() => { if (!option.disabled) setActive(index); }} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}><span>{option.label}</span>{option.value === selected && <Icon name="check" size={14} />}</div></div>)}</div></OverlayPortal>}</span>;
});
export function Field({ label, hint, error, required, children, className }: { label: string; hint?: string; error?: string; required?: boolean; className?: string; children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true; required?: boolean }) => ReactNode }) {
  const id = useId(), description = error || hint;
  return <div className={cx('cap-field', className)}><label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{children({ id, 'aria-describedby': description ? `${id}-hint` : undefined, 'aria-invalid': error ? true : undefined, required })}{description && <span id={`${id}-hint`} className={cx('cap-field-hint', error && 'cap-error')} role={error ? 'alert' : undefined}>{description}</span>}</div>;
}
export function Checkbox({ label, indeterminate, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return <label className={cx('cap-check-label', className)}><input ref={ref} type="checkbox" className="cap-checkbox" {...props} /><span>{label}</span></label>;
}
export function Radio({ label, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return <label className={cx('cap-check-label', className)}><input type="radio" className="cap-radio" {...props} /><span>{label}</span></label>;
}
export function Switch({ label, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return <label className={cx('cap-switch-label', className)}><input type="checkbox" role="switch" className="cap-switch" {...props} /><span>{label}</span></label>;
}
export function Slider({ label, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }) {
  const id = useId(); return <div className={cx('cap-field', className)}><label htmlFor={id}>{label}</label><input id={id} type="range" className="cap-slider" {...props} /></div>;
}
export interface Choice { value: string; label: string; disabled?: boolean; icon?: ReactNode }
export function SegmentedControl({ options, value, onValueChange, label, className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> & { options: Choice[]; value: string; onValueChange: (value: string) => void; label: string }) {
  const name = useId();
  return <div className={cx('cap-segmented', className)} role="radiogroup" aria-label={label} {...props}>{options.map(option => <label className="cap-segment" key={option.value}><input type="radio" name={name} value={option.value} checked={value === option.value} disabled={option.disabled} onChange={() => onValueChange(option.value)} /><span>{option.icon}{option.label}</span></label>)}</div>;
}
