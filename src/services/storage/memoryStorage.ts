import type {Storage} from './types';

/** Implementación para tests: sin efectos de módulo, aislada por instancia. */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}
