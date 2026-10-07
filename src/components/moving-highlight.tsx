import { useLayoutEffect, useRef, type RefObject } from 'react';

export interface MovingHighlightProps {
  root: RefObject<HTMLElement | null>;
  selected?: string;
  hover?: boolean;
  /** Limit the shared layer to sibling actions, avoiding primary actions and nested groups. */
  target?: string;
  revision?: unknown;
}
type Geometry = { x: number; y: number; width: number; height: number; radius: string };
const defaultTarget = 'button:not(:disabled),a[href],summary,label:has(input:not(:disabled))';
const controls = 'button,a,summary,label,[role="treeitem"],[role="option"],[role="menuitem"]';
const translate = (box: Geometry) => `translate3d(${box.x}px,${box.y}px,0)`;
const sameBox = (a: Geometry | null, b: Geometry) => a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.radius === b.radius;

/** One local layer; measure actual target changes, never every pointer frame. */
export function MovingHighlight({ root, selected, hover = false, target: selector = defaultTarget, revision }: MovingHighlightProps) {
  const layer = useRef<HTMLSpanElement>(null);
  const selection = useRef(selected);
  selection.current = selected;
  const refresh = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    let parent: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    let contextObserver: MutationObserver | null = null;
    let frame: number | undefined;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    let target: HTMLElement | null = null;
    let geometry: Geometry | null = null;
    let visible = false;
    let animation: Animation | null = null;
    let afterScroll = false;
    const trackTarget = (next: HTMLElement | null) => {
      if (target === next) return;
      if (target) observer?.unobserve(target);
      target = next;
      if (target) observer?.observe(target);
    };
    const eligible = (element: EventTarget | null) => {
      const node = element instanceof Element ? element.closest<HTMLElement>(selector) : null;
      if (!node || !parent?.contains(node) || node.closest('[inert],[aria-disabled="true"]') || node.matches(':disabled')) return null;
      const scope = node.closest('.cap-shared-hover');
      return scope && scope !== parent && parent.contains(scope) ? null : node;
    };
    const visualBox = (): Geometry | null => {
      if (!parent || !layer.current || !geometry) return null;
      const container = parent.getBoundingClientRect(), bounds = layer.current.getBoundingClientRect();
      return { ...geometry, x: bounds.left - container.left + parent.scrollLeft - parent.clientLeft,
        y: bounds.top - container.top + parent.scrollTop - parent.clientTop, width: bounds.width, height: bounds.height };
    };
    const paint = (box: Geometry) => {
      const element = layer.current;
      if (!element) return;
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.style.transform = translate(box);
      element.style.borderRadius = box.radius;
    };
    const hide = () => {
      const element = layer.current;
      if (!visible || !element) return;
      // Capture the in-flight pixels BEFORE cancellation, then fade at that position.
      const frozen = visualBox();
      animation?.cancel(); animation = null;
      element.removeAttribute('data-moving');
      if (frozen) { paint(frozen); geometry = frozen; }
      element.style.opacity = '0'; element.removeAttribute('data-visible'); visible = false;
    };
    const measure = (animate = true) => {
      const element = layer.current;
      if (!parent || !element) return;
      if (target && eligible(target) !== target) trackTarget(null);
      const node = target ?? (selection.current ? parent.querySelector<HTMLElement>(selection.current) : null);
      if (!node || !parent.contains(node) || node.closest('[inert],[aria-disabled="true"]')) { hide(); return; }
      // Batch reads before writes. The label's span is the painted segment surface.
      const painted = node.matches('label.cap-segment') ? node.querySelector<HTMLElement>('span') ?? node : node;
      const container = parent.getBoundingClientRect(), bounds = node.getBoundingClientRect();
      const to: Geometry = { x: bounds.left - container.left + parent.scrollLeft - parent.clientLeft,
        y: bounds.top - container.top + parent.scrollTop - parent.clientTop, width: bounds.width, height: bounds.height,
        radius: getComputedStyle(painted).borderRadius };
      if (visible && sameBox(geometry, to)) return;
      const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const fading = !visible && geometry && Number.parseFloat(getComputedStyle(element).opacity) > 0;
      const from = visible || fading ? visualBox() : null;
      animation?.cancel(); animation = null;
      const moving = !!(animate && !reduced && from);
      element.toggleAttribute('data-moving', moving);
      paint(to); element.style.opacity = '1'; element.setAttribute('data-visible', 'true');
      geometry = to; visible = true;
      if (moving && element.animate && from && from.width && from.height && to.width && to.height) {
        animation = element.animate([
          { transform: `${translate(from)} scale(${from.width / to.width},${from.height / to.height})` },
          { transform: `${translate(to)} scale(1,1)` },
        ], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    };
    const enter = (event: Event) => {
      if ('pointerType' in event && (event as PointerEvent).pointerType === 'touch') return;
      const next = eligible(event.target);
      if (next) {
        if (next === target && !afterScroll) return;
        const reacquiring = afterScroll;
        trackTarget(next); afterScroll = false; measure(!reacquiring);
      } else if (event.target instanceof Element) {
        const scope = event.target.closest('.cap-shared-hover');
        // Empty space inside this scope bridges adjacent rows. Excluded controls
        // and nested scopes must not borrow its layer.
        if (event.target.closest(controls) || scope && scope !== parent) { trackTarget(null); hide(); }
      }
    };
    const leave = (event: Event) => {
      if (event.type === 'focusout') {
        const next = eligible((event as FocusEvent).relatedTarget);
        if (next) { trackTarget(next); measure(); return; }
      }
      trackTarget(null); measure();
    };
    const scroll = (event: Event) => {
      const owner = event.target;
      if (owner instanceof Node && parent && (owner.contains(parent) || parent.contains(owner))) {
        trackTarget(null); afterScroll = true; hide();
      }
    };
    const reconnectPointer = (event: Event) => { if (afterScroll) enter(event); };
    const settle = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => measure(false), 60); };
    const connect = () => {
      if (!alive || !root.current || parent === root.current) return;
      parent = root.current;
      observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(settle);
      observer?.observe(parent);
      if (hover) {
        parent.addEventListener('pointerover', enter);
        parent.addEventListener('pointermove', reconnectPointer);
        parent.addEventListener('focusin', enter);
        parent.addEventListener('pointerleave', leave);
        parent.addEventListener('focusout', leave);
        parent.ownerDocument.addEventListener('scroll', scroll, { capture: true, passive: true });
      }
      // Radius axes can change without resizing. Observe only context attributes,
      // never our own style mutations or an animation frame stream.
      if (typeof MutationObserver !== 'undefined') {
        contextObserver = new MutationObserver(() => measure(false));
        for (let ancestor: HTMLElement | null = parent; ancestor; ancestor = ancestor.parentElement)
          contextObserver.observe(ancestor, { attributes: true, attributeFilter: ['data-radius'] });
      }
      const selectedNode = selection.current ? parent.querySelector<HTMLElement>(selection.current) : null;
      if (selectedNode) observer?.observe(selectedNode);
      measure();
    };
    refresh.current = () => { connect(); measure(!hover); };
    // Parent refs may attach after the child layout effect in the first commit.
    connect(); queueMicrotask(connect);
    if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(connect);
    return () => {
      alive = false; refresh.current = null;
      if (frame !== undefined) cancelAnimationFrame(frame);
      animation?.cancel(); observer?.disconnect(); contextObserver?.disconnect(); clearTimeout(resizeTimer);
      parent?.removeEventListener('pointerover', enter);
      parent?.removeEventListener('pointermove', reconnectPointer);
      parent?.removeEventListener('focusin', enter);
      parent?.removeEventListener('pointerleave', leave);
      parent?.removeEventListener('focusout', leave);
      parent?.ownerDocument.removeEventListener('scroll', scroll, true);
    };
  }, [root, hover, selector]);
  useLayoutEffect(() => { refresh.current?.(); }, [selected, revision]);
  return <span ref={layer} aria-hidden="true" className="cap-moving-highlight" data-kind={hover ? 'hover' : 'selection'} data-native-motion={typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function' || undefined} style={{ opacity: 0 }}/>;
}
