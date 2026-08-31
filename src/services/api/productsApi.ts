import {baseApi} from './baseApi';
import type {Product} from './types';

/**
 * `getProduct` es transversal: lo consumen el detalle (feature `catalog`) y la
 * pantalla de favoritos (feature `favorites`). Si viviera dentro de `catalogApi`,
 * favoritos tendría que importar de otra feature, que es justo lo que la regla
 * de dependencias prohíbe. Por eso el endpoint nace en la capa de API compartida.
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
