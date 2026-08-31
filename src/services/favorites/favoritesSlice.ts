import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction, ThunkAction, UnknownAction} from '@reduxjs/toolkit';

// Import de tipo puro: en runtime no existe (Babel lo borra al compilar), así
// que no arma un ciclo con app/store.ts, que sí importa este módulo en
// runtime. Mismo truco que ya usa sessionSlice.ts y listenerMiddleware.ts.
import type {RootState} from '@/app/store';
import {unauthorized} from '@/services/api/sessionEvents';
import {signedOut} from '@/services/session';
import {storage as defaultStorage, STORAGE_KEYS} from '@/services/storage';
import type {Storage} from '@/services/storage';

/** Solo ids: los datos del producto se resuelven desde el cache de RTK Query. */
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
   * Los favoritos son del usuario, no del dispositivo: cerrar sesión —o que la
   * sesión caduque con un 401— los vacía, para que quien entre después no
   * herede los del anterior. El borrado del storage es el efecto secundario
   * espejo y vive en `favoritesListeners`, no acá: el reducer sigue puro.
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
 * `ThunkAction`, parametrizado con el `RootState` real de la store, tipa
 * `dispatch` dentro del thunk como la `ThunkDispatch` real de la app en vez de
 * `(action: unknown) => unknown`. Mismo patrón que `SessionThunk` en
 * `sessionSlice.ts`.
 */
type FavoritesThunk = ThunkAction<
  Promise<void>,
  RootState,
  unknown,
  UnknownAction
>;

/**
 * Bootstrap de favoritos. `storage` se inyecta para poder testearlo sin
 * AsyncStorage, igual que `restoreSession`.
 */
export function restoreFavorites({
  storage = defaultStorage,
}: {storage?: Storage} = {}): FavoritesThunk {
  return async dispatch => {
    let raw: string | null;

    try {
      raw = await storage.getItem(STORAGE_KEYS.favorites);
    } catch {
      // Mismo criterio que `restoreSession`: un storage roto o sin permisos no
      // se distingue de no tener nada guardado. Si esto rechazara, el
      // `.catch` de RootNavigator loguearía el error y la lista de favoritos
      // se quedaría sin inicializar en vez de arrancar vacía.
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
      // Storage corrupto no debe romper el arranque de la app.
      dispatch(favoritesRestored([]));
    }
  };
}
