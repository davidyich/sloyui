import { useTranslate } from './locale.js';
import { Fragment, forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Pipette } from 'lucide-react';
import { Icon, Tag, type Color, type IconSource, type Size } from './primitives.js';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlays.js';
import { useValueScrubber, type ScrubOrientation } from './value-scrubber.js';
import { Select, fieldContext, fieldFocusStyle, type FocusRing } from './forms.js';
import { Chip } from './chip.js';
import { MovingHighlight } from './moving-highlight.js';

export interface SelectionOption { value: string; label: string; disabled?: boolean; group?: string; icon?: IconSource; aliases?: string[]; description?: string; color?: Color }
export type FieldVariant = 'surface' | 'ghost';
export interface ComboBoxProps { options: readonly SelectionOption[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; label: string; name?: string; placeholder?: string; disabled?: boolean; required?: boolean; clearable?: boolean; description?: ReactNode; error?: string; emptyMessage?: string; size?: Size; variant?: FieldVariant; className?: string; focusRing?: FocusRing }
const norm = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const useValue = <T,>(value: T | undefined, initial: T) => { const [inner, setInner] = useState(initial); return [value === undefined ? inner : value, setInner] as const; };

/** Searchable single-choice field. A hidden native select preserves form submission and required validation. */
export const ComboBox = /* @__PURE__ */ forwardRef<HTMLInputElement, ComboBoxProps>(function ComboBox({ options, value, defaultValue = '', onValueChange, label, name, placeholder: suppliedPlaceholder, disabled, required, clearable = true, description, error, emptyMessage: suppliedEmptyMessage, size = 'md', variant = 'surface', className, focusRing }: ComboBoxProps, forwardedRef) {
  const t = useTranslate();
  const placeholder = suppliedPlaceholder === undefined ? (t("Выберите…", "Choose…")) : suppliedPlaceholder;
  const emptyMessage = suppliedEmptyMessage === undefined ? (t("Ничего не найдено", "No results")) : suppliedEmptyMessage;

  const id = useId(), [selected, setSelected] = useValue(value, defaultValue), [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0), suppressFocusOpen = useRef(false);
  const anchor = useRef<HTMLInputElement>(null), panel = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null), scope = useOverlayScope(anchor), position = useAnchoredOverlay(open, anchor, panel, { matchWidth: true }), present = useOverlayPresence(open), [resultsHeight, setResultsHeight] = useState(0);
  useImperativeHandle(forwardedRef, () => anchor.current as HTMLInputElement);
  const chosen = options.find(item => item.value === selected), matches = useMemo(() => options.filter(item => norm(`${item.label} ${item.value} ${(item.aliases ?? []).join(' ')}`).includes(norm(query))), [options, query]);
  const groups = useMemo(() => { const result = new Map<string, SelectionOption[]>(); matches.forEach(option => { const key = option.group ?? ''; result.set(key, [...(result.get(key) ?? []), option]); }); return [...result]; }, [matches]);
  const enabledIndices = matches.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  useLayoutEffect(() => { const node = list.current; if (!node) return; const measure = () => setResultsHeight(node.scrollHeight); measure(); if (typeof ResizeObserver === 'undefined') return; const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect(); }, [present, matches.length]);
  const update = (next: string) => { if (disabled) return; setSelected(next); onValueChange?.(next); setOpen(false); setQuery(''); };
  const close = (restore = false) => { setOpen(false); setQuery(''); if (restore) anchor.current?.focus(); };
  useOverlayDismiss(open, panel, anchor, close);
  useEffect(() => { if (disabled) close(); }, [disabled]);
  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) { setOpen(true); setQuery(''); setActive(enabledIndices[0] ?? 0); } else if (enabledIndices.length) { const current = enabledIndices.indexOf(active); const step = event.key === 'ArrowDown' ? 1 : -1; setActive(enabledIndices[current < 0 ? (step > 0 ? 0 : enabledIndices.length - 1) : (current + step + enabledIndices.length) % enabledIndices.length]); } }
    if (event.key === 'Enter' && open) { event.preventDefault(); const option = matches[active]; if (option && !option.disabled) update(option.value); }
    if (event.key === 'Escape' && open) { event.preventDefault(); close(); }
    if (event.key === 'Tab') close();
  };
  return <div className={`cap-selection-field ${className ?? ''}`} data-size={size} data-variant={variant} style={fieldFocusStyle(undefined, focusRing)}>
    <label className="cap-selection-label" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>{description && <span id={`${id}-description`} className="cap-selection-description">{description}</span>}
    <div className="cap-combobox-wrap">
      {name && <select className="cap-selection-native" tabIndex={-1} aria-hidden="true" name={name} value={selected} required={required} disabled={disabled} onInvalid={e => { e.preventDefault(); anchor.current?.focus(); }} onChange={e => update(e.target.value)}><option value="" />{options.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select>}
      <div className="cap-combobox-input-wrap">{chosen?.icon && !open && <Icon className="cap-combobox-leading" name={chosen.icon} size={16} aria-hidden="true" />}<input ref={anchor} id={id} data-size={size} className="cap-input cap-combobox-input" role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open && matches[active] ? `${id}-option-${matches[active].value}` : undefined} aria-invalid={error ? true : undefined} aria-describedby={[description ? `${id}-description` : '',error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined} aria-required={required || undefined} disabled={disabled} autoComplete="off" placeholder={open ? t("Поиск…", "Search…") : chosen?.label ?? placeholder} value={open ? query : ''} onFocus={() => { if (suppressFocusOpen.current) { suppressFocusOpen.current=false; return; } if (!disabled) { setOpen(true); setQuery(''); setActive(enabledIndices[0] ?? 0); } }} onClick={() => { if (!disabled && !open) { setOpen(true); setQuery(''); setActive(enabledIndices[0] ?? 0); } }} onChange={e => { setQuery(e.target.value); setActive(0); setOpen(true); }} onKeyDown={keyDown} />{clearable && !!selected && !disabled && <button className="cap-combobox-clear" type="button" aria-label={`${t("Очистить ", "Clear ")}${label}`} onMouseDown={event => event.preventDefault()} onClick={() => { update(''); anchor.current?.focus(); setQuery(''); setActive(0); setOpen(true); }}><Icon name="close" size={13} /></button>}<Icon className="cap-combobox-chevron" name="down" size={14} aria-hidden="true" /></div>
      {present && <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} role="region" aria-label={`${t("Варианты: ", "Options: ")}${label}`} className="cap-selection-popup cap-combobox-popup cap-shared-hover" data-state={open ? 'open' : 'closed'} style={position} {...scope} aria-hidden={!open || undefined} inert={!open}><MovingHighlight root={panel} hover target=".cap-selection-option:not(:disabled)"/><div className="cap-combobox-autosize" style={{ height: `${resultsHeight}px` }}><div id={`${id}-list`} ref={list} role="listbox" aria-label={label}>{groups.map(([group, items]) => <Fragment key={group || 'ungrouped'}>{group && <div className="cap-selection-group" role="presentation">{group}</div>}{items.map(option => { const i = matches.indexOf(option); return <button key={option.value} id={`${id}-option-${option.value}`} type="button" role="option" aria-selected={option.value === selected} disabled={option.disabled} data-active={active === i} className="cap-selection-option" onPointerMove={() => setActive(i)} onClick={() => { update(option.value); if(anchor.current&&document.activeElement!==anchor.current){suppressFocusOpen.current=true;anchor.current.focus();} setOpen(false); }}>{option.icon && <Icon name={option.icon} size={16} aria-hidden="true" />}<span className="cap-selection-option-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>{option.value === selected && <Icon name="check" size={15} aria-hidden="true" />}</button>; })}</Fragment>)}{!matches.length && <p className="cap-selection-empty" role="status">{emptyMessage}</p>}</div></div></div></OverlayPortal>}
    </div>
    {error && <span id={`${id}-error`} className="cap-selection-error" role="alert">{error}</span>}
  </div>;
});

export interface MultiSelectProps { options: readonly SelectionOption[]; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void; label: string; name?: string; placeholder?: string; description?: ReactNode; disabled?: boolean; error?: string; maxVisible?: number; /** @deprecated Chips are neutral; set option.color for an optional dot. */ color?: Color | 'inherit'; size?: Size; variant?: FieldVariant; focusRing?: FocusRing; className?: string; emptyMessage?: string }
/** Searchable multi-choice with grouped options, neutral chips and repeated form values. */
export function MultiSelect({ options, value, defaultValue = [], onValueChange, label, name, placeholder: suppliedPlaceholder, description, disabled, error, maxVisible = 2, size = 'md', variant = 'surface', focusRing, className, emptyMessage: suppliedEmptyMessage }: MultiSelectProps) {
  const t = useTranslate();
  const placeholder = suppliedPlaceholder === undefined ? (t("Добавить…", "Add…")) : suppliedPlaceholder;
  const emptyMessage = suppliedEmptyMessage === undefined ? (t("Ничего не найдено", "No results")) : suppliedEmptyMessage;

  const id = useId(), [rawSelected, setSelected] = useValue(value, defaultValue), [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0), [announcement, setAnnouncement] = useState('');
  const selected = [...new Set(rawSelected)], selectedSet = new Set(selected);
  const anchor = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), panel = useRef<HTMLDivElement>(null), scope = useOverlayScope(anchor), position = useAnchoredOverlay(open, anchor, panel, { matchWidth: true }), present = useOverlayPresence(open);
  const matches = useMemo(() => options.filter(option => norm(`${option.label} ${option.value} ${option.group ?? ''} ${(option.aliases ?? []).join(' ')}`).includes(norm(query))), [options, query]);
  const groups = useMemo(() => { const grouped = new Map<string, SelectionOption[]>(); matches.forEach(option => { const key = option.group ?? ''; grouped.set(key, [...(grouped.get(key) ?? []), option]); }); return [...grouped]; }, [matches]);
  const enabledIndices = matches.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0), visibleCount = Number.isFinite(maxVisible) ? Math.max(0, Math.floor(maxVisible)) : selected.length;
  const update = (next: string[]) => { if (disabled) return; setSelected(next); onValueChange?.(next); const labels = next.map(value => options.find(option => option.value === value)?.label ?? value); setAnnouncement(labels.length ? `${t("Выбрано: ", "Selected: ")}${labels.join(', ')}` : t("Выбор очищен", "Selection cleared")); };
  const close = () => { setOpen(false); setQuery(''); };
  useEffect(() => { if (disabled) close(); }, [disabled]);
  useEffect(() => { if (open) panel.current?.querySelector('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [active, open]);
  useEffect(() => { if (!enabledIndices.includes(active)) setActive(enabledIndices[0] ?? -1); }, [matches, active]);
  useOverlayDismiss(open, panel, anchor, close);
  const toggle = (option: SelectionOption) => { if (option.disabled || disabled) return; update(selectedSet.has(option.value) ? selected.filter(value => value !== option.value) : [...selected, option.value]); };
  const removable = (value: string) => !options.find(option => option.value === value)?.disabled;
  return <div className={`cap-selection-field cap-multiselect ${className ?? ''}`} data-size={size} data-variant={variant} style={fieldFocusStyle(undefined, focusRing)}>
    <label className="cap-selection-label" htmlFor={id}>{label}</label>{description && <span id={`${id}-description`} className="cap-selection-description">{description}</span>}
    <div ref={anchor} className="cap-multiselect-box" data-disabled={disabled || undefined} onClick={event => { if (!disabled && !(event.target as HTMLElement).closest('button')) { input.current?.focus(); setOpen(true); } }}>
      {selected.slice(0, visibleCount).map(value => { const option = options.find(option => option.value === value), text = option?.label ?? value; return <span className="cap-selection-chip-wrap" key={value}><Chip size={size === 'xl' ? 'sm' : 'xs'} disabled={disabled || option?.disabled} action={{ icon: 'close', label: `${t("Удалить ", "Remove ")}${text}`, onClick: () => { update(selected.filter(item => item !== value)); input.current?.focus(); } }}>{text}</Chip></span>; })}
      {selected.length > visibleCount && <span className="cap-selection-chip-wrap"><Chip size={size === 'xl' ? 'sm' : 'xs'} title={selected.slice(visibleCount).map(value => options.find(option => option.value === value)?.label ?? value).join(', ')}>+{selected.length - visibleCount}</Chip></span>}
      {name && selected.map(value => <input key={`native-${value}`} type="hidden" name={name} value={value} disabled={disabled} />)}
      <input ref={input} id={id} className="cap-multiselect-search" role="combobox" aria-label={`${label}${t(": поиск", ": search")}`} aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-activedescendant={open && matches[active] && !matches[active].disabled ? `${id}-option-${matches[active].value}` : undefined} aria-autocomplete="list" aria-invalid={error ? true : undefined} aria-describedby={[description ? `${id}-description` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined} placeholder={selected.length ? '' : placeholder} disabled={disabled} autoComplete="off" value={query} onFocus={() => { if (!disabled) { setOpen(true); setActive(enabledIndices[0] ?? -1); } }} onClick={() => { if (!disabled && !open) { setOpen(true); setActive(enabledIndices[0] ?? -1); } }} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }} onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && (open || event.key.startsWith('Arrow'))) {
          event.preventDefault(); setOpen(true);
          const current = enabledIndices.indexOf(active), step = event.key === 'ArrowDown' ? 1 : -1;
          setActive(event.key === 'Home' ? enabledIndices[0] ?? -1 : event.key === 'End' ? enabledIndices.at(-1) ?? -1 : enabledIndices[!open || current < 0 ? (step > 0 ? 0 : enabledIndices.length - 1) : (current + step + enabledIndices.length) % enabledIndices.length] ?? -1);
        } else if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[active]) toggle(matches[active]); }
        else if (event.key === 'Backspace' && !query) { const last = [...selected].reverse().find(removable); if (last) { event.preventDefault(); update(selected.filter(value => value !== last)); } }
        else if (event.key === 'Escape') { if (open) { event.preventDefault(); event.stopPropagation(); close(); } }
        else if (event.key === 'Tab') close();
      }} />
      {selected.some(removable) && !disabled && <button className="cap-multiselect-clear" type="button" aria-label={`${t("Очистить все: ", "Clear all: ")}${label}`} onMouseDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); update(selected.filter(value => !removable(value))); input.current?.focus(); }}><Icon name="close" size={13} /></button>}
      <Icon className="cap-multiselect-chevron" name="down" size={14} aria-hidden="true" />
    </div>
    {present && <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} role="region" aria-label={`${t("Варианты: ", "Options: ")}${label}`} className="cap-selection-popup cap-multiselect-popup cap-shared-hover" data-state={open ? 'open' : 'closed'} style={position} {...scope} aria-hidden={!open || undefined} inert={!open}><MovingHighlight root={panel} hover target=".cap-multiselect-option:not(:disabled)"/><div id={`${id}-list`} role="listbox" aria-label={label} aria-multiselectable="true">{groups.map(([group, items], groupIndex) => <div key={group} role={group ? 'group' : 'presentation'} aria-labelledby={group ? `${id}-group-${groupIndex}` : undefined}>{group && <div id={`${id}-group-${groupIndex}`} className="cap-selection-group">{group}</div>}{items.map(option => { const index = matches.indexOf(option); return <button key={option.value} id={`${id}-option-${option.value}`} type="button" role="option" aria-selected={selectedSet.has(option.value)} disabled={disabled || option.disabled} tabIndex={-1} data-active={!option.disabled && active === index} className="cap-selection-option cap-multiselect-option" onMouseDown={event => event.preventDefault()} onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={() => { toggle(option); input.current?.focus(); }}>{option.color ? <span className="cap-selection-color-dot" data-accent={option.color} aria-hidden="true" /> : option.icon && <Icon name={option.icon} size={16} aria-hidden="true" />}<span className="cap-selection-option-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span><span className="cap-multiselect-check" aria-hidden="true" data-selected={selectedSet.has(option.value) || undefined}>{selectedSet.has(option.value) && <Icon name="check" size={12} />}</span></button>; })}</div>)}{!matches.length && <p className="cap-selection-empty" role="status">{emptyMessage}</p>}</div></div></OverlayPortal>}
    {error && <span id={`${id}-error`} className="cap-selection-error" role="alert">{error}</span>}{announcement && <span className="cap-selection-sr-only" aria-live="polite">{announcement}</span>}
  </div>;
}

export interface TagInputProps { value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void; label: string; name?: string; placeholder?: string; description?: ReactNode; disabled?: boolean; error?: string; maxTags?: number; delimiter?: string; color?: Color | 'inherit'; size?: Size; variant?: FieldVariant; focusRing?: FocusRing }
/** Free-form tag cloud. Enter or the configured delimiter commits the current text. */
export function TagInput({ value, defaultValue = [], onValueChange, label, name, placeholder: suppliedPlaceholder, description, disabled, error, maxTags = Infinity, delimiter = ',', color = 'neutral', size = 'md', variant = 'surface', focusRing }: TagInputProps) {
  const t = useTranslate();
  const placeholder = suppliedPlaceholder === undefined ? (t("Добавить тег…", "Add a tag…")) : suppliedPlaceholder;

  const id = useId(), input = useRef<HTMLInputElement>(null), [tags, setTags] = useValue(value, defaultValue), [draft, setDraft] = useState(''), [picked,setPicked] = useState<string|null>(null), [notice,setNotice] = useState('');
  const tagColor = color === 'inherit' ? undefined : color;
  const update = (next: string[]) => { setTags(next); onValueChange?.(next); };
  const commit = () => {
    if (disabled) return;
    const next = draft.trim(); if (!next) return;
    if (tags.some(tag => tag.toLocaleLowerCase() === next.toLocaleLowerCase())) { setNotice(`${t("Метка «", "Tag “")}${next}${t("» уже добавлена", "” already exists")}`); return; }
    if (tags.length >= maxTags) { setNotice(`${t("Можно добавить не больше ", "You can add at most ")}${maxTags}${t(" меток", " tags")}`); return; }
    update([...tags,next]); setDraft(''); setPicked(null); setNotice(`${t("Добавлена метка «", "Added tag “")}${next}»`);
  };
  const remove = (tag: string) => { update(tags.filter(t => t !== tag)); setPicked(null); setNotice(`${t("Удалена метка «", "Removed tag “")}${tag}»`); input.current?.focus(); };
  const pick = (tag: string|null) => { setPicked(tag); if (tag) setNotice(`${t("Выбрана метка «", "Selected tag “")}${tag}${t("». Нажмите Backspace, чтобы удалить её", "”. Press Backspace to remove it")}`); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const atStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
    const index = picked ? tags.indexOf(picked) : tags.length;
    if (event.key === 'Enter' || event.key === delimiter) { event.preventDefault(); commit(); return; }
    if ((event.key === 'Backspace' || event.key === 'Delete') && picked) { event.preventDefault(); remove(picked); return; }
    if (event.key === 'Backspace' && !draft && tags.length) { event.preventDefault(); pick(tags.at(-1) ?? null); return; }
    if (event.key === 'ArrowLeft' && atStart && index > 0) { event.preventDefault(); pick(tags[index - 1]); return; }
    if (event.key === 'ArrowRight' && picked) { event.preventDefault(); pick(tags[index + 1] ?? null); return; }
    if (event.key === 'Escape' && picked) { event.preventDefault(); pick(null); }
  };
  return <div className="cap-selection-field" data-size={size} data-variant={variant} style={fieldFocusStyle(undefined, focusRing)}><label className="cap-selection-label" htmlFor={id}>{label}</label>{description && <span id={`${id}-description`} className="cap-selection-description">{description}</span>}<div className="cap-tag-input-box" data-disabled={disabled || undefined}>{tags.map(tag => <Fragment key={tag}><span className="cap-selection-chip-wrap" data-color={color} data-picked={picked === tag || undefined} onMouseDown={event => { if ((event.target as HTMLElement).closest('button')) return; event.preventDefault(); input.current?.focus(); }} onClick={() => pick(picked === tag ? null : tag)}><Tag color={tagColor} size={size === 'xl' ? 'md' : 'xs'} shape="rounded" action={{icon:'close',label:`${t("Удалить ", "Remove ")}${tag}`,onClick:()=>remove(tag)}} disabled={disabled}>{tag}</Tag></span>{name && <input type="hidden" name={name} value={tag} disabled={disabled} />}</Fragment>)}<input ref={input} id={id} className="cap-tag-input" aria-invalid={error ? true : undefined} aria-describedby={[description ? `${id}-description` : '',error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined} disabled={disabled || tags.length >= maxTags} value={draft} placeholder={placeholder} onChange={e => { setDraft(e.target.value); setPicked(null); }} onKeyDown={handleKeyDown} onBlur={commit} /></div>{error && <span id={`${id}-error`} className="cap-selection-error" role="alert">{error}</span>}<span className="cap-selection-sr-only" aria-live="polite">{notice}</span></div>;
}

export interface RadioGroupOption { value: string; label: ReactNode; description?: ReactNode; meta?: ReactNode; disabledReason?: ReactNode; icon?: IconSource; disabled?: boolean }
export interface RadioGroupProps { options: readonly RadioGroupOption[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; label: string; name?: string; variant?: 'plain' | 'cards' | FieldVariant; size?: Size; contrast?: boolean; disabled?: boolean; error?: string; orientation?: 'horizontal' | 'vertical'; layout?: 'list' | 'grid'; focusRing?: FocusRing }
/** Native radio choices, optionally presented as selectable cards. */
export function RadioGroup({ options, value, defaultValue, onValueChange, label, name, variant = 'plain', size = 'md', contrast = true, disabled, error, orientation = 'vertical', layout = 'list', focusRing }: RadioGroupProps) {
  const id = useId(), groupName = name ?? id, [selected, setSelected] = useValue(value, defaultValue ?? ''), track = useRef<HTMLDivElement>(null), structure = options.map(option => `${option.value}:${option.disabled ? 1 : 0}`).join('|');
  return <fieldset className="cap-selection-field cap-radio-group" data-size={size} data-contrast={contrast} data-variant={variant} data-orientation={orientation} data-layout={layout} style={fieldFocusStyle(undefined, focusRing)} disabled={disabled}><legend className="cap-selection-label">{label}</legend><div ref={track} role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} className="cap-radio-options"><MovingHighlight root={track} selected='.cap-radio-option[data-selected="true"]' revision={`${selected}:${size}:${layout}:${orientation}:${structure}`}/>{options.map(option => <label className="cap-radio-option" key={option.value} data-selected={selected === option.value || undefined} data-disabled={option.disabled || disabled || undefined}><input type="radio" className="cap-radio" name={groupName} value={option.value} checked={selected === option.value} disabled={disabled || option.disabled} onChange={() => { setSelected(option.value); onValueChange?.(option.value); }} /><span className="cap-radio-copy"><span className="cap-radio-heading">{option.icon && <Icon name={option.icon} size={18} aria-hidden="true" />}<span className="cap-radio-title">{option.label}</span>{option.meta && <small className="cap-radio-meta">{option.meta}</small>}</span>{(option.description || option.disabledReason) && <small className="cap-radio-description">{option.disabled ? option.disabledReason ?? option.description : option.description}</small>}</span></label>)}</div>{error && <span id={`${id}-error`} className="cap-selection-error" role="alert">{error}</span>}</fieldset>;
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';
export interface ColorSwatch { id: string; color: string }
export interface ColorPickerProps { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; label: string; name?: string; palette?: readonly string[]; showRecent?: boolean; swatches?: readonly ColorSwatch[]; defaultSwatches?: ColorSwatch[]; onSwatchesChange?: (swatches: ColorSwatch[]) => void; maxSwatches?: number; background?: string; format?: ColorFormat; disabled?: boolean; description?: ReactNode; error?: string; size?: Size; variant?: FieldVariant; focusRing?: FocusRing }
type RGB = [number, number, number];
interface HSVA { h:number; s:number; v:number; a:number }
const rgbToHsv = ([r8,g8,b8]: RGB, a = 1, fallbackHue = 0): HSVA => { const r=r8/255,g=g8/255,b=b8/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min; let h=fallbackHue; if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);if(h<0)h+=360;} return {h,s:max===0?0:d/max,v:max,a}; };
const hsvToRgb = ({h,s,v}:HSVA):RGB => { const f=(n:number)=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1));};return [f(5),f(3),f(1)].map(channel=>Math.round(channel*255)) as RGB; };
const alphaFromColor = (value:string):number|null => {
  const text=value.trim(),hex=text.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if(hex&&(hex[1].length===4||hex[1].length===8)){const digits=hex[1].length===4?hex[1][3]+hex[1][3]:hex[1].slice(6,8);return parseInt(digits,16)/255;}
  const fn=text.match(/^(rgba?|hsla?|oklch)\((.*)\)$/i);if(!fn)return 1;
  const body=fn[2],commaParts=body.split(','),hasLegacyAlpha=/^(?:rgba|hsla)$/i.test(fn[1])&&commaParts.length===4;
  const alphaText=hasLegacyAlpha?commaParts[3].trim():body.includes('/')?body.slice(body.lastIndexOf('/')+1).trim():null;
  if(alphaText===null)return 1;
  const alpha=alphaText.match(/^(\d+(?:\.\d+)?|\.\d+)(%)?$/);if(!alpha)return null;
  const raw=Number(alpha[1]),value01=raw/(alpha[2]?100:1);return raw<0||value01>1?null:value01;
};
const linear = (channel: number) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
const contrastRatio = (foreground:string,background:string):number|null=>{const fg=parseColor(foreground),bg=parseColor(background);if(!fg||!bg)return null;const alpha=alphaFromColor(foreground)??1,composited=fg.map((channel,index)=>channel*alpha+bg[index]*(1-alpha)) as RGB;const luminance=(rgb:RGB)=>.2126*linear(rgb[0]/255)+.7152*linear(rgb[1]/255)+.0722*linear(rgb[2]/255);const first=luminance(composited),second=luminance(bg);return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);};
const gamma = (channel: number) => channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
const oklchToRgb = (l: number, c: number, h: number): RGB => {
  const angle = h * Math.PI / 180, a = c * Math.cos(angle), b = c * Math.sin(angle);
  const ll = (l + .3963377774 * a + .2158037573 * b) ** 3;
  const mm = (l - .1055613458 * a - .0638541728 * b) ** 3;
  const ss = (l - .0894841775 * a - 1.291485548 * b) ** 3;
  return [gamma(4.0767416621 * ll - 3.3077115913 * mm + .2309699292 * ss), gamma(-1.2684380046 * ll + 2.6097574011 * mm - .3413193965 * ss), gamma(-.0041960863 * ll - .7034186147 * mm + 1.707614701 * ss)].map(channel => Math.round(Math.min(1, Math.max(0, channel)) * 255)) as RGB;
};
const rgbToOklch = ([r8,g8,b8]: RGB) => {
  const r=linear(r8/255),g=linear(g8/255),b=linear(b8/255);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  const L=.2104542553*l+.793617785*m-.0040720468*s,A=1.9779984951*l-2.428592205*m+.4505937099*s,B=.0259040371*l+.7827717662*m-.808675766*s;
  return {l:L,c:Math.hypot(A,B),h:(Math.atan2(B,A)*180/Math.PI+360)%360};
};
const parseColor = (value: string): RGB | null => {
  const text = value.trim();
  if(alphaFromColor(text)===null)return null;
  const hex = text.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hex) { let raw = hex[1]; if(raw.length<=4)raw=[...raw].map(c=>c+c).join(''); return [parseInt(raw.slice(0,2),16), parseInt(raw.slice(2,4),16), parseInt(raw.slice(4,6),16)]; }
  const rgb = text.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})(?:\s*[,/]\s*(?:\d+(?:\.\d+)?%?))?\s*\)$/i);
  if (rgb) { const channels = rgb.slice(1).map(Number); return channels.every(c => c >= 0 && c <= 255) ? channels as RGB : null; }
  const hsl = text.match(/^hsla?\(\s*(-?\d+(?:\.\d+)?)(?:deg)?\s*[, ]\s*(\d+(?:\.\d+)?)%\s*[, ]\s*(\d+(?:\.\d+)?)%(?:\s*[,/]\s*(?:\d+(?:\.\d+)?%?))?\s*\)$/i);
  if (hsl) {
    const h = Number(hsl[1]), s = Number(hsl[2]), l = Number(hsl[3]);
    if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
    const hue = h === 360 ? 0 : h, sat = s / 100, light = l / 100, c = (1 - Math.abs(2 * light - 1)) * sat, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = light - c / 2;
    const rgb = hue < 60 ? [c,x,0] : hue < 120 ? [x,c,0] : hue < 180 ? [0,c,x] : hue < 240 ? [0,x,c] : hue < 300 ? [x,0,c] : [c,0,x];
    return rgb.map(channel => Math.round((channel + m) * 255)) as RGB;
  }
  const oklch = text.match(/^oklch\(\s*(\d+(?:\.\d+)?)(%?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:deg)?(?:\s*\/\s*(?:\d+(?:\.\d+)?%?))?\s*\)$/i);
  if (oklch) {
    const l = Number(oklch[1]) / (oklch[2] ? 100 : 1), c = Number(oklch[3]), h = Number(oklch[4]);
    if (l < 0 || l > 1 || c < 0 || c > .5 || h < 0 || h > 360) return null;
    return oklchToRgb(l,c,h);
  }
  return null;
};
const toHex = ([r,g,b]: RGB,alpha=1) => `#${[r,g,b].map(c => c.toString(16).padStart(2,'0')).join('').toUpperCase()}${alpha<.999?Math.round(alpha*255).toString(16).padStart(2,'0').toUpperCase():''}`;
const swatchInk = (value: string): string => { const rgb = parseColor(value) ?? [0,0,0], y = .2126*linear(rgb[0]/255)+.7152*linear(rgb[1]/255)+.0722*linear(rgb[2]/255); return (y + .05) / .05 >= 1.05 / (y + .05) ? '#000000' : '#FFFFFF'; };
const showColor = (value: string, format: ColorFormat) => {
  const rgb = parseColor(value); if (!rgb) return value;
  const alpha=alphaFromColor(value)??1,suffix=alpha<.999?` / ${Math.round(alpha*100)}%`:'';
  if (format === 'hex') return toHex(rgb,alpha);
  if (format === 'rgb') return `rgb(${rgb.join(', ')}${suffix})`;
  if (format === 'oklch') { const {l,c,h}=rgbToOklch(rgb); return `oklch(${(l*100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)}${suffix})`; }
  const [r,g,b] = rgb.map(c => c / 255), max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min; let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d) { s = d / (1 - Math.abs(2*l - 1)); if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  return `hsl(${Math.round(h)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%${suffix})`;
};
/** HSV picker with kit-native popover, accessible controls and exact editable color syntax. */
export function ColorPicker({ value, defaultValue = '#3E63DD', onValueChange, label, name, palette = [], showRecent = false, swatches: swatchesProp, defaultSwatches, onSwatchesChange, maxSwatches = 7, background, format = 'hex', disabled, description, error: externalError, size = 'md', variant = 'surface', focusRing }: ColorPickerProps) {
  const t = useTranslate();

  const id = useId(), initial = defaultValue, initialRGB = parseColor(initial) ?? [62,99,221] as RGB;
  const [selected, setSelected] = useValue(value, toHex(initialRGB, alphaFromColor(initial) ?? 1));
  const [text, setText] = useState(showColor(value ?? initial, format)), [mode, setMode] = useState<ColorFormat>(format), [validationError, setValidationError] = useState('');
  const [hsva,setHsva] = useState<HSVA>(()=>rgbToHsv(parseColor(value??initial)??initialRGB,alphaFromColor(value??initial)??1));
  const [open,setOpen] = useState(false), [ownSwatches,setOwnSwatches] = useState<ColorSwatch[]>(defaultSwatches??[]);
  const anchor=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),area=useRef<HTMLDivElement>(null),hueTrack=useRef<HTMLDivElement>(null),alphaTrack=useRef<HTMLDivElement>(null),drag=useRef<{id:number;target:'area'|'hue'|'alpha'}|null>(null);
  const scope=useOverlayScope(anchor),position=useAnchoredOverlay(open,anchor,panel,{align:'start'}),present=useOverlayPresence(open),formatList:ColorFormat[]=['hex','rgb','hsl','oklch'];
  const selectedRGB=parseColor(selected)??initialRGB, selectedAlpha=alphaFromColor(selected)??1, selectedHex=toHex(selectedRGB,selectedAlpha),colors=palette.filter(color=>parseColor(color)!==null),swatches=swatchesProp??ownSwatches;
  const colorStyle={'--cap-color-hue':`hsl(${hsva.h} 100% 50%)`,'--cap-color-rgb':`${hsvToRgb(hsva).join(' ')}`} as React.CSSProperties;
  const error=externalError||validationError;
  useEffect(()=>{const rgb=parseColor(selected);if(rgb)setHsva(previous=>rgbToHsv(rgb,alphaFromColor(selected)??1,previous.h));},[selected]);
  const close=(restore:boolean)=>{setOpen(false);if(showRecent&&maxSwatches>0){const next=[{id:`recent-${selectedHex}`,color:selectedHex},...swatches.filter(swatch=>swatch.color.toUpperCase()!==selectedHex)].slice(0,maxSwatches);if(!swatchesProp)setOwnSwatches(next);onSwatchesChange?.(next);}if(restore)anchor.current?.focus();};
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  useOverlayDismiss(open,panel,anchor,close);
  useEffect(()=>{if(open)area.current?.focus({preventScroll:true});},[open]);
  const emit=(next:HSVA)=>{if(disabled)return;const hex=toHex(hsvToRgb(next),next.a);setHsva(next);setSelected(hex);setText(showColor(hex,mode));setValidationError('');if(hex!==selectedHex)onValueChange?.(showColor(hex,mode));};
  const update=(input:string)=>{const rgb=parseColor(input),alpha=alphaFromColor(input);if(!rgb||alpha===null||disabled)return;const hex=toHex(rgb,alpha);setHsva(previous=>rgbToHsv(rgb,alpha,previous.h));setSelected(hex);setText(showColor(hex,mode));setValidationError('');if(hex!==selectedHex)onValueChange?.(showColor(hex,mode));};
  useEffect(()=>setText(showColor(selected,mode)),[selected,mode]);
  const commit=()=>{if(!parseColor(text)||alphaFromColor(text)===null){setValidationError(`${t("Введите корректный цвет ", "Enter a valid ")}${mode.toUpperCase()}${t(" в допустимом диапазоне.", " color within the allowed range.")}`);return false;}update(text);return true;};
  const areaPoint=(event:React.PointerEvent<HTMLDivElement>)=>{const rect=event.currentTarget.getBoundingClientRect();if(!rect.width||!rect.height)return;emit({...hsva,s:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),v:1-Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))});};
  const trackPoint=(event:React.PointerEvent<HTMLDivElement>,target:'hue'|'alpha')=>{const rect=event.currentTarget.getBoundingClientRect();if(!rect.width)return;const amount=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));emit(target==='hue'?{...hsva,h:amount*359.9}:{...hsva,a:amount});};
  const beginDrag=(event:React.PointerEvent<HTMLDivElement>,target:'area'|'hue'|'alpha')=>{if(disabled)return;drag.current={id:event.pointerId,target};event.currentTarget.setPointerCapture(event.pointerId);if(target==='area')areaPoint(event);else trackPoint(event,target);};
  const moveDrag=(event:React.PointerEvent<HTMLDivElement>,target:'area'|'hue'|'alpha')=>{if(drag.current?.id!==event.pointerId||drag.current.target!==target)return;if(target==='area')areaPoint(event);else trackPoint(event,target);};
  const finishDrag=(event:React.PointerEvent<HTMLDivElement>)=>{if(drag.current?.id===event.pointerId)drag.current=null;};
  const saveSwatch=()=>{const entry={id:`swatch-${selectedHex}`,color:selectedHex},next=[entry,...swatches.filter(swatch=>swatch.color.toUpperCase()!==selectedHex)].slice(0,maxSwatches);if(!swatchesProp)setOwnSwatches(next);onSwatchesChange?.(next);};
  const deleteSwatch=(entry:ColorSwatch)=>{const next=swatches.filter(swatch=>swatch.id!==entry.id);if(!swatchesProp)setOwnSwatches(next);onSwatchesChange?.(next);};
  const eyedropperAvailable=typeof window!=='undefined'&&'EyeDropper' in window;
  const pickFromScreen=()=>{const Ctor=(window as unknown as {EyeDropper?:new()=>{open:()=>Promise<{sRGBHex:string}>}}).EyeDropper;if(!Ctor)return;new Ctor().open().then(result=>update(result.sRGBHex)).catch(()=>{});};
  const currentIndex=colors.findIndex(color=>toHex(parseColor(color)!,alphaFromColor(color)??1)===selectedHex);
  return <div className="cap-selection-field cap-color-picker" data-size={size} data-variant={variant} style={fieldFocusStyle(undefined,focusRing)}>
    <span id={`${id}-label`} className="cap-selection-label">{label}</span>{description&&<span id={`${id}-description`} className="cap-selection-description">{description}</span>}{name&&<input type="hidden" name={name} value={selectedHex} disabled={disabled}/>}
    <button ref={anchor} type="button" className="cap-color-trigger" aria-labelledby={`${id}-label`} aria-describedby={[description ? `${id}-description` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined} aria-invalid={error ? true : undefined} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?`${id}-dialog`:undefined} disabled={disabled} onClick={()=>open?close(false):setOpen(true)}><span className="cap-color-current" aria-hidden="true" style={{'--cap-swatch':selectedHex} as React.CSSProperties}/><span className="cap-color-trigger-value">{selectedHex}</span><Icon name="down" size={14}/></button>{error&&<span id={`${id}-error`} className="cap-selection-error" role="alert">{error}</span>}
    {present&&<OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={`${id}-dialog`} role="dialog" aria-label={`${label}${t(": цвет", ": color")}`} className="cap-selection-popup cap-color-popup" data-state={open?'open':'closed'} style={position} {...scope} aria-hidden={!open||undefined} inert={!open}>
      <div className="cap-color-editor" style={colorStyle}>
        <div className="cap-color-editor-head"><span className="cap-color-current" aria-hidden="true" style={{'--cap-swatch':selectedHex} as React.CSSProperties}/><span>{label}</span>{eyedropperAvailable&&<button type="button" aria-label={t("Выбрать цвет с экрана", "Pick color from screen")} disabled={disabled} onClick={pickFromScreen}><Pipette size={15} aria-hidden="true"/></button>}<button type="button" aria-label={t("Готово", "Done")} onClick={()=>close(true)}><Icon name="check" size={15}/></button></div>
        <div ref={area} className="cap-color-area" role="slider" aria-label={t("Насыщенность и яркость", "Saturation and brightness")} aria-roledescription={t("Двумерный ползунок", "2D slider")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsva.s*100)} aria-valuetext={`${t("Насыщенность ", "Saturation ")}${Math.round(hsva.s*100)}${t("%, яркость ", "%, brightness ")}${Math.round(hsva.v*100)}%`} aria-disabled={disabled||undefined} tabIndex={disabled?-1:0} onPointerDown={event=>beginDrag(event,'area')} onPointerMove={event=>moveDrag(event,'area')} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={event=>{const step=event.shiftKey?.1:.01;if(event.key==='ArrowLeft'||event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();emit({...hsva,s:Math.max(0,Math.min(1,hsva.s+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0))),v:Math.max(0,Math.min(1,hsva.v+(event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0)))});}else if(event.key==='Home'){event.preventDefault();emit({...hsva,s:0});}else if(event.key==='End'){event.preventDefault();emit({...hsva,s:1});}}}><span className="cap-color-area-thumb" style={{left:`${hsva.s*100}%`,top:`${(1-hsva.v)*100}%`}}/></div>
        <div ref={hueTrack} className="cap-color-hue" role="slider" aria-label={t("Оттенок", "Hue")} aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(hsva.h)} aria-disabled={disabled||undefined} tabIndex={disabled?-1:0} onPointerDown={event=>beginDrag(event,'hue')} onPointerMove={event=>moveDrag(event,'hue')} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={event=>{const step=event.shiftKey?10:1;if(event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowLeft'||event.key==='ArrowDown'){event.preventDefault();emit({...hsva,h:(hsva.h+(event.key==='ArrowRight'||event.key==='ArrowUp'?step:-step)+360)%360});}else if(event.key==='Home'){event.preventDefault();emit({...hsva,h:0});}else if(event.key==='End'){event.preventDefault();emit({...hsva,h:359.9});}}}><span style={{left:`${hsva.h/360*100}%`}}/></div>
        <div ref={alphaTrack} className="cap-color-alpha" role="slider" aria-label={t("Непрозрачность", "Opacity")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsva.a*100)} aria-disabled={disabled||undefined} tabIndex={disabled?-1:0} onPointerDown={event=>beginDrag(event,'alpha')} onPointerMove={event=>moveDrag(event,'alpha')} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={event=>{const step=event.shiftKey?.1:.01;if(event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowLeft'||event.key==='ArrowDown'){event.preventDefault();emit({...hsva,a:Math.max(0,Math.min(1,hsva.a+(event.key==='ArrowRight'||event.key==='ArrowUp'?step:-step)))});}else if(event.key==='Home'){event.preventDefault();emit({...hsva,a:0});}else if(event.key==='End'){event.preventDefault();emit({...hsva,a:1});}}}><span style={{left:`${hsva.a*100}%`}}/></div>
        <div className="cap-color-alpha-caption"><span>{t("Непрозрачность", "Opacity")}</span><output aria-hidden="true">{Math.round(hsva.a*100)}%</output></div>
        <div className="cap-color-custom"><Select aria-label={t("Формат цвета", "Color format")} className="cap-color-format-select" size="sm" value={mode} options={formatList.map(value=>({value,label:value.toUpperCase()}))} onValueChange={value=>{setMode(value as ColorFormat);setValidationError('');}} disabled={disabled}/><input className="cap-input cap-color-value-input" aria-label={`${label}${t(", формат ", ", format ")}${mode.toUpperCase()}`} aria-invalid={!!error||undefined} aria-describedby={error?`${id}-error`:undefined} value={text} disabled={disabled} spellCheck={false} onChange={event=>{setText(event.target.value);if(validationError)setValidationError('');}} onBlur={()=>{commit();}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/></div>
        {background&&contrastRatio(selectedHex,background)!==null&&<small className="cap-color-contrast" aria-label={`${t("Контраст ", "Contrast ")}${contrastRatio(selectedHex,background)!.toFixed(2)}${t(" к 1", " to 1")}`}>{t("Контраст", "Contrast")} {contrastRatio(selectedHex,background)!.toFixed(2)}:1</small>}
        {colors.length>0&&<div role="radiogroup" aria-label={t("Цветовая палитра", "Color palette")} className="cap-color-palette">{colors.map((color,index)=><button key={`${color}-${index}`} type="button" className="cap-color-swatch" aria-label={`${t("Цвет ", "Color ")}${color}`} aria-checked={currentIndex===index} role="radio" tabIndex={currentIndex===index||(currentIndex<0&&index===0)?0:-1} disabled={disabled} style={{'--cap-swatch':color,'--cap-swatch-ink':swatchInk(color)} as React.CSSProperties} onClick={()=>update(color)} onKeyDown={event=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(event.key)&&colors.length){event.preventDefault();const delta=event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1,next=(index+delta+colors.length)%colors.length;update(colors[next]);(event.currentTarget.parentElement?.children[next] as HTMLButtonElement|undefined)?.focus();}}}>{currentIndex===index&&<Icon name="check" size={12}/>}</button>)}</div>}
        {(showRecent||swatchesProp!==undefined||defaultSwatches!==undefined||onSwatchesChange!==undefined)&&<div className="cap-color-saved" aria-label={showRecent?t("Недавние цвета", "Recent colors"):t("Сохранённые цвета", "Saved colors")}>{showRecent&&<span className="cap-color-recent-label">{t("Недавние", "Recent")}</span>}<button type="button" aria-label={`${t("Сохранить ", "Save ")}${selectedHex}`} disabled={disabled||maxSwatches<=0} onClick={saveSwatch}><Icon name="plus" size={14}/></button>{swatches.map(swatch=><span key={swatch.id} className="cap-color-saved-item"><button type="button" aria-label={`${t("Применить цвет ", "Apply color ")}${swatch.color}`} disabled={disabled} onClick={()=>update(swatch.color)} style={{'--cap-swatch':swatch.color} as React.CSSProperties}/><button type="button" aria-label={`${t("Удалить сохранённый цвет ", "Remove saved color ")}${swatch.color}`} disabled={disabled} onClick={()=>deleteSwatch(swatch)}><Icon name="close" size={10}/></button></span>)}</div>}
      </div>
    </div></OverlayPortal>}
  </div>;
}

export interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value' | 'defaultValue' | 'onChange' | 'prefix'> { value?: number; defaultValue?: number; onValueChange?: (value: number) => void; label: string; size?: Size; step?: number; largeStep?: number; min?: number; max?: number; prefix?: ReactNode; suffix?: ReactNode; compact?: boolean; variant?: FieldVariant; error?: string; scrubbable?: boolean; scrubOrientation?: ScrubOrientation; focusRing?: FocusRing }
/** Numeric field with bounded steppers and full native number-input keyboard behavior. */
export function NumberField({ value, defaultValue = 0, onValueChange, label, size = 'md', step = 1, largeStep, min = -Infinity, max = Infinity, prefix, suffix, compact = false, variant = 'surface', error, disabled, name, scrubbable = true, scrubOrientation = 'horizontal', focusRing, ...props }: NumberFieldProps) {
  const t = useTranslate();

  const id = useId(), [rawCurrent, setCurrent] = useValue<number | ''>(value, defaultValue), safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const repeat = useRef<{ timeout: number; interval?: number } | null>(null), repeatClick = useRef(false);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const current = typeof rawCurrent === 'number' ? clamp(rawCurrent) : '';
  const update = (n: number) => { if (disabled || props.readOnly) return; const next = clamp(n); setCurrent(next); onValueChange?.(next); };
  const currentNumber = typeof current === 'number' ? current : clamp(defaultValue);
  const stopRepeat = () => { if (repeat.current) { window.clearTimeout(repeat.current.timeout); if (repeat.current.interval !== undefined) window.clearInterval(repeat.current.interval); repeat.current = null; } };
  useEffect(() => stopRepeat, []);
  const startRepeat = (direction: -1 | 1, event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || props.readOnly || (event.button != null && event.button !== 0)) return;
    stopRepeat(); event.currentTarget.setPointerCapture?.(event.pointerId); repeatClick.current = true;
    let repeatedValue = clamp(currentNumber + direction * safeStep);
    update(repeatedValue);
    if ((direction < 0 && repeatedValue <= min) || (direction > 0 && repeatedValue >= max)) { repeatClick.current = false; return; }
    const timeout = window.setTimeout(() => { repeat.current!.interval = window.setInterval(() => { const next = clamp(repeatedValue + direction * safeStep); if (next === repeatedValue) { stopRepeat(); repeatClick.current = false; return; } repeatedValue = next; update(next); if ((direction < 0 && next <= min) || (direction > 0 && next >= max)) { stopRepeat(); repeatClick.current = false; } }, 85); }, 420);
    repeat.current = { timeout };
  };
  const finishRepeat = () => stopRepeat();
  const clickStep = (direction: -1 | 1) => { if (repeatClick.current) { repeatClick.current = false; return; } update(currentNumber + direction * safeStep); };
  const scrubber = useValueScrubber({ value: currentNumber, min, max, step: safeStep, disabled: !scrubbable || disabled || props.readOnly, orientation: scrubOrientation, onValueChange: update });
  const scrubBindings = { ...scrubber,
    onPointerDown: (event: React.PointerEvent<HTMLInputElement>) => { scrubber.onPointerDown(event); props.onPointerDown?.(event); },
    onPointerMove: (event: React.PointerEvent<HTMLInputElement>) => { scrubber.onPointerMove(event); props.onPointerMove?.(event); },
    onPointerUp: (event: React.PointerEvent<HTMLInputElement>) => { scrubber.onPointerUp(event); props.onPointerUp?.(event); },
    onPointerCancel: (event: React.PointerEvent<HTMLInputElement>) => { scrubber.onPointerCancel(event); props.onPointerCancel?.(event); },
    onLostPointerCapture: (event: React.PointerEvent<HTMLInputElement>) => { scrubber.onLostPointerCapture(event); props.onLostPointerCapture?.(event); },
    onClickCapture: (event: React.MouseEvent<HTMLInputElement>) => { scrubber.onClickCapture(event); props.onClickCapture?.(event); },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => { scrubber.onKeyDown(event); if (event.defaultPrevented) return; const amount = Number.isFinite(largeStep) && (largeStep as number) > 0 ? largeStep as number : safeStep * 10; if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); update(currentNumber + (event.key === 'PageUp' ? amount : -amount)); } props.onKeyDown?.(event); },
  };
  const change = (event: ChangeEvent<HTMLInputElement>) => { const n = event.target.valueAsNumber; if (Number.isFinite(n)) update(n); else if (!event.target.value) setCurrent(''); };
  const makeStepButton = (direction:-1|1) => <button type="button" aria-label={`${direction<0?t("Уменьшить", "Decrease"):t("Увеличить", "Increase")}: ${label}`} disabled={disabled || props.readOnly || (direction<0?currentNumber<=min:currentNumber>=max)} onPointerDown={event=>startRepeat(direction,event)} onPointerUp={finishRepeat} onPointerCancel={()=>{finishRepeat();repeatClick.current=false;}} onLostPointerCapture={finishRepeat} onClick={()=>clickStep(direction)}>{direction<0?<Icon name="minus" size={14}/>:<Icon name="plus" size={14}/>}</button>;
  return <div {...fieldContext(props)} className="cap-selection-field" data-size={size} data-compact={compact || undefined} data-variant={variant} style={fieldFocusStyle(undefined, focusRing)}><label className="cap-selection-label" htmlFor={id}>{label}</label><div className="cap-number-field" data-disabled={disabled || undefined}>{makeStepButton(-1)}{prefix && <span className="cap-number-prefix">{prefix}</span>}<input {...props} {...scrubBindings} id={id} type="number" name={name} value={current} min={Number.isFinite(min) ? min : undefined} max={Number.isFinite(max) ? max : undefined} step={safeStep} disabled={disabled} data-scrubbable={scrubbable && !disabled && !props.readOnly || undefined} data-scrub-orientation={scrubOrientation} aria-invalid={error ? true : undefined} aria-describedby={[props['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined} onChange={change} onBlur={e => { finishRepeat(); if (e.target.value === '') update(clamp(defaultValue)); }} />{suffix && <span className="cap-number-suffix">{suffix}</span>}{makeStepButton(1)}</div>{error && <span id={`${id}-error`} className="cap-selection-error" role="alert">{error}</span>}</div>;
}
