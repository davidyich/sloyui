import { DisclosureChevron } from './disclosure-chevron.js';
import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Button, Icon, cx, type IconSource, type Size } from './primitives.js';
import { Input, fieldFocusStyle, type FocusRing, type SelectOption } from './forms.js';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlays.js';
import { MovingHighlight } from './moving-highlight.js';
import { useTranslate } from './locale.js';

export interface PopupSelectOption extends SelectOption {
  icon?: IconSource;
  /** Decorative leading content, such as a color swatch. */
  leading?: ReactNode;
  aliases?: readonly string[];
  description?: string;
}
export interface PopupSelectProps {
  options: readonly PopupSelectOption[];
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional visible label above the trigger; label always names the control. */
  showLabel?: boolean;
  /** Replace the selected text with custom compact content. */
  triggerContent?: ReactNode | ((option: PopupSelectOption | undefined) => ReactNode);
  placeholder?: string;
  /** Enable filtering for longer choice lists. Off by default. */
  searchable?: boolean;
  /** Inline search shares the list surface; separate search uses a framed header field. */
  searchPlacement?: 'inline' | 'separate';
  searchPlaceholder?: string;
  emptyMessage?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  size?: Size;
  variant?: 'surface' | 'ghost';
  /** Independent popup width in pixels, constrained to the viewport. */
  popupWidth?: number;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  hint?: ReactNode;
  error?: string;
  focusRing?: FocusRing;
  className?: string;
  popupClassName?: string;
}
const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Button trigger with an optionally searchable choice list inside its floating popup. */
export const PopupSelect = /* @__PURE__ */ forwardRef<HTMLButtonElement, PopupSelectProps>(function PopupSelect({
  options, label, value, defaultValue = '', onValueChange, open: controlledOpen, defaultOpen = false, onOpenChange,
  showLabel = false, triggerContent, placeholder, searchable = false, searchPlacement = 'inline', searchPlaceholder, emptyMessage, name, required, disabled = false,
  size = 'md', variant = 'surface', popupWidth = 320, side = 'bottom', align = 'start', hint, error, focusRing, className, popupClassName,
}, ref) {
  const t = useTranslate(), id = useId();
  const [innerValue, setInnerValue] = useState(defaultValue), [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [query, setQuery] = useState(''), [active, setActive] = useState(-1), [revealVersion, setRevealVersion] = useState(0);
  const selected = value ?? innerValue, open = !disabled && (controlledOpen ?? innerOpen);
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null), native = useRef<HTMLSelectElement>(null);
  const typeahead = useRef(''), typeaheadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(typeaheadTimer.current), []);
  const reveal = useRef(false), opened = useRef(false), currentValue = useRef(value); currentValue.current = value;
  useImperativeHandle(ref, () => trigger.current!);
  const chosen = options.find(option => option.value === selected);
  const matches = useMemo(() => options.filter(option => normalize(`${option.label} ${option.value} ${option.description ?? ''} ${(option.aliases ?? []).join(' ')}`).includes(normalize(searchable ? query.trim() : ''))), [options, query, searchable]);
  const enabled = matches.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const present = useOverlayPresence(open), scope = useOverlayScope(trigger, open);
  const position = useAnchoredOverlay(open, trigger, panel, { side, align });
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setInnerOpen(next); onOpenChange?.(next); };
  const close = (restore = false) => { if (open) setOpen(false); setQuery(''); typeahead.current = ''; clearTimeout(typeaheadTimer.current); if (restore) trigger.current?.focus({ preventScroll: true }); };
  useOverlayDismiss(open, panel, trigger, close);
  useEffect(() => { if (disabled) { setInnerOpen(false); setQuery(''); } }, [disabled]);
  useLayoutEffect(() => {
    if (!open) { opened.current = false; return; }
    if (opened.current) return;
    opened.current = true; setQuery('');
    const index = options.findIndex(option => option.value === selected && !option.disabled);
    setActive(index >= 0 ? index : options.findIndex(option => !option.disabled));
    reveal.current = true;
  }, [open, options, selected]);
  useLayoutEffect(() => {
    if (!open) return;
    if (!enabled.includes(active)) { const selectedIndex = matches.findIndex(option => option.value === selected && !option.disabled); setActive(selectedIndex >= 0 ? selectedIndex : enabled[0] ?? -1); return; }
    if (reveal.current && position.visibility === 'visible') {
      const row = list.current?.querySelector<HTMLElement>('[role="option"][data-active="true"]'), viewport = list.current;
      if (row && viewport) { const bounds = viewport.getBoundingClientRect(), item = row.getBoundingClientRect(); if (item.top < bounds.top) viewport.scrollTop -= bounds.top - item.top; else if (item.bottom > bounds.bottom) viewport.scrollTop += item.bottom - bounds.bottom; }
      reveal.current = false;
    }
  }, [open, active, matches, selected, position.visibility, revealVersion]);
  useEffect(() => { if (open && position.visibility === 'visible') (searchable ? input.current : list.current)?.focus({ preventScroll: true }); }, [open, searchable, position.visibility]);
  useEffect(() => {
    const form = native.current?.form; if (!form) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => { timer = setTimeout(() => { const next = currentValue.current ?? defaultValue; if (currentValue.current === undefined) setInnerValue(next); if (native.current) native.current.value = next; setInnerOpen(false); setQuery(''); }, 0); };
    form.addEventListener('reset', reset); return () => { clearTimeout(timer); form.removeEventListener('reset', reset); };
  }, [defaultValue, name]);
  const choose = (option: PopupSelectOption | undefined) => {
    if (!option || option.disabled || disabled) return;
    if (native.current) { native.current.value = option.value; native.current.dispatchEvent(new Event('change', { bubbles: true })); }
    else { if (value === undefined) setInnerValue(option.value); onValueChange?.(option.value); }
    close(true);
  };
  const navigate = (event: KeyboardEvent<HTMLElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const current = enabled.indexOf(active), step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(event.key === 'Home' ? enabled[0] ?? -1 : event.key === 'End' ? enabled.at(-1) ?? -1 : enabled[current < 0 ? (step > 0 ? 0 : enabled.length - 1) : (current + step + enabled.length) % enabled.length] ?? -1); reveal.current = true; setRevealVersion(version => version + 1);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); choose(matches[active]); }
    else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === 'Tab') close(true);
    else if (!searchable && event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); clearTimeout(typeaheadTimer.current); typeahead.current += normalize(event.key);
      const term = [...typeahead.current].every(char => char === typeahead.current[0]) ? typeahead.current[0] : typeahead.current;
      const next = [...enabled.filter(index => index > active), ...enabled.filter(index => index <= active)].find(index => normalize(matches[index].label).startsWith(term));
      if (next !== undefined) { setActive(next); reveal.current = true; setRevealVersion(version => version + 1); }
      typeaheadTimer.current = setTimeout(() => { typeahead.current = ''; }, 600);
    }
  };
  const leave = (event: { relatedTarget: EventTarget | null }) => { if (!panel.current?.contains(event.relatedTarget as Node | null) && !trigger.current?.contains(event.relatedTarget as Node | null)) close(false); };
  const descriptionId = error || hint ? `${id}-description` : undefined;
  const selectedContent = typeof triggerContent === 'function' ? triggerContent(chosen) : triggerContent;
  return <div className={cx('cap-popup-select', className)} data-size={size} data-variant={variant} style={fieldFocusStyle(undefined, focusRing)}>
    {showLabel && <label className="cap-selection-label" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>}
    {name && <select ref={native} className="cap-selection-native" name={name} tabIndex={-1} aria-hidden="true" value={selected} required={required} disabled={disabled} onInvalid={event => { event.preventDefault(); trigger.current?.focus(); }} onChange={event => { if (value === undefined) setInnerValue(event.target.value); onValueChange?.(event.target.value); }}><option value=""/>{options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select>}
    <Button ref={trigger} id={id} size={size} variant={variant === 'ghost' ? 'ghost' : 'secondary'} className="cap-popup-select-trigger" disabled={disabled} aria-label={label} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? `${id}-popup` : undefined} aria-describedby={descriptionId} aria-invalid={error ? true : undefined} onClick={() => open ? close(true) : setOpen(true)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}>
      {selectedContent !== undefined ? <span className="cap-popup-select-custom">{selectedContent}</span> : <><span className="cap-popup-select-value">{chosen?.triggerLabel ?? chosen?.label ?? placeholder ?? t('Выберите…', 'Choose…')}</span></>}
      <DisclosureChevron expanded={open} size={14} className="cap-popup-select-chevron"/>
    </Button>
    {(error || hint) && <span id={descriptionId} className={error ? 'cap-selection-error' : 'cap-selection-description'} role={error ? 'alert' : undefined}>{error || hint}</span>}
    {present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} id={`${id}-popup`} role="dialog" aria-label={label} aria-hidden={!open || undefined} inert={!open} className={cx('cap-popup-select-panel', popupClassName)} data-state={open ? 'open' : 'closed'} data-search-placement={searchable ? searchPlacement : undefined} style={fieldFocusStyle({ ...position, '--cap-popup-select-width': `${Number.isFinite(popupWidth) ? Math.max(160, popupWidth) : 320}px` } as CSSProperties, focusRing)} {...scope}>
      {searchable && <div className="cap-popup-select-search"><Input ref={input} size="sm" variant={searchPlacement === 'inline' ? 'ghost' : 'surface'} leading={<Icon name="search" size={14}/>} aria-label={`${label}${t(': поиск', ': search')}`} placeholder={searchPlaceholder ?? t('Поиск…', 'Search…')} value={query} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={matches[active] && !matches[active].disabled ? `${id}-option-${active}` : undefined} autoComplete="off" onChange={event => { setQuery(event.target.value); setActive(-1); reveal.current = true; }} onKeyDown={navigate} onBlur={leave}/></div>}
      <div ref={list} className="cap-popup-select-options cap-shared-hover" id={`${id}-list`} role="listbox" aria-label={label} tabIndex={searchable ? -1 : 0} aria-activedescendant={!searchable && matches[active] && !matches[active].disabled ? `${id}-option-${active}` : undefined} onKeyDown={!searchable ? navigate : undefined} onBlur={!searchable ? leave : undefined}>
        <MovingHighlight root={list} selected=".cap-popup-select-option[data-active=true]:not(:disabled)" revision={`${open}:${active}:${query}:${matches[active]?.value ?? ''}`}/>
        {matches.map((option, index) => <div key={option.value} role="none">
          {option.group && option.group !== matches[index - 1]?.group && <div className="cap-selection-group" role="presentation">{option.group}</div>}
          <button type="button" id={`${id}-option-${index}`} role="option" tabIndex={-1} aria-selected={option.value === selected} disabled={option.disabled} data-active={active === index || undefined} className="cap-popup-select-option" onPointerMove={event => { if (event.pointerType !== 'touch' && !option.disabled) setActive(index); }} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
            {option.leading !== undefined ? <span className="cap-popup-select-leading" aria-hidden="true">{option.leading}</span> : option.icon && <Icon name={option.icon} size={16}/>}
            <span className="cap-popup-select-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
            {option.meta !== undefined && <span className="cap-popup-select-meta">{option.meta}</span>}
            <span className="cap-popup-select-check" aria-hidden="true">{option.value === selected && <Icon name="check" size={14}/>}</span>
          </button>
        </div>)}
        {!matches.length && <p className="cap-selection-empty" role="status">{emptyMessage ?? t('Ничего не найдено', 'No results')}</p>}
      </div>
    </div></OverlayPortal>}
  </div>;
});
