import { createContext, useLayoutEffect, useRef, type RefObject } from 'react';

/** Private paint-plane agreement between FloatingActionBar and its Button slots. */
export const SharedHoverForegroundContext = createContext(false);

export interface MovingHighlightProps {
  root: RefObject<HTMLElement | null>;
  selected?: string;
  hover?: boolean;
  /** Limit the shared layer to sibling actions, avoiding primary actions and nested groups. */
  target?: string;
  revision?: unknown;
}
type Geometry = { x: number; y: number; width: number; height: number; radius: string };
const defaultTarget = 'button:not(:disabled),a[href],summary,label:has(input:not(:disabled)),.cap-combobox-input-wrap:not(:has(input:disabled))';
const controls = 'button,a,summary,label,input,[role="treeitem"],[role="option"],[role="menuitem"]';
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
    let resizeTimer: ReturnType<typeof setTimeout> | undefined, fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let selectedTarget: HTMLElement | null = null;
    let alive = true;
    let target: HTMLElement | null = null;
    let pointerTarget: HTMLElement | null = null, focusTarget: HTMLElement | null = null;
    let pointerOwnsLayer = false;
    let geometry: Geometry | null = null;
    let visible = false;
    let animation: Animation | null = null;
    let afterScroll = false;
    const trackTarget = (next: HTMLElement | null) => {
      if (target === next) return;
      if (target) { observer?.unobserve(target); target.removeAttribute('data-shared-hover-target'); }
      target = next;
      if (target) { observer?.observe(target); if (hover) target.setAttribute('data-shared-hover-target', 'true'); }
    };
    const eligible = (element: EventTarget | null) => {
      const node = element instanceof Element ? element.closest<HTMLElement>(selector) : null;
      if (!node || !parent?.contains(node) || node.closest('[inert],[aria-disabled="true"]') || node.matches(':disabled')) return null;
      // Opaque controls need an explicit plane between resting paint and foreground.
      // Ordinary groups retain their local hover path until they provide that plane.
      if (hover && !parent.hasAttribute('data-shared-hover-plane') && (node.matches('.cap-button:not([data-variant="ghost"]),.cap-select-trigger:not([data-variant="ghost"])') ||
        node.matches('.cap-combobox-input-wrap') && !node.closest('.cap-selection-field[data-variant="ghost"]'))) return null;
      if (hover && node.matches('.cap-button:is([data-variant="primary"],[data-variant="accent"],[data-variant="accent-secondary"])')) return null;
      const scope = node.closest('.cap-shared-hover');
      return scope && scope !== parent && parent.contains(scope) ? null : node;
    };
    // Native focus-visible distinguishes keyboard focus from a click/restore.
    // A pointer leave must never fly back to an old mouse-focused control.
    const keyboardTarget = () => focusTarget && (focusTarget.matches(':focus-visible') || focusTarget.querySelector(':focus-visible')) ? eligible(focusTarget) : null;
    const rootMetrics = () => {
      const box = parent!.getBoundingClientRect(), style = getComputedStyle(parent!);
      const borderX = parseFloat(style.borderLeftWidth) || 0, borderY = parseFloat(style.borderTopWidth) || 0;
      const width = parseFloat(style.width) + (style.boxSizing === 'border-box' ? 0 : (parseFloat(style.paddingLeft)||0) + (parseFloat(style.paddingRight)||0) + borderX + (parseFloat(style.borderRightWidth)||0));
      const height = parseFloat(style.height) + (style.boxSizing === 'border-box' ? 0 : (parseFloat(style.paddingTop)||0) + (parseFloat(style.paddingBottom)||0) + borderY + (parseFloat(style.borderBottomWidth)||0));
      return { box, borderX, borderY, scaleX: width > 0 && box.width > 0 ? box.width / width : 1, scaleY: height > 0 && box.height > 0 ? box.height / height : 1 };
    };
    const visualBox = (metrics = parent ? rootMetrics() : null): Geometry | null => {
      if (!parent || !layer.current || !geometry || !metrics) return null;
      const bounds = layer.current.getBoundingClientRect(), style = getComputedStyle(layer.current);
      return { x: (bounds.left - metrics.box.left) / metrics.scaleX + parent.scrollLeft - metrics.borderX,
        y: (bounds.top - metrics.box.top) / metrics.scaleY + parent.scrollTop - metrics.borderY,
        width: bounds.width / metrics.scaleX, height: bounds.height / metrics.scaleY, radius: style.borderRadius || geometry.radius };
    };
    const paint = (box: Geometry) => {
      const element = layer.current;
      if (!element) return;
      element.style.width = `${box.width}px`;
      element.style.height = `${box.height}px`;
      element.style.transform = translate(box);
      // Canonical segments inherit their CSS radius directly; freezing a resolved
      // pixel value would make a context update depend on observer timing.
      if (box.radius === 'inherit') element.style.removeProperty('border-radius');
      else element.style.borderRadius = box.radius;
    };
    const syncAccent = (node: HTMLElement) => {
      const element = layer.current;
      if (!element) return;
      const accented = node.hasAttribute('data-accented');
      element.toggleAttribute('data-accented', accented);
      let accent: string | undefined;
      if (accented) for (let context: HTMLElement | null = node; context && context !== parent; context = context.parentElement) {
        const explicit = context.dataset.accent ?? context.dataset.color;
        if (explicit && explicit !== 'inherit') { accent = explicit; break; }
      }
      if (accent) element.dataset.accent = accent;
      else delete element.dataset.accent;
    };
    const hide = (immediate = false) => {
      const element = layer.current;
      if (!visible || !element) return;
      // Capture the in-flight pixels BEFORE cancellation, then fade at that position.
      const frozen = visualBox();
      animation?.cancel(); animation = null;
      element.removeAttribute('data-moving');
      if (frozen) { paint(frozen); geometry = frozen; }
      element.toggleAttribute('data-hide-immediately', immediate);
      element.style.opacity = '0'; element.removeAttribute('data-visible'); visible = false;
      clearTimeout(fadeTimer);
      const release = () => parent?.removeAttribute('data-shared-hover-active');
      if (immediate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) release();
      else fadeTimer = setTimeout(release, 110);
    };
    const measure = (animate = true) => {
      const element = layer.current;
      if (!parent || !element) return;
      if (target && eligible(target) !== target) { trackTarget(null); hide(true); }
      const node = target ?? (selection.current ? parent.querySelector<HTMLElement>(selection.current) : null);
      if (!node || !parent.contains(node) || node.closest('[inert],[aria-disabled="true"]')) { hide(); return; }
      // Batch reads before writes. The label's span is the painted segment surface.
      const painted = node.matches('label.cap-segment') ? node.querySelector<HTMLElement>('span') ?? node : node;
      const metrics = rootMetrics(), bounds = painted.getBoundingClientRect(), paintedStyle = getComputedStyle(painted);
      // Fractional borders and transformed ancestors stay in the parent's layout coordinate system.
      const to: Geometry = { x: (bounds.left - metrics.box.left) / metrics.scaleX + parent.scrollLeft - metrics.borderX,
        y: (bounds.top - metrics.box.top) / metrics.scaleY + parent.scrollTop - metrics.borderY, width: bounds.width / metrics.scaleX, height: bounds.height / metrics.scaleY,
        radius: node.matches('label.cap-segment') ? 'inherit' : paintedStyle.borderRadius };
      if (visible && sameBox(geometry, to)) { syncAccent(node); return; }
      const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const fading = !visible && geometry && Number.parseFloat(getComputedStyle(element).opacity) > 0;
      const from = visible || fading ? visualBox(metrics) : null;
      animation?.cancel(); animation = null;
      const moving = !!(animate && !reduced && from);
      element.toggleAttribute('data-moving', moving);
      clearTimeout(fadeTimer); element.removeAttribute('data-hide-immediately');
      paint(to); element.style.opacity = '1'; element.setAttribute('data-visible', 'true');
      if (hover) parent.setAttribute('data-shared-hover-active', 'true');
      if (!hover && selectedTarget !== node) { if (selectedTarget) observer?.unobserve(selectedTarget); selectedTarget = node; observer?.observe(node); }
      // Keep declared secondary accents, while inherited axes stay inherited.
      syncAccent(node);
      geometry = to; visible = true;
      if (moving && element.animate && from && from.width && from.height && to.width && to.height) {
        // This tiny absolute surface can morph its own box without scaling corners or text.
        // Geometry is read once above; the browser owns the finite interpolation.
        const radius = (value: string, width: number, height: number) => value.replace(/[\d.]+px/g, token => `${Math.min(parseFloat(token), width / 2, height / 2)}px`);
        const fromRadius = from.radius === 'inherit' ? paintedStyle.borderRadius : from.radius;
        const toRadius = paintedStyle.borderRadius;
        const running = element.animate([
          { transform: translate(from), width: `${from.width}px`, height: `${from.height}px`, ...(fromRadius ? { borderRadius: radius(fromRadius, from.width, from.height) } : {}) },
          { transform: translate(to), width: `${to.width}px`, height: `${to.height}px`, ...(toRadius ? { borderRadius: radius(toRadius, to.width, to.height) } : {}) },
        ], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
        animation = running;
        running.onfinish = () => { if (animation === running) { animation = null; element.removeAttribute('data-moving'); } };
      } else element.removeAttribute('data-moving');
    };
    const enter = (event: Event) => {
      if ('pointerType' in event && (event as PointerEvent).pointerType === 'touch') return;
      const next = eligible(event.target);
      if (event.type === 'focusin') {
        focusTarget = next;
        // Focus changes during a click must not steal a layer from the pointer.
        if (!pointerOwnsLayer) { trackTarget(keyboardTarget()); measure(); }
        return;
      }
      if (next) {
        pointerTarget = next; pointerOwnsLayer = true;
        if (next === target && !afterScroll) return;
        const reacquiring = afterScroll;
        trackTarget(next); afterScroll = false; measure(!reacquiring);
      } else if (event.target instanceof Element) {
        const scope = event.target.closest('.cap-shared-hover');
        // Empty space bridges adjacent rows. Excluded controls and nested scopes
        // own the pointer even while a different sibling retains keyboard focus.
        if (event.target.closest(controls) || scope && scope !== parent) {
          pointerTarget = null; pointerOwnsLayer = true; trackTarget(null); hide();
        }
      }
    };
    const leave = (event: Event) => {
      if (event.type === 'focusout') {
        focusTarget = eligible((event as FocusEvent).relatedTarget);
        if (pointerOwnsLayer) return;
      } else {
        pointerTarget = null; pointerOwnsLayer = false;
      }
      trackTarget(pointerOwnsLayer ? pointerTarget : keyboardTarget()); measure();
    };
    const scroll = (event: Event) => {
      const owner = event.target;
      if (owner instanceof Node && parent && (owner.contains(parent) || parent.contains(owner))) {
        pointerTarget = null; pointerOwnsLayer = false; trackTarget(null); afterScroll = true; hide();
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
          contextObserver.observe(ancestor, { attributes: true, attributeFilter: ['data-radius','data-density'] });
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
      target?.removeAttribute('data-shared-hover-target');
      if (hover) parent?.removeAttribute('data-shared-hover-active');
      clearTimeout(fadeTimer);
      animation?.cancel(); observer?.disconnect(); contextObserver?.disconnect(); clearTimeout(resizeTimer);
      parent?.removeEventListener('pointerover', enter);
      parent?.removeEventListener('pointermove', reconnectPointer);
      parent?.removeEventListener('focusin', enter);
      parent?.removeEventListener('pointerleave', leave);
      parent?.removeEventListener('focusout', leave);
      parent?.ownerDocument.removeEventListener('scroll', scroll, true);
    };
  }, [root, hover, selector]);
  // Controlled checked/selected properties may change without DOM attribute mutations.
  // Refresh on consumer commits, never on a pointer-frame timer.
  useLayoutEffect(() => { refresh.current?.(); });
  return <span ref={layer} aria-hidden="true" className="cap-moving-highlight" data-kind={hover ? 'hover' : 'selection'} data-native-motion={typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function' || undefined} style={{ opacity: 0 }}/>;
}
