import { useId, type HTMLAttributes, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cx, Icon, IconBox, type Color, type IconName } from './primitives.js';
export function Card({ className, variant = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'subtle' | 'elevated' }) { return <div className={cx('cap-card', className)} data-variant={variant} data-surface={variant === 'subtle' ? 'canvas' : 'raised'} {...props} />; }
export function ObjectCard({ title, description, icon = 'page', color = 'gray', meta, cover, className, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & { title: string; description?: string; icon?: IconName; color?: Color; meta?: ReactNode; cover?: ReactNode }) {
  return <button type="button" className={cx('cap-object-card', className)} data-surface="raised" {...props}>{cover && <span className="cap-object-cover">{cover}</span>}<span className="cap-object-body"><IconBox icon={icon} color={color} /><strong>{title}</strong>{description && <span className="cap-object-description">{description}</span>}{meta && <span className="cap-object-meta">{meta}</span>}</span></button>;
}
export function SidebarItem({ icon, active, count, children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; active?: boolean; count?: number }) {
  return <button type="button" className={cx('cap-sidebar-item', className)} aria-current={active ? 'page' : undefined} {...props}>{icon && <Icon name={icon} />}<span>{children}</span>{count !== undefined && <span className="cap-count">{count}</span>}</button>;
}
export function CollectionRow({ title, icon = 'page', color = 'gray', meta, className, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & { title: string; icon?: IconName; color?: Color; meta?: ReactNode }) {
  return <button type="button" className={cx('cap-collection-row', className)} {...props}><IconBox icon={icon} color={color} size="sm" /><span>{title}</span>{meta && <span className="cap-row-meta">{meta}</span>}</button>;
}
export function PropertyRow({ label, icon, children, className, ...props }: HTMLAttributes<HTMLDivElement> & { label: string; icon?: IconName }) {
  return <div className={cx('cap-property-row', className)} {...props}><span className="cap-property-label">{icon && <Icon name={icon} />}{label}</span><div>{children}</div></div>;
}
export function Breadcrumbs({ items, label = 'Хлебные крошки' }: { items: { label: string; href?: string }[]; label?: string }) {
  return <nav aria-label={label} className="cap-breadcrumbs"><ol>{items.map((item, i) => <li key={i}>{i > 0 && <Icon name="chevron" size={12} />}{item.href && i < items.length - 1 ? <a href={item.href}>{item.label}</a> : <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>}</li>)}</ol></nav>;
}
export function Callout({ color = 'blue', icon = 'info', title, children, className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'color'> & { color?: Color; icon?: IconName; title?: string }) {
  return <div className={cx('cap-callout', className)} data-color={color} {...props}><Icon name={icon} size={18} /><div>{title && <strong>{title}</strong>}{children}</div></div>;
}
export function EmptyState({ icon = 'folder', title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return <div className="cap-empty"><IconBox icon={icon} size="lg" /><strong>{title}</strong>{description && <p>{description}</p>}{action}</div>;
}
export function Accordion({ title, children, className, ...props }: Omit<React.ComponentPropsWithoutRef<'details'>, 'title'> & { title: ReactNode }) {
  return <details className={cx('cap-accordion', className)} {...props}><summary><Icon name="chevron" />{title}</summary><div className="cap-accordion-content">{children}</div></details>;
}
export function Tabs({ items, value, onValueChange, label, className, variant = 'line' }: { variant?: 'line' | 'pills'; items: { value: string; label: string; content: ReactNode; disabled?: boolean }[]; value: string; onValueChange: (v: string) => void; label: string; className?: string }) {
  const id = useId();
  const enabled = items.filter(i => !i.disabled);
  return <div className={cx('cap-tabs', className)}><div role="tablist" aria-label={label} data-variant={variant} className="cap-tab-list" onKeyDown={e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); const index = enabled.findIndex(i => i.value === value);
    const next = e.key === 'Home' ? enabled[0] : e.key === 'End' ? enabled.at(-1) : enabled[(index + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    if (next) { onValueChange(next.value); document.getElementById(`${id}-tab-${next.value}`)?.focus(); }
  }}>{items.map(item => <button type="button" key={item.value} id={`${id}-tab-${item.value}`} role="tab" aria-selected={value === item.value} aria-controls={`${id}-panel-${item.value}`} tabIndex={value === item.value ? 0 : -1} disabled={item.disabled} onClick={() => onValueChange(item.value)}>{item.label}</button>)}</div>{items.map(item => <div key={item.value} id={`${id}-panel-${item.value}`} role="tabpanel" aria-labelledby={`${id}-tab-${item.value}`} hidden={value !== item.value} tabIndex={0} className="cap-tab-panel">{item.content}</div>)}</div>;
}
export function Table({ caption, columns, rows, className }: { caption: string; columns: string[]; rows: ReactNode[][]; className?: string }) {
  return <div className={cx('cap-table-wrap', className)} tabIndex={0} role="region" aria-label={caption}><table className="cap-table"><caption className="cap-sr-only">{caption}</caption><thead><tr>{columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function CodeBlock({ children, label = 'Code' }: { children: string; label?: string }) { return <figure className="cap-code"><figcaption>{label}</figcaption><pre tabIndex={0}><code>{children}</code></pre></figure>; }
