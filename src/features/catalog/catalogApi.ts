import {baseApi} from '@/services/api/baseApi';
import {PAGE_SIZE} from '@/services/api/config';
import type {ProductsPage, ProductsQueryArgs} from '@/services/api/types';

/** El cursor es el id del último producto de la página anterior; `null` = primera. */
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
        // Devolver `undefined` corta el paginado: es lo que apaga `hasNextPage`.
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
