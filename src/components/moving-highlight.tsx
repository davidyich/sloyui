import { useLayoutEffect, useRef, useState, type RefObject, type CSSProperties } from 'react';

export interface MovingHighlightProps {
  root: RefObject<HTMLElement | null>;
  selected?: string;
  hover?: boolean;
  /** Limit the shared layer to sibling actions, avoiding primary actions and nested groups. */
  target?: string;
  revision?: unknown;
}
type Geometry = { x: number; y: number; width: number; height: number };
type HighlightBox = { style: CSSProperties; moving: boolean; from?: Geometry; to?: Geometry };
const defaultTarget = 'button:not(:disabled),a[href],summary,label:has(input:not(:disabled))';

/** One local hover/selection layer. Measure on target changes and resize, then translate on the compositor. */
export function MovingHighlight({ root, selected, hover = false, target: selector = defaultTarget, revision }: MovingHighlightProps) {
  const [box, setBox] = useState<HighlightBox>({ style: { opacity: 0 }, moving: false });
  const layer = useRef<HTMLSpanElement>(null), animation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    let parent: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    let frame: number | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    let target: HTMLElement | null = null;
    const measure = () => {
      if (!parent) return;
      const node = target ?? (selected ? parent.querySelector<HTMLElement>(selected) : null);
      if (!node || !parent.contains(node) || node.closest('[inert],[aria-disabled="true"]')) {
        setBox(previous => ({ ...previous, style: { ...previous.style, opacity: 0 } }));
        return;
      }
      // Read all geometry before the single React write. No per-frame measurement.
      const container = parent.getBoundingClientRect(), bounds = node.getBoundingClientRect();
      const previousBounds = layer.current?.getBoundingClientRect();
      const x = bounds.left - container.left + parent.scrollLeft - parent.clientLeft;
      const y = bounds.top - container.top + parent.scrollTop - parent.clientTop;
      const from = previousBounds ? { x: previousBounds.left - container.left + parent.scrollLeft - parent.clientLeft, y: previousBounds.top - container.top + parent.scrollTop - parent.clientTop, width: previousBounds.width, height: previousBounds.height } : undefined;
      const to = { x, y, width: bounds.width, height: bounds.height };
      setBox(previous => ({ moving: previous.style.opacity === 1, from: previous.style.opacity === 1 ? from : undefined, to, style: {
        width: bounds.width, height: bounds.height,
        transform: `translate3d(${x}px,${y}px,0)`,
        opacity: 1,
      } }));
    };
    const eligible = (element: EventTarget | null) => {
      const node = element instanceof Element ? element.closest<HTMLElement>(selector) : null;
      const container = parent;
      if (!node || !container?.contains(node) || node.closest('[inert],[aria-disabled="true"]')) return null;
      // A nested shared group owns its own highlight.
      const scope = node.closest('.cap-shared-hover');
      return scope && scope !== container && container.contains(scope) ? null : node;
    };
    const enter = (event: Event) => {
      if ('pointerType' in event && (event as PointerEvent).pointerType === 'touch') return;
      target = eligible(event.target);
      measure();
    };
    const leave = (event: Event) => {
      target = event.type === 'focusout' ? eligible((event as FocusEvent).relatedTarget) : null;
      measure();
    };
    const connect = () => {
      if (!alive || !root.current) return;
      if (parent !== root.current) {
        parent = root.current;
        observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
          // Disclosure heights may resize every frame. Measure only after they settle.
          clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 60);
        });
        observer?.observe(parent);
        if (hover) {
          parent.addEventListener('pointerover', enter);
          parent.addEventListener('focusin', enter);
          parent.addEventListener('pointerleave', leave);
          parent.addEventListener('focusout', leave);
        }
      }
      const selectedNode = selected ? parent.querySelector<HTMLElement>(selected) : null;
      if (selectedNode) observer?.observe(selectedNode);
      measure();
    };
    // Parent refs may attach after the child layout effect in the first commit.
    connect(); queueMicrotask(connect);
    if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(connect);
    return () => {
      alive = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
      observer?.disconnect(); clearTimeout(resizeTimer);
      parent?.removeEventListener('pointerover', enter);
      parent?.removeEventListener('focusin', enter);
      parent?.removeEventListener('pointerleave', leave);
      parent?.removeEventListener('focusout', leave);
    };
  }, [root, selected, hover, selector, revision]);
  useLayoutEffect(() => {
    animation.current?.cancel();
    const element = layer.current;
    const { from, to } = box;
    if (!element?.animate || !from || !to || !from.width || !from.height || !to.width || !to.height || box.style.opacity !== 1 || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // One FLIP animation also morphs dimensions without transitioning width/height.
    animation.current = element.animate([
      { transform: `translate3d(${from.x}px,${from.y}px,0) scale(${from.width / to.width},${from.height / to.height})` },
      { transform: `translate3d(${to.x}px,${to.y}px,0) scale(1,1)` },
    ], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
    return () => animation.current?.cancel();
  }, [box]);
  return <span ref={layer} aria-hidden="true" className="cap-moving-highlight" data-kind={hover ? 'hover' : 'selection'} data-visible={box.style.opacity === 1 || undefined} data-moving={box.moving || undefined} data-native-motion={typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function' || undefined} style={box.style}/>;
}
