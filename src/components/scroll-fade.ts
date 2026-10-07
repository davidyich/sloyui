export type ScrollFadeDirection = 'none' | 'vertical' | 'horizontal' | 'both' | 'top' | 'bottom' | 'left' | 'right' | 'start' | 'end';
export type ScrollFadeSize = number | string;
export interface ScrollFadeProgress { top: number; right: number; bottom: number; left: number }
const revealProgress = (distance: number, reveal: number) => {
  if (distance <= 1) return 0;
  const progress = reveal > 0 ? Math.min(1, distance / reveal) : 1;
  return Math.round(progress * progress * (3 - 2 * progress) * 1000) / 1000;
};
/** Physical mask edges from logical scroll position; clamp elastic overscroll first. */
export function scrollFadeProgress(node: HTMLElement, axis: 'vertical' | 'horizontal' | 'both', direction: ScrollFadeDirection, reveal: number, rtl: boolean): ScrollFadeProgress {
  const xRange = Math.max(0, node.scrollWidth - node.clientWidth), yRange = Math.max(0, node.scrollHeight - node.clientHeight);
  const x = Math.max(0, Math.min(xRange, rtl ? -node.scrollLeft : node.scrollLeft)), y = Math.max(0, Math.min(yRange, node.scrollTop));
  const left = rtl ? xRange - x : x, right = rtl ? x : xRange - x;
  const vertical = axis !== 'horizontal', horizontal = axis !== 'vertical';
  const active = {
    top: vertical && ['vertical','both','top'].includes(direction),
    bottom: vertical && ['vertical','both','bottom'].includes(direction),
    left: horizontal && (['horizontal','both','left'].includes(direction) || direction === (rtl ? 'end' : 'start')),
    right: horizontal && (['horizontal','both','right'].includes(direction) || direction === (rtl ? 'start' : 'end')),
  };
  return { top: active.top ? revealProgress(y, reveal) : 0, bottom: active.bottom ? revealProgress(yRange - y, reveal) : 0, left: active.left ? revealProgress(left, reveal) : 0, right: active.right ? revealProgress(right, reveal) : 0 };
}
