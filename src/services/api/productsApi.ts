import {baseApi} from './baseApi';
import type {Product} from './types';

/**
 * `getProduct` is cross-cutting: it's consumed by the detail screen (the
 * `catalog` feature) and the favorites screen (the `favorites` feature). If
 * it lived inside `catalogApi`, favorites would have to import from another
 * feature, which is exactly what the dependency rule forbids. That's why the
 * endpoint lives in the shared API layer instead.
 */
export const productsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    getProduct: build.query<Product, string>({
      query: id => `/products/${id}`,
      providesTags: (_result, _error, id) => [{type: 'Product', id}],
    }),
  }),
});

export const {useGetProductQuery} = productsApi;
