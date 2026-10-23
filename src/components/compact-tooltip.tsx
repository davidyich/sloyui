import { forwardRef, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type RefObject } from 'react';
import { OverlayPortal, useAnchoredOverlay, useOverlayDismiss, useOverlayPresence, useOverlayScope } from './overlay-foundations.js';
import { ExplicitTooltipContext } from './tooltip-context.js';

function actionName(button: HTMLButtonElement) {
  const labelledBy = button.getAttribute('aria-labelledby')?.trim().split(/\s+/).map(id => button.ownerDocument.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ');
  return labelledBy || button.getAttribute('aria-label')?.trim() || '';
}

function hasVisibleText(button: HTMLButtonElement) {
  const walker = button.ownerDocument.createTreeWalker(button, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    let element = node.parentElement, hidden = false;
    while (element && element !== button) {
      if (element.matches('svg,[aria-hidden="true"],[hidden],.cap-sr-only,.cap-kbd')) { hidden = true; break; }
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') { hidden = true; break; }
      element = element.parentElement;
    }
    if (!hidden) return true;
  }
  return false;
}

function useCompactTooltip(anchor: RefObject<HTMLButtonElement | null>, enabled: boolean) {
  const [open, setOpen] = useState(false), [label, setLabel] = useState(''), id = useId();
  const panel = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = open && enabled;
  const scope = useOverlayScope(anchor, active), position = useAnchoredOverlay(active, anchor, panel, { side: 'top', align: 'center' }), present = useOverlayPresence(active);
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  const hideLater = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 100); };
  useOverlayDismiss(active, panel, anchor, hide);
  useEffect(() => {
    const button = anchor.current;
    if (!enabled || !button) { setOpen(false); return; }
    const show = () => {
      const name = actionName(button);
      if (!name || hasVisibleText(button)) return;
      setLabel(name); setOpen(true);
    };
    const enter = () => { clearTimeout(timer.current); timer.current = setTimeout(show, 350); };
    const focus = () => { clearTimeout(timer.current); if (button.matches(':focus-visible')) show(); };
    // Native listeners preserve consumer handlers and also receive disabled hover.
    button.addEventListener('pointerenter', enter); button.addEventListener('pointerleave', hideLater);
    button.addEventListener('focus', focus); button.addEventListener('blur', hide); button.addEventListener('pointerdown', hide);
    return () => {
      clearTimeout(timer.current);
      button.removeEventListener('pointerenter', enter); button.removeEventListener('pointerleave', hideLater);
      button.removeEventListener('focus', focus); button.removeEventListener('blur', hide); button.removeEventListener('pointerdown', hide);
    };
  }, [enabled, anchor]);
  // Refresh changing action names while open, without observing every idle button.
  useLayoutEffect(() => {
    if (!active || !anchor.current) return;
    const name = actionName(anchor.current);
    if (!name || hasVisibleText(anchor.current)) setOpen(false);
    else if (name !== label) setLabel(name);
  });
  return { describedBy: active ? id : undefined, tooltip: present && <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} id={id} role="tooltip" aria-hidden={!active || undefined} data-state={active ? 'open' : 'closed'} data-variant="inverse" data-compact="true" onPointerEnter={() => clearTimeout(timer.current)} onPointerLeave={hideLater} className="cap-tooltip cap-tooltip-v2" style={{ ...position, maxWidth: typeof position.maxWidth === 'number' ? Math.min(240, position.maxWidth) : 240 }} {...scope}><div className="cap-tooltip-body">{label}</div></div></OverlayPortal> };
}

/** Native internal button with an automatic action hint; adds no layout wrapper. */
export const TooltipButton = /* @__PURE__ */ forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(function TooltipButton({ children, title, ...props }, ref) {
  const anchor = useRef<HTMLButtonElement>(null), explicit = useContext(ExplicitTooltipContext);
  const [iconTitle, setIconTitle] = useState(false);
  const named = !!(props['aria-label'] || props['aria-labelledby']);
  useImperativeHandle(ref, () => anchor.current as HTMLButtonElement, []);
  const hint = useCompactTooltip(anchor, named && !explicit);
  useLayoutEffect(() => {
    setIconTitle(!!(named && title && anchor.current && !hasVisibleText(anchor.current)));
  }, [named, title, children]);
  return <><button {...props} ref={anchor} title={explicit || iconTitle ? undefined : title} aria-describedby={[props['aria-describedby'], hint.describedBy].filter(Boolean).join(' ') || undefined}>{children}</button>{hint.tooltip}</>;
});
