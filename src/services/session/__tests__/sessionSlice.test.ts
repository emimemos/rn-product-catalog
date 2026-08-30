import {unauthorized} from '@/services/api/sessionEvents';
import type {User} from '@/services/api/types';
import {createMemoryStorage, STORAGE_KEYS} from '@/services/storage';

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
  it('arranca en bootstrapping', () => {
    expect(sessionReducer(undefined, {type: '@@INIT'})).toEqual(initial);
  });

  it('pasa a signedIn al restaurar una sesión', () => {
    const state = sessionReducer(
      initial,
      sessionRestored({accessToken: 'tok', user: USER}),
    );
    expect(state).toEqual({status: 'signedIn', accessToken: 'tok', user: USER});
  });

  it('pasa a signedOut cuando no hay sesión guardada', () => {
    expect(sessionReducer(initial, sessionMissing()).status).toBe('signedOut');
  });

  it('pasa a signedIn cuando el login se resuelve', () => {
    // RTK Query comparte un único thunk interno (`executeMutation`) entre
    // todas las mutations de una `api`; lo que distingue a cada endpoint es
    // `meta.arg.endpointName`, no el `type`. `matchFulfilled` es una función
    // compuesta (no un action creator con `.type`), así que acá se reproduce
    // el `type` real que emite esa mutation compartida en vez de invocar
    // `.toString()` sobre el matcher, que solo devolvería su código fuente.
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

  it('limpia token y usuario en signedOut', () => {
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

  it('limpia la sesión cuando la API responde 401', () => {
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
  it('restaura la sesión guardada', async () => {
    const storage = createMemoryStorage();
    await storage.setItem(STORAGE_KEYS.accessToken, 'tok');
    await storage.setItem(STORAGE_KEYS.user, JSON.stringify(USER));

    const dispatched: string[] = [];
    const thunk = restoreSession({storage});
    await thunk(
      action => {
        dispatched.push(
          typeof action === 'object' && action !== null && 'type' in action
            ? String(action.type)
            : '',
        );
        return action;
      },
      () => ({}),
      undefined,
    );

    expect(dispatched).toContain(sessionRestored.type);
  });

  it('marca la sesión como ausente cuando no hay token', async () => {
    const storage = createMemoryStorage();
    const dispatched: string[] = [];
    const thunk = restoreSession({storage});
    await thunk(
      action => {
        dispatched.push(
          typeof action === 'object' && action !== null && 'type' in action
            ? String(action.type)
            : '',
        );
        return action;
      },
      () => ({}),
      undefined,
    );

    expect(dispatched).toContain(sessionMissing.type);
  });
});
