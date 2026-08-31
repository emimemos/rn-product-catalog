import {asyncStorage} from './asyncStorage';
import type {Storage} from './types';

export {STORAGE_KEYS} from './keys';
export type {Storage} from './types';

/**
 * La implementación en memoria (`./memoryStorage`) es solo para tests y a
 * propósito no se re-exporta acá: la superficie pública de este servicio es la
 * que puede usar el código de la app.
 */
export const storage: Storage = asyncStorage;
