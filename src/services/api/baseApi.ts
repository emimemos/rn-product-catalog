import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import {API_BASE_URL} from './config';
import {unauthorized} from './sessionEvents';

/**
 * Se tipa solo el trozo del estado que hace falta en vez de importar RootState:
 * store.ts importa baseApi, así que importar RootState acá sería un ciclo.
 */
interface StateWithSession {
  session: {accessToken: string | null};
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, {getState}) => {
    const token = (getState() as StateWithSession).session.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    api.dispatch(unauthorized());
  }
  return result;
};

/**
 * Una sola API para toda la app. Cada feature agrega sus endpoints con
 * `baseApi.injectEndpoints`, así el cache y los tags son compartidos sin que las
 * features se conozcan entre sí.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Product', 'User'],
  endpoints: () => ({}),
});
