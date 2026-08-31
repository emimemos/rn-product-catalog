import {http, HttpResponse} from 'msw';

import {makeStore} from '@/app/store';
import {ACCESS_TOKEN} from '@/mocks/handlers';
import {server} from '@/mocks/server.node';

import {baseApi} from '../baseApi';
import {API_BASE_URL} from '../config';
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

/**
 * Endpoint y handler de prueba: lo que se testea acá es el wrapper del
 * `baseQuery` (header de Authorization y reacción al 401), no un endpoint real
 * de la app. Por eso tanto el endpoint como su handler viven en este archivo:
 * `src/mocks/handlers/` describe el contrato de la API de verdad y no debería
 * cargar rutas que solo existen para un test.
 */
const probeApi = baseApi.injectEndpoints({
  endpoints: build => ({
    probeAuth: build.query<{authorization: string | null}, void>({
      query: () => '/probe-auth',
    }),
  }),
  overrideExisting: true,
});

function useProbeHandler(): void {
  server.use(
    http.get(`${API_BASE_URL}/probe-auth`, ({request}) => {
      const authorization = request.headers.get('Authorization');
      if (authorization !== `Bearer ${ACCESS_TOKEN}`) {
        return HttpResponse.json({message: 'No autorizado'}, {status: 401});
      }
      return HttpResponse.json({authorization});
    }),
  );
}

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
  beforeEach(useProbeHandler);

  it('inyecta el Authorization header desde el store', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: ACCESS_TOKEN, user: null},
    });
    const result = await dispatchAndFlush(() =>
      store.dispatch(
        probeApi.endpoints.probeAuth.initiate(undefined, {subscribe: false}),
      ),
    );
    // El handler devuelve el header que recibió: la afirmación es sobre lo que
    // llegó al servidor, no sobre que la request no falló.
    expect(result.data?.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('limpia la sesión cuando la respuesta es 401', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: 'token-invalido', user: null},
    });
    await dispatchAndFlush(() =>
      store.dispatch(
        probeApi.endpoints.probeAuth.initiate(undefined, {subscribe: false}),
      ),
    );
    // `unauthorized` lo despacha el wrapper del baseQuery; el slice lo escucha.
    expect(store.getState().session.status).toBe('signedOut');
    expect(unauthorized.type).toBe('session/unauthorized');
  });
});
