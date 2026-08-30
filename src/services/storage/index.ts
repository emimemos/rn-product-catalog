import {asyncStorage} from './asyncStorage';
import type {Storage} from './types';

export {createMemoryStorage} from './memoryStorage';
export {STORAGE_KEYS} from './keys';
export type {Storage} from './types';

export const storage: Storage = asyncStorage;
