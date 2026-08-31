import {useEffect, useState} from 'react';

/**
 * Retrasa la propagación de `value` hasta que se queda quieto `delayMs`.
 * El `return` del efecto es lo importante: sin él, cada tecla dejaría un timer
 * vivo y el valor se actualizaría varias veces (y después de desmontar).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
