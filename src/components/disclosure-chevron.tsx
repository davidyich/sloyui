import { useEffect, useLayoutEffect, useRef, type SVGProps } from 'react';

type Points = readonly number[];
const right: Points = [9, 6, 15, 12, 9, 18], down: Points = [6, 9, 12, 15, 18, 9], up: Points = [6, 15, 12, 9, 18, 15];
// Corresponding endpoints stay apart throughout the right/down morph.
const downFromRight: Points = [18, 9, 12, 15, 6, 9];

/** Private decorative glyph. Its three SVG points morph; its box never rotates. */
export function DisclosureChevron({ expanded, closed = 'down', size = 16, className, ...props }: Omit<SVGProps<SVGSVGElement>, 'children'> & { expanded: boolean; closed?: 'right' | 'down'; size?: number }) {
  const target = expanded ? closed === 'right' ? downFromRight : up : closed === 'right' ? right : down;
  const initial = useRef(target), current = useRef(target), latest = useRef(target);
  const line = useRef<SVGPolylineElement>(null), frame = useRef<number | undefined>(undefined);
  latest.current = target;
  const stop = () => { if (frame.current !== undefined) cancelAnimationFrame(frame.current); frame.current = undefined; };
  const paint = (points: Points) => { current.current = points; line.current?.setAttribute('points', points.join(' ')); };
  useLayoutEffect(() => {
    stop();
    if (current.current === target) return;
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.visibilityState === 'hidden') { paint(target); return; }
    const from = current.current, start = performance.now();
    // A bounded 140ms value animation: no geometry reads and no idle frame loop.
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / 140)), eased = 1 - (1 - progress) ** 3;
      paint(progress === 1 ? target : target.map((value, index) => from[index] + (value - from[index]) * eased));
      frame.current = progress < 1 ? requestAnimationFrame(tick) : undefined;
    };
    frame.current = requestAnimationFrame(tick);
    return stop;
  }, [target]);
  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const finish = () => { if (media?.matches || document.visibilityState === 'hidden') { stop(); paint(latest.current); } };
    media?.addEventListener?.('change', finish); document.addEventListener('visibilitychange', finish);
    return () => { media?.removeEventListener?.('change', finish); document.removeEventListener('visibilitychange', finish); stop(); };
  }, []);
  return <svg {...props} className={['cap-icon', 'cap-disclosure-chevron', className].filter(Boolean).join(' ')} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><polyline ref={line} points={initial.current.join(' ')}/></svg>;
}
