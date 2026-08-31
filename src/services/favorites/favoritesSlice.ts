import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction, ThunkAction, UnknownAction} from '@reduxjs/toolkit';

// Type-only import: it doesn't exist at runtime (Babel strips it out at
// compile time), so it doesn't create a cycle with app/store.ts, which does
// import this module at runtime. Same trick already used by
// sessionSlice.ts and listenerMiddleware.ts.
import type {RootState} from '@/app/store';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {storage as defaultStorage, STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';

/** Only ids: product data is resolved from RTK Query's cache. */
export interface FavoritesState {
  ids: string[];
}

const initialState: FavoritesState = {ids: []};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    favoriteToggled(state, action: PayloadAction<string>) {
      const index = state.ids.indexOf(action.payload);
      if (index === -1) {
        state.ids.push(action.payload);
      } else {
        state.ids.splice(index, 1);
      }
    },
    favoritesRestored(state, action: PayloadAction<string[]>) {
      state.ids = action.payload;
    },
  },
  /**
   * Favorites belong to the user, not the device: signing out — or the
   * session expiring with a 401 — clears them, so whoever signs in next
   * doesn't inherit the previous user's. Clearing storage is the mirror side
   * effect and lives in `favoritesListeners`, not here: the reducer stays
   * pure.
   */
  extraReducers: builder => {
    builder
      .addCase(signedOut, () => initialState)
      .addCase(unauthorized, () => initialState);
  },
});

export const {favoriteToggled, favoritesRestored} = favoritesSlice.actions;
export default favoritesSlice.reducer;

/**
 * `ThunkAction`, parameterized with the store's real `RootState`, types
 * `dispatch` inside the thunk as the app's real `ThunkDispatch` instead of
 * `(action: unknown) => unknown`. Same pattern as `SessionThunk` in
 * `sessionSlice.ts`.
 */
type FavoritesThunk = ThunkAction<
  Promise<void>,
  RootState,
  unknown,
  UnknownAction
>;

/**
 * Favorites bootstrap. `storage` is injected so it can be tested without
 * AsyncStorage, just like `restoreSession`.
 */
export function restoreFavorites({
  storage = defaultStorage,
}: {storage?: Storage} = {}): FavoritesThunk {
  return async dispatch => {
    let raw: string | null;

    try {
      raw = await storage.getItem(STORAGE_KEYS.favorites);
    } catch {
      // Same criterion as `restoreSession`: broken or unauthorized storage
      // is indistinguishable from having nothing saved. If this rejected,
      // RootNavigator's `.catch` would log the error and the favorites list
      // would stay uninitialized instead of starting empty.
      dispatch(favoritesRestored([]));
      return;
    }

    if (raw == null) {
      dispatch(favoritesRestored([]));
      return;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const ids = Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
      dispatch(favoritesRestored(ids));
    } catch {
      // Corrupt storage must not break the app's startup.
      dispatch(favoritesRestored([]));
    }
  };
}
