import {authHandlers} from './auth';
import {productHandlers} from './products';

/**
 * Única fuente de verdad del contrato de API: los mismos handlers alimentan
 * los tests (vía msw/node) y, en dev, el shim de fetch que instala el
 * entrypoint de la app.
 */
export const handlers = [...authHandlers, ...productHandlers];

export {ACCESS_TOKEN} from './auth';
