import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type DisclosurePhase = 'enter' | 'open' | 'exit';
export interface DisclosureItem<T> { key: string; item: T; phase: DisclosurePhase }

/** Keep closing rows mounted, but inert, until their short CSS transition ends. */
export function useDisclosurePresence<T>(visible: readonly T[], keyOf: (item: T) => string, duration = 180): DisclosureItem<T>[] {
  const [reduceMotion, setReduceMotion] = useState(() => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const keys = visible.map(keyOf).join('\u0000');
  const [present, setPresent] = useState<DisclosureItem<T>[]>(() => visible.map(item => ({ key: keyOf(item), item, phase: 'open' })));
  const current = new Map(visible.map(item => [keyOf(item), item]));
  const latest = useRef(new Map<string, T>());
  const exitTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media?.matches ?? false);
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);
  useLayoutEffect(() => { current.forEach((item, key) => latest.current.set(key, item)); });

  useLayoutEffect(() => {
    setPresent(previous => {
      const before = new Map(previous.map(item => [item.key, item]));
      const next: DisclosureItem<T>[] = visible.map(item => {
        const key = keyOf(item), old = before.get(key);
        return { key, item, phase: old ? (old.phase === 'exit' ? 'open' : old.phase) : (reduceMotion ? 'open' : 'enter') };
      });
      // Commit an inert exit first so consumers can restore focus even with reduced motion.
      previous.forEach((item, index) => {
        if (!current.has(item.key)) next.splice(Math.min(index, next.length), 0, { ...item, item: latest.current.get(item.key) ?? item.item, phase: 'exit' });
      });
      if (next.length === previous.length && next.every((item, index) => item.key === previous[index].key && item.phase === previous[index].phase)) return previous;
      return next;
    });
  }, [keys, reduceMotion]);

  useEffect(() => {
    if (!present.some(item => item.phase === 'enter')) return;
    if (reduceMotion) { setPresent(previous => previous.map(item => item.phase === 'enter' ? { ...item, phase: 'open' } : item)); return; }
    let nextFrame = 0;
    // Paint the zero-size entry before its target state, including freshly mounted rows.
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => setPresent(previous => previous.map(item => item.phase === 'enter' ? { ...item, phase: 'open' } : item))); });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [present, reduceMotion]);

  useEffect(() => {
    const exits = new Set(present.filter(item => item.phase === 'exit').map(item => item.key));
    for (const [key, timer] of exitTimers.current) {
      if (!exits.has(key) || reduceMotion) { clearTimeout(timer); exitTimers.current.delete(key); }
    }
    if (reduceMotion) {
      if (exits.size) setPresent(previous => previous.filter(item => item.phase !== 'exit'));
      return;
    }
    for (const key of exits) {
      if (exitTimers.current.has(key)) continue;
      const timer = setTimeout(() => {
        exitTimers.current.delete(key);
        setPresent(previous => previous.filter(item => item.key !== key || item.phase !== 'exit'));
      }, duration);
      exitTimers.current.set(key, timer);
    }
  }, [present, duration, reduceMotion]);

  useEffect(() => () => { for (const timer of exitTimers.current.values()) clearTimeout(timer); }, []);

  useEffect(() => {
    const retained = new Set(present.map(item => item.key));
    for (const key of latest.current.keys()) if (!retained.has(key) && !current.has(key)) latest.current.delete(key);
  }, [present, keys]);

  return present.map(item => ({ ...item, item: current.get(item.key) ?? latest.current.get(item.key) ?? item.item }));
}
