import AsyncStorage from '@react-native-async-storage/async-storage';

import type {Storage} from './types';

/**
 * AsyncStorage guarda texto plano, sin cifrar: en un dispositivo con root o
 * jailbreak, o en un backup sin cifrar, el token es legible. Lo correcto en
 * producción es react-native-keychain (Keychain en iOS, EncryptedSharedPreferences
 * en Android). Se eligió AsyncStorage acá para no sumar dependencias nativas y
 * reducir el riesgo de que el build se rompa (ADR-003). El reemplazo afecta
 * únicamente a este archivo, porque todo lo demás depende de la interfaz
 * `Storage`. El tradeoff se documenta en el README (futuro, no presente).
 */
export const asyncStorage: Storage = {
  getItem: key => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: key => AsyncStorage.removeItem(key),
};
