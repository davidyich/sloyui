import { FeedbackIcon, feedbackColor, type FeedbackStyleProps } from './feedback.js';
import { MovingHighlight } from './moving-highlight.js';
import { createContext, useContext, useMemo, cloneElement, useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type ReactElement, type HTMLAttributes, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Kbd, cx, type IconSource, type ButtonProps, type Size } from './primitives.js';

const OverlayParents = /* @__PURE__ */ createContext<RefObject<HTMLElement | null>[]>([]);
const focusSelector = 'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(focusSelector)).filter(element => {
  if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden],[inert],[aria-hidden="true"]') || getComputedStyle(element).visibility === 'hidden') return false;
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) if (getComputedStyle(parent).display === 'none') return false;
  return true;
});
type Scope = { 'data-radius'?: string; 'data-theme'?: string; 'data-accent'?: string; 'data-color'?: string; 'data-borders'?: string; 'data-shadow'?: string; 'data-surface': 'floating' };
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
  const [scope, setScope] = useState<Scope>({ 'data-surface': 'floating' });
  useLayoutEffect(() => {
    let observed: HTMLElement[] = [];
    const read = () => {
      const next: Scope = { 'data-surface': 'floating' };
      const radius = anchor.current?.closest('[data-radius]')?.getAttribute('data-radius');
      if (radius) next['data-radius'] = radius;
      const theme = anchor.current?.closest('[data-theme]')?.getAttribute('data-theme');
      if (theme) next['data-theme'] = theme;
      const borders = anchor.current?.closest('[data-borders]')?.getAttribute('data-borders');
      if (borders) next['data-borders'] = borders;
      const shadow = anchor.current?.closest('[data-shadow]')?.getAttribute('data-shadow');
      if (shadow) next['data-shadow'] = shadow;
      const accent = anchor.current?.closest('[data-accent]:not([data-accent="inherit"]),[data-color]:not([data-color="inherit"])');
      const accentValue = accent?.getAttribute('data-accent'), colorValue = accent?.getAttribute('data-color');
      if (accentValue && accentValue !== 'inherit') next['data-accent'] = accentValue;
      else if (colorValue && colorValue !== 'inherit') next['data-color'] = colorValue;
      setScope(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      const ancestors: HTMLElement[] = [];
      for (let element = anchor.current; element; element = element.parentElement) ancestors.push(element);
      if (ancestors.length !== observed.length || ancestors.some((element, index) => element !== observed[index])) {
        observer.disconnect();
        // A moved/replaced anchor must observe its new inheritance chain too.
        for (const element of ancestors) observer.observe(element, { attributes: true, childList: true, attributeFilter: ['data-theme', 'data-accent', 'data-color', 'data-borders', 'data-shadow', 'data-radius'] });
        observed = ancestors;
      }
    };
    const observer = new MutationObserver(read);
    read();
    return () => observer.disconnect();
  });
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
export function useAnchoredOverlay(open: boolean, anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, { align = 'start', side = 'bottom', matchWidth = false, arrow = false }: { align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; matchWidth?: boolean; arrow?: boolean } = {}) {
  const [position, setPosition] = useState<CSSProperties>({ left: 0, top: 0, visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = anchor.current, surface = panel.current; if (!trigger || !surface) return;
      const rect = trigger.getBoundingClientRect();
      const styles = getComputedStyle(surface);
      const gutter = parseFloat(styles.getPropertyValue('--cap-overlay-gutter')) || 12;
      const gap = parseFloat(styles.getPropertyValue('--cap-overlay-gap')) || 12;
      const viewport = window.visualViewport, width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const viewportLeft = viewport?.offsetLeft ?? 0, viewportTop = viewport?.offsetTop ?? 0;
      if (matchWidth) surface.style.minWidth = `${Math.min(rect.width, width - gutter * 2)}px`;
      const measured = surface.getBoundingClientRect(), bounds = { width: surface.offsetWidth || measured.width, height: surface.offsetHeight || measured.height };
      // Measure content independently of the last constrained height: otherwise resizing
      // a long menu can repeatedly flip its side and erase the visual anchor gap.
      const preferredLimit = parseFloat(styles.getPropertyValue('--cap-overlay-max-height')) || 360;
      const naturalHeight = Math.max(bounds.height, surface.scrollHeight + surface.offsetHeight - surface.clientHeight);
      const wantedHeight = Math.min(naturalHeight, preferredLimit);
      const below = height + viewportTop - rect.bottom - gutter - gap, above = rect.top - viewportTop - gutter - gap;
      const placeAbove = side === 'top' ? above >= wantedHeight || above > below : below < wantedHeight && above > below;
      const available = Math.max(0, Math.min(height - gutter * 2, placeAbove ? above : below));
      const panelHeight = Math.min(wantedHeight, available);
      const left = align === 'end' ? rect.right - bounds.width : align === 'center' ? rect.left + (rect.width - bounds.width) / 2 : rect.left;
      const top = placeAbove ? rect.top - panelHeight - gap : rect.bottom + gap;
      const placedLeft = Math.max(viewportLeft + gutter, Math.min(left, viewportLeft + width - bounds.width - gutter));
      const arrowPosition = arrow ? { '--cap-tooltip-arrow-x': `${rect.left + rect.width / 2 - placedLeft}px` } : {};
      const next: CSSProperties = { ...arrowPosition, left: placedLeft, top: Math.max(viewportTop + gutter, Math.min(top, viewportTop + height - panelHeight - gutter)), maxHeight: Math.min(preferredLimit, available), maxWidth: width - gutter * 2, visibility: 'visible', transformOrigin: placeAbove ? 'bottom center' : 'top center' };
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (anchor.current) observer?.observe(anchor.current); if (panel.current) observer?.observe(panel.current);
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true); window.visualViewport?.addEventListener('resize', update); window.visualViewport?.addEventListener('scroll', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, [open, anchor, panel, align, side, matchWidth, arrow]);
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
export interface DialogProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; className?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; closeLabel?: string; dismissOnOutside?: boolean }
export interface DrawerProps extends DialogProps { side?: 'left' | 'right' | 'bottom'; variant?: 'inset' | 'edge' }
function Modal({ open, onOpenChange, title, description, children, footer, className, size = 'md', closeLabel = 'Закрыть', dismissOnOutside = true, side, variant = 'inset' }: DrawerProps) {
  const anchor = useRef<HTMLSpanElement>(null), layer = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), id = useId();
  const scope = useOverlayScope(anchor), present = useOverlayPresence(open), wasOpen = useRef(false), opener = useRef<HTMLElement | null>(null);
  const parents = useContext(OverlayParents), descendants = useMemo(() => [...parents, panel], [parents, panel]);
  // Capture before React commits descendants with autoFocus.
  if (open && !wasOpen.current && typeof document !== 'undefined') opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpen.current = open;
  useModalFocus(open, layer, panel, opener, () => onOpenChange(false));
  useOverlayDismiss(open, panel, anchor, () => onOpenChange(false), dismissOnOutside);
  return <><span hidden ref={anchor} />{present && typeof document !== 'undefined' && createPortal(<OverlayParents.Provider value={descendants}><div ref={layer} className="cap-modal-layer" data-state={open ? 'open' : 'closed'} data-side={side} data-variant={side ? variant : undefined} {...scope}><div aria-hidden="true" className="cap-modal-backdrop" /><div ref={panel} role="dialog" aria-hidden={!open || undefined} inert={!open} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1} className={cx('cap-dialog', side && 'cap-drawer', className)} data-surface="floating" data-size={size} data-side={side} data-variant={side ? variant : undefined}><div className="cap-dialog-header"><div><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div><IconButton variant="ghost" icon="close" label={closeLabel} onClick={() => onOpenChange(false)} /></div><div className="cap-dialog-body">{children}</div>{footer && <div className="cap-dialog-footer">{footer}</div>}</div></div></OverlayParents.Provider>, document.body)}</>;
}
export function Dialog(props: DialogProps) { return <Modal {...props} />; }
export function Drawer({ side = 'right', ...props }: DrawerProps) { return <Modal {...props} side={side} />; }
export interface TooltipProps {
  content: ReactNode;
  children: ReactElement<{ 'aria-describedby'?: string }>;
  shortcut?: string[];
  /** Small label above the main text. Tooltip content must remain non-interactive. */
  caption?: ReactNode;
  /** Optional supporting text below the main text. */
  description?: ReactNode;
  variant?: 'default' | 'inverse';
  arrow?: boolean;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
}
export function Tooltip({ content, children, shortcut, caption, description, variant = 'default', arrow = false, side = 'top', align = 'center' }: TooltipProps) {
  const [open, setOpen] = useState(false), id = useId(), anchor = useRef<HTMLSpanElement>(null), panel = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scope = useOverlayScope(anchor), position = useAnchoredOverlay(open, anchor, panel, { side, align, arrow }), present = useOverlayPresence(open);
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  const hideLater = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 100); };
  useOverlayDismiss(open, panel, anchor, hide);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <span ref={anchor} className="cap-tooltip-wrap" onMouseEnter={() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 350); }} onMouseLeave={hideLater} onFocus={() => { clearTimeout(timer.current); setOpen(true); }} onBlur={hide} onPointerDown={hide}>{cloneElement(children, { 'aria-describedby': [children.props['aria-describedby'], open && id].filter(Boolean).join(' ') || undefined })}{present && <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={id} role="tooltip" aria-hidden={!open || undefined} data-state={open ? 'open' : 'closed'} data-variant={variant} data-arrow={arrow || undefined} data-side={position.transformOrigin === 'bottom center' ? 'top' : 'bottom'} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideLater} className="cap-tooltip cap-tooltip-v2" style={position} {...scope}><div className="cap-tooltip-body">{caption && <div className="cap-tooltip-caption">{caption}</div>}<div className="cap-tooltip-content">{content}</div>{description && <div className="cap-tooltip-description">{description}</div>}{shortcut && <span className="cap-tooltip-shortcut">{shortcut.map((key, index) => <Kbd key={`${key}-${index}`}>{key}</Kbd>)}</span>}</div></div></OverlayPortal>}</span>;
}
export interface MenuItem { id: string; label: string; icon?: IconSource; shortcut?: string; disabled?: boolean; danger?: boolean; separator?: boolean; onSelect?: () => void }
export interface MenuProps { label: string; items: MenuItem[]; icon?: IconSource; disabled?: boolean; size?: Size; variant?: ButtonProps['variant']; className?: string }
export function Menu({ label, items, icon = 'more', disabled, size, variant = 'ghost', className }: MenuProps) {
  const [open, setOpen] = useState(false), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId(), startAtEnd = useRef(false);
  const scope = useOverlayScope(trigger), position = useAnchoredOverlay(open, trigger, panel, { align: 'end' }), present = useOverlayPresence(open);
  const hoverRoot = useRef<HTMLDivElement>(null);
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
  return <span className="cap-menu-root"><IconButton ref={trigger} label={label} icon={icon} variant={variant} size={size} disabled={disabled} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => { startAtEnd.current = false; setOpen(!open); }} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); startAtEnd.current = e.key === 'ArrowUp'; setOpen(true); } }} />{present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} role="menu" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={label} id={id} className={cx('cap-menu', 'cap-menu-v2', className)} style={position} {...scope} onKeyDown={onKeyDown} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== trigger.current) close(false); }}><div ref={hoverRoot} className="cap-menu-items cap-shared-hover"><MovingHighlight root={hoverRoot} hover target=".cap-menu-item:not(:disabled)"/>{items.map(item => <div key={item.id} role="none">{item.separator && <hr className="cap-separator" />}<button type="button" role="menuitem" className="cap-menu-item" tabIndex={-1} data-label={item.label} data-danger={item.danger || undefined} disabled={item.disabled} onClick={() => { close(); item.onSelect?.(); }}>{item.icon && <Icon name={item.icon} />}<span>{item.label}</span>{item.shortcut && <Kbd>{item.shortcut}</Kbd>}</button></div>)}</div></div></OverlayPortal>}</span>;
}
export interface PopoverProps { label: string; triggerContent?: ReactNode; triggerIcon?: IconSource; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; disabled?: boolean; size?: Size }
export function Popover({ label, triggerContent, triggerIcon, children, open: controlledOpen, onOpenChange, className, align, side, disabled, size = 'md' }: PopoverProps) {
  const [internal, setInternal] = useState(false), open = controlledOpen ?? internal;
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const scope = useOverlayScope(trigger), position = useAnchoredOverlay(open, trigger, panel, { align, side }), present = useOverlayPresence(open);
  const restoreFocus = useRef(true);
  const setOpen = (value: boolean) => { if (value) restoreFocus.current = true; if (controlledOpen === undefined) setInternal(value); onOpenChange?.(value); };
  const close = (restore = true) => { restoreFocus.current = restore; setOpen(false); if (restore) trigger.current?.focus(); };
  useOverlayDismiss(open, panel, trigger, close);
  useEffect(() => { if (!open) return; return () => { if (restoreFocus.current && trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); }; }, [open]);
  useEffect(() => { if (open && panel.current && position.visibility === 'visible') (focusables(panel.current)[0] ?? panel.current).focus({ preventScroll: true }); }, [open, position.visibility]);
  const triggerProps = { ref: trigger, disabled, size, 'aria-haspopup': 'dialog' as const, 'aria-expanded': open, 'aria-controls': open ? id : undefined, onClick: () => setOpen(!open) };
  return <span className="cap-popover-root">{triggerIcon ? <IconButton {...triggerProps} label={label} icon={triggerIcon} /> : <Button {...triggerProps} aria-label={triggerContent ? label : undefined}>{triggerContent ?? label}<Icon name="down" size={12} /></Button>}{present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} id={id} role="dialog" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={label} tabIndex={-1} className={cx('cap-popover', 'cap-popover-v2', className)} style={position} {...scope} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && !trigger.current?.contains(e.relatedTarget) && !childSurfaceContains(panel.current, e.relatedTarget) && !panel.current?.closest('.cap-modal-layer')?.contains(e.relatedTarget)) close(false); }} onKeyDown={e => {
    if (e.key !== 'Tab' || !panel.current) return;
    const choices = focusables(panel.current), active = document.activeElement;
    if (e.shiftKey && (active === choices[0] || active === panel.current)) { e.preventDefault(); close(); }
    else if (!e.shiftKey && (active === choices.at(-1) || !choices.length)) { e.preventDefault(); close(); const all = focusables(document.body), index = all.indexOf(trigger.current!); all[index + 1]?.focus(); }
  }}>{children}</div></OverlayPortal>}</span>;
}
export interface CommandItem { id: string; label: string; description?: string; icon?: IconSource; shortcut?: string; onSelect: () => void }
export function CommandPalette({ open, onOpenChange, items, placeholder = 'Найти команду или объект…' }: { open: boolean; onOpenChange: (open: boolean) => void; items: CommandItem[]; placeholder?: string }) {
  const [query, setQuery] = useState(''), [active, setActive] = useState(0), id = useId();
  const input = useRef<HTMLInputElement>(null), hoverRoot = useRef<HTMLDivElement>(null);
  const filtered = items.filter(i => `${i.label} ${i.description ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  useEffect(() => { if (open) { setQuery(''); setActive(0); input.current?.focus(); } }, [open]);
  const choose = (item: CommandItem) => { onOpenChange(false); item.onSelect(); };
  const index = Math.min(active, Math.max(0, filtered.length - 1));
  useEffect(() => { if (open) document.getElementById(`${id}-${index}`)?.scrollIntoView?.({ block: 'nearest' }); }, [id, index, open]);
  return <Dialog open={open} onOpenChange={onOpenChange} title="Быстрый поиск" className="cap-command" footer={<span className="cap-command-help"><Kbd>↑↓</Kbd> навигация <Kbd>↵</Kbd> выбрать <Kbd>esc</Kbd> закрыть</span>}><div className="cap-command-input"><Icon name="search" size={20} /><input ref={input} autoFocus role="combobox" aria-label="Поиск команд" aria-expanded={true} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={filtered.length ? `${id}-${index}` : undefined} value={query} placeholder={placeholder} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(filtered.length ? (index + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0); }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && filtered[index]) { e.preventDefault(); choose(filtered[index]); }
  }} /></div><div id={`${id}-list`} role="listbox" aria-label="Результаты поиска" ref={hoverRoot} className="cap-command-list cap-shared-hover"><MovingHighlight root={hoverRoot} selected="[aria-selected=true]" hover target=".cap-command-item" revision={`${query}:${index}`}/>{filtered.map((item, i) => <div key={item.id} id={`${id}-${i}`} role="option" aria-selected={i === index} className="cap-command-item" onPointerMove={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => choose(item)}>{item.icon && <Icon name={item.icon} />}<span>{item.label}{item.description && <small>{item.description}</small>}</span>{item.shortcut && <Kbd>{item.shortcut}</Kbd>}</div>)}</div>{!filtered.length && <p className="cap-command-empty" role="status">Ничего не найдено</p>}</Dialog>;
}
export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'color'>, FeedbackStyleProps {
  title: string;
  description?: string;
  onDismiss?: () => void;
  icon?: ReactNode;
  action?: ReactNode;
}
export function Toast({ title, description, onDismiss, icon, action, tone = 'success', color, appearance = 'neutral', contrast = false, surface = 'floating', className, ...props }: ToastProps) {
  return <div className={cx('cap-toast', 'cap-feedback', className)} data-surface={surface === 'inherit' ? undefined : surface} data-tone={tone} data-feedback-appearance={appearance} data-contrast={contrast || undefined} data-accent={appearance === 'neutral' ? undefined : feedbackColor(tone,color)} role="status" {...props}><FeedbackIcon tone={tone} color={color} contrast={contrast}>{icon}</FeedbackIcon><div className="cap-toast-content"><strong>{title}</strong>{description && <p>{description}</p>}{action && <div className="cap-toast-action">{action}</div>}</div>{onDismiss && <IconButton label="Скрыть уведомление" icon="close" size="sm" variant="ghost" onClick={onDismiss} />}</div>;
}
