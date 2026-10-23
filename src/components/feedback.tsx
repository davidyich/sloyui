import type { Surface } from './surface.js';
import type { ReactNode } from 'react';
import { Icon, type Color, type IconName } from './primitives.js';
export type FeedbackTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type FeedbackSurface = 'inherit' | Surface;
export interface FeedbackStyleProps {
  tone?: FeedbackTone;
  color?: Color | 'inherit';
  appearance?: 'neutral' | 'soft' | 'solid';
  /** Higher contrast fill; neutral Toast uses the primary pair, inline neutral feedback emphasizes only its icon. */
  contrast?: boolean;
  surface?: FeedbackSurface;
}
const colors: Record<FeedbackTone, Color> = { neutral: 'neutral', info: 'blue', success: 'green', warning: 'orange', danger: 'red' };
const icons: Record<FeedbackTone, IconName> = { neutral: 'info', info: 'info', success: 'check', warning: 'warning', danger: 'warning' };
export const feedbackColor = (tone: FeedbackTone, color?: Color | 'inherit') => color === 'inherit' ? undefined : color ?? colors[tone];
export function FeedbackIcon({ tone, color, contrast, children, className = '' }: { tone: FeedbackTone; color?: Color | 'inherit'; contrast?: boolean; children?: ReactNode; className?: string }) {
  return <span className={`cap-feedback-icon ${className}`} data-accent={feedbackColor(tone, color)} data-contrast={contrast || undefined} aria-hidden="true">{children ?? <Icon name={icons[tone]} size={18}/>}</span>;
}
