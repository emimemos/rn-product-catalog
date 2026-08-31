import {authHandlers} from './auth';
import {productHandlers} from './products';

/**
 * Single source of truth for the API contract: the same handlers feed the
 * tests (via msw/node) and, in dev, the fetch shim the app entrypoint
 * installs.
 */
export const handlers = [...authHandlers, ...productHandlers];

export {ACCESS_TOKEN} from './auth';
