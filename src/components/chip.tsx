import { useTranslate } from './locale.js';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Counter, Icon, cx, type CounterProps, type IconSource, type Size } from './primitives.js';

export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick'> {
  children?: ReactNode;
  size?: Size;
  shape?: 'rounded' | 'pill';
  icon?: IconSource;
  count?: number | string;
  counter?: Pick<CounterProps, 'variant' | 'shape' | 'max'>;
  selected?: boolean;
  disabled?: boolean;
  /** False keeps the entire chip static, including its action slot. */
  interactive?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onRemove?: () => void;
  action?: { icon: IconSource; label: string; onClick: () => void };
}

/** Neutral, button-like selection token. Label and trailing action are sibling controls. */
export function Chip({ children, size = 'sm', shape = 'rounded', icon, count, counter, selected, disabled = false, interactive, onClick, onRemove, action, className, ...props }: ChipProps) {
  const t = useTranslate();

  const active = interactive ?? !!(onClick || onRemove || action);
  const endAction = action ?? (onRemove ? { icon: 'close' as const, label: `${t("Удалить ", "Remove ")}${typeof children === 'string' ? children : t("элемент", "item")}`, onClick: onRemove } : undefined);
  const content = <>{icon && <Icon name={icon} aria-hidden="true" />}<span className="cap-chip-text">{children}</span>{count !== undefined && <Counter value={count} size={size} variant="translucent" {...counter} />}</>;
  return <span {...props} className={cx('cap-chip', className)} data-size={size} data-shape={shape} data-selected={selected || undefined} data-interactive={active || undefined} aria-disabled={disabled || undefined}>
    {active && onClick ? <button type="button" className="cap-chip-label" disabled={disabled} aria-pressed={selected} onClick={onClick}>{content}</button> : <span className="cap-chip-label">{content}</span>}
    {active && endAction && <button type="button" className="cap-chip-action" disabled={disabled} aria-label={endAction.label} onClick={event => { event.stopPropagation(); endAction.onClick(); }}><Icon name={endAction.icon} aria-hidden="true" /></button>}
  </span>;
}
