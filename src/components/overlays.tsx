import { createContext, useContext, useMemo, cloneElement, useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type ReactElement, type HTMLAttributes, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Kbd, cx, type IconName, type ButtonProps, type Size } from './primitives.js';

const OverlayParents = /* @__PURE__ */ createContext<RefObject<HTMLElement | null>[]>([]);
const focusSelector = 'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(focusSelector)).filter(element => {
  if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden],[inert],[aria-hidden="true"]') || getComputedStyle(element).visibility === 'hidden') return false;
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) if (getComputedStyle(parent).display === 'none') return false;
  return true;
});
type Scope = { 'data-theme'?: string; 'data-accent'?: string; 'data-color'?: string; 'data-borders'?: string; 'data-surface': 'raised' };
export function useOverlayPresence(open: boolean) {
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setPresent(false), reduced ? 0 : 180);
    return () => clearTimeout(timer);
  }, [open]);
  return open || present;
}
/** Keep locally selected appearance and accent when a surface leaves its DOM parent. */
export function useOverlayScope(anchor: RefObject<HTMLElement | null>) {
  const [scope, setScope] = useState<Scope>({ 'data-surface': 'raised' });
  useLayoutEffect(() => {
    const read = () => {
      const next: Scope = { 'data-surface': 'raised' };
      const theme = anchor.current?.closest('[data-theme]')?.getAttribute('data-theme');
      if (theme) next['data-theme'] = theme;
      const borders = anchor.current?.closest('[data-borders]')?.getAttribute('data-borders');
      if (borders) next['data-borders'] = borders;
      const accent = anchor.current?.closest('[data-accent],[data-color]');
      if (accent?.hasAttribute('data-accent')) next['data-accent'] = accent.getAttribute('data-accent')!;
      else if (accent?.hasAttribute('data-color')) next['data-color'] = accent.getAttribute('data-color')!;
      setScope(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    read();
    const observer = new MutationObserver(read);
    for (let element = anchor.current; element; element = element.parentElement) observer.observe(element, { attributes: true, attributeFilter: ['data-theme', 'data-accent', 'data-color', 'data-borders'] });
    return () => observer.disconnect();
  }, [anchor]);
  return scope;
}
export function OverlayPortal({ anchor, panel, children }: { anchor: RefObject<HTMLElement | null>; panel: RefObject<HTMLElement | null>; children: ReactNode }) {
  const parents = useContext(OverlayParents), descendants = useMemo(() => [...parents, panel], [parents, panel]);
  if (typeof document === 'undefined') return null;
  // A floating child belongs to its modal, so background inertness never disables it.
  return createPortal(<OverlayParents.Provider value={descendants}>{children}</OverlayParents.Provider>, anchor.current?.closest('.cap-modal-layer') ?? document.body);
}
type Layer = { id: string; element: HTMLElement; parents: (HTMLElement | null)[] };
const dismissLayers: Layer[] = [];
export function useOverlayDismiss(open: boolean, panel: RefObject<HTMLElement | null>, anchor: RefObject<HTMLElement | null>, onClose: (restoreFocus: boolean) => void, outside = true) {
  const id = useId(), close = useRef(onClose), parents = useContext(OverlayParents); close.current = onClose;
  useEffect(() => {
    if (!open || !panel.current) return;
    const entry = { id, element: panel.current, parents: parents.map(parent => parent.current) };
    const descendant = dismissLayers.findIndex(layer => layer.parents.includes(panel.current));
    if (descendant < 0) dismissLayers.push(entry); else dismissLayers.splice(descendant, 0, entry);
    const pointer = (event: PointerEvent) => {
      if (!outside || dismissLayers.at(-1) !== entry || panel.current?.contains(event.target as Node) || anchor.current?.contains(event.target as Node)) return;
      close.current(false);
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || dismissLayers.at(-1) !== entry) return;
      event.preventDefault(); event.stopPropagation(); close.current(true);
    };
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key);
    return () => { const index = dismissLayers.indexOf(entry); if (index !== -1) dismissLayers.splice(index, 1); document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); };
  }, [open, panel, anchor, outside, id]);
}
export function useAnchoredOverlay(open: boolean, anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, { align = 'start', side = 'bottom', matchWidth = false }: { align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; matchWidth?: boolean } = {}) {
  const [position, setPosition] = useState<CSSProperties>({ left: 0, top: 0, visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = anchor.current, surface = panel.current; if (!trigger || !surface) return;
      const rect = trigger.getBoundingClientRect();
      const gutter = parseFloat(getComputedStyle(surface).getPropertyValue('--cap-overlay-gutter')) || 12, gap = 6;
      const viewport = window.visualViewport, width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const viewportLeft = viewport?.offsetLeft ?? 0, viewportTop = viewport?.offsetTop ?? 0;
      if (matchWidth) surface.style.minWidth = `${Math.min(rect.width, width - gutter * 2)}px`;
      const measured = surface.getBoundingClientRect(), bounds = { width: surface.offsetWidth || measured.width, height: surface.offsetHeight || measured.height };
      const below = height + viewportTop - rect.bottom - gutter - gap, above = rect.top - viewportTop - gutter - gap;
      const placeAbove = side === 'top' ? above >= bounds.height || above > below : below < bounds.height && above > below;
      const available = Math.max(48, Math.min(height - gutter * 2, placeAbove ? above : below));
      const left = align === 'end' ? rect.right - bounds.width : align === 'center' ? rect.left + (rect.width - bounds.width) / 2 : rect.left;
      const top = placeAbove ? rect.top - Math.min(bounds.height, available) - gap : rect.bottom + gap;
      const next: CSSProperties = { left: Math.max(viewportLeft + gutter, Math.min(left, viewportLeft + width - bounds.width - gutter)), top: Math.max(viewportTop + gutter, Math.min(top, viewportTop + height - Math.min(bounds.height, available) - gutter)), maxHeight: available, maxWidth: width - gutter * 2, visibility: 'visible', transformOrigin: placeAbove ? 'bottom center' : 'top center' };
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (anchor.current) observer?.observe(anchor.current); if (panel.current) observer?.observe(panel.current);
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [open, anchor, panel, align, side, matchWidth]);
  return position;
}
const modalLayers: HTMLElement[] = [];
const modalParents = new Map<HTMLElement, (HTMLElement | null)[]>();
const inertValues = new Map<HTMLElement, { inert: boolean; ariaHidden: string | null }>();
let originalOverflow = '', originalPadding = '', bodyObserver: MutationObserver | undefined;
function syncModalBackground() {
  const top = modalLayers.at(-1);
  modalLayers.forEach((layer, index) => { layer.style.zIndex = String(1000 + index * 10); });
  for (const element of Array.from(document.body.children)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!inertValues.has(element)) inertValues.set(element, { inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') });
    const original = inertValues.get(element)!;
    if (element === top) { element.inert = false; element.removeAttribute('aria-hidden'); }
    else if ((top && element !== top) || (element.classList.contains('cap-modal-layer') && element.dataset.state === 'closed')) { element.inert = true; element.setAttribute('aria-hidden', 'true'); }
    else { element.inert = original.inert; original.ariaHidden === null ? element.removeAttribute('aria-hidden') : element.setAttribute('aria-hidden', original.ariaHidden); }
  }
  if (!top) {
    for (const [element, original] of inertValues) { if (element.classList.contains('cap-modal-layer') && element.dataset.state === 'closed') continue; element.inert = original.inert; original.ariaHidden === null ? element.removeAttribute('aria-hidden') : element.setAttribute('aria-hidden', original.ariaHidden); }
    inertValues.clear();
  }
}
function childSurfaceContains(parent: HTMLElement | null, target: EventTarget | null) {
  if (!(target instanceof Node)) return false;
  const index = dismissLayers.findIndex(layer => layer.element === parent);
  return index !== -1 && dismissLayers.slice(index + 1).some(layer => layer.element.contains(target));
}
function useModalFocus(open: boolean, layer: RefObject<HTMLDivElement | null>, panel: RefObject<HTMLDivElement | null>, opener: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose), parents = useContext(OverlayParents); close.current = onClose;
  useEffect(() => {
    const surface = panel.current, root = layer.current; if (!open || !surface || !root) return;
    const previous = opener.current;
    if (!modalLayers.length) {
      originalOverflow = document.body.style.overflow; originalPadding = document.body.style.paddingRight;
      const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.body.style.overflow = 'hidden';
      if (scrollbar && document.documentElement.clientWidth) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight || '0') + scrollbar}px`;
      bodyObserver = new MutationObserver(syncModalBackground); bodyObserver.observe(document.body, { childList: true });
    }
    modalParents.set(root, parents.map(parent => parent.current));
    const descendant = modalLayers.findIndex(layer => modalParents.get(layer)?.includes(surface));
    if (descendant < 0) modalLayers.push(root); else modalLayers.splice(descendant, 0, root);
    syncModalBackground();
    const choices = focusables(surface), initial = choices.find(element => element.matches('[data-autofocus],[autofocus],input,textarea,[role="combobox"]'));
    if (modalLayers.at(-1) === root) (initial ?? choices[0] ?? surface).focus({ preventScroll: true });
    const focus = (event: FocusEvent) => { if (modalLayers.at(-1) === root && !root.contains(event.target as Node)) (focusables(surface)[0] ?? surface).focus(); };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented || modalLayers.at(-1) !== root) return;
      const choices = focusables(root), active = document.activeElement;
      if (!choices.length) { event.preventDefault(); surface.focus(); }
      else if (event.shiftKey && (active === choices[0] || !root.contains(active))) { event.preventDefault(); choices.at(-1)?.focus(); }
      else if (!event.shiftKey && (active === choices.at(-1) || !root.contains(active))) { event.preventDefault(); choices[0]?.focus(); }
    };
    const cancel = (event: Event) => { event.preventDefault(); close.current(); };
    document.addEventListener('focusin', focus); document.addEventListener('keydown', key); surface.addEventListener('cancel', cancel);
    return () => {
      document.removeEventListener('focusin', focus); document.removeEventListener('keydown', key); surface.removeEventListener('cancel', cancel);
      const index = modalLayers.indexOf(root); if (index !== -1) modalLayers.splice(index, 1); modalParents.delete(root);
      if (!modalLayers.length) { bodyObserver?.disconnect(); bodyObserver = undefined; document.body.style.overflow = originalOverflow; document.body.style.paddingRight = originalPadding; }
      syncModalBackground();
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
    };
  }, [open, layer, panel, opener]);
}
export interface DialogProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; className?: string; size?: 'sm' | 'md' | 'lg'; closeLabel?: string; dismissOnOutside?: boolean }
export interface DrawerProps extends DialogProps { side?: 'left' | 'right' | 'bottom' }
function Modal({ open, onOpenChange, title, description, children, footer, className, size = 'md', closeLabel = 'Закрыть', dismissOnOutside = true, side }: DrawerProps) {
  const anchor = useRef<HTMLSpanElement>(null), layer = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), id = useId();
  const scope = useOverlayScope(anchor), present = useOverlayPresence(open), wasOpen = useRef(false), opener = useRef<HTMLElement | null>(null);
  const parents = useContext(OverlayParents), descendants = useMemo(() => [...parents, panel], [parents, panel]);
  // Capture before React commits descendants with autoFocus.
  if (open && !wasOpen.current && typeof document !== 'undefined') opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpen.current = open;
  useModalFocus(open, layer, panel, opener, () => onOpenChange(false));
  useOverlayDismiss(open, panel, anchor, () => onOpenChange(false), dismissOnOutside);
  return <><span hidden ref={anchor} />{present && typeof document !== 'undefined' && createPortal(<OverlayParents.Provider value={descendants}><div ref={layer} className="cap-modal-layer" data-state={open ? 'open' : 'closed'} data-side={side} {...scope}><div aria-hidden="true" className="cap-modal-backdrop" /><div ref={panel} role="dialog" aria-hidden={!open || undefined} inert={!open} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1} className={cx('cap-dialog', side && 'cap-drawer', className)} data-surface="raised" data-size={size} data-side={side}><div className="cap-dialog-header"><div><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div><IconButton variant="ghost" icon="close" label={closeLabel} onClick={() => onOpenChange(false)} /></div><div className="cap-dialog-body">{children}</div>{footer && <div className="cap-dialog-footer">{footer}</div>}</div></div></OverlayParents.Provider>, document.body)}</>;
}
export function Dialog(props: DialogProps) { return <Modal {...props} />; }
export function Drawer({ side = 'right', ...props }: DrawerProps) { return <Modal {...props} side={side} />; }
export function Tooltip({ content, children, shortcut }: { content: ReactNode; children: ReactElement<{ 'aria-describedby'?: string }>; shortcut?: string[] }) {
  const [open, setOpen] = useState(false), id = useId(), anchor = useRef<HTMLSpanElement>(null), panel = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scope = useOverlayScope(anchor), position = useAnchoredOverlay(open, anchor, panel, { side: 'top', align: 'center' }), present = useOverlayPresence(open);
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  const hideLater = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 100); };
  useOverlayDismiss(open, panel, anchor, hide);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <span ref={anchor} className="cap-tooltip-wrap" onMouseEnter={() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 350); }} onMouseLeave={hideLater} onFocus={() => { clearTimeout(timer.current); setOpen(true); }} onBlur={hide} onPointerDown={hide}>{cloneElement(children, { 'aria-describedby': [children.props['aria-describedby'], open && id].filter(Boolean).join(' ') || undefined })}{present && <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={id} role="tooltip" aria-hidden={!open || undefined} data-state={open ? 'open' : 'closed'} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideLater} className="cap-tooltip cap-tooltip-v2" style={position} {...scope}>{content}{shortcut && <span className="cap-tooltip-shortcut">{shortcut.map((key, index) => <Kbd key={`${key}-${index}`}>{key}</Kbd>)}</span>}</div></OverlayPortal>}</span>;
}
export interface MenuItem { id: string; label: string; icon?: IconName; shortcut?: string; disabled?: boolean; danger?: boolean; separator?: boolean; onSelect?: () => void }
export interface MenuProps { label: string; items: MenuItem[]; icon?: IconName; disabled?: boolean; size?: Size; variant?: ButtonProps['variant']; className?: string }
export function Menu({ label, items, icon = 'more', disabled, size, variant = 'ghost', className }: MenuProps) {
  const [open, setOpen] = useState(false), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId(), startAtEnd = useRef(false);
  const scope = useOverlayScope(trigger), position = useAnchoredOverlay(open, trigger, panel, { align: 'end' }), present = useOverlayPresence(open);
  const search = useRef(''), searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const buttons = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  const close = (restore = true) => { setOpen(false); if (restore) trigger.current?.focus(); };
  useOverlayDismiss(open, panel, trigger, close);
  useEffect(() => { if (open && position.visibility === 'visible') (startAtEnd.current ? buttons().at(-1) : buttons()[0])?.focus(); }, [open, position.visibility]);
  useEffect(() => () => clearTimeout(searchTimer.current), []);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') { e.preventDefault(); close(); const choices = focusables(document.body), index = choices.indexOf(trigger.current!); choices[index + (e.shiftKey ? -1 : 1)]?.focus(); return; }
    const choices = buttons(), current = choices.indexOf(document.activeElement as HTMLButtonElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const i = e.key === 'Home' ? 0 : e.key === 'End' ? choices.length - 1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length;
      choices[i]?.focus();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== ' ') {
      e.preventDefault(); clearTimeout(searchTimer.current); search.current += e.key.toLocaleLowerCase();
      const term = [...search.current].every(char => char === search.current[0]) ? search.current[0] : search.current;
      const ordered = [...choices.slice(current + 1), ...choices.slice(0, current + 1)]; ordered.find(button => button.dataset.label?.toLocaleLowerCase().startsWith(term))?.focus();
      searchTimer.current = setTimeout(() => { search.current = ''; }, 600);
    }
  };
  return <span className="cap-menu-root"><IconButton ref={trigger} label={label} icon={icon} variant={variant} size={size} disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { startAtEnd.current = false; setOpen(!open); }} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); startAtEnd.current = e.key === 'ArrowUp'; setOpen(true); } }} />{present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} role="menu" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={label} id={id} className={cx('cap-menu', 'cap-menu-v2', className)} style={position} {...scope} onKeyDown={onKeyDown} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== trigger.current) close(false); }}>{items.map(item => <div key={item.id} role="none">{item.separator && <hr className="cap-separator" />}<button type="button" role="menuitem" className="cap-menu-item" tabIndex={-1} data-label={item.label} data-danger={item.danger || undefined} disabled={item.disabled} onClick={() => { close(); item.onSelect?.(); }}>{item.icon && <Icon name={item.icon} />}<span>{item.label}</span>{item.shortcut && <Kbd>{item.shortcut}</Kbd>}</button></div>)}</div></OverlayPortal>}</span>;
}
export interface PopoverProps { label: string; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; disabled?: boolean; size?: Size }
export function Popover({ label, children, open: controlledOpen, onOpenChange, className, align, side, disabled, size = 'md' }: PopoverProps) {
  const [internal, setInternal] = useState(false), open = controlledOpen ?? internal;
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const scope = useOverlayScope(trigger), position = useAnchoredOverlay(open, trigger, panel, { align, side }), present = useOverlayPresence(open);
  const restoreFocus = useRef(true);
  const setOpen = (value: boolean) => { if (value) restoreFocus.current = true; if (controlledOpen === undefined) setInternal(value); onOpenChange?.(value); };
  const close = (restore = true) => { restoreFocus.current = restore; setOpen(false); if (restore) trigger.current?.focus(); };
  useOverlayDismiss(open, panel, trigger, close);
  useEffect(() => { if (!open) return; return () => { if (restoreFocus.current && trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); }; }, [open]);
  useEffect(() => { if (open && panel.current && position.visibility === 'visible') (focusables(panel.current)[0] ?? panel.current).focus({ preventScroll: true }); }, [open, position.visibility]);
  return <span className="cap-popover-root"><Button ref={trigger} disabled={disabled} size={size} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>{label}<Icon name="down" size={12} /></Button>{present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} id={id} role="dialog" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={label} tabIndex={-1} className={cx('cap-popover', 'cap-popover-v2', className)} style={position} {...scope} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && !trigger.current?.contains(e.relatedTarget) && !childSurfaceContains(panel.current, e.relatedTarget) && !panel.current?.closest('.cap-modal-layer')?.contains(e.relatedTarget)) close(false); }} onKeyDown={e => {
    if (e.key !== 'Tab' || !panel.current) return;
    const choices = focusables(panel.current), active = document.activeElement;
    if (e.shiftKey && (active === choices[0] || active === panel.current)) { e.preventDefault(); close(); }
    else if (!e.shiftKey && (active === choices.at(-1) || !choices.length)) { e.preventDefault(); close(); const all = focusables(document.body), index = all.indexOf(trigger.current!); all[index + 1]?.focus(); }
  }}>{children}</div></OverlayPortal>}</span>;
}
export interface CommandItem { id: string; label: string; description?: string; icon?: IconName; shortcut?: string; onSelect: () => void }
export function CommandPalette({ open, onOpenChange, items, placeholder = 'Найти команду или объект…' }: { open: boolean; onOpenChange: (open: boolean) => void; items: CommandItem[]; placeholder?: string }) {
  const [query, setQuery] = useState(''), [active, setActive] = useState(0), id = useId();
  const input = useRef<HTMLInputElement>(null);
  const filtered = items.filter(i => `${i.label} ${i.description ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  useEffect(() => { if (open) { setQuery(''); setActive(0); input.current?.focus(); } }, [open]);
  const choose = (item: CommandItem) => { onOpenChange(false); item.onSelect(); };
  const index = Math.min(active, Math.max(0, filtered.length - 1));
  useEffect(() => { if (open) document.getElementById(`${id}-${index}`)?.scrollIntoView?.({ block: 'nearest' }); }, [id, index, open]);
  return <Dialog open={open} onOpenChange={onOpenChange} title="Быстрый поиск" className="cap-command" footer={<span className="cap-command-help"><Kbd>↑↓</Kbd> навигация <Kbd>↵</Kbd> выбрать <Kbd>esc</Kbd> закрыть</span>}><div className="cap-command-input"><Icon name="search" size={20} /><input ref={input} autoFocus role="combobox" aria-label="Поиск команд" aria-expanded={true} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={filtered.length ? `${id}-${index}` : undefined} value={query} placeholder={placeholder} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(filtered.length ? (index + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0); }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && filtered[index]) { e.preventDefault(); choose(filtered[index]); }
  }} /></div><div id={`${id}-list`} role="listbox" aria-label="Результаты поиска" className="cap-command-list">{filtered.map((item, i) => <div key={item.id} id={`${id}-${i}`} role="option" aria-selected={i === index} className="cap-command-item" onPointerMove={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => choose(item)}>{item.icon && <Icon name={item.icon} />}<span>{item.label}{item.description && <small>{item.description}</small>}</span>{item.shortcut && <Kbd>{item.shortcut}</Kbd>}</div>)}</div>{!filtered.length && <p className="cap-command-empty" role="status">Ничего не найдено</p>}</Dialog>;
}
export function Toast({ title, description, onDismiss, className, ...props }: HTMLAttributes<HTMLDivElement> & { title: string; description?: string; onDismiss?: () => void }) {
  return <div className={cx('cap-toast', className)} data-surface="raised" role="status" {...props}><Icon name="check" /><div><strong>{title}</strong>{description && <p>{description}</p>}</div>{onDismiss && <IconButton label="Скрыть уведомление" icon="close" size="sm" variant="ghost" onClick={onDismiss} />}</div>;
}
