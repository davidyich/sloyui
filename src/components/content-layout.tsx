import { useId, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton, cx } from './primitives.js';
export interface ContentPane {
  content: ReactNode; label: string; open?: boolean; onOpenChange?: (open: boolean) => void;
  width?: number; defaultWidth?: number; minWidth?: number; maxWidth?: number; onWidthChange?: (width: number) => void;
  height?: number; defaultHeight?: number; minHeight?: number; maxHeight?: number; onHeightChange?: (height: number) => void;
  contentWidth?: number | string; surface?: 'base' | 'canvas' | 'raised' | 'floating';
}
export interface ContentLayoutProps extends HTMLAttributes<HTMLDivElement> {
  left?: ContentPane; right?: ContentPane; contentWidth?: number | string; label?: string;
  orientation?: 'horizontal' | 'vertical'; divider?: 'always' | 'hover' | 'none'; stretch?: boolean;
}
/** Horizontal left/right panes or vertical before/after panes, with independent axis dimensions. */
export function ContentLayout({ left, right, contentWidth = '100%', label = 'Контент', orientation = 'horizontal', divider = 'hover', stretch = true, children, className, ...props }: ContentLayoutProps) {
  const root = useRef<HTMLDivElement>(null), id = useId(), vertical = orientation === 'vertical';
  const [widths, setWidths] = useState({ left: left?.defaultWidth ?? 240, right: right?.defaultWidth ?? 280 });
  const [heights, setHeights] = useState({ left: left?.defaultHeight ?? 200, right: right?.defaultHeight ?? 200 });
  const drag = useRef<{ side:'left'|'right'; start:number; size:number; pointerId:number } | null>(null);
  const paneFor = (side:'left'|'right') => side === 'left' ? left : right;
  const bounds = (pane:ContentPane) => ({ min: vertical ? pane.minHeight ?? 100 : pane.minWidth ?? 160, max: vertical ? pane.maxHeight ?? 600 : pane.maxWidth ?? 600 });
  const getSize = (side:'left'|'right') => { const pane = paneFor(side); if (!pane) return 0; const limit = bounds(pane); return Math.min(limit.max, Math.max(limit.min, vertical ? pane.height ?? heights[side] : pane.width ?? widths[side])); };
  const resize = (side:'left'|'right', requested:number) => {
    const pane = paneFor(side), other = paneFor(side === 'left' ? 'right' : 'left'); if (!pane) return;
    const limit = bounds(pane), frameBounded = !vertical || !!root.current?.style.height || !!root.current?.style.maxHeight;
    const rootSize = frameBounded ? vertical ? root.current?.clientHeight : root.current?.clientWidth : undefined;
    // Unconstrained compositions may grow. A constrained frame reserves readable main content.
    const available = (rootSize || 1600) - (vertical ? 120 : 240) - (other && other.open !== false ? getSize(side === 'left' ? 'right' : 'left') + 8 : 0) - 8;
    const size = Math.round(Math.max(limit.min, Math.min(limit.max, Math.max(limit.min, available), requested)));
    if (vertical) { if (pane.height === undefined) setHeights(current => ({ ...current, [side]:size })); pane.onHeightChange?.(size); }
    else { if (pane.width === undefined) setWidths(current => ({ ...current, [side]:size })); pane.onWidthChange?.(size); }
  };
  const renderPane = (side:'left'|'right') => {
    const pane = paneFor(side); if (!pane || pane.open === false) return null;
    const size = getSize(side), limit = bounds(pane), resizable = vertical ? pane.height === undefined || !!pane.onHeightChange : pane.width === undefined || !!pane.onWidthChange;
    const handle = resizable ? <div role="separator" tabIndex={0} aria-orientation={vertical ? 'horizontal' : 'vertical'} aria-label={`${vertical ? 'Высота' : 'Ширина'}: ${pane.label}`} aria-controls={`${id}-${side}`} aria-valuemin={limit.min} aria-valuemax={limit.max} aria-valuenow={size} className="cap-content-resizer" onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture?.(event.pointerId); drag.current={side,start:vertical?event.clientY:event.clientX,size,pointerId:event.pointerId}; }} onPointerMove={event => { const active=drag.current; if (active?.side===side && active.pointerId===event.pointerId) resize(side, active.size + ((vertical?event.clientY:event.clientX)-active.start)*(side==='left'?1:-1)); }} onPointerUp={event => { drag.current=null; if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId); }} onPointerCancel={() => { drag.current=null; }} onLostPointerCapture={() => { drag.current=null; }} onKeyDown={event => {
      const increase = vertical ? 'ArrowDown' : 'ArrowRight', decrease = vertical ? 'ArrowUp' : 'ArrowLeft';
      if (![increase,decrease,'Home','End'].includes(event.key)) return; event.preventDefault();
      resize(side,event.key==='Home'?limit.min:event.key==='End'?limit.max:size+(event.key===increase?1:-1)*(side==='left'?1:-1)*(event.shiftKey?40:10));
    }}/> : <div className="cap-content-divider" aria-hidden="true"/>;
    const panel = <section id={`${id}-${side}`} role="region" aria-label={pane.label} className="cap-content-pane cap-surface-boundary" data-surface={pane.surface ?? 'raised'} style={{'--cap-pane-size':`${size}px`,'--cap-pane-width':vertical?'100%':`${size}px`} as CSSProperties}><header><strong>{pane.label}</strong>{pane.onOpenChange && <IconButton icon="close" size="sm" variant="ghost" label={`Закрыть: ${pane.label}`} onClick={() => pane.onOpenChange?.(false)}/>}</header><div className="cap-content-pane-scroll" tabIndex={0} role="group" aria-label={pane.label}><div className="cap-content-pane-inner" style={{maxWidth:pane.contentWidth}}>{pane.content}</div></div></section>;
    return <>{side === 'right' && handle}{panel}{side === 'left' && handle}</>;
  };
  return <div ref={root} className={cx('cap-content-layout',className)} data-orientation={orientation} data-divider={divider} data-stretch={stretch || undefined} {...props}><div className="cap-content-layout-row">{renderPane('left')}<section role="region" tabIndex={0} aria-label={label} className="cap-content-main" data-surface="base"><div style={{maxWidth:contentWidth}}>{children}</div></section>{renderPane('right')}</div></div>;
}
