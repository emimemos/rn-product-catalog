import {DEMO_PASSWORD as MOCK_DEMO_PASSWORD, DEMO_USER} from '@/mocks/db';

import {DEMO_EMAIL, DEMO_PASSWORD} from '../demoCredentials';

/**
 * Las credenciales de demo están duplicadas a propósito (ver comentario en
 * demoCredentials.ts). Este test es la única razón por la que esa
 * duplicación es segura: si el mock server cambia las credenciales que
 * acepta y nadie actualiza el hint de la pantalla, esto falla en vez de
 * dejar que la demo muestre un login que ya no funciona.
 */
describe('demoCredentials', () => {
  it('coincide con las credenciales que acepta el mock server', () => {
    expect(DEMO_EMAIL).toBe(DEMO_USER.email);
    expect(DEMO_PASSWORD).toBe(MOCK_DEMO_PASSWORD);
  });
});
