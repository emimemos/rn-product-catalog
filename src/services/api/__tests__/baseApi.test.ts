import {makeStore} from '@/app/store';
import {ACCESS_TOKEN} from '@/mocks/handlers';

import {baseApi} from '../baseApi';
import {unauthorized} from '../sessionEvents';

describe('store', () => {
  it('monta el reducer de la API bajo la clave `api`', () => {
    const store = makeStore();
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
  });

  it('crea stores independientes', () => {
    expect(makeStore()).not.toBe(makeStore());
  });
});

const probeApi = baseApi.injectEndpoints({
  endpoints: build => ({
    probeMe: build.query<{id: string}, void>({query: () => '/auth/me'}),
  }),
  overrideExisting: true,
});

/**
 * Al despachar un query, RTK Query programa —pase lo que pase, incluso con
 * `subscribe: false`— un `setTimeout` real de 500 ms para sincronizar el
 * estado de suscripciones que usan las devtools. Si el test termina antes de
 * que ese timer dispare, Jest ya desmontó el entorno de este archivo y
 * revienta con "Jest environment... torn down" (o deja el proceso colgado
 * esperando el handle). Se usan fake timers alrededor del dispatch para
 * disparar ese timer al toque en vez de esperar el reloj real.
 */
async function dispatchAndFlush<T>(thunk: () => Promise<T>): Promise<T> {
  jest.useFakeTimers();
  try {
    const result = await thunk();
    jest.runOnlyPendingTimers();
    return result;
  } finally {
    jest.useRealTimers();
  }
}

describe('baseApi', () => {
  it('inyecta el Authorization header desde el store', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: ACCESS_TOKEN, user: null},
    });
    const result = await dispatchAndFlush(() =>
      store.dispatch(
        probeApi.endpoints.probeMe.initiate(undefined, {subscribe: false}),
      ),
    );
    expect(result.data).toBeDefined();
  });

  it('limpia la sesión cuando la respuesta es 401', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: 'token-invalido', user: null},
    });
    await dispatchAndFlush(() =>
      store.dispatch(
        probeApi.endpoints.probeMe.initiate(undefined, {subscribe: false}),
      ),
    );
    // `unauthorized` lo despacha el wrapper del baseQuery; el slice lo escucha.
    expect(store.getState().session.status).toBe('signedOut');
    expect(unauthorized.type).toBe('session/unauthorized');
  });
});
