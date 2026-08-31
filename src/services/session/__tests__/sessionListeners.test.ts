import {makeStore} from '@/app/store';
import {DEMO_PASSWORD, DEMO_USER} from '@/mocks/db';
import {ACCESS_TOKEN} from '@/mocks/handlers';
import {unauthorized} from '@/services/api/sessionEvents';
import {storage, STORAGE_KEYS} from '@/services/storage';

import {sessionApi} from '../sessionApi';
import {signOut} from '../sessionSlice';

/**
 * These tests look at storage, not the store. `sessionSlice`'s tests prove
 * that the in-memory state ends up right; here we test the one thing the
 * listener middleware does — write and clear — that no reducer touches.
 * Without this, emptying out the listeners' bodies would leave the whole
 * suite green even though the session no longer survives an app restart.
 *
 * Each test seeds storage on its own instead of relying on the previous
 * test's listener: that way the one testing clearing fails if clearing
 * breaks, not only if writing breaks.
 */

/**
 * The listeners' effects are `async`: dispatch returns before they finish
 * writing. One macrotask turn is enough for the AsyncStorage mock's
 * in-memory storage to have resolved.
 */
function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function readSession(): Promise<{
  token: string | null;
  user: string | null;
}> {
  return {
    token: await storage.getItem(STORAGE_KEYS.accessToken),
    user: await storage.getItem(STORAGE_KEYS.user),
  };
}

async function seedStoredSession(): Promise<void> {
  await storage.setItem(STORAGE_KEYS.accessToken, ACCESS_TOKEN);
  await storage.setItem(STORAGE_KEYS.user, JSON.stringify(DEMO_USER));
}

describe('sessionListeners', () => {
  afterEach(async () => {
    await storage.removeItem(STORAGE_KEYS.accessToken);
    await storage.removeItem(STORAGE_KEYS.user);
  });

  it('persists the token and user when login resolves', async () => {
    const store = makeStore();
    await store.dispatch(
      sessionApi.endpoints.login.initiate({
        email: DEMO_USER.email,
        password: DEMO_PASSWORD,
      }),
    );
    await settle();

    expect(await readSession()).toEqual({
      token: ACCESS_TOKEN,
      user: JSON.stringify(DEMO_USER),
    });
  });

  it('clears the token and user from storage on sign out', async () => {
    await seedStoredSession();

    const store = makeStore();
    await store.dispatch(signOut());
    await settle();

    expect(await readSession()).toEqual({token: null, user: null});
  });

  it('clears the token and user from storage when the session expires with a 401', async () => {
    await seedStoredSession();

    // A 401 doesn't go through the logout thunk: it's dispatched by the
    // baseQuery wrapper. If storage cleanup lived in that thunk, this case
    // would leave the previous session written to disk.
    const store = makeStore();
    store.dispatch(unauthorized());
    await settle();

    expect(await readSession()).toEqual({token: null, user: null});
  });
});
