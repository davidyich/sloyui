import { useTranslate } from './locale.js';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { cx } from './primitives.js';
import { EmptyState } from './layout.js';

export interface PreviewRailItem { id: string; label: string; description?: ReactNode; preview?: ReactNode; href?: string; disabled?: boolean }
export interface PreviewRailProps {
  items: PreviewRailItem[];
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  onItemSelect?: (item: PreviewRailItem) => void;
  orientation?: 'vertical' | 'horizontal';
  previewSide?: 'before' | 'after';
  showPreview?: boolean;
  highlightActive?: boolean;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
  emptyLabel?: string;
  className?: string;
}
/** Compact ticks form a local hover pyramid. A destination preview follows hover, focus or pinned touch. */
export function PreviewRail({ items, label, value, defaultValue, onValueChange, onItemSelect, orientation = 'vertical', previewSide = 'after', showPreview = true, highlightActive = false, renderPreview, emptyLabel: suppliedEmptyLabel, className }: PreviewRailProps) {
  const t = useTranslate();
  const emptyLabel = suppliedEmptyLabel === undefined ? (t("Нет элементов для просмотра", "No items to preview")) : suppliedEmptyLabel;

  const id = useId(), root = useRef<HTMLDivElement>(null), rail = useRef<HTMLElement>(null), preview = useRef<HTMLElement>(null), pointer = useRef<{ type: string; pinned: boolean } | null>(null);
  const [internal, setInternal] = useState(defaultValue), [hovered, setHovered] = useState<string | null>(null), [focused, setFocused] = useState<string | null>(null), [pinned, setPinned] = useState<string | null>(null), [position, setPosition] = useState<CSSProperties>({ opacity: 0 });
  const enabled = items.filter(item => !item.disabled), requested = value ?? internal;
  const selected = enabled.find(item => item.id === requested) ?? enabled[0];
  const displayed = enabled.find(item => item.id === hovered) ?? enabled.find(item => item.id === pinned) ?? enabled.find(item => item.id === focused);
  const highlighted = displayed ?? (highlightActive ? selected : undefined), highlightedIndex = items.findIndex(item => item.id === highlighted?.id);
  const select = (item: PreviewRailItem) => {
    if (item.disabled) return;
    if (value === undefined) setInternal(item.id);
    onValueChange?.(item.id);
  };
  const reveal = (element: HTMLElement) => {
    const node = rail.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect(), item = element.getBoundingClientRect();
    const horizontal = orientation === 'horizontal';
    const delta = horizontal ? item.left < bounds.left ? item.left - bounds.left : item.right > bounds.right ? item.right - bounds.right : 0 : item.top < bounds.top ? item.top - bounds.top : item.bottom > bounds.bottom ? item.bottom - bounds.bottom : 0;
    if (delta) node.scrollBy?.({ [horizontal ? 'left' : 'top']: delta, behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  useLayoutEffect(() => {
    if (!selected) return;
    const element = document.getElementById(`${id}-${encodeURIComponent(selected.id)}`);
    if (element) reveal(element);
  }, [selected?.id, orientation]);
  useLayoutEffect(() => {
    const node = root.current, card = preview.current, target = displayed && document.getElementById(`${id}-${encodeURIComponent(displayed.id)}`);
    if (!node || !card || !target) return;
    const measure = () => {
      const frame = node.getBoundingClientRect(), item = target.getBoundingClientRect(), bounds = card.getBoundingClientRect();
      const horizontal = orientation === 'horizontal';
      const x = horizontal ? item.left - frame.left + item.width / 2 - bounds.width / 2 : previewSide === 'before' ? item.left - frame.left - bounds.width - 12 : item.right - frame.left + 12;
      const y = horizontal ? previewSide === 'before' ? item.top - frame.top - bounds.height - 12 : item.bottom - frame.top + 12 : item.top - frame.top + item.height / 2 - bounds.height / 2;
      setPosition({ transform: `translate3d(${Math.max(0, Math.min(frame.width - bounds.width, x))}px,${Math.max(0, Math.min(frame.height - bounds.height, y))}px,0)`, opacity: 1 });
    };
    measure();
    let timer: ReturnType<typeof setTimeout>;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(measure, 60); });
    observer?.observe(node); observer?.observe(card);
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, [displayed?.id, orientation, previewSide, showPreview]);
  useEffect(() => {
    if (!pinned) return;
    const outside = (event: globalThis.PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setPinned(null); setFocused(null); } };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [pinned]);
  const activate = (event: MouseEvent<HTMLElement>, item: PreviewRailItem) => {
    if (item.disabled) { event.preventDefault(); return; }
    const gesture = pointer.current;
    pointer.current = null;
    if (gesture && gesture.type !== 'mouse') {
      setPinned(item.id);
      if (item.href && !gesture.pinned) { event.preventDefault(); return; }
    }
    select(item); onItemSelect?.(item);
  };
  return <div ref={root} className={cx('cap-preview-rail', className)} data-orientation={orientation} data-preview-side={previewSide} data-preview={showPreview || undefined} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(null); setPinned(null); } }}>
    {!items.length ? <EmptyState title={emptyLabel} icon={false}/> : <div className="cap-preview-rail-layout">
      <nav ref={rail} className="cap-preview-rail-track" aria-label={label} onPointerLeave={event => { if (event.pointerType !== 'touch') setHovered(null); }} onKeyDown={event => {
        pointer.current = null;
        if (event.key === 'Escape') { setPinned(null); setHovered(null); setFocused(null); return; }
        const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight', previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
        if (![nextKey, previousKey, 'Home', 'End'].includes(event.key) || !enabled.length) return;
        event.preventDefault();
        const current = enabled.findIndex(item => document.activeElement?.id === `${id}-${encodeURIComponent(item.id)}`);
        const rtl = orientation === 'horizontal' && getComputedStyle(event.currentTarget).direction === 'rtl';
        const direction = (event.key === nextKey ? 1 : -1) * (rtl ? -1 : 1);
        const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(Math.max(0, current) + direction + enabled.length) % enabled.length];
        if (next) { select(next); document.getElementById(`${id}-${encodeURIComponent(next.id)}`)?.focus(); }
      }}>
        {items.map((item, index) => {
          const distance = highlightedIndex < 0 ? Infinity : Math.abs(index - highlightedIndex);
          const scale = distance === 0 ? 1 : distance === 1 ? 0.68 : distance === 2 ? 0.44 : 0.25;
          const common = { id: `${id}-${encodeURIComponent(item.id)}`, className: 'cap-preview-rail-item', 'aria-label': item.label, 'aria-describedby': showPreview && displayed?.id === item.id ? `${id}-preview` : undefined, title: item.label, tabIndex: selected?.id === item.id ? 0 : -1, 'data-highlighted': highlighted?.id === item.id || undefined,
            onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== 'touch' && !event.buttons && !item.disabled) setHovered(item.id); },
            onPointerDown: (event: PointerEvent<HTMLElement>) => { pointer.current = { type: event.pointerType, pinned: pinned === item.id }; setFocused(null); },
            onPointerCancel: () => { pointer.current = null; },
            onFocus: (event: React.FocusEvent<HTMLElement>) => { if (event.currentTarget.matches(':focus-visible')) setFocused(item.id); reveal(event.currentTarget); },
            onClick: (event: MouseEvent<HTMLElement>) => activate(event, item),
          };
          const tick = <span aria-hidden="true" className="cap-preview-rail-mark" style={{ transform: orientation === 'horizontal' ? `scaleY(${scale})` : `scaleX(${scale})` }}/>;
          return item.href ? <a key={item.id} {...common} href={item.disabled ? undefined : item.href} aria-disabled={item.disabled || undefined} aria-current={selected?.id === item.id ? 'page' : undefined}>{tick}</a> : <button key={item.id} {...common} type="button" aria-pressed={selected?.id === item.id} disabled={item.disabled}>{tick}</button>;
        })}
      </nav>
      {showPreview && displayed && <section id={`${id}-preview`} ref={preview} className="cap-preview-rail-preview" data-surface="floating" aria-label={`${label}${t(": предпросмотр", ": preview")}`} style={position}><div key={displayed.id} className="cap-preview-rail-card">{renderPreview ? renderPreview(displayed) : <><strong>{displayed.label}</strong>{displayed.description && <div className="cap-preview-rail-description">{displayed.description}</div>}{displayed.preview && <div className="cap-preview-rail-content">{displayed.preview}</div>}</>}</div></section>}
      {!enabled.length && <EmptyState title={emptyLabel} icon={false}/>}
    </div>}
  </div>;
}
