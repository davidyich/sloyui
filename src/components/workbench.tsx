import { FeedbackIcon, feedbackColor, type FeedbackStyleProps } from './feedback.js';
import { MovingHighlight } from './moving-highlight.js';
import {
  Children, Fragment, isValidElement, forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type HTMLAttributes, type ReactNode,
} from 'react';
import { Counter, Button, Icon, IconButton, cx, type ButtonProps, type Color, type IconName, type Size } from './primitives.js';
import { Input, type InputProps } from './forms.js';
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
  /** An overlay outside the clipped viewport. Its measured height reserves scroll clearance. */
  floating?: ReactNode;
}
/** The ref points to the native scrolling viewport, not its decorative wrapper. */
export const ScrollArea = /* @__PURE__ */ forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea({
  label, axis = 'vertical', scrollbar = axis === 'horizontal' ? 'hidden' : 'auto', shadows = true, viewportClassName, contentClassName, viewportProps,
  onEdgesChange, floating, children, className, style, ...props
}, ref) {
  const viewport = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null), floatingLayer = useRef<HTMLDivElement>(null);
  const [floatingHeight, setFloatingHeight] = useState(0);
  useLayoutEffect(() => {
    const node = floatingLayer.current;
    if (!node) { setFloatingHeight(0); return; }
    const measureFloating = () => setFloatingHeight(node.getBoundingClientRect().height);
    measureFloating();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureFloating);
    observer?.observe(node);
    return () => observer?.disconnect();
  }, [floating]);
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
    data-scroll-bottom={edges.bottom || undefined} data-scroll-left={edges.left || undefined} data-floating={!!floating || undefined} style={{...style, '--cap-floating-height': `${floatingHeight}px`} as CSSProperties} {...props}>
    <div {...restViewport} ref={node => { viewport.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
      className={cx('cap-scroll-viewport', viewportClassName, viewportExtraClass)} role={restViewport.role ?? 'region'}
      aria-label={restViewport['aria-label'] ?? label} tabIndex={restViewport.tabIndex ?? 0}
      onScroll={event => { measure(); onScroll?.(event); }}>
      <div ref={content} className={cx('cap-scroll-content', contentClassName)}>{children}</div>
    </div>
    {floating && <div ref={floatingLayer} className="cap-scroll-floating">{floating}</div>}
  </div>;
});

export interface ButtonGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'prefix'> {
  label: string;
  attached?: boolean;
  size?: Size;
  orientation?: 'horizontal' | 'vertical';
  prefix?: ReactNode;
  color?: Color | 'inherit';
}
export function ButtonGroup({ label, attached = true, size, orientation = 'horizontal', prefix, color = 'neutral', className, children, ...props }: ButtonGroupProps) {
  const track = useRef<HTMLDivElement>(null);
  return <div role="group" aria-label={label} className={cx('cap-button-group', className)} data-attached={attached || undefined} data-size={size} data-orientation={orientation} data-color={color} data-accent={color === 'inherit' ? undefined : color} {...props}>
    {prefix !== undefined && <span className="cap-button-group-prefix">{(typeof prefix === 'number' || typeof prefix === 'string') ? <Counter value={prefix} size={size ?? 'md'} variant="plain"/> : prefix}</span>}<div ref={track} className={cx("cap-button-group-items", attached && "cap-shared-hover")} data-moving={attached||undefined}>{attached&&<MovingHighlight root={track} hover/>}{children}</div>
  </div>;
}

export interface SplitButtonProps extends Omit<ButtonProps, 'children' | 'trailing'> {
  label: string;
  menuLabel?: string;
  layout?: 'joined' | 'separated';
  items: MenuItem[];
}
export function SplitButton({ label, menuLabel = `${label}: дополнительные действия`, items, className, size, layout = 'joined', variant = 'primary', disabled, loading, ...props }: SplitButtonProps) {
  return <div className={cx('cap-split-button', className)} data-layout={layout} data-variant={variant} data-size={size} role="group" aria-label={label}>
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
export interface FloatingActionBarProps extends ActionBarProps {
  position?: 'static' | 'sticky';
  leading?: ReactNode;
  trailing?: ReactNode;
  variant?: 'surface' | 'divided';
  action?: {label:string; icon:import('./primitives.js').IconSource; onClick:()=>void; variant?: 'primary' | 'accent'; disabled?:boolean};
}
function floatingSegments(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap(child => isValidElement<{children?: ReactNode}>(child) && child.type === Fragment
    ? floatingSegments(child.props.children) : [child]);
}
export function FloatingActionBar({ position = 'sticky', size = 'md', leading, trailing, children, className, variant = 'surface', action, orientation = 'horizontal', ...props }: FloatingActionBarProps) {
  const hoverRoot = useRef<HTMLDivElement>(null);
  return <ActionBar className={cx('cap-floating-action-bar', className)} data-position={position} data-variant={variant} data-surface="floating" size={size} orientation={orientation} {...props}>
    {leading && <div className="cap-floating-leading-slot">{leading}</div>}
    <div ref={hoverRoot} className="cap-floating-items cap-shared-hover"><MovingHighlight root={hoverRoot} hover target=".cap-button:not(:disabled):not([data-variant=primary]):not([data-variant=accent]):not([data-variant=accent-secondary]),.cap-select-trigger:not(:disabled),.cap-combobox-input-wrap:not(:has(input:disabled))"/>{variant==='divided'?floatingSegments(children).map((child,index)=><div className="cap-floating-segment" key={isValidElement(child) ? child.key ?? index : index}>{child}</div>):children}</div>
    {(action || (trailing && orientation==='horizontal')) && <div className="cap-floating-trailing-slot">{action ? orientation==='vertical' ? <IconButton label={action.label} icon={action.icon} variant={action.variant??'accent'} onClick={action.onClick} disabled={action.disabled}/> : <Button variant={action.variant??'accent'} onClick={action.onClick} disabled={action.disabled} leading={<Icon name={action.icon}/>}>{action.label}</Button> : trailing}</div>}
  </ActionBar>;
}

/** Compatibility wrapper; all fields share labelPlacement="inside". */
export interface FloatingFieldProps extends Omit<InputProps, 'labelPlacement'> { label: string; inputClassName?: string }
export const FloatingField = /* @__PURE__ */ forwardRef<HTMLInputElement, FloatingFieldProps>(function FloatingField({ className, inputClassName, ...props }, ref) {
  return <div className={cx('cap-floating-field',className)}><Input {...props} ref={ref} labelPlacement="inside" className={inputClassName}/></div>;
});

export type { FeedbackTone } from './feedback.js';
export interface StatusBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'>, FeedbackStyleProps {
  variant?: 'plain' | 'surface';
  leading?: ReactNode;
  trailing?: ReactNode;
  busy?: boolean;
}
export function StatusBar({ tone = 'neutral', color, appearance = 'neutral', contrast = false, surface = 'inherit', variant = 'plain', leading, trailing, busy, children, className, ...props }: StatusBarProps) {
  return <div className={cx('cap-status-bar', 'cap-feedback', className)} role="status" aria-live="polite" aria-busy={busy || undefined} data-variant={variant} data-tone={tone} data-feedback-appearance={appearance} data-contrast={contrast || undefined} data-surface={surface === 'inherit' ? undefined : surface} data-accent={appearance === 'neutral' ? undefined : feedbackColor(tone,color)} {...props}>
    <div className="cap-status-main">{leading ?? <FeedbackIcon className="cap-status-indicator" tone={tone} color={color} contrast={contrast}/>}<span>{children}</span></div>
    {trailing && <div className="cap-status-trailing">{trailing}</div>}
  </div>;
}

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'color'>, FeedbackStyleProps {
  title: ReactNode;
  icon?: ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onDismiss?: () => void;
  dismissLabel?: string;
}
export function Alert({ title, tone = 'info', color, appearance = 'neutral', contrast = false, surface = 'inherit', icon, expandable = false, expanded, defaultExpanded = false, onExpandedChange,
  onDismiss, dismissLabel = 'Закрыть уведомление', children, className, ...props }: AlertProps) {
  const id = useId(), [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = !expandable || (expanded ?? internalExpanded), hasBody = children !== undefined && children !== null;
  const toggleRef = useRef<HTMLButtonElement>(null), bodyRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!isExpanded && bodyRef.current?.contains(document.activeElement)) toggleRef.current?.focus();
  }, [isExpanded]);
  const titleContent = <><FeedbackIcon className="cap-alert-icon" tone={tone} color={color} contrast={contrast}>{icon}</FeedbackIcon>
    <span className="cap-alert-title">{title}</span>{expandable && hasBody && <span className="cap-alert-action" aria-hidden="true"><Icon name="down" size={15} className="cap-alert-chevron" /></span>}</>;
  return <div className={cx('cap-alert', 'cap-feedback', className)} role={tone === 'danger' ? 'alert' : 'status'} data-tone={tone} data-feedback-appearance={appearance} data-contrast={contrast || undefined} data-surface={surface === 'inherit' ? undefined : surface} data-accent={appearance === 'neutral' ? undefined : feedbackColor(tone,color)} data-expanded={isExpanded || undefined} {...props}>
    <div className="cap-alert-header" data-dismissible={!!onDismiss || undefined}>
      {expandable && hasBody ? <button ref={toggleRef} type="button" className="cap-alert-toggle" aria-expanded={isExpanded} aria-controls={`${id}-body`} onClick={() => {
        if (expanded === undefined) setInternalExpanded(!isExpanded); onExpandedChange?.(!isExpanded);
      }}>{titleContent}</button> : <div className="cap-alert-heading">{titleContent}</div>}
      {onDismiss && <IconButton className="cap-alert-dismiss" label={dismissLabel} icon="close" variant="ghost" size="sm" onClick={onDismiss} />}
    </div>
    {hasBody && <div ref={bodyRef} id={`${id}-body`} className="cap-alert-body" data-open={isExpanded || undefined} aria-hidden={!isExpanded} inert={!isExpanded}>
      <div><div className="cap-alert-body-content">{children}</div></div>
    </div>}
  </div>;
}

export interface SidebarPanelProps extends HTMLAttributes<HTMLElement> {
  label: string;
  header?: ReactNode;
  footer?: ReactNode;
  footerAlign?: 'start' | 'center' | 'end' | 'stretch';
  width?: CSSProperties['width'];
  surface?: 'base' | 'canvas' | 'raised' | 'floating';
}
export function SidebarPanel({ label, header, footer, footerAlign = 'start', width, surface = 'canvas', className, children, style, ...props }: SidebarPanelProps) {
  const hoverRoot = useRef<HTMLDivElement>(null);
  return <aside aria-label={label} className={cx('cap-sidebar-panel', className)} data-surface={surface} style={{ ...style, ...(width !== undefined ? { width } : {}) }} {...props}>
    {header && <div className="cap-sidebar-panel-header">{header}</div>}
    <ScrollArea label={`${label}: содержимое`} className="cap-sidebar-panel-scroll" contentClassName="cap-sidebar-panel-content"><div ref={hoverRoot} className="cap-sidebar-panel-items cap-shared-hover"><MovingHighlight root={hoverRoot} hover target=".cap-sidebar-item:not(:disabled),.cap-accordion[data-variant=navigation] > summary"/>{children}</div></ScrollArea>
    {footer && <div className="cap-sidebar-panel-footer" data-align={footerAlign}>{footer}</div>}
  </aside>;
}
