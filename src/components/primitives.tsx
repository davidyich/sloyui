import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, type ComponentType, type AnchorHTMLAttributes, type SVGProps } from 'react';
export const cx = (...values: (string | false | null | undefined)[]) => values.filter(Boolean).join(' ');
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Color = 'neutral' | 'gray' | 'rose' | 'pink' | 'fuchsia' | 'purple' | 'violet' | 'indigo' | 'blue' | 'sky' | 'cyan' | 'teal' | 'emerald' | 'green' | 'lime' | 'yellow' | 'amber' | 'orange' | 'red';
export const colors: Color[] = ['neutral', 'rose', 'pink', 'fuchsia', 'purple', 'violet', 'indigo', 'blue', 'sky', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow', 'amber', 'orange', 'red'];
import { Square, PanelsTopLeft, SlidersHorizontal, Minus, ArrowDownWideNarrow, Mic, Plus, Search, X, Check, ChevronRight, ChevronDown, Menu as MenuIcon, Grid2X2, FileText, BookOpen, Box, CalendarDays, Sun, Moon, Settings, Copy, ArrowRight, ExternalLink, Code, Folder, Tag as TagIcon, Sparkles, Info, TriangleAlert, Trash2, Ellipsis, ListFilter, List, Clock, Layers, Heart, PanelLeft, PanelRight } from 'lucide-react';
const iconGlyphs: Record<IconName, IconGlyph> = { border:Square, table:PanelsTopLeft, sliders:SlidersHorizontal, minus:Minus, sort:ArrowDownWideNarrow, microphone:Mic, plus:Plus, search:Search, close:X, check:Check, chevron:ChevronRight, down:ChevronDown, menu:MenuIcon, grid:Grid2X2, page:FileText, book:BookOpen, cube:Box, calendar:CalendarDays, sun:Sun, moon:Moon, settings:Settings, copy:Copy, arrow:ArrowRight, external:ExternalLink, code:Code, folder:Folder, tag:TagIcon, sparkle:Sparkles, info:Info, warning:TriangleAlert, trash:Trash2, more:Ellipsis, filter:ListFilter, list:List, clock:Clock, layers:Layers, heart:Heart, panelLeft:PanelLeft, panelRight:PanelRight };
export type IconName = 'border' | 'table' | 'sliders' | 'minus' | 'sort' | 'microphone' | 'plus' | 'search' | 'close' | 'check' | 'chevron' | 'down' | 'menu' | 'grid' | 'page' | 'book' | 'cube' | 'calendar' | 'sun' | 'moon' | 'settings' | 'copy' | 'arrow' | 'external' | 'code' | 'folder' | 'tag' | 'sparkle' | 'info' | 'warning' | 'trash' | 'more' | 'filter' | 'list' | 'clock' | 'layers' | 'heart' | 'panelLeft' | 'panelRight';
/** Accept any directly imported Lucide icon without loading a dynamic runtime. */
export type IconGlyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
export type IconSource = IconName | IconGlyph;
export const iconNames = /* @__PURE__ */ Object.keys(iconGlyphs) as IconName[];
export function Icon({ name, size = 16, ...props }: Omit<SVGProps<SVGSVGElement>, 'name'> & { name: IconSource; size?: number }) {
  const Glyph = typeof name === 'string' ? iconGlyphs[name] : name;
  return <Glyph size={size} strokeWidth={1.65} aria-hidden="true" focusable="false" {...props} />;
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
export const IconButton = /* @__PURE__ */ forwardRef<HTMLButtonElement, Omit<ButtonProps, 'children'> & { label: string; icon: IconSource }>(function IconButton({ label, icon, className, ...props }, ref) {
  return <Button ref={ref} className={cx('cap-icon-button', className)} aria-label={label} {...props}>{!props.loading && <Icon name={icon} />}</Button>;
});
export type CounterVariant = 'neutral' | 'translucent' | 'accent' | 'white' | 'black' | 'plain' | 'soft';
export interface CounterProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> { value: number | string; size?: Size; variant?: CounterVariant; shape?: 'round' | 'rounded'; color?: Color; max?: number }
export function Counter({ value, size = 'sm', variant = 'neutral', shape = 'round', color, max, className, ...props }: CounterProps) {
  const display = typeof value === 'number' && max !== undefined && value > max ? `${max}+` : value;
  return <span className={cx('cap-counter', className)} data-size={size} data-variant={variant === 'soft' ? 'neutral' : variant} data-shape={shape} data-color={color} aria-label={display !== value ? String(value) : undefined} {...props}>{display}</span>;
}
export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color' | 'onClick'> {
  color?: Color; size?: Size; variant?: 'soft' | 'solid' | 'outline'; icon?: IconSource; count?: number | string;
  shape?: 'rounded' | 'pill';
  counter?: Pick<CounterProps, 'variant' | 'shape' | 'max'>;
  /** False makes every slot static, even when action handlers are supplied. Omitted infers from handlers. */
  interactive?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']; onRemove?: () => void;
  action?: { icon: IconSource; label: string; onClick: () => void }; disabled?: boolean;
}
export function Tag({ color, size = 'sm', variant = 'soft', shape = 'rounded', icon, count, counter, interactive, onRemove, action, onClick, disabled = false, className, children, ...props }: TagProps) {
  const isInteractive = interactive ?? !!(onClick || onRemove || action);
  const endAction = action ?? (onRemove ? {icon: 'close' as const, label: `Удалить тег ${typeof children === 'string' ? children : ''}`, onClick: onRemove} : undefined);
  const content = <>{icon && <Icon name={icon} />}<span className="cap-tag-text">{children}</span>{count !== undefined && <Counter value={count} size={size} variant="translucent" {...counter} />}</>;
  return <span {...props} className={cx('cap-tag', className)} data-size={size} data-variant={variant} data-shape={shape} data-color={color} data-interactive={isInteractive || undefined} aria-disabled={disabled || undefined}>
    {isInteractive && onClick ? <button type="button" className="cap-tag-label" disabled={disabled} onClick={onClick}>{content}</button> : <span className="cap-tag-label">{content}</span>}
    {isInteractive && endAction && <button type="button" className="cap-tag-remove" disabled={disabled} aria-label={endAction.label} onClick={endAction.onClick}><Icon name={endAction.icon} /></button>}
  </span>;
}
/** @deprecated Use Tag. Compatibility wrapper; no separate visual system. */
export function Badge(props: TagProps) { return <Tag {...props} />; }
/** @deprecated Use Tag with icon. */
export function TypeLabel({icon = 'page', ...props}: TagProps) { return <Tag icon={icon} {...props} />; }
export type TextActionProps = ({href: string} & AnchorHTMLAttributes<HTMLAnchorElement>) | ({href?: never} & ButtonHTMLAttributes<HTMLButtonElement>);
export const TextAction = /* @__PURE__ */ forwardRef<HTMLAnchorElement | HTMLButtonElement, TextActionProps>(function TextAction(props, ref) {
  if (props.href !== undefined) { const {className, ...rest} = props; return <a ref={ref as React.Ref<HTMLAnchorElement>} className={cx('cap-text-action',className)} {...rest} />; }
  const {className, type = 'button', ...rest} = props;
  return <button ref={ref as React.Ref<HTMLButtonElement>} type={type} className={cx('cap-text-action',className)} {...rest} />;
});
export function IconBox({ icon, color, size = 'md', className, ...props }: Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & { icon: IconSource; color?: Color; size?: Size }) {
  return <span className={cx('cap-icon-box', className)} data-color={color} data-size={size} {...props}><Icon name={icon} size={size === 'xl' ? 32 : size === 'lg' ? 24 : size === 'xs' ? 12 : 16} /></span>;
}
export function Avatar({ name, src, size = 'md', className, ...props }: HTMLAttributes<HTMLSpanElement> & { name: string; src?: string; size?: Size }) {
  return <span role="img" aria-label={name} className={cx('cap-avatar', className)} data-size={size} {...props}>{src ? <img src={src} alt="" /> : name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>;
}
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) { return <kbd className={cx('cap-kbd', className)} {...props} />; }
export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> { orientation?: 'horizontal' | 'vertical'; length?: number | string; contrast?: 'subtle' | 'normal' | 'strong'; reveal?: 'always' | 'hover' }
export function Separator({ className, orientation = 'horizontal', length, contrast = 'normal', reveal = 'always', style, ...props }: SeparatorProps) { return <hr className={cx('cap-separator', className)} aria-orientation={orientation} data-orientation={orientation} data-contrast={contrast} data-reveal={reveal} style={{[orientation==='vertical'?'height':'width']:length,...style}} {...props} />; }
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div aria-hidden="true" className={cx('cap-skeleton', className)} {...props} />; }
export function Progress({ value, label, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: number; label: string }) {
  const safe = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe} className={cx('cap-progress', className)} {...props}><span style={{ width: `${safe}%` }} /></div>;
}
