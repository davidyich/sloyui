import { createContext, useContext, useMemo, useEffect, useLayoutEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export const OverlayParents = /* @__PURE__ */ createContext<RefObject<HTMLElement | null>[]>([]);
type Scope = { 'data-surface-scheme'?: string; 'data-radius'?: string; 'data-density'?: string; 'data-theme'?: string; 'data-accent'?: string; 'data-color'?: string; 'data-borders'?: string; 'data-shadow'?: string; 'data-surface': 'floating' };
export function useOverlayPresence(open: boolean) {
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    if (!present) return;
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setPresent(false), reduced ? 0 : 180);
    return () => clearTimeout(timer);
  }, [open]);
  return open || present;
}
/** Keep locally selected appearance and accent when a surface leaves its DOM parent. */
export function useOverlayScope(anchor: RefObject<HTMLElement | null>, active = true) {
  const [scope, setScope] = useState<Scope>({ 'data-surface': 'floating' });
  const connection = useRef<{ anchor: HTMLElement; observer: MutationObserver } | null>(null);
  useLayoutEffect(() => {
    const node = anchor.current;
    if (!active || !node) { connection.current?.observer.disconnect(); connection.current = null; return; }
    // Stable mounted triggers do not rebuild their observer on ordinary React renders.
    // Checking the node also preserves ref replacement, without depending on ref.current.
    if (connection.current?.anchor === node) return;
    connection.current?.observer.disconnect();
    let observed: HTMLElement[] = [];
    const read = () => {
      const next: Scope = { 'data-surface': 'floating' };
      const radius = node.closest('[data-radius]')?.getAttribute('data-radius');
      if (radius) next['data-radius'] = radius;
      const density = node.closest('[data-density]')?.getAttribute('data-density');
      if (density) next['data-density'] = density;
      const surfaceScheme = node.closest('[data-surface-scheme]')?.getAttribute('data-surface-scheme');
      if (surfaceScheme) next['data-surface-scheme'] = surfaceScheme;
      const theme = node.closest('[data-theme]')?.getAttribute('data-theme');
      if (theme) next['data-theme'] = theme;
      const borders = node.closest('[data-borders]')?.getAttribute('data-borders');
      if (borders) next['data-borders'] = borders;
      const shadow = node.closest('[data-shadow]')?.getAttribute('data-shadow');
      if (shadow) next['data-shadow'] = shadow;
      const accent = node.closest('[data-accent]:not([data-accent="inherit"]),[data-color]:not([data-color="inherit"])');
      const accentValue = accent?.getAttribute('data-accent'), colorValue = accent?.getAttribute('data-color');
      if (accentValue && accentValue !== 'inherit') next['data-accent'] = accentValue;
      else if (colorValue && colorValue !== 'inherit') next['data-color'] = colorValue;
      setScope(previous => Object.keys({ ...previous, ...next }).every(key => previous[key as keyof Scope] === next[key as keyof Scope]) ? previous : next);
      const ancestors: HTMLElement[] = [];
      for (let element: HTMLElement | null = node; element; element = element.parentElement) ancestors.push(element);
      if (ancestors.length !== observed.length || ancestors.some((element, index) => element !== observed[index])) {
        observer.disconnect();
        // A moved/replaced anchor must observe its new inheritance chain too.
        for (const element of ancestors) observer.observe(element, { attributes: true, childList: true, attributeFilter: ['data-surface-scheme', 'data-theme', 'data-accent', 'data-color', 'data-borders', 'data-shadow', 'data-radius', 'data-density'] });
        observed = ancestors;
      }
    };
    const observer = new MutationObserver(read);
    connection.current = { anchor: node, observer };
    read();
  });
  useLayoutEffect(() => () => { connection.current?.observer.disconnect(); connection.current = null; }, []);
  return scope;
}
export function OverlayPortal({ anchor, panel, children }: { anchor: RefObject<HTMLElement | null>; panel: RefObject<HTMLElement | null>; children: ReactNode }) {
  const parents = useContext(OverlayParents), descendants = useMemo(() => [...parents, panel], [parents, panel]);
  if (typeof document === 'undefined') return null;
  // A floating child belongs to its modal, so background inertness never disables it.
  return createPortal(<OverlayParents.Provider value={descendants}>{children}</OverlayParents.Provider>, anchor.current?.closest('.cap-modal-layer') ?? document.body);
}
type Layer = { id: string; element: HTMLElement; parents: (HTMLElement | null)[] };
const dismissLayers: Layer[] = [];
export function useOverlayDismiss(open: boolean, panel: RefObject<HTMLElement | null>, anchor: RefObject<HTMLElement | null>, onClose: (restoreFocus: boolean) => void, outside = true) {
  const id = useId(), close = useRef(onClose), parents = useContext(OverlayParents); close.current = onClose;
  useEffect(() => {
    if (!open || !panel.current) return;
    const entry = { id, element: panel.current, parents: parents.map(parent => parent.current) };
    const descendant = dismissLayers.findIndex(layer => layer.parents.includes(panel.current));
    if (descendant < 0) dismissLayers.push(entry); else dismissLayers.splice(descendant, 0, entry);
    const pointer = (event: PointerEvent) => {
      if (!outside || dismissLayers.at(-1) !== entry || panel.current?.contains(event.target as Node) || anchor.current?.contains(event.target as Node)) return;
      close.current(false);
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || dismissLayers.at(-1) !== entry) return;
      event.preventDefault(); event.stopPropagation(); close.current(true);
    };
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key);
    return () => { const index = dismissLayers.indexOf(entry); if (index !== -1) dismissLayers.splice(index, 1); document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); };
  }, [open, panel, anchor, outside, id]);
}
export function useAnchoredOverlay(open: boolean, anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, { align = 'start', side = 'bottom', matchWidth = false, arrow = false }: { align?: 'start' | 'center' | 'end'; side?: 'top' | 'bottom'; matchWidth?: boolean; arrow?: boolean } = {}) {
  const [position, setPosition] = useState<CSSProperties>({ left: 0, top: 0, visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!open) return;
    let frame: number | undefined;
    const update = () => {
      const trigger = anchor.current, surface = panel.current; if (!trigger || !surface) return;
      const rect = trigger.getBoundingClientRect();
      const styles = getComputedStyle(surface);
      const gutter = parseFloat(styles.getPropertyValue('--cap-overlay-gutter')) || 12;
      const gap = parseFloat(styles.getPropertyValue('--cap-overlay-gap')) || 12;
      const viewport = window.visualViewport, width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const viewportLeft = viewport?.offsetLeft ?? 0, viewportTop = viewport?.offsetTop ?? 0;
      if (matchWidth) {
        const minWidth = `${Math.min(rect.width, width - gutter * 2)}px`;
        if (surface.style.minWidth !== minWidth) surface.style.minWidth = minWidth;
      }
      const measured = surface.getBoundingClientRect(), bounds = { width: surface.offsetWidth || measured.width, height: surface.offsetHeight || measured.height };
      // Measure content independently of the last constrained height: otherwise resizing
      // a long menu can repeatedly flip its side and erase the visual anchor gap.
      const preferredLimit = parseFloat(styles.getPropertyValue('--cap-overlay-max-height')) || 360;
      const naturalHeight = Math.max(bounds.height, surface.scrollHeight + surface.offsetHeight - surface.clientHeight);
      const wantedHeight = Math.min(naturalHeight, preferredLimit);
      const below = height + viewportTop - rect.bottom - gutter - gap, above = rect.top - viewportTop - gutter - gap;
      const placeAbove = side === 'top' ? above >= wantedHeight || above > below : below < wantedHeight && above > below;
      const available = Math.max(0, Math.min(height - gutter * 2, placeAbove ? above : below));
      const panelHeight = Math.min(wantedHeight, available);
      const left = align === 'end' ? rect.right - bounds.width : align === 'center' ? rect.left + (rect.width - bounds.width) / 2 : rect.left;
      const top = placeAbove ? rect.top - panelHeight - gap : rect.bottom + gap;
      const placedLeft = Math.max(viewportLeft + gutter, Math.min(left, viewportLeft + width - bounds.width - gutter));
      const arrowPosition = arrow ? { '--cap-tooltip-arrow-x': `${rect.left + rect.width / 2 - placedLeft}px` } : {};
      const next: CSSProperties = { ...arrowPosition, left: placedLeft, top: Math.max(viewportTop + gutter, Math.min(top, viewportTop + height - panelHeight - gutter)), maxHeight: Math.min(preferredLimit, available), maxWidth: width - gutter * 2, visibility: 'visible', transformOrigin: placeAbove ? 'bottom center' : 'top center' };
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    update();
    const schedule = () => { if (frame === undefined) frame = requestAnimationFrame(() => { frame = undefined; update(); }); };
    const scroll = (event: Event) => {
      // Internal menu scrolling and unrelated scroll regions cannot move its anchor.
      if (event.target instanceof Element && anchor.current && !event.target.contains(anchor.current)) return;
      schedule();
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (anchor.current) observer?.observe(anchor.current); if (panel.current) observer?.observe(panel.current);
    window.addEventListener('resize', schedule); window.addEventListener('scroll', scroll, { capture: true, passive: true }); window.visualViewport?.addEventListener('resize', schedule); window.visualViewport?.addEventListener('scroll', schedule);
    return () => { if (frame !== undefined) cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', scroll, true); window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule); };
  }, [open, anchor, panel, align, side, matchWidth, arrow]);
  return position;
}
export function childSurfaceContains(parent: HTMLElement | null, target: EventTarget | null) {
  if (!(target instanceof Node)) return false;
  const index = dismissLayers.findIndex(layer => layer.element === parent);
  return index !== -1 && dismissLayers.slice(index + 1).some(layer => layer.element.contains(target));
}
