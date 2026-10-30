import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from './primitives.js';

/** Shared boundary affordance; each layout owns its sizing and input semantics. */
export const ResizeSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
  appearance?: 'line' | 'grip';
}>(function ResizeSeparator({ orientation = 'horizontal', appearance = 'line', className, ...props }, ref) {
  return <div {...props} ref={ref} className={cx('cap-resize-separator', className)} data-orientation={orientation} data-appearance={appearance}>
    <span className="cap-resize-separator-grip cap-resizable-handle-grip" aria-hidden="true" />
  </div>;
});
