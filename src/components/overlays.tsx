import { useTranslate } from './locale.js';
import { FeedbackIcon, feedbackColor, type FeedbackStyleProps } from './feedback.js';
import { MovingHighlight } from './moving-highlight.js';
import { useContext, useMemo, cloneElement, useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type ReactElement, type HTMLAttributes, type KeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, IconButton, Kbd, cx, type IconSource, type ButtonProps, type Size } from './primitives.js';
import { ScrollArea } from './workbench.js';
import { OverlayParents, OverlayPortal, useOverlayPresence, useOverlayScope, useOverlayDismiss, useAnchoredOverlay, childSurfaceContains } from './overlay-foundations.js';
import { ExplicitTooltipContext } from './tooltip-context.js';
export { OverlayPortal, useOverlayPresence, useOverlayScope, useOverlayDismiss, useAnchoredOverlay } from './overlay-foundations.js';

const focusSelector = 'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
const focusables = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(focusSelector)).filter(element => {
  if (element.tabIndex < 0 || element.matches(':disabled') || element.closest('[hidden],[inert],[aria-hidden="true"]') || getComputedStyle(element).visibility === 'hidden') return false;
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) if (getComputedStyle(parent).display === 'none') return false;
  return true;
});
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
function Modal({ open, onOpenChange, title, description, children, footer, className, size = 'md', closeLabel: suppliedCloseLabel, dismissOnOutside = true, side, variant = 'inset', showTitle = true, headerContent }: DrawerProps & { showTitle?: boolean; headerContent?: ReactNode }) {
  const t = useTranslate();
  const closeLabel = suppliedCloseLabel === undefined ? (t("Закрыть", "Close")) : suppliedCloseLabel;

  const anchor = useRef<HTMLSpanElement>(null), layer = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), id = useId();
  const scope = useOverlayScope(anchor, open), present = useOverlayPresence(open), wasOpen = useRef(false), opener = useRef<HTMLElement | null>(null);
  const parents = useContext(OverlayParents), descendants = useMemo(() => [...parents, panel], [parents, panel]);
  // Capture before React commits descendants with autoFocus.
  if (open && !wasOpen.current && typeof document !== 'undefined') opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpen.current = open;
  useModalFocus(open, layer, panel, opener, () => onOpenChange(false));
  useOverlayDismiss(open, panel, anchor, () => onOpenChange(false), dismissOnOutside);
  return <><span hidden ref={anchor} />{present && typeof document !== 'undefined' && createPortal(<OverlayParents.Provider value={descendants}><div ref={layer} className="cap-modal-layer" data-state={open ? 'open' : 'closed'} data-side={side} data-variant={side ? variant : undefined} {...scope}><div aria-hidden="true" className="cap-modal-backdrop" /><div ref={panel} role="dialog" aria-hidden={!open || undefined} inert={!open} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} tabIndex={-1} className={cx('cap-dialog', side && 'cap-drawer', className)} data-surface="floating" data-size={size} data-side={side} data-variant={side ? variant : undefined}><div className="cap-dialog-header">{showTitle ? <div><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`}>{description}</p>}</div> : <h2 id={`${id}-title`} className="cap-sr-only">{title}</h2>}{headerContent}<IconButton variant="ghost" icon="close" label={closeLabel} onClick={() => onOpenChange(false)} /></div><div className="cap-dialog-body">{children}</div>{footer && <div className="cap-dialog-footer">{footer}</div>}</div></div></OverlayParents.Provider>, document.body)}</>;
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
  /** Maximum readable width in pixels or a CSS length; always capped to the viewport. */
  maxWidth?: number | string;
}
export function Tooltip({ content, children, shortcut, caption, description, variant = 'default', arrow = false, side = 'top', align = 'center', maxWidth = 288 }: TooltipProps) {
  const [open, setOpen] = useState(false), id = useId(), anchor = useRef<HTMLSpanElement>(null), panel = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scope = useOverlayScope(anchor, open), position = useAnchoredOverlay(open, anchor, panel, { side, align, arrow }), present = useOverlayPresence(open);
  const width = typeof maxWidth === 'number' ? Number.isFinite(maxWidth) ? Math.max(1, maxWidth) : 288 : maxWidth;
  const limitedWidth = typeof width === 'number' && typeof position.maxWidth === 'number' ? Math.min(width, position.maxWidth)
    : typeof width === 'number' ? `min(${width}px, calc(100vw - var(--cap-overlay-gutter, 12px) * 2))` : `min(${width}, ${typeof position.maxWidth === 'number' ? `${position.maxWidth}px` : 'calc(100vw - 24px)'})`;
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  const hideLater = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 100); };
  useOverlayDismiss(open, panel, anchor, hide);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ExplicitTooltipContext.Provider value={true}><span ref={anchor} className="cap-tooltip-wrap" onMouseEnter={() => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 350); }} onMouseLeave={hideLater} onFocus={() => { clearTimeout(timer.current); setOpen(true); }} onBlur={hide} onPointerDown={hide}>{cloneElement(children, { 'aria-describedby': [children.props['aria-describedby'], open && id].filter(Boolean).join(' ') || undefined })}{present && <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={id} role="tooltip" aria-hidden={!open || undefined} data-state={open ? 'open' : 'closed'} data-variant={variant} data-arrow={arrow || undefined} data-side={position.transformOrigin === 'bottom center' ? 'top' : 'bottom'} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideLater} className="cap-tooltip cap-tooltip-v2" style={{...position,maxWidth:limitedWidth}} {...scope}><div className="cap-tooltip-body">{caption && <div className="cap-tooltip-caption">{caption}</div>}<div className="cap-tooltip-content">{content}</div>{description && <div className="cap-tooltip-description">{description}</div>}{shortcut && <span className="cap-tooltip-shortcut">{shortcut.map((key, index) => <Kbd key={`${key}-${index}`}>{key}</Kbd>)}</span>}</div></div></OverlayPortal>}</span></ExplicitTooltipContext.Provider>;
}
export interface MenuItem { id: string; label: string; icon?: IconSource; shortcut?: string; disabled?: boolean; danger?: boolean; separator?: boolean; onSelect?: () => void }
export interface MenuProps { label: string; items: MenuItem[]; icon?: IconSource; triggerContent?: ReactNode; disabled?: boolean; size?: Size; variant?: ButtonProps['variant']; className?: string }
export function Menu({ label, items, icon = 'more', triggerContent, disabled, size, variant = 'ghost', className }: MenuProps) {
  const [open, setOpen] = useState(false), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId(), startAtEnd = useRef(false);
  const scope = useOverlayScope(trigger, open), position = useAnchoredOverlay(open, trigger, panel, { align: 'end' }), present = useOverlayPresence(open);
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
  const triggerProps: ButtonProps = {variant,size,disabled,'aria-label':label,'aria-haspopup':'menu','aria-expanded':open,'aria-controls':open?id:undefined,onClick:()=>{startAtEnd.current=false;setOpen(!open);},onKeyDown:e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();startAtEnd.current=e.key==='ArrowUp';setOpen(true);}}};
  return <span className="cap-menu-root" data-custom-trigger={triggerContent!==undefined||undefined}>{triggerContent!==undefined?<Button ref={trigger} {...triggerProps}>{triggerContent}</Button>:<IconButton ref={trigger} {...triggerProps} label={label} icon={icon}/>} {present && <OverlayPortal anchor={trigger} panel={panel}><div ref={panel} role="menu" aria-hidden={!open || undefined} inert={!open} data-state={open ? 'open' : 'closed'} aria-label={label} id={id} className={cx('cap-menu', 'cap-menu-v2', className)} style={position} {...scope} onKeyDown={onKeyDown} onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== trigger.current) close(false); }}><div ref={hoverRoot} className="cap-menu-items cap-shared-hover"><MovingHighlight root={hoverRoot} hover target=".cap-menu-item:not(:disabled)"/>{items.map(item => <div key={item.id} role="none">{item.separator && <hr className="cap-menu-separator" />}<button type="button" role="menuitem" className="cap-menu-item" tabIndex={-1} data-label={item.label} data-danger={item.danger || undefined} disabled={item.disabled} onClick={() => { close(); item.onSelect?.(); }}>{item.icon && <Icon name={item.icon} />}<span>{item.label}</span>{item.shortcut && <Kbd>{item.shortcut}</Kbd>}</button></div>)}</div></div></OverlayPortal>}</span>;
}
export interface PopoverProps { label: string; triggerContent?: ReactNode; triggerIcon?: IconSource; children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void; className?: string; align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; disabled?: boolean; size?: Size }
export function Popover({ label, triggerContent, triggerIcon, children, open: controlledOpen, onOpenChange, className, align, side, disabled, size = 'md' }: PopoverProps) {
  const [internal, setInternal] = useState(false), open = controlledOpen ?? internal;
  const id = useId(), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const scope = useOverlayScope(trigger, open), position = useAnchoredOverlay(open, trigger, panel, { align, side }), present = useOverlayPresence(open);
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
export interface CommandPaletteProps { open: boolean; onOpenChange: (open: boolean) => void; items: CommandItem[]; placeholder?: string; /** Hide the visual title while preserving the dialog's accessible name. */ showTitle?: boolean }
export function CommandPalette({ open, onOpenChange, items, placeholder: suppliedPlaceholder, showTitle = false }: CommandPaletteProps) {
  const t = useTranslate();
  const placeholder = suppliedPlaceholder === undefined ? (t("Найти команду или объект…", "Find a command or object…")) : suppliedPlaceholder;
  const [query, setQuery] = useState(''), [active, setActive] = useState(0), id = useId();
  const input = useRef<HTMLInputElement>(null), hoverRoot = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null), revealActive = useRef(true);
  const filtered = useMemo(() => { const term = query.toLocaleLowerCase(); return items.filter(i => `${i.label} ${i.description ?? ''}`.toLocaleLowerCase().includes(term)); }, [items, query]);
  useEffect(() => { if (open) { revealActive.current = true; setQuery(''); setActive(0); input.current?.focus(); } }, [open]);
  const choose = (item: CommandItem) => { onOpenChange(false); item.onSelect(); };
  const index = Math.min(active, Math.max(0, filtered.length - 1));
  useLayoutEffect(() => {
    if (!open || !revealActive.current) return;
    const node = viewport.current, option = document.getElementById(`${id}-${index}`);
    if (!node || !option) return;
    const bounds = node.getBoundingClientRect(), item = option.getBoundingClientRect();
    const clearance = Math.min(24, bounds.height / 4), top = bounds.top + clearance, bottom = bounds.bottom - clearance;
    const delta = item.top < top ? item.top - top : item.bottom > bottom ? item.bottom - bottom : 0;
    // Reveal only the command list; scrollIntoView can move the document behind it.
    if (delta) node.scrollTop += delta;
  }, [id, index, open, filtered.length, query]);
  const search = <div className="cap-command-input"><Icon name="search" size={16} /><input ref={input} autoFocus role="combobox" aria-label={t("Поиск команд", "Search commands")} aria-expanded={true} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={filtered.length ? `${id}-${index}` : undefined} value={query} placeholder={placeholder} onChange={e => { revealActive.current = true; setQuery(e.target.value); setActive(0); }} onKeyDown={e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); revealActive.current = true; setActive(filtered.length ? (index + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0); }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && filtered[index]) { e.preventDefault(); choose(filtered[index]); }
  }} /></div>;
  return <Modal open={open} onOpenChange={onOpenChange} title={t("Быстрый поиск", "Quick search")} showTitle={showTitle} headerContent={!showTitle ? search : undefined} className={cx("cap-command", !showTitle && "cap-command-compact")} footer={<span className="cap-command-help"><Kbd>↑↓</Kbd> {t("навигация", "navigate")}<Kbd>↵</Kbd> {t("выбрать", "select")}<Kbd>esc</Kbd> {t("закрыть", "close")}</span>}>
    {showTitle && search}
    <ScrollArea ref={viewport} label={t("Результаты поиска", "Search results")} className="cap-command-scroll" fade="vertical" fadeSize={24} fadeReveal={0} scrollbar="hidden" viewportProps={{ tabIndex: -1 }}>
      <div id={`${id}-list`} role="listbox" aria-label={t("Результаты поиска", "Search results")} ref={hoverRoot} className="cap-command-list cap-shared-hover"><MovingHighlight root={hoverRoot} selected="[aria-selected=true]" revision={`${query}:${index}`}/>{filtered.map((item, i) => <div key={item.id} id={`${id}-${i}`} role="option" aria-selected={i === index} className="cap-command-item" onPointerMove={event => { if (event.pointerType === 'touch') return; revealActive.current = false; setActive(previous => previous === i ? previous : i); }} onMouseDown={e => e.preventDefault()} onClick={() => choose(item)}>{item.icon && <Icon name={item.icon} />}<span>{item.label}{item.description && <small>{item.description}</small>}</span>{item.shortcut && <Kbd>{item.shortcut}</Kbd>}</div>)}</div>
      {!filtered.length && <p className="cap-command-empty" role="status">{t("Ничего не найдено", "No results")}</p>}
    </ScrollArea>
  </Modal>;
}
export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'color'>, FeedbackStyleProps {
  title: string;
  description?: string;
  onDismiss?: () => void;
  icon?: ReactNode;
  action?: ReactNode;
}
export function Toast({ title, description, onDismiss, icon, action, tone = 'success', color, appearance = 'neutral', contrast = false, surface = 'floating', className, ...props }: ToastProps) {
  const t = useTranslate();

  return <div className={cx('cap-toast', 'cap-feedback', className)} data-surface={surface === 'inherit' ? undefined : surface} data-tone={tone} data-feedback-appearance={appearance} data-contrast={contrast || undefined} data-accent={appearance === 'neutral' ? undefined : feedbackColor(tone,color)} role="status" {...props}><FeedbackIcon tone={tone} color={color} contrast={contrast}>{icon}</FeedbackIcon><div className="cap-toast-content"><strong>{title}</strong>{description && <p>{description}</p>}{action && <div className="cap-toast-action">{action}</div>}</div>{onDismiss && <IconButton label={t("Скрыть уведомление", "Dismiss notification")} icon="close" size="sm" variant="ghost" onClick={onDismiss} />}</div>;
}
