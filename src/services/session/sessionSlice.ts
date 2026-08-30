import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction, ThunkAction, UnknownAction} from '@reduxjs/toolkit';

// Import de tipo puro: en runtime no existe (Babel lo borra al compilar), así
// que no arma un ciclo con app/store.ts, que sí importa este módulo en
// runtime. Mismo truco que ya usa listenerMiddleware.ts.
import type {RootState} from '@/app/store';
import {baseApi} from '@/services/api/baseApi';
import {unauthorized} from '@/services/api/sessionEvents';
import type {User} from '@/services/api/types';
import {storage as defaultStorage, STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';

import {sessionApi} from './sessionApi';

export interface SessionState {
  status: 'bootstrapping' | 'signedOut' | 'signedIn';
  accessToken: string | null;
  user: User | null;
}

const initialState: SessionState = {
  status: 'bootstrapping',
  accessToken: null,
  user: null,
};

function clear(state: SessionState): void {
  state.status = 'signedOut';
  state.accessToken = null;
  state.user = null;
}

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionRestored(
      state,
      action: PayloadAction<{accessToken: string; user: User}>,
    ) {
      state.status = 'signedIn';
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    sessionMissing: clear,
    signedOut: clear,
  },
  extraReducers: builder => {
    builder
      // `addCase` va antes que `addMatcher`: el builder de RTK Toolkit exige ese
      // orden y falla en runtime si se invierte.
      .addCase(unauthorized, clear)
      // El login exitoso no necesita una acción propia: el slice reacciona al
      // resultado de la mutación de RTK Query. Una sola fuente de verdad.
      .addMatcher(
        sessionApi.endpoints.login.matchFulfilled,
        (state, action) => {
          state.status = 'signedIn';
          state.accessToken = action.payload.accessToken;
          state.user = action.payload.user;
        },
      );
  },
});

export const {sessionMissing, sessionRestored, signedOut} =
  sessionSlice.actions;
export default sessionSlice.reducer;

/**
 * Antes `dispatch` venía tipado a mano como `(action: unknown) => unknown`.
 * `ThunkAction`, parametrizado con el `RootState` real de la store, tipa
 * `dispatch` dentro del thunk como la `ThunkDispatch` real de la app (la
 * misma que expone `AppDispatch`) en vez de `unknown`, y habilita que
 * `store.dispatch(restoreSession())` / `store.dispatch(signOut())` compilen
 * usando la `AppDispatch` real (`src/app/store.ts`, `src/services/session/useSession.ts`).
 */
type SessionThunk = ThunkAction<
  Promise<void>,
  RootState,
  unknown,
  UnknownAction
>;

/**
 * Bootstrap de sesión. `storage` se inyecta para poder testearlo sin AsyncStorage.
 * Se escribe como thunk a mano (no createAsyncThunk) porque no hay estados
 * pending/rejected que interesen: o hay sesión o no la hay.
 */
export function restoreSession({
  storage = defaultStorage,
}: {storage?: Storage} = {}): SessionThunk {
  return async dispatch => {
    const [token, rawUser] = await Promise.all([
      storage.getItem(STORAGE_KEYS.accessToken),
      storage.getItem(STORAGE_KEYS.user),
    ]);

    if (token == null || rawUser == null) {
      dispatch(sessionMissing());
      return;
    }

    try {
      dispatch(
        sessionRestored({
          accessToken: token,
          user: JSON.parse(rawUser) as User,
        }),
      );
    } catch {
      dispatch(sessionMissing());
    }
  };
}

/** Logout: limpia el slice, el storage y **todo** el cache de RTK Query. */
export function signOut({
  storage = defaultStorage,
}: {storage?: Storage} = {}): SessionThunk {
  return async dispatch => {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.accessToken),
      storage.removeItem(STORAGE_KEYS.user),
    ]);
    dispatch(signedOut());
    dispatch(baseApi.util.resetApiState());
  };
}
