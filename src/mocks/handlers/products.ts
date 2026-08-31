import {delay, http, HttpResponse} from 'msw';

import {API_BASE_URL, PAGE_SIZE} from '@/services/api/config';
import {CATEGORIES} from '@/services/api/types';
import type {
  ApiErrorBody,
  Category,
  Product,
  ProductsPage,
  SortOption,
} from '@/services/api/types';

import {findProduct, queryProducts} from '../db';

const withLatency = process.env.NODE_ENV !== 'test';

async function maybeDelay(): Promise<void> {
  if (withLatency) {
    await delay(300 + Math.floor(Math.random() * 300));
  }
}

const SORT_OPTIONS: SortOption[] = ['name', 'price_asc', 'price_desc'];

function parseCategory(value: string | null): Category | 'all' {
  const found = CATEGORIES.find(category => category === value);
  return found ?? 'all';
}

function parseSort(value: string | null): SortOption {
  return SORT_OPTIONS.find(option => option === value) ?? 'name';
}

export const productHandlers = [
  // El tercer genérico de `http.*` fija el tipo de cuerpo de respuesta: sin él,
  // TS infiere el de la primera rama y rechaza las demás.
  http.get<never, never, ApiErrorBody | ProductsPage>(
    `${API_BASE_URL}/products`,
    async ({request}) => {
      const url = new URL(request.url);
      await maybeDelay();

      // Inyección de fallos. No es alcanzable desde la app: la query string
      // la arma `catalogApi` y no expone este parámetro. Existe para los
      // tests, y para poder pegarle a mano desde un cliente HTTP contra el
      // shim de dev sin tocar código.
      if (url.searchParams.get('fail') === '1') {
        return HttpResponse.json<ApiErrorBody>(
          {message: 'Fallo inyectado'},
          {status: 500},
        );
      }

      const limitParam = Number(url.searchParams.get('limit'));
      const page = queryProducts({
        q: url.searchParams.get('q') ?? '',
        category: parseCategory(url.searchParams.get('category')),
        sort: parseSort(url.searchParams.get('sort')),
        cursor: url.searchParams.get('cursor'),
        limit:
          Number.isFinite(limitParam) && limitParam > 0
            ? limitParam
            : PAGE_SIZE,
      });

      return HttpResponse.json<ProductsPage>(page);
    },
  ),

  http.get<{id: string}, never, ApiErrorBody | Product>(
    `${API_BASE_URL}/products/:id`,
    async ({params}) => {
      await maybeDelay();
      const product = findProduct(params.id);

      if (!product) {
        return HttpResponse.json<ApiErrorBody>(
          {message: 'Producto no encontrado'},
          {status: 404},
        );
      }

      return HttpResponse.json<Product>(product);
    },
  ),
];
