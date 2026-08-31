import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction, ThunkAction, UnknownAction} from '@reduxjs/toolkit';

// Type-only import: it doesn't exist at runtime (Babel strips it out at
// compile time), so it doesn't create a cycle with app/store.ts, which does
// import this module at runtime. Same trick already used by
// listenerMiddleware.ts.
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
      // `addCase` goes before `addMatcher`: RTK Toolkit's builder requires
      // that order and fails at runtime if it's reversed.
      .addCase(unauthorized, clear)
      // A successful login doesn't need its own action: the slice reacts to
      // the result of RTK Query's mutation. A single source of truth.
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
 * `dispatch` used to be typed by hand as `(action: unknown) => unknown`.
 * `ThunkAction`, parameterized with the store's real `RootState`, types
 * `dispatch` inside the thunk as the app's real `ThunkDispatch` (the same
 * one `AppDispatch` exposes) instead of `unknown`, and lets
 * `store.dispatch(restoreSession())` / `store.dispatch(signOut())` compile
 * using the real `AppDispatch` (`src/app/store.ts`,
 * `src/services/session/useSession.ts`).
 */
type SessionThunk = ThunkAction<
  Promise<void>,
  RootState,
  unknown,
  UnknownAction
>;

/**
 * Session bootstrap. `storage` is injected so it can be tested without
 * AsyncStorage. It's written as a hand-rolled thunk (not createAsyncThunk)
 * because there are no pending/rejected states worth caring about: either
 * there's a session or there isn't.
 */
export function restoreSession({
  storage = defaultStorage,
}: {storage?: Storage} = {}): SessionThunk {
  return async dispatch => {
    let token: string | null;
    let rawUser: string | null;

    try {
      [token, rawUser] = await Promise.all([
        storage.getItem(STORAGE_KEYS.accessToken),
        storage.getItem(STORAGE_KEYS.user),
      ]);
    } catch {
      // Broken or unauthorized storage is no different from having no
      // saved session: there's nothing to restore. If this rejected
      // instead, RootNavigator's bootstrap would stay in `bootstrapping`
      // forever, with the user staring at the splash with no signal of
      // what happened.
      dispatch(sessionMissing());
      return;
    }

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

/**
 * Logout: clears the slice and **all** of RTK Query's cache.
 *
 * Storage isn't touched here on purpose. `signedOut` already clears it via
 * two listeners — the session one clears the token and user, the favorites
 * one clears its list — and that's the same path a 401 takes, which never
 * goes through this thunk. Clearing it here too would be a second mechanism
 * for the same effect, which is exactly what the listener middleware exists
 * to avoid.
 */
export function signOut(): SessionThunk {
  return async dispatch => {
    dispatch(signedOut());
    dispatch(baseApi.util.resetApiState());
  };
}
