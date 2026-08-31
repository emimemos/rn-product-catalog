import {useEffect, useState} from 'react';

/**
 * Delays propagating `value` until it stays still for `delayMs`.
 * The effect's `return` is what matters: without it, every keystroke would
 * leave a live timer and the value would update multiple times (and after
 * unmounting).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
