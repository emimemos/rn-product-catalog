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

    // Se dispatchea contra una store real (no se captura la lista de tipos
    // despachados) para probar el resultado que ve la app, no el mecanismo:
    // es el mismo camino que recorre `useSession` en producción.
    const store = makeStore();
    await store.dispatch(restoreSession({storage}));

    expect(store.getState().session).toEqual({
      status: 'signedIn',
      accessToken: 'tok',
      user: USER,
    });
  });

  it('marca la sesión como ausente cuando no hay token', async () => {
    const storage = createMemoryStorage();
    const store = makeStore();
    await store.dispatch(restoreSession({storage}));

    expect(store.getState().session).toEqual({
      status: 'signedOut',
      accessToken: null,
      user: null,
    });
  });

  it('marca la sesión como ausente cuando falla la lectura del storage', async () => {
    // Un storage roto o sin permisos no es distinto de no tener sesión
    // guardada: no hay nada que restaurar, así que el bootstrap tiene que
    // resolver a `signedOut` en vez de quedarse colgado en `bootstrapping`.
    const storage: Storage = {
      getItem: jest.fn().mockRejectedValue(new Error('storage no disponible')),
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
