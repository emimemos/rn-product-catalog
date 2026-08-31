import {http, HttpResponse} from 'msw';

import {makeStore} from '@/app/store';
import {ACCESS_TOKEN} from '@/mocks/handlers';
import {server} from '@/mocks/server.node';

import {baseApi} from '../baseApi';
import {API_BASE_URL} from '../config';
import {unauthorized} from '../sessionEvents';

describe('store', () => {
  it('mounts the API reducer under the `api` key', () => {
    const store = makeStore();
    expect(store.getState()).toHaveProperty(baseApi.reducerPath);
  });

  it('creates independent stores', () => {
    expect(makeStore()).not.toBe(makeStore());
  });
});

/**
 * Test endpoint and handler: what's being tested here is the `baseQuery`
 * wrapper (the Authorization header and the reaction to a 401), not a real
 * app endpoint. That's why both the endpoint and its handler live in this
 * file: `src/mocks/handlers/` describes the real API contract and shouldn't
 * carry routes that only exist for a test.
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
        return HttpResponse.json({message: 'Unauthorized'}, {status: 401});
      }
      return HttpResponse.json({authorization});
    }),
  );
}

/**
 * When dispatching a query, RTK Query schedules — no matter what, even with
 * `subscribe: false` — a real 500ms `setTimeout` to sync the subscription
 * state the devtools use. If the test ends before that timer fires, Jest has
 * already torn down this file's environment and blows up with "Jest
 * environment... torn down" (or leaves the process hanging waiting for the
 * handle). Fake timers are used around the dispatch to fire that timer right
 * away instead of waiting for the real clock.
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

  it('injects the Authorization header from the store', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: ACCESS_TOKEN, user: null},
    });
    const result = await dispatchAndFlush(() =>
      store.dispatch(
        probeApi.endpoints.probeAuth.initiate(undefined, {subscribe: false}),
      ),
    );
    // The handler returns the header it received: the assertion is about
    // what reached the server, not about the request not having failed.
    expect(result.data?.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it('clears the session when the response is a 401', async () => {
    const store = makeStore({
      session: {status: 'signedIn', accessToken: 'token-invalido', user: null},
    });
    await dispatchAndFlush(() =>
      store.dispatch(
        probeApi.endpoints.probeAuth.initiate(undefined, {subscribe: false}),
      ),
    );
    // `unauthorized` is dispatched by the baseQuery wrapper; the slice listens for it.
    expect(store.getState().session.status).toBe('signedOut');
    expect(unauthorized.type).toBe('session/unauthorized');
  });
});
