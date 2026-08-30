/**
 * Fachada mínima sobre el almacenamiento persistente. Existe para que el
 * reemplazo de AsyncStorage por react-native-keychain sea un solo archivo
 * (ADR-003) y para poder inyectar una implementación en memoria en los tests.
 */
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
