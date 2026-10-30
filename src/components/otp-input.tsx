import { forwardRef, useId, useLayoutEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx, type Size } from './primitives.js';
import { fieldContext } from './forms.js';

export interface OTPInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'type' | 'size' | 'maxLength' | 'minLength' | 'pattern' | 'inputMode' | 'placeholder' | 'children'> {
  /** Keep the code as a string so leading zeroes survive. */
  value: string;
  onValueChange: (value: string) => void;
  /** Positive whole-number code length; defaults to six digits. */
  length?: number;
  size?: Size;
  label?: string;
  hint?: ReactNode;
  error?: string;
}

/** One native text input owns focus, selection, autofill and form submission. */
export const OTPInput = /* @__PURE__ */ forwardRef<HTMLInputElement, OTPInputProps>(function OTPInput({
  value, onValueChange, length = 6, size = 'md', label, hint, error,
  id: suppliedId, className, style, disabled, readOnly, required,
  autoComplete = 'one-time-code', onChange, onSelect, onFocus, onBlur,
  'aria-describedby': describedBy, 'aria-invalid': invalid, ...props
}, ref) {
  const generatedId = useId(), id = suppliedId ?? generatedId;
  const count = Number.isFinite(length) ? Math.max(1, Math.min(32, Math.floor(length))) : 6;
  const normalize = (text: string) => text.replace(/[^0-9]/g, '').slice(0, count);
  const code = normalize(value), input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false), [selection, setSelection] = useState<[number, number]>([0, 0]);
  const pendingSelection = useRef<number | null>(null);
  const syncSelection = (element: HTMLInputElement) => {
    element.scrollLeft = 0;
    setSelection([element.selectionStart ?? 0, element.selectionEnd ?? 0]);
  };
  useLayoutEffect(() => {
    const element = input.current;
    if (!element || pendingSelection.current === null) return;
    const position = Math.min(pendingSelection.current, code.length);
    pendingSelection.current = null;
    element.setSelectionRange(position, position);
    syncSelection(element);
  });
  const description = [describedBy, (error || hint) && `${id}-description`].filter(Boolean).join(' ') || undefined;
  const active = Math.min(selection[0], count - 1);
  return <span {...fieldContext(props)} className={cx('cap-labeled-field', 'cap-otp-field', className)} data-size={size} data-disabled={disabled || undefined} style={style}>
    {label && <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>}
    <span className="cap-otp" data-size={size} data-focused={focused || undefined} data-disabled={disabled || undefined} data-readonly={readOnly || undefined} data-invalid={error || invalid === true || invalid === 'true' ? true : undefined} style={{ '--cap-otp-count': count } as CSSProperties}>
      <span className="cap-otp-slots" aria-hidden="true">{Array.from({ length: count }, (_, index) => <span key={index} className="cap-otp-slot" data-active={focused && !disabled && index === active || undefined} data-selected={focused && index >= selection[0] && index < selection[1] || undefined}>
        {code[index] ?? ''}{focused && !disabled && !readOnly && selection[0] === selection[1] && index === active && <span className="cap-otp-caret" data-position={selection[0] >= count ? 'after' : code[index] ? 'before' : 'empty'} />}
      </span>)}</span>
      <span className="cap-otp-input-clip"><input {...props} id={id} ref={element => { input.current = element; if (typeof ref === 'function') ref(element); else if (ref) ref.current = element; }}
        className="cap-otp-native" type="text" inputMode="numeric" autoComplete={autoComplete} autoCapitalize="none" spellCheck={false} dir="ltr"
        value={code} disabled={disabled} readOnly={readOnly} required={required} pattern={`[0-9]{${count}}`} minLength={count}
        aria-invalid={error ? true : invalid} aria-describedby={description}
        onChange={event => {
          if (disabled || readOnly) return;
          const element = event.currentTarget, raw = element.value, next = normalize(raw);
          const caret = normalize(raw.slice(0, element.selectionStart ?? raw.length)).length;
          if (raw !== next) { element.value = next; element.setSelectionRange(caret, caret); pendingSelection.current = caret; }
          syncSelection(element);
          onChange?.(event);
          onValueChange(next);
        }}
        onSelect={event => { syncSelection(event.currentTarget); onSelect?.(event); }}
        onFocus={event => { setFocused(true); syncSelection(event.currentTarget); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }} /></span>
    </span>
    {(error || hint) && <span id={`${id}-description`} className={cx('cap-field-hint', !!error && 'cap-error')} role={error ? 'alert' : undefined}>{error || hint}</span>}
  </span>;
});
