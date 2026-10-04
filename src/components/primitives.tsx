import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, type SVGProps } from 'react';
export const cx = (...values: (string | false | null | undefined)[]) => values.filter(Boolean).join(' ');
export type Size = 'xs' | 'sm' | 'md' | 'lg';
export type Color = 'neutral' | 'gray' | 'rose' | 'pink' | 'fuchsia' | 'purple' | 'violet' | 'indigo' | 'blue' | 'sky' | 'cyan' | 'teal' | 'emerald' | 'green' | 'lime' | 'yellow' | 'amber' | 'orange' | 'red';
export const colors: Color[] = ['neutral', 'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow', 'amber', 'orange', 'red'];
const paths = {
  minus: 'M5 12h14', sort: 'M4 5h10M4 10h7M4 15h4M17 4v16m-4-4 4 4 4-4', microphone: 'M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0V4ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8',
  plus: 'M12 5v14M5 12h14', search: 'm21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  close: 'm6 6 12 12M6 18 18 6', check: 'm5 12 4 4L19 6', chevron: 'm9 5 7 7-7 7', down: 'm5 9 7 7 7-7',
  menu: 'M4 6h16M4 12h16M4 18h16', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  page: 'M14 2H5v20h14V7l-5-5v5h5M8 12h8M8 16h6', book: 'M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2z',
  cube: 'm12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10M7.5 4.5l9 5',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M8 14h2m4 0h2m-8 3h2',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  settings: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  copy: 'M9 9h12v12H9zM5 15H3V3h12v2', arrow: 'M5 12h14m-6-6 6 6-6 6',
  external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7', code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  folder: 'M3 5h7l2 3h9v12H3z', tag: 'M3 3h8l10 10-8 8L3 11V3Zm4 4h.01',
  sparkle: 'm12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  warning: 'm12 3 10 18H2L12 3Zm0 6v5m0 3h.01',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  more: 'M5 12h.01M12 12h.01M19 12h.01', filter: 'M3 5h18M6 12h12m-9 7h6',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',
  clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  layers: 'm12 2 10 6-10 6L2 8l10-6ZM2 12l10 6 10-6M2 16l10 6 10-6',
  heart: 'M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-5 5 2 10 8 16 6-6 13-11 8-16Z',
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 16, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
export function Spinner({ className, label = 'Загрузка', ...props }: HTMLAttributes<HTMLSpanElement> & { label?: string }) {
  return <span role="status" className={cx('cap-spinner', className)} {...props}><span className="cap-sr-only">{label}</span></span>;
}
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'accent'; size?: Size; loading?: boolean; leading?: ReactNode; trailing?: ReactNode;
}
export const Button = /* @__PURE__ */ forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'secondary', size = 'md', loading, leading, trailing, className, children, disabled, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cx('cap-button', className)} data-variant={variant} data-size={size} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading ? <Spinner /> : leading}{children}{trailing}</button>;
});
export const IconButton = /* @__PURE__ */ forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'> & { label: string; icon: IconName }>(function IconButton({ label, icon, className, ...props }, ref) {
  return <Button ref={ref} className={cx('cap-icon-button', className)} aria-label={label} {...props}><Icon name={icon} /></Button>;
});
export function Badge({ color, variant = 'soft', className, children, ...props }: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & { color?: Color; variant?: 'soft' | 'solid' | 'outline' }) {
  return <span className={cx('cap-badge', className)} data-color={color} data-variant={variant} {...props}>{children}</span>;
}
export function Tag({ color, onRemove, className, children, ...props }: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & { color?: Color; onRemove?: () => void }) {
  return <span className={cx('cap-tag', className)} data-color={color} {...props}>{children}{onRemove && <button type="button" className="cap-tag-remove" aria-label={`Удалить тег ${typeof children === 'string' ? children : ''}`} onClick={onRemove}><Icon name="close" size={12} /></button>}</span>;
}
export function TypeLabel({ color, icon = 'page', children, className, ...props }: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & { color?: Color; icon?: IconName }) {
  return <span className={cx('cap-type-label', className)} data-color={color} {...props}><Icon name={icon} size={13} />{children}</span>;
}
export function IconBox({ icon, color, size = 'md', className, ...props }: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & { icon: IconName; color?: Color; size?: Size }) {
  return <span className={cx('cap-icon-box', className)} data-color={color} data-size={size} {...props}><Icon name={icon} size={size === 'lg' ? 24 : size === 'xs' ? 12 : 16} /></span>;
}
export function Avatar({ name, src, size = 'md', className, ...props }: HTMLAttributes<HTMLSpanElement> & { name: string; src?: string; size?: Size }) {
  return <span role="img" aria-label={name} className={cx('cap-avatar', className)} data-size={size} {...props}>{src ? <img src={src} alt="" /> : name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>;
}
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) { return <kbd className={cx('cap-kbd', className)} {...props} />; }
export function Separator({ className, ...props }: HTMLAttributes<HTMLHRElement>) { return <hr className={cx('cap-separator', className)} {...props} />; }
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div aria-hidden="true" className={cx('cap-skeleton', className)} {...props} />; }
export function Progress({ value, label, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: number; label: string }) {
  const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe} className={cx('cap-progress', className)} {...props}><span style={{ width: `${safe}%` }} /></div>;
}
