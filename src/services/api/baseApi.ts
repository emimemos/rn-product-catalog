import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import {API_BASE_URL} from './config';
import {unauthorized} from './sessionEvents';

/**
 * Only the slice of state that's needed is typed instead of importing
 * RootState: store.ts imports baseApi, so importing RootState here would be
 * a cycle.
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
 * A single API for the whole app. Each feature adds its endpoints with
 * `baseApi.injectEndpoints`, so the cache and tags are shared without the
 * features knowing about each other.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Product'],
  endpoints: () => ({}),
});
