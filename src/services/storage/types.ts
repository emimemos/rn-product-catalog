/**
 * Minimal facade over persistent storage. It exists so that replacing
 * AsyncStorage with react-native-keychain is a single-file change (ADR-003)
 * and so an in-memory implementation can be injected in tests.
 */
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
