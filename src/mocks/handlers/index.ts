import {authHandlers} from './auth';
import {productHandlers} from './products';

/**
 * Única fuente de verdad del contrato de API: los mismos handlers alimentan la
 * app en desarrollo (msw/native) y los tests (msw/node).
 */
export const handlers = [...authHandlers, ...productHandlers];

export {ACCESS_TOKEN} from './auth';
