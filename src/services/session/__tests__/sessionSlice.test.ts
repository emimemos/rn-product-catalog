import {makeStore} from '@/app/store';
import {unauthorized} from '@/services/api/sessionEvents';
import type {User} from '@/services/api/types';
import {STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';
import {createMemoryStorage} from '@/services/storage/memoryStorage';

import sessionReducer, {
  restoreSession,
  sessionMissing,
  sessionRestored,
  signedOut,
} from '../sessionSlice';
import type {SessionState} from '../sessionSlice';

const USER: User = {id: 'u-1', email: 'demo@catalog.dev', name: 'Demo User'};

const initial: SessionState = {
  status: 'bootstrapping',
  accessToken: null,
  user: null,
};

describe('sessionSlice', () => {
  it('starts in bootstrapping', () => {
    expect(sessionReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('moves to signedIn when restoring a session', () => {
    const state = sessionReducer(
      initial,
      sessionRestored({accessToken: 'tok', user: USER}),
    );
    expect(state).toEqual({status: 'signedIn', accessToken: 'tok', user: USER});
  });

  it('moves to signedOut when there is no saved session', () => {
    expect(sessionReducer(initial, sessionMissing()).status).toBe('signedOut');
  });

  it('moves to signedIn when login resolves', () => {
    // RTK Query shares a single internal thunk (`executeMutation`) across
    // all of an `api`'s mutations; what tells each endpoint apart is
    // `meta.arg.endpointName`, not the `type`. `matchFulfilled` is a
    // composed function (not an action creator with a `.type`), so here we
    // reproduce the real `type` that shared mutation emits instead of
    // calling `.toString()` on the matcher, which would only return its
    // source code.
    const action = {
      type: 'api/executeMutation/fulfilled',
      payload: {accessToken: 'tok', user: USER},
      meta: {
        arg: {endpointName: 'login'},
        requestId: 'r1',
        requestStatus: 'fulfilled',
      },
    };
    const state = sessionReducer(initial, action);
    expect(state.status).toBe('signedIn');
    expect(state.accessToken).toBe('tok');
  });

  it('clears the token and user on signedOut', () => {
    const signedIn: SessionState = {
      status: 'signedIn',
      accessToken: 'tok',
      user: USER,
    };
    expect(sessionReducer(signedIn, signedOut())).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });

  it('clears the session when the API responds with a 401', () => {
    const signedIn: SessionState = {
      status: 'signedIn',
      accessToken: 'tok',
      user: USER,
    };
    expect(sessionReducer(signedIn, unauthorized())).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });
});

describe('restoreSession', () => {
  it('restores the saved session', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.accessToken, 'tok');
    await storage.setItem(STORAGE_KEYS.user, JSON.stringify(USER));

    // Dispatched against a real store (the list of dispatched types isn't
    // captured) to test the result the app sees, not the mechanism: it's
    // the same path `useSession` takes in production.
    const store = makeStore();
    await store.dispatch(restoreSession({storage}));

    expect(store.getState().session).toEqual({
      status: 'signedIn',
      accessToken: 'tok',
      user: USER,
    });
  });

  it('marks the session as missing when there is no token', async () => {
    const storage = createMemoryStorage();
    const store = makeStore();
    await store.dispatch(restoreSession({storage}));

    expect(store.getState().session).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });

  it('marks the session as missing when reading storage fails', async () => {
    // Broken or unauthorized storage is no different from having no saved
    // session: there's nothing to restore, so the bootstrap has to resolve
    // to `signedOut` instead of staying stuck in `bootstrapping`.
    const storage: Storage = {
      getItem: jest.fn().mockRejectedValue(new Error('storage unavailable')),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const store = makeStore();
    await store.dispatch(restoreSession({storage}));

    expect(store.getState().session).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });
});
