import { useTranslate } from './locale.js';
import { MovingHighlight } from './moving-highlight.js';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cx, Icon, IconBox, Counter, TextAction, type Color, type IconSource, type Size } from './primitives.js';
export function Card({ className, variant = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'subtle' | 'elevated' }) { return <div className={cx('cap-card', 'cap-surface-boundary', className)} data-variant={variant} data-surface={variant === 'subtle' ? 'canvas' : 'raised'} {...props} />; }
export function ObjectCard({ title, description, icon = 'page', color = 'gray', meta, cover, className, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & { title: string; description?: string; icon?: IconSource; color?: Color; meta?: ReactNode; cover?: ReactNode }) {
  return <button type="button" className={cx('cap-object-card', className)} data-surface="raised" {...props}>{cover && <span className="cap-object-cover">{cover}</span>}<span className="cap-object-body"><IconBox icon={icon} color={color} /><strong>{title}</strong>{description && <span className="cap-object-description">{description}</span>}{meta && <span className="cap-object-meta">{meta}</span>}</span></button>;
}
export interface SidebarItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> { icon?: IconSource; active?: boolean; count?: number; color?: Color | 'inherit' }
export function SidebarItem({ icon, active, count, color = 'neutral', children, className, ...props }: SidebarItemProps) {
  return <button type="button" className={cx('cap-sidebar-item', className)} data-color={color === 'inherit' ? undefined : color} data-accented={color !== 'neutral' && color !== 'gray' || undefined} aria-current={active ? 'page' : undefined} {...props}>{icon && <Icon name={icon} />}<span>{children}</span>{count !== undefined && <Counter value={count} max={99} size="xs" variant="plain"/>}</button>;
}
export function CollectionRow({ title, icon = 'page', color = 'gray', meta, className, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & { title: string; icon?: IconSource; color?: Color; meta?: ReactNode }) {
  return <button type="button" className={cx('cap-collection-row', className)} {...props}><IconBox icon={icon} color={color} size="sm" /><span>{title}</span>{meta && <span className="cap-row-meta">{meta}</span>}</button>;
}
export function PropertyRow({ label, icon, children, className, ...props }: HTMLAttributes<HTMLDivElement> & { label: string; icon?: IconSource }) {
  return <div className={cx('cap-property-row', className)} {...props}><span className="cap-property-label">{icon && <Icon name={icon} />}{label}</span><div>{children}</div></div>;
}
export function Breadcrumbs({ items, label: suppliedLabel }: { items: { label: string; href?: string }[]; label?: string }) {
  const t = useTranslate();
  const label = suppliedLabel === undefined ? (t("Хлебные крошки", "Breadcrumbs")) : suppliedLabel;

  return <nav aria-label={label} className="cap-breadcrumbs"><ol>{items.map((item, i) => <li key={i}>{i > 0 && <Icon name="chevron" size={12} />}{item.href && i < items.length - 1 ? <TextAction href={item.href}>{item.label}</TextAction> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}
export function Callout({ color = 'blue', icon = 'info', title, children, className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'color'> & { color?: Color; icon?: IconSource; title?: string }) {
  return <div className={cx('cap-callout', className)} data-color={color} {...props}><Icon name={icon} size={18} /><div>{title && <strong>{title}</strong>}{children}</div></div>;
}
export function EmptyState({ icon = 'folder', title, description, action }: { icon?: IconSource | false; title: string; description?: string; action?: ReactNode }) {
  return <div className="cap-empty">{icon && <span className="cap-empty-icon" aria-hidden="true"><IconBox icon={icon} color="neutral" size="lg" /></span>}<strong>{title}</strong>{description && <p>{description}</p>}{action}</div>;
}
export type AccordionProps = Omit<React.ComponentPropsWithoutRef<'details'>, 'title'> & { title: ReactNode; variant?: 'default' | 'navigation' | 'bouncy'; icon?: IconSource; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; expandLabel?: string; collapseLabel?: string };
export function Accordion({ title, children, className, open, onToggle, variant = 'default', icon, defaultOpen = false, onOpenChange, expandLabel, collapseLabel, ...props }: AccordionProps) {
  const [fallback, setFallback] = useState(false);
  const [requestedOpen, setRequestedOpen] = useState(open ?? defaultOpen);
  const [renderedOpen, setRenderedOpen] = useState(open ?? defaultOpen);
  const body = useRef<HTMLDivElement>(null), summary = useRef<HTMLElement>(null), initialized = useRef(false);
  useLayoutEffect(() => {
    setFallback(variant === 'bouncy' || !(globalThis.CSS?.supports?.('selector(::details-content)') && globalThis.CSS.supports('interpolate-size: allow-keywords')));
  }, [variant]);
  useEffect(() => { if (open !== undefined) setRequestedOpen(open); }, [open]);
  useLayoutEffect(() => {
    if (!requestedOpen && body.current?.contains(document.activeElement)) summary.current?.focus();
  }, [requestedOpen]);
  useLayoutEffect(() => {
    if (!fallback || !body.current) return;
    const element = body.current;
    if (!initialized.current) {
      initialized.current = true;
      element.style.height = renderedOpen ? 'auto' : '0px';
      element.style.opacity = renderedOpen ? '1' : '0';
      if (requestedOpen === renderedOpen) return;
    }
    if (requestedOpen && !renderedOpen) { setRenderedOpen(true); return; }
    if (!renderedOpen) return;
    if (!requestedOpen && element.contains(document.activeElement)) summary.current?.focus();
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      element.style.height = requestedOpen ? 'auto' : '0px';
      element.style.opacity = requestedOpen ? '1' : '0';
      if (!requestedOpen) setRenderedOpen(false);
      return;
    }
    const start = element.getBoundingClientRect().height;
    const end = requestedOpen ? element.scrollHeight : 0;
    element.style.height = `${start}px`;
    element.style.opacity = requestedOpen ? '1' : '0';
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (requestedOpen) element.style.height = 'auto';
      else setRenderedOpen(false);
    };
    const frame = requestAnimationFrame(() => { element.style.height = `${end}px`; });
    const onEnd = (event: TransitionEvent) => { if (event.target === element && event.propertyName === 'height') finish(); };
    element.addEventListener('transitionend', onEnd);
    const timer = setTimeout(finish, variant === 'bouncy' ? 440 : 230);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); element.removeEventListener('transitionend', onEnd); };
  }, [fallback, requestedOpen, renderedOpen, variant]);
  const request = (next: boolean) => {
    onOpenChange?.(next);
    if (open === undefined || !onOpenChange) setRequestedOpen(next);
  };
  const toggleFallback = () => request(!requestedOpen);
  return <details className={cx('cap-accordion', className)} {...props} open={fallback ? renderedOpen : requestedOpen} onToggle={event => { if (!fallback) setRequestedOpen(event.currentTarget.open); onToggle?.(event); }} data-variant={variant} data-fallback={fallback || undefined} data-expanded={requestedOpen}>
    <summary ref={summary} aria-expanded={requestedOpen} aria-label={requestedOpen ? collapseLabel : expandLabel} onClick={event => { event.preventDefault(); request(!requestedOpen); }} onKeyDown={fallback ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleFallback(); } } : undefined}><Icon name="chevron" className="cap-accordion-chevron" />{icon && <Icon name={icon} className="cap-accordion-icon"/>}<span className="cap-accordion-title">{title}</span></summary>
    <div ref={body} className="cap-accordion-body" aria-hidden={!requestedOpen} inert={!requestedOpen}><div className="cap-accordion-content">{children}</div></div>
  </details>;
}
export interface TabItem { value: string; label: string; content: ReactNode; disabled?: boolean; count?: number; color?: Color | 'inherit' }
export interface TabsProps { size?: Size; variant?: 'line' | 'pills' | 'segment' | 'outline' | 'accent'; items: TabItem[]; value: string; onValueChange: (v: string) => void; label: string; className?: string; scrollLabels?: { previous: string; next: string } }
export function Tabs({ items, value, onValueChange, label, className, variant = 'line', size = 'md', scrollLabels: suppliedScrollLabels }: TabsProps) {
  const t = useTranslate();
  const scrollLabels = suppliedScrollLabels === undefined ? ({ previous: t("Прокрутить вкладки влево", "Scroll tabs left"), next: t("Прокрутить вкладки вправо", "Scroll tabs right") }) : suppliedScrollLabels;

  const id = useId(), track = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ overflow: false, left: false, right: false });
  const enabled = items.filter(item => !item.disabled);
  const measure = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    const max = Math.max(0, node.scrollWidth - node.clientWidth);
    const rtl = getComputedStyle(node).direction === 'rtl';
    const fromLeft = Math.max(0, Math.min(max, rtl ? max + node.scrollLeft : node.scrollLeft));
    const next = { overflow: max > 1, left: fromLeft > 1, right: fromLeft < max - 1 };
    setEdges(previous => previous.overflow === next.overflow && previous.left === next.left && previous.right === next.right ? previous : next);
  }, []);
  const reveal = useCallback((tab: HTMLElement | null) => {
    const node = viewport.current;
    if (!node || !tab) return;
    const bounds = node.getBoundingClientRect(), item = tab.getBoundingClientRect();
    const max = Math.max(0, node.scrollWidth - node.clientWidth), rtl = getComputedStyle(node).direction === 'rtl';
    const fromLeft = Math.max(0, Math.min(max, rtl ? max + node.scrollLeft : node.scrollLeft));
    const left = bounds.left + (fromLeft > 1 ? 32 : 0), right = bounds.right - (fromLeft < max - 1 ? 32 : 0);
    const delta = item.left < left ? item.left - left : item.right > right ? item.right - right : 0;
    // scrollIntoView can move ancestors and the document. Reveal only this viewport.
    if (delta && node.scrollBy) node.scrollBy({ left: delta, behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, []);
  useLayoutEffect(() => {
    const node = viewport.current, list = track.current;
    if (!node || !list) return;
    const update = () => { measure(); reveal(list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(node); observer?.observe(list);
    node.addEventListener('scroll', measure, { passive: true });
    update();
    return () => { observer?.disconnect(); node.removeEventListener('scroll', measure); };
  }, [measure, reveal]);
  useLayoutEffect(() => {
    measure(); reveal(track.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? null);
  }, [value, items, measure, reveal]);
  const scroll = (direction: number) => {
    const node = viewport.current;
    node?.scrollBy?.({ left: direction * node.clientWidth * 0.75, behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <div className={cx('cap-tabs', className)}><div className="cap-tab-bar" data-variant={variant} data-overflow={edges.overflow || undefined}>
    {edges.overflow && <button type="button" className="cap-tab-scroll" data-edge="left" aria-label={scrollLabels.previous} aria-controls={`${id}-viewport`} disabled={!edges.left} onClick={() => scroll(-1)}><Icon name="chevron"/></button>}
    <div ref={viewport} id={`${id}-viewport`} className="cap-tab-viewport" data-left={edges.left || undefined} data-right={edges.right || undefined} onFocusCapture={event => { if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'tab') reveal(event.target); }}>
      <div ref={track} role="tablist" aria-label={label} data-size={size} data-variant={variant} className="cap-tab-list cap-shared-hover" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !enabled.length) return;
        event.preventDefault();
        const current = enabled.findIndex(item => `${id}-tab-${item.value}` === document.activeElement?.id);
        const index = current < 0 ? Math.max(0, enabled.findIndex(item => item.value === value)) : current;
        const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
        const direction = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
        const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(index + direction + enabled.length) % enabled.length];
        if (next) { onValueChange(next.value); document.getElementById(`${id}-tab-${next.value}`)?.focus(); }
      }}>
        {!['line', 'pills'].includes(variant) && <MovingHighlight root={track} selected="[role='tab'][aria-selected='true']" revision={value}/>}
        <MovingHighlight root={track} hover target="[role='tab']:not(:disabled):not([aria-selected='true'])"/>
        {items.map(item => <button type="button" key={item.value} id={`${id}-tab-${item.value}`} role="tab" data-color={item.color === 'inherit' ? undefined : item.color} data-accented={item.color !== undefined && item.color !== 'neutral' && item.color !== 'gray' || undefined} aria-selected={value === item.value} aria-controls={`${id}-panel-${item.value}`} tabIndex={value === item.value ? 0 : -1} disabled={item.disabled} onClick={() => onValueChange(item.value)}><span>{item.label}</span>{item.count !== undefined && <Counter value={item.count} max={99} size="xs" variant="plain"/>}</button>)}
      </div>
    </div>
    {edges.overflow && <button type="button" className="cap-tab-scroll" data-edge="right" aria-label={scrollLabels.next} aria-controls={`${id}-viewport`} disabled={!edges.right} onClick={() => scroll(1)}><Icon name="chevron"/></button>}
  </div>{items.map(item => <div key={item.value} id={`${id}-panel-${item.value}`} role="tabpanel" aria-labelledby={`${id}-tab-${item.value}`} hidden={value !== item.value} tabIndex={0} className="cap-tab-panel">{item.content}</div>)}</div>;
}
export function Table({ caption, columns, rows, className }: { caption: string; columns: string[]; rows: ReactNode[][]; className?: string }) {
  return <div className={cx('cap-table-wrap', 'cap-surface-boundary', className)} tabIndex={0} role="region" aria-label={caption}><table className="cap-table"><caption className="cap-sr-only">{caption}</caption><thead><tr>{columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
