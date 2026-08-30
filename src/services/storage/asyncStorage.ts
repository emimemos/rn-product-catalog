import AsyncStorage from '@react-native-async-storage/async-storage';

import type {Storage} from './types';

/**
 * ADR-003: en producción esto debería ser react-native-keychain (Keychain en iOS,
 * EncryptedSharedPreferences en Android). Se eligió AsyncStorage para no sumar
 * dependencias nativas. El tradeoff está declarado en el README; el reemplazo
 * afecta únicamente a este archivo.
 */
export const asyncStorage: Storage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};
