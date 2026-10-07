import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton, cx } from './primitives.js';
import { clampResize, resizeBounds, useFrameResize, useResizeSpace } from './resize-utils.js';
export interface ContentPane {
  content: ReactNode; label: string; open?: boolean; onOpenChange?: (open: boolean) => void;
  width?: number; defaultWidth?: number; minWidth?: number; maxWidth?: number; onWidthChange?: (width: number) => void;
  height?: number; defaultHeight?: number; minHeight?: number; maxHeight?: number; onHeightChange?: (height: number) => void;
  contentWidth?: number | string; surface?: 'base' | 'canvas' | 'raised' | 'floating';
}
export interface ContentLayoutProps extends HTMLAttributes<HTMLDivElement> {
  left?: ContentPane; right?: ContentPane; contentWidth?: number | string; label?: string;
  orientation?: 'horizontal' | 'vertical'; divider?: 'always' | 'hover' | 'none'; stretch?: boolean;
  /** Container width below which horizontal panes become a flow. Zero disables automatic stacking. */
  collapseAt?: number;
  /** Main content space reserved while resizing; defaults to 240 horizontal / 120 vertical. */
  minContentSize?: number;
}
type Side = 'left' | 'right';
const sides: Side[] = ['left', 'right'], handleSize = 12;
/** Independent width/height state; container fitting takes precedence over pane minimums. */
export function ContentLayout({ left, right, contentWidth = '100%', label = 'Контент', orientation = 'horizontal', divider = 'hover', stretch = true, collapseAt = 760, minContentSize, children, className, style, ...props }: ContentLayoutProps) {
  const root = useRef<HTMLDivElement>(null), id = useId(), vertical = orientation === 'vertical', space = useResizeSpace(root);
  const [widths, setWidths] = useState({ left: left?.defaultWidth ?? 240, right: right?.defaultWidth ?? 280 });
  const [heights, setHeights] = useState({ left: left?.defaultHeight ?? 200, right: right?.defaultHeight ?? 200 });
  const [resizing, setResizing] = useState<Side | null>(null);
  const drag = useRef<{ side: Side; start: number; size: number; pointerId: number; handle: HTMLDivElement } | null>(null);
  const collapsed = !vertical && collapseAt > 0 && space.width !== null && space.width < collapseAt;
  const mainMin = Math.max(0, Number.isFinite(minContentSize) ? minContentSize! : vertical ? 120 : 240);
  const paneFor = (side: Side) => side === 'left' ? left : right;
  const bounds = (pane: ContentPane) => resizeBounds(vertical ? pane.minHeight : pane.minWidth, vertical ? pane.maxHeight : pane.maxWidth, vertical ? 100 : 160, 600);
  const configuredSize = (side: Side) => { const pane = paneFor(side); if (!pane) return 0; const limit = bounds(pane); return clampResize(vertical ? pane.height ?? heights[side] : pane.width ?? widths[side], limit.min, limit.max); };
  const visible = sides.filter(side => paneFor(side) && paneFor(side)?.open !== false);
  const axisSpace = vertical ? space.height : space.width;
  const budget = axisSpace === null || collapsed ? Infinity : Math.max(0, axisSpace - mainMin - visible.length * handleSize);
  const sizes = { left: configuredSize('left'), right: configuredSize('right') };
  const total = visible.reduce((sum, side) => sum + sizes[side], 0);
  if (total > budget) {
    const minimum = visible.reduce((sum, side) => sum + bounds(paneFor(side)!).min, 0);
    visible.forEach(side => { const min = bounds(paneFor(side)!).min; sizes[side] = Math.floor(budget >= minimum ? min + (sizes[side] - min) * (budget - minimum) / Math.max(1, total - minimum) : budget * sizes[side] / total); });
  }
  const boundsFor = (side: Side) => { const limit = bounds(paneFor(side)!); const other: Side = side === 'left' ? 'right' : 'left'; const max = Math.min(limit.max, Math.max(0, budget - (visible.includes(other) ? sizes[other] : 0))); return { min: Math.min(limit.min, max), max }; };
  const resize = (side: Side, requested: number) => {
    const pane = paneFor(side); if (!pane || pane.open === false || collapsed) return;
    const limit = boundsFor(side), size = clampResize(requested, limit.min, limit.max); if (size === sizes[side]) return;
    if (vertical) { if (pane.height === undefined) setHeights(current => ({ ...current, [side]: size })); pane.onHeightChange?.(size); }
    else { if (pane.width === undefined) setWidths(current => ({ ...current, [side]: size })); pane.onWidthChange?.(size); }
  };
  const scheduled = useFrameResize<{ side: Side; size: number }>(next => resize(next.side, next.size));
  const finish = (cancel = false) => {
    const active = drag.current; if (!active) return;
    if (cancel) { scheduled.clear(); resize(active.side, active.size); } else scheduled.flush();
    drag.current = null; setResizing(null);
    if (active.handle.hasPointerCapture?.(active.pointerId)) active.handle.releasePointerCapture?.(active.pointerId);
  };
  const paneSignature = visible.join(',');
  useEffect(() => { scheduled.clear(); const active = drag.current; drag.current = null; setResizing(null); if (active?.handle.hasPointerCapture?.(active.pointerId)) active.handle.releasePointerCapture?.(active.pointerId); }, [orientation, collapsed, paneSignature, scheduled.clear]);
  const renderPane = (side: Side) => {
    const pane = paneFor(side); if (!pane || pane.open === false) return null;
    const size = sizes[side], limit = boundsFor(side), resizable = vertical ? pane.height === undefined || !!pane.onHeightChange : pane.width === undefined || !!pane.onWidthChange;
    const handle = resizable ? <div role="separator" tabIndex={0} aria-orientation={vertical ? 'horizontal' : 'vertical'} aria-label={`${vertical ? 'Высота' : 'Ширина'}: ${pane.label}`} aria-describedby={`${id}-resize-help`} aria-controls={`${id}-${side}`} aria-valuemin={Math.round(limit.min)} aria-valuemax={Math.round(limit.max)} aria-valuenow={size} aria-valuetext={`${size} px`} className="cap-content-resizer" data-resizing={resizing === side || undefined} onPointerDown={event => {
      if (event.button !== 0 || drag.current) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true });
      drag.current = { side, start: vertical ? event.clientY : event.clientX, size, pointerId: event.pointerId, handle: event.currentTarget }; setResizing(side); event.currentTarget.setPointerCapture?.(event.pointerId);
    }} onPointerMove={event => { const active = drag.current; if (active?.side === side && active.pointerId === event.pointerId) scheduled.queue({ side, size: active.size + ((vertical ? event.clientY : event.clientX) - active.start) * (side === 'left' ? 1 : -1) }); }} onPointerUp={event => { if (drag.current?.pointerId === event.pointerId) finish(); }} onPointerCancel={event => { if (drag.current?.pointerId === event.pointerId) finish(true); }} onLostPointerCapture={event => { if (drag.current?.pointerId === event.pointerId) finish(true); }} onKeyDown={event => {
      if (event.key === 'Escape' && drag.current) { event.preventDefault(); finish(true); return; }
      const increase = vertical ? 'ArrowDown' : 'ArrowRight', decrease = vertical ? 'ArrowUp' : 'ArrowLeft';
      if (![increase, decrease, 'Home', 'End'].includes(event.key)) return; event.preventDefault();
      resize(side, event.key === 'Home' ? limit.min : event.key === 'End' ? limit.max : size + (event.key === increase ? 1 : -1) * (side === 'left' ? 1 : -1) * (event.shiftKey ? 40 : 10));
    }}><span aria-hidden="true" /></div> : <div className="cap-content-divider" aria-hidden="true" />;
    const panel = <section id={`${id}-${side}`} role="region" aria-label={pane.label} className="cap-content-pane cap-surface-boundary" data-surface={pane.surface ?? 'raised'} style={{ '--cap-pane-size': `${size}px` } as CSSProperties}><header><strong>{pane.label}</strong>{pane.onOpenChange && <IconButton icon="close" size="sm" variant="ghost" label={`Закрыть: ${pane.label}`} onClick={() => pane.onOpenChange?.(false)} />}</header><div className="cap-content-pane-scroll" tabIndex={0} role="group" aria-label={pane.label}><div className="cap-content-pane-inner" style={{ maxWidth: pane.contentWidth }}>{pane.content}</div></div></section>;
    return <>{side === 'right' && handle}{panel}{side === 'left' && handle}</>;
  };
  return <div ref={root} className={cx('cap-content-layout', className)} data-orientation={orientation} data-divider={divider} data-stretch={stretch || undefined} data-collapsed={collapsed || undefined} data-resizing={resizing || undefined} style={{ ...style, '--cap-content-min-size': `${mainMin}px` } as CSSProperties} {...props}><span id={`${id}-resize-help`} className="cap-sr-only">Перетащите разделитель. Стрелки меняют размер на 10 px, Shift — на 40 px. Home и End задают границы; Escape отменяет перетаскивание.</span><div className="cap-content-layout-row">{renderPane('left')}<section role="region" tabIndex={0} aria-label={label} className="cap-content-main" data-surface="base"><div style={{ maxWidth: contentWidth }}>{children}</div></section>{renderPane('right')}</div></div>;
}
