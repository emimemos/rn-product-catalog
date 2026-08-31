import AsyncStorage from '@react-native-async-storage/async-storage';

import type {Storage} from './types';

/**
 * AsyncStorage stores plain, unencrypted text: on a rooted or jailbroken
 * device, or in an unencrypted backup, the token is readable. The correct
 * choice in production is react-native-keychain (Keychain on iOS,
 * EncryptedSharedPreferences on Android). AsyncStorage was chosen here to
 * avoid adding native dependencies and reduce the risk of breaking the build
 * (ADR-003). The replacement affects only this file, because everything else
 * depends on the `Storage` interface. The tradeoff is documented in the
 * README.
 */
export const asyncStorage: Storage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};
