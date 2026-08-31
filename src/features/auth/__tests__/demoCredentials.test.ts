import {DEMO_PASSWORD as MOCK_DEMO_PASSWORD, DEMO_USER} from '@/mocks/db';

import {DEMO_EMAIL, DEMO_PASSWORD} from '../demoCredentials';

/**
 * The demo credentials are duplicated on purpose (see the comment in
 * demoCredentials.ts). This test is the only reason that duplication is
 * safe: if the mock server changes the credentials it accepts and nobody
 * updates the screen's hint, this fails instead of letting the demo show a
 * login that no longer works.
 */
describe('demoCredentials', () => {
  it('matches the credentials the mock server accepts', () => {
    expect(DEMO_EMAIL).toBe(DEMO_USER.email);
    expect(DEMO_PASSWORD).toBe(MOCK_DEMO_PASSWORD);
  });
});
