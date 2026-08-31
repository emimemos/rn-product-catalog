import {baseApi} from '@/services/api/baseApi';
import {PAGE_SIZE} from '@/services/api/config';
import type {ProductsPage, ProductsQueryArgs} from '@/services/api/types';

/** The cursor is the id of the last product on the previous page; `null` = first. */
type PageParam = string | null;

export const catalogApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getProducts: build.infiniteQuery<
      ProductsPage,
      ProductsQueryArgs,
      PageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        // Returning `undefined` stops pagination: that's what turns `hasNextPage` off.
        getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
      },
      query: ({queryArg, pageParam}) => ({
        url: '/products',
        params: {
          q: queryArg.q,
          category: queryArg.category,
          sort: queryArg.sort,
          limit: PAGE_SIZE,
          ...(pageParam != null ? {cursor: pageParam} : {}),
        },
      }),
      providesTags: ['Product'],
    }),
  }),
});

export const {useGetProductsInfiniteQuery} = catalogApi;
