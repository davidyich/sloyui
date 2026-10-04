import {
  forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, type ReactNode,
} from 'react';
import { Button, Icon, IconButton, cx, type ButtonProps, type Color, type IconName, type Size } from './primitives.js';
import { Menu, type MenuItem } from './overlays.js';

export interface ScrollEdges { top: boolean; right: boolean; bottom: boolean; left: boolean }
export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  axis?: 'vertical' | 'horizontal' | 'both';
  scrollbar?: 'auto' | 'hidden';
  shadows?: boolean;
  viewportClassName?: string;
  contentClassName?: string;
  viewportProps?: HTMLAttributes<HTMLDivElement>;
  onEdgesChange?: (edges: ScrollEdges) => void;
}
/** The ref points to the native scrolling viewport, not its decorative wrapper. */
export const ScrollArea = /* @__PURE__ */ forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea({
  label, axis = 'vertical', scrollbar = axis === 'horizontal' ? 'hidden' : 'auto', shadows = true, viewportClassName, contentClassName, viewportProps,
  onEdgesChange, children, className, ...props
}, ref) {
  const viewport = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const notify = useRef(onEdgesChange); notify.current = onEdgesChange;
  const [edges, setEdges] = useState<ScrollEdges>({ top: false, right: false, bottom: false, left: false });
  const previous = useRef<ScrollEdges | null>(null);
  const measure = useCallback(() => {
    const node = viewport.current; if (!node) return;
    const vertical = axis !== 'horizontal', horizontal = axis !== 'vertical';
    const rtl = horizontal && getComputedStyle(node).direction === 'rtl';
    const horizontalOffset = Math.abs(node.scrollLeft), horizontalRemaining = node.scrollWidth - node.clientWidth - horizontalOffset;
    // A one-pixel tolerance avoids flicker from fractional scroll positions and zoom.
    const next = {
      top: vertical && node.scrollTop > 1,
      bottom: vertical && node.scrollHeight - node.clientHeight - node.scrollTop > 1,
      left: horizontal && (rtl ? horizontalRemaining : horizontalOffset) > 1,
      right: horizontal && (rtl ? horizontalOffset : horizontalRemaining) > 1,
    };
    if (!previous.current || Object.keys(next).some(key => next[key as keyof ScrollEdges] !== previous.current?.[key as keyof ScrollEdges])) {
      previous.current = next; setEdges(next); notify.current?.(next);
    }
  }, [axis]);
  useLayoutEffect(() => {
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (viewport.current) observer?.observe(viewport.current);
    if (content.current) observer?.observe(content.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [measure]);
  useLayoutEffect(measure, [children, measure]);
  const { onScroll, className: viewportExtraClass, ...restViewport } = viewportProps ?? {};
  return <div className={cx('cap-scroll-area', className)} data-axis={axis} data-scrollbar={scrollbar} data-shadows={shadows || undefined}
    data-scroll-top={edges.top || undefined} data-scroll-right={edges.right || undefined}
    data-scroll-bottom={edges.bottom || undefined} data-scroll-left={edges.left || undefined} {...props}>
    <div {...restViewport} ref={node => { viewport.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
      className={cx('cap-scroll-viewport', viewportClassName, viewportExtraClass)} role={restViewport.role ?? 'region'}
      aria-label={restViewport['aria-label'] ?? label} tabIndex={restViewport.tabIndex ?? 0}
      onScroll={event => { measure(); onScroll?.(event); }}>
      <div ref={content} className={cx('cap-scroll-content', contentClassName)}>{children}</div>
    </div>
  </div>;
});

export interface ButtonGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'prefix'> {
  label: string;
  attached?: boolean;
  size?: Size;
  orientation?: 'horizontal' | 'vertical';
  prefix?: ReactNode;
}
export function ButtonGroup({ label, attached = true, size, orientation = 'horizontal', prefix, className, children, ...props }: ButtonGroupProps) {
  return <div role="group" aria-label={label} className={cx('cap-button-group', className)} data-attached={attached || undefined} data-size={size} data-orientation={orientation} {...props}>
    {prefix !== undefined && <span className="cap-button-group-prefix">{prefix}</span>}{children}
  </div>;
}

export interface SplitButtonProps extends Omit<ButtonProps, 'children' | 'trailing'> {
  label: string;
  menuLabel?: string;
  items: MenuItem[];
}
export function SplitButton({ label, menuLabel = `${label}: дополнительные действия`, items, className, size, variant = 'primary', disabled, loading, ...props }: SplitButtonProps) {
  return <div className={cx('cap-split-button', className)} data-variant={variant} data-size={size} role="group" aria-label={label}>
    <Button {...props} size={size} variant={variant} disabled={disabled} loading={loading}>{label}</Button>
    <Menu label={menuLabel} icon="down" items={items} variant={variant} size={size} disabled={disabled || loading} />
  </div>;
}

export interface ActionBarProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  size?: Size;
  orientation?: 'horizontal' | 'vertical';
  rovingFocus?: boolean;
}
const actionSelector = 'button:not(:disabled),a[href],[role="button"][tabindex]:not([aria-disabled="true"])';
export function ActionBar({ label, size, orientation = 'horizontal', rovingFocus = true, className, children, onKeyDown, onFocusCapture, ...props }: ActionBarProps) {
  const root = useRef<HTMLDivElement>(null);
  const actions = () => Array.from(root.current?.querySelectorAll<HTMLElement>(actionSelector) ?? [])
    .filter(node => !node.closest('[hidden],[inert],[aria-hidden="true"],[role="menu"]'));
  const activate = (current: HTMLElement) => actions().forEach(node => { node.tabIndex = node === current ? 0 : -1; });
  useEffect(() => {
    if (!rovingFocus) return;
    const controls = actions();
    const initialTabIndices = controls.map(node => node.getAttribute('tabindex'));
    if (controls.length) activate(controls.find(node => node === document.activeElement) ?? controls.find(node => node.tabIndex === 0) ?? controls[0]);
    return () => controls.forEach((node, index) => { const original = initialTabIndices[index]; if (original === null) node.removeAttribute('tabindex'); else node.setAttribute('tabindex', original); });
  }, [children, rovingFocus]);
  return <div ref={root} className={cx('cap-action-bar', className)} data-size={size} role="toolbar" aria-label={label} aria-orientation={orientation} {...props}
    onFocusCapture={event => { onFocusCapture?.(event); if (rovingFocus && actions().includes(event.target as HTMLElement)) activate(event.target as HTMLElement); }}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (!rovingFocus || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const controls = actions(), index = controls.indexOf(event.target as HTMLElement);
      if (index < 0) return;
      const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      if (![previousKey, nextKey, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === nextKey ? 1 : -1) + controls.length) % controls.length;
      activate(controls[next]); controls[next].focus();
    }}>{children}</div>;
}
export interface FloatingActionBarProps extends ActionBarProps { position?: 'static' | 'sticky' }
export function FloatingActionBar({ position = 'sticky', className, ...props }: FloatingActionBarProps) {
  return <ActionBar className={cx('cap-floating-action-bar', className)} data-position={position} data-surface="raised" {...props} />;
}

export interface FloatingFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  inputClassName?: string;
}
export const FloatingField = /* @__PURE__ */ forwardRef<HTMLInputElement, FloatingFieldProps>(function FloatingField({
  label, hint, error, leading, trailing, id: suppliedId, className, inputClassName, placeholder, required, disabled,
  'aria-describedby': describedBy, 'aria-invalid': invalid, type = 'text', ...props
}, ref) {
  const generatedId = useId(), id = suppliedId ?? generatedId, description = error || hint;
  const persistent = !['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(type);
  return <div className={cx('cap-floating-field', className)} data-disabled={disabled || undefined} data-invalid={!!error || (invalid !== undefined && invalid !== false && invalid !== 'false') || undefined}>
    <div className="cap-floating-control" data-leading={!!leading || undefined} data-trailing={!!trailing || undefined} data-persistent={persistent || undefined}>
      {leading && <span className="cap-floating-leading" aria-hidden="true">{leading}</span>}
      <input {...props} ref={ref} id={id} type={type} disabled={disabled} required={required} placeholder={placeholder ?? ' '}
        aria-describedby={[describedBy, description && `${id}-description`].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : invalid} className={cx('cap-floating-input', inputClassName)} />
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {trailing && <span className="cap-floating-trailing">{trailing}</span>}
    </div>
    {description && <span id={`${id}-description`} className={cx('cap-field-hint', !!error && 'cap-error')} role={error ? 'alert' : undefined}>{description}</span>}
  </div>;
});

export type FeedbackTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
const toneColors: Record<FeedbackTone, Color> = { neutral: 'gray', info: 'blue', success: 'green', warning: 'amber', danger: 'red' };
const toneIcons: Record<FeedbackTone, IconName> = { neutral: 'info', info: 'info', success: 'check', warning: 'warning', danger: 'warning' };
export interface StatusBarProps extends HTMLAttributes<HTMLDivElement> {
  tone?: FeedbackTone;
  variant?: 'plain' | 'surface';
  leading?: ReactNode;
  trailing?: ReactNode;
  busy?: boolean;
}
export function StatusBar({ tone = 'neutral', variant = 'plain', leading, trailing, busy, children, className, ...props }: StatusBarProps) {
  return <div className={cx('cap-status-bar', className)} role="status" aria-live="polite" aria-busy={busy || undefined} data-variant={variant} data-tone={tone} data-color={toneColors[tone]} {...props}>
    <div className="cap-status-main">{leading ?? <span className="cap-status-dot" aria-hidden="true" />}<span>{children}</span></div>
    {trailing && <div className="cap-status-trailing">{trailing}</div>}
  </div>;
}

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  tone?: FeedbackTone;
  icon?: ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onDismiss?: () => void;
  dismissLabel?: string;
}
export function Alert({ title, tone = 'info', icon, expandable = false, expanded, defaultExpanded = false, onExpandedChange,
  onDismiss, dismissLabel = 'Закрыть уведомление', children, className, ...props }: AlertProps) {
  const id = useId(), [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = !expandable || (expanded ?? internalExpanded), hasBody = children !== undefined && children !== null;
  const titleContent = <><span className="cap-alert-icon" aria-hidden="true">{icon ?? <Icon name={toneIcons[tone]} size={18} />}</span>
    <span className="cap-alert-title">{title}</span>{expandable && hasBody && <span className="cap-alert-action" aria-hidden="true"><Icon name="down" size={15} className="cap-alert-chevron" /></span>}</>;
  return <div className={cx('cap-alert', className)} role={tone === 'danger' ? 'alert' : 'status'} data-tone={tone} data-color={toneColors[tone]} data-expanded={isExpanded || undefined} {...props}>
    <div className="cap-alert-header" data-dismissible={!!onDismiss || undefined}>
      {expandable && hasBody ? <button type="button" className="cap-alert-toggle" aria-expanded={isExpanded} aria-controls={`${id}-body`} onClick={() => {
        if (expanded === undefined) setInternalExpanded(!isExpanded); onExpandedChange?.(!isExpanded);
      }}>{titleContent}</button> : <div className="cap-alert-heading">{titleContent}</div>}
      {onDismiss && <IconButton className="cap-alert-dismiss" label={dismissLabel} icon="close" variant="ghost" size="sm" onClick={onDismiss} />}
    </div>
    {hasBody && <div id={`${id}-body`} className="cap-alert-body" data-open={isExpanded || undefined} aria-hidden={!isExpanded} inert={!isExpanded}>
      <div><div className="cap-alert-body-content">{children}</div></div>
    </div>}
  </div>;
}

export interface SidebarPanelProps extends HTMLAttributes<HTMLElement> {
  label: string;
  header?: ReactNode;
  footer?: ReactNode;
  width?: CSSProperties['width'];
}
export function SidebarPanel({ label, header, footer, width, className, children, style, ...props }: SidebarPanelProps) {
  return <aside aria-label={label} className={cx('cap-sidebar-panel', className)} data-surface="canvas" style={{ ...style, ...(width !== undefined ? { width } : {}) }} {...props}>
    {header && <div className="cap-sidebar-panel-header">{header}</div>}
    <ScrollArea label={`${label}: содержимое`} className="cap-sidebar-panel-scroll" contentClassName="cap-sidebar-panel-content">{children}</ScrollArea>
    {footer && <div className="cap-sidebar-panel-footer">{footer}</div>}
  </aside>;
}
