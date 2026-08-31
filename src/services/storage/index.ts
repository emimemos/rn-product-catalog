import {asyncStorage} from './asyncStorage';
import type {Storage} from './types';

export {STORAGE_KEYS} from './keys';
export type {Storage} from './types';

/**
 * The in-memory implementation (`./memoryStorage`) is only for tests and is
 * deliberately not re-exported here: this service's public surface is what
 * the app's code is allowed to use.
 */
export const storage: Storage = asyncStorage;
